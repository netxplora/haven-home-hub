-- =========================================================================
-- EXPAND PROPERTY DETAILS SCHEMA
-- Adds advanced fields for property listings and ensures image support.
-- =========================================================================

-- Add missing columns to public.properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS parking_spaces INTEGER DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS year_built INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS internal_id TEXT UNIQUE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS nearby_pois JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS inspection_availability TEXT DEFAULT 'Available for viewing Monday to Saturday, 9AM - 5PM.';

-- Ensure property_images table exists
CREATE TABLE IF NOT EXISTS public.property_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure alt_text and other columns exist if the table was created previously without them
ALTER TABLE public.property_images ADD COLUMN IF NOT EXISTS alt_text TEXT;
ALTER TABLE public.property_images ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON public.property_images(property_id);

-- Enable RLS
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

-- Policies (using DO block to avoid errors if policies already exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Property images are viewable by everyone.') THEN
        CREATE POLICY "Property images are viewable by everyone." ON public.property_images FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage property images.') THEN
        CREATE POLICY "Admins can manage property images." ON public.property_images FOR ALL USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- Update existing properties with a default internal_id if they don't have one
DO $$
DECLARE
    prop RECORD;
    counter INTEGER := 1000;
BEGIN
    FOR prop IN SELECT id FROM public.properties WHERE internal_id IS NULL LOOP
        UPDATE public.properties SET internal_id = 'PROP-' || counter WHERE id = prop.id;
        counter := counter + 1;
    END LOOP;
END $$;
