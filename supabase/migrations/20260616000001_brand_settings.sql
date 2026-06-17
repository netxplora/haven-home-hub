-- ============================================================
-- DYNAMIC BRAND SETTINGS SYSTEM
-- ============================================================
-- Single-row table for platform-wide branding configuration.
-- All branding (name, logo, colors, contact) is driven from here.
-- ============================================================

-- 1. CREATE TABLE
CREATE TABLE IF NOT EXISTS public.brand_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_name VARCHAR(120) NOT NULL DEFAULT 'Haven Home Hub',
    tagline VARCHAR(255) DEFAULT 'Smart Property Investment',
    logo_url TEXT,
    favicon_url TEXT,
    primary_color VARCHAR(20) DEFAULT '#B8860B',
    secondary_color VARCHAR(20) DEFAULT '#0F172A',
    support_email VARCHAR(120) DEFAULT 'support@havenhomehub.com',
    legal_name VARCHAR(200) DEFAULT 'Haven Home Hub LLC',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. ENFORCE SINGLE ROW (prevent inserts when a row already exists)
CREATE OR REPLACE FUNCTION public.enforce_single_brand_row()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF (SELECT COUNT(*) FROM public.brand_settings) >= 1 THEN
        RAISE EXCEPTION 'Only one brand_settings row is allowed. Use UPDATE instead.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_brand_settings_single_row ON public.brand_settings;
CREATE TRIGGER tr_brand_settings_single_row
    BEFORE INSERT ON public.brand_settings
    FOR EACH ROW EXECUTE FUNCTION public.enforce_single_brand_row();

-- 3. AUTO-UPDATE updated_at
DROP TRIGGER IF EXISTS tr_brand_settings_updated ON public.brand_settings;
CREATE TRIGGER tr_brand_settings_updated
    BEFORE UPDATE ON public.brand_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. SEED DEFAULT ROW
INSERT INTO public.brand_settings (
    platform_name,
    tagline,
    primary_color,
    secondary_color,
    support_email,
    legal_name
)
SELECT 
    'Haven Home Hub',
    'Smart Property Investment',
    '#B8860B',
    '#0F172A',
    'support@havenhomehub.com',
    'Haven Home Hub LLC'
WHERE NOT EXISTS (SELECT 1 FROM public.brand_settings);

-- 5. ENABLE RLS
ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;

-- Public read access (everyone can see brand settings)
DROP POLICY IF EXISTS "Brand settings are publicly readable" ON public.brand_settings;
CREATE POLICY "Brand settings are publicly readable"
    ON public.brand_settings FOR SELECT
    USING (true);

-- Admin-only write access
DROP POLICY IF EXISTS "Admins can update brand settings" ON public.brand_settings;
CREATE POLICY "Admins can update brand settings"
    ON public.brand_settings FOR UPDATE TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Prevent deletes entirely
DROP POLICY IF EXISTS "Nobody can delete brand settings" ON public.brand_settings;
CREATE POLICY "Nobody can delete brand settings"
    ON public.brand_settings FOR DELETE
    USING (false);
