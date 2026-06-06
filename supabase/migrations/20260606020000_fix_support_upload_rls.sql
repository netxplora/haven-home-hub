-- Fix RLS for support chat file uploads
-- 1. Allow any user (authenticated or anon) to upload files to the support/ path in property-media
-- 2. Allow ticket owners to insert events (not just staff)

-- Storage: Allow anyone to upload to support/ folder in property-media bucket
CREATE POLICY "Allow support chat file uploads"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = 'support'
  );

-- Storage: Allow anyone to read support/ folder files (already public bucket, but ensure)
DROP POLICY IF EXISTS "Allow support chat file reads" ON storage.objects;
CREATE POLICY "Allow support chat file reads"
  ON storage.objects FOR SELECT TO public
  USING (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = 'support'
  );

-- Fix support_ticket_events INSERT policy: allow ticket owners AND staff to insert events
DROP POLICY IF EXISTS "Allow staff to insert events" ON public.support_ticket_events;
CREATE POLICY "Allow users and staff to insert events" ON public.support_ticket_events
  FOR INSERT TO public WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_id AND (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
        public.is_support_staff(auth.uid()) OR
        (auth.uid() IS NULL)
      )
    )
  );
