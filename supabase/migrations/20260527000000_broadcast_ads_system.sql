-- ============================================================
-- BROADCAST & ADVERTISEMENT MANAGEMENT SYSTEM
-- ============================================================
-- Purpose: Creates broadcasts and advertisements tables,
-- a cms-media storage bucket, and admin-only RLS policies.
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. BROADCASTS TABLE
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT,
    broadcast_type TEXT NOT NULL DEFAULT 'general'
        CHECK (broadcast_type IN ('general', 'investor_update', 'maintenance', 'promotion', 'featured_property', 'emergency')),
    target_audience TEXT NOT NULL DEFAULT 'all'
        CHECK (target_audience IN ('all', 'investors', 'admins', 'agents', 'buyers')),
    visibility TEXT[] NOT NULL DEFAULT '{homepage}',
    image_url TEXT,
    link_url TEXT,
    link_label TEXT,
    is_active BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    priority INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Auto-update updated_at on broadcasts
CREATE OR REPLACE FUNCTION public.handle_broadcasts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_broadcasts_updated ON public.broadcasts;
CREATE TRIGGER on_broadcasts_updated
    BEFORE UPDATE ON public.broadcasts
    FOR EACH ROW EXECUTE FUNCTION public.handle_broadcasts_updated_at();

-- Enable RLS
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: readable by everyone, writable by admins only
DROP POLICY IF EXISTS "Broadcasts are viewable by everyone" ON public.broadcasts;
CREATE POLICY "Broadcasts are viewable by everyone"
    ON public.broadcasts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert broadcasts" ON public.broadcasts;
CREATE POLICY "Admins can insert broadcasts"
    ON public.broadcasts FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update broadcasts" ON public.broadcasts;
CREATE POLICY "Admins can update broadcasts"
    ON public.broadcasts FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete broadcasts" ON public.broadcasts;
CREATE POLICY "Admins can delete broadcasts"
    ON public.broadcasts FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'));


-- ──────────────────────────────────────────────
-- 2. ADVERTISEMENTS TABLE
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.advertisements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    ad_type TEXT NOT NULL DEFAULT 'image_banner'
        CHECK (ad_type IN ('image_banner', 'clickable_promo', 'featured_property', 'text_image_card', 'promo_slider')),
    placement TEXT NOT NULL DEFAULT 'homepage_mid'
        CHECK (placement IN ('homepage_hero', 'homepage_mid', 'sidebar', 'property_detail', 'dashboard_promo', 'invest_page')),
    image_url TEXT,
    click_url TEXT,
    cta_label TEXT,
    is_active BOOLEAN NOT NULL DEFAULT false,
    starts_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    priority INTEGER NOT NULL DEFAULT 0,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Auto-update updated_at on advertisements
CREATE OR REPLACE FUNCTION public.handle_advertisements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_advertisements_updated ON public.advertisements;
CREATE TRIGGER on_advertisements_updated
    BEFORE UPDATE ON public.advertisements
    FOR EACH ROW EXECUTE FUNCTION public.handle_advertisements_updated_at();

-- Enable RLS
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- RLS Policies: readable by everyone, writable by admins only
DROP POLICY IF EXISTS "Advertisements are viewable by everyone" ON public.advertisements;
CREATE POLICY "Advertisements are viewable by everyone"
    ON public.advertisements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert advertisements" ON public.advertisements;
CREATE POLICY "Admins can insert advertisements"
    ON public.advertisements FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update advertisements" ON public.advertisements;
CREATE POLICY "Admins can update advertisements"
    ON public.advertisements FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete advertisements" ON public.advertisements;
CREATE POLICY "Admins can delete advertisements"
    ON public.advertisements FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'));


-- ──────────────────────────────────────────────
-- 3. CMS-MEDIA STORAGE BUCKET
-- ──────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('cms-media', 'cms-media', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view (public bucket, direct URL access)
DROP POLICY IF EXISTS "CMS media is viewable by everyone" ON storage.objects;
CREATE POLICY "CMS media is viewable by everyone"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'cms-media');

-- Only admins can upload
DROP POLICY IF EXISTS "Admins can upload CMS media" ON storage.objects;
CREATE POLICY "Admins can upload CMS media"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'cms-media'
        AND public.has_role(auth.uid(), 'admin'::public.app_role)
    );

-- Only admins can update
DROP POLICY IF EXISTS "Admins can update CMS media" ON storage.objects;
CREATE POLICY "Admins can update CMS media"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'cms-media'
        AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
    WITH CHECK (
        bucket_id = 'cms-media'
        AND public.has_role(auth.uid(), 'admin'::public.app_role)
    );

-- Only admins can delete
DROP POLICY IF EXISTS "Admins can delete CMS media" ON storage.objects;
CREATE POLICY "Admins can delete CMS media"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'cms-media'
        AND public.has_role(auth.uid(), 'admin'::public.app_role)
    );
