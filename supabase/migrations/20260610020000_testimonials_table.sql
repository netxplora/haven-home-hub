-- Migration: 20260610020000_testimonials_table
-- Purpose: Dedicated Testimonials table for CMS Home page

CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_type TEXT NOT NULL DEFAULT 'Client',
  image_url TEXT,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  content TEXT NOT NULL,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Testimonials: public read" ON public.testimonials FOR SELECT USING (true);
CREATE POLICY "Testimonials: admin all" ON public.testimonials FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Trigger for updated_at
CREATE TRIGGER tr_testimonials_updated BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Insert some initial dummy data for the audit
INSERT INTO public.testimonials (name, user_type, rating, content, featured)
VALUES 
  ('James T.', 'Fractional Investor', 5, 'Investing in Austin tech-hub condos fractionally has allowed me to diversify my portfolio out of equities into inflation-hedged assets. The yield reports are transparent and automatic.', true),
  ('Mrs. Sarah O.', 'Homebuyer', 5, 'We bought our family home through Haven. The team handled physical showings, title insurance, and HOA clearance with zero hassle.', true),
  ('Robert K.', 'Out-of-State Buyer', 5, 'The escrow payment pathway gave me the confidence to send funds from out of state knowing the seller validation occurred before payout dispatch.', true)
ON CONFLICT DO NOTHING;
