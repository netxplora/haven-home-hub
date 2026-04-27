
-- 1. Tighten "Inquiries: public insert" — disallow setting a user_id that isn't yours
DROP POLICY "Inquiries: public insert" ON public.inquiries;
CREATE POLICY "Inquiries: insert"
ON public.inquiries FOR INSERT
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);

-- 2. Tighten "Bookings: public insert"
DROP POLICY "Bookings: public insert" ON public.bookings;
CREATE POLICY "Bookings: insert"
ON public.bookings FOR INSERT
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);

-- 3. Restrict storage SELECT so the bucket can't be listed by anyone
DROP POLICY "Property media public read" ON storage.objects;
-- Public can fetch by direct URL (the bucket is public), but listing via the API now requires admin
CREATE POLICY "Property media admin list"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'property-media' AND public.has_role(auth.uid(),'admin'));

-- 4. Lock down the SECURITY DEFINER signup trigger function
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 5. Make sure search_path is explicit on set_updated_at as well
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
