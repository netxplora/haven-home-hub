-- Migration: User Documents System
-- Purpose: Creates the user_documents table and configures the storage bucket for ownership documents.

-- 1. Create table for user documents
CREATE TABLE IF NOT EXISTS public.user_documents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id uuid REFERENCES public.investment_properties(id) ON DELETE SET NULL,
    investment_id uuid REFERENCES public.user_investments(id) ON DELETE SET NULL,
    document_type text NOT NULL, -- 'c_of_o', 'deed', 'allocation_letter', 'survey', etc.
    name text NOT NULL, -- User-facing name, e.g., 'Certificate of Occupancy'
    file_path text NOT NULL, -- Path in the user-documents storage bucket
    status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'available', 'rejected'
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own documents
DROP POLICY IF EXISTS "Users can view own documents" ON public.user_documents;
CREATE POLICY "Users can view own documents" ON public.user_documents
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admins can manage all documents
DROP POLICY IF EXISTS "Admins can manage documents" ON public.user_documents;
CREATE POLICY "Admins can manage documents" ON public.user_documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Fast lookups
CREATE INDEX IF NOT EXISTS idx_user_documents_user ON public.user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_property ON public.user_documents(property_id);

-- 2. Storage Bucket Configuration
-- We'll insert the bucket record if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-documents', 'user-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for Storage Bucket (user-documents)
-- Policy: Users can read their own documents in storage
DROP POLICY IF EXISTS "Users can read own documents" ON storage.objects;
CREATE POLICY "Users can read own documents" ON storage.objects FOR SELECT
    USING (bucket_id = 'user-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policy: Admins can insert/update/delete documents in storage
DROP POLICY IF EXISTS "Admins can manage documents in storage" ON storage.objects;
CREATE POLICY "Admins can manage documents in storage" ON storage.objects
    FOR ALL USING (
        bucket_id = 'user-documents' AND
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );
