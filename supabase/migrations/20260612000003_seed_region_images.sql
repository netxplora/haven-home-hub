-- ============================================================
-- REGION IMAGES MIGRATION
-- Update location images to use locally generated premium assets
-- ============================================================

UPDATE public.locations
SET image_url = '/regions/region_major_city_skyline_1781281501942.png'
WHERE name ILIKE '%New York%' OR name ILIKE '%NY%';

UPDATE public.locations
SET image_url = '/regions/region_transport_infrastructure_1781281533677.png'
WHERE name ILIKE '%Austin%' OR name ILIKE '%TX%';

UPDATE public.locations
SET image_url = '/regions/region_development_1781281576904.png'
WHERE name ILIKE '%Seattle%' OR name ILIKE '%WA%';

UPDATE public.locations
SET image_url = 'https://images.unsplash.com/photo-1554629947-334ff61d85dc?auto=format&fit=crop&w=800&q=80'
WHERE name ILIKE '%Miami%' OR name ILIKE '%FL%';

-- Fallback for any other featured locations
UPDATE public.locations
SET image_url = '/regions/region_major_city_skyline_1781281501942.png'
WHERE image_url IS NULL AND featured = true;
