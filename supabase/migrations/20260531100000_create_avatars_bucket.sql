-- =========================
-- AVATARS STORAGE BUCKET
-- =========================
-- Creates a public bucket for user profile pictures (avatars).
-- Users can upload/update/delete their own avatars.
-- Admins can manage all avatars.

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view avatars (public bucket)
CREATE POLICY "Avatars: public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Users can upload their own avatar (path must start with their user ID)
CREATE POLICY "Avatars: user upload own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own avatar
CREATE POLICY "Avatars: user update own" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own avatar
CREATE POLICY "Avatars: user delete own" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can manage all avatars
CREATE POLICY "Avatars: admin manage" ON storage.objects
  FOR ALL TO authenticated USING (
    bucket_id = 'avatars'
    AND public.has_role(auth.uid(), 'admin')
  ) WITH CHECK (
    bucket_id = 'avatars'
    AND public.has_role(auth.uid(), 'admin')
  );
