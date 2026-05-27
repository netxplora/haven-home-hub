-- Migration: Document Verification & Generation Queue
-- Purpose: Creates the document_requests table for strict admin verification.

-- Only create the enum if it doesn't already exist
DO $$ BEGIN
  CREATE TYPE public.document_request_status AS ENUM ('pending', 'under_review', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.document_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
    investment_property_id uuid REFERENCES public.investment_properties(id) ON DELETE CASCADE,
    requested_documents jsonb NOT NULL DEFAULT '[]'::jsonb,
    status public.document_request_status NOT NULL DEFAULT 'pending',
    admin_notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_requests_user ON public.document_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_status ON public.document_requests(status);

-- Enable RLS
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

-- ========== User Policies ==========
DROP POLICY IF EXISTS "Users can view own document requests" ON public.document_requests;
CREATE POLICY "Users can view own document requests" ON public.document_requests
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own document requests" ON public.document_requests;
CREATE POLICY "Users can insert own document requests" ON public.document_requests
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ========== Admin Policies (separate per-operation, matching proven codebase pattern) ==========
DROP POLICY IF EXISTS "Admins can view all document requests" ON public.document_requests;
CREATE POLICY "Admins can view all document requests" ON public.document_requests
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update document requests" ON public.document_requests;
CREATE POLICY "Admins can update document requests" ON public.document_requests
    FOR UPDATE TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete document requests" ON public.document_requests;
CREATE POLICY "Admins can delete document requests" ON public.document_requests
    FOR DELETE TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS tg_document_requests_updated ON public.document_requests;
CREATE TRIGGER tg_document_requests_updated
    BEFORE UPDATE ON public.document_requests
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
