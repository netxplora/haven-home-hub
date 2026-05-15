-- Enable RLS policies for admin CRUD operations on crypto_assets table

-- 1. Admins can read all crypto assets (active and inactive)
CREATE POLICY "Admins can view all crypto assets" 
ON public.crypto_assets FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Admins can insert new crypto assets
CREATE POLICY "Admins can insert crypto assets" 
ON public.crypto_assets FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Admins can update crypto assets
CREATE POLICY "Admins can update crypto assets" 
ON public.crypto_assets FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Admins can delete crypto assets
CREATE POLICY "Admins can delete crypto assets" 
ON public.crypto_assets FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));
