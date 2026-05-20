-- ============================================================
-- KYC SYSTEM MIGRATION
-- ============================================================

-- 1. Add KYC columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS id_document_url TEXT,
ADD COLUMN IF NOT EXISTS proof_of_address_url TEXT;

-- 2. Create KYC Documents storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('kyc_documents', 'kyc_documents', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies for KYC Documents
DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON storage.objects;
CREATE POLICY "Users can upload their own KYC documents" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'kyc_documents' AND (auth.uid()::text = (string_to_array(name, '/'))[1]));

DROP POLICY IF EXISTS "Users can view their own KYC documents" ON storage.objects;
CREATE POLICY "Users can view their own KYC documents" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'kyc_documents' AND (auth.uid()::text = (string_to_array(name, '/'))[1]));

DROP POLICY IF EXISTS "Admins can view all KYC documents" ON storage.objects;
CREATE POLICY "Admins can view all KYC documents" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'kyc_documents' AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
));
