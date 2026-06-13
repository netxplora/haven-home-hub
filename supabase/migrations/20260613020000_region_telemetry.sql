CREATE TABLE IF NOT EXISTS public.regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    country TEXT,
    state_province TEXT,
    city TEXT,
    slug TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT false,
    
    short_description TEXT,
    long_description TEXT,
    market_outlook TEXT,
    growth_commentary TEXT,
    investment_notes TEXT,
    
    population_growth TEXT,
    infrastructure_score TEXT,
    rental_demand TEXT,
    property_appreciation TEXT,
    employment_growth TEXT,
    investment_score TEXT,
    custom_metrics JSONB DEFAULT '{}'::jsonb,
    
    category TEXT,
    
    cover_image_url TEXT,
    secondary_image_url TEXT,
    gallery_images JSONB DEFAULT '[]'::jsonb,
    
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Regions: public read"
ON public.regions FOR SELECT
TO public
USING (true);

CREATE POLICY "Regions: admin all"
ON public.regions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  )
);
