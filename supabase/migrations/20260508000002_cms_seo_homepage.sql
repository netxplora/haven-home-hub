-- ============================================================
-- CMS & SEO SYSTEM MIGRATION
-- ============================================================

-- 1. Add SEO columns to blog_posts
ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS meta_keywords TEXT;

-- 2. Create site_content table for Homepage section management
CREATE TABLE IF NOT EXISTS public.site_content (
    section_key TEXT PRIMARY KEY,
    content_value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view site content
DROP POLICY IF EXISTS "Site content is viewable by everyone" ON public.site_content;
CREATE POLICY "Site content is viewable by everyone" ON public.site_content FOR SELECT USING (true);

-- Only admins can modify site content
DROP POLICY IF EXISTS "Admins can insert site content" ON public.site_content;
CREATE POLICY "Admins can insert site content" ON public.site_content FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

DROP POLICY IF EXISTS "Admins can update site content" ON public.site_content;
CREATE POLICY "Admins can update site content" ON public.site_content FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- 3. Seed default homepage content
INSERT INTO public.site_content (section_key, content_value) VALUES 
('homepage_hero', '{"title": "Find a home you''ll love coming back to.", "subtitle": "Browse curated homes for sale, premium rentals, and land — all hand-picked and managed by trusted agents.", "badge": "Curated by our agency"}'::jsonb),
('homepage_trust', '{"items": [{"title": "Verified listings", "description": "Every property is inspected and verified by our agency before going live."}, {"title": "Real human agents", "description": "Talk to a trusted agent who knows the property — not a chatbot."}, {"title": "Curated, not crowded", "description": "We list fewer homes, but every one of them is worth your visit."}]}'::jsonb),
('homepage_invest_cta', '{"badge": "New · Fractional Ownership", "title": "Invest in real estate from any amount.", "description": "Co-invest in professionally managed, income-generating properties and track your returns from one clean portfolio."}'::jsonb)
ON CONFLICT (section_key) DO NOTHING;
