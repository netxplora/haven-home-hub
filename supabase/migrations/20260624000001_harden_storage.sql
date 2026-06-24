-- Migration: Harden Storage Buckets (File Upload Security)
-- This migration explicitly defines allowed MIME types and file size limits for all storage buckets
-- to prevent malicious file uploads (e.g. executing scripts, extremely large files causing DoS).

-- 1. Avatars: Images only, max 2MB
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  file_size_limit = 2097152 -- 2MB
WHERE id = 'avatars';

-- 2. KYC Documents: Images and PDFs, max 10MB
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  file_size_limit = 10485760 -- 10MB
WHERE id = 'kyc_documents';

-- 3. User Documents: Images and PDFs, max 10MB
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  file_size_limit = 10485760 -- 10MB
WHERE id = 'user-documents';

-- 4. Admin Assets (Signatures, Seals, Logos): Images and PDFs, max 10MB
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf'],
  file_size_limit = 10485760 -- 10MB
WHERE id = 'admin-assets';

-- 5. Payment Receipts: Images and PDFs, max 5MB
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  file_size_limit = 5242880 -- 5MB
WHERE id = 'payment_receipts';

-- 6. Applications (CVs): PDFs and Word Docs, max 5MB
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  file_size_limit = 5242880 -- 5MB
WHERE id = 'applications';

-- 7. Broadcast Assets: Images and Videos, max 50MB
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'],
  file_size_limit = 52428800 -- 50MB
WHERE id = 'broadcast_assets';

-- 8. Investment Documents: Images and PDFs, max 10MB
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  file_size_limit = 10485760 -- 10MB
WHERE id = 'investment_documents';
