-- Migration: Finalize data consistency for filtering system
-- Created: 2026-05-11

-- 1. Ensure all properties have a category
UPDATE public.properties SET property_category = 'house' WHERE property_category IS NULL;
UPDATE public.investment_properties SET property_category = 'residential' WHERE property_category IS NULL;

-- 2. Clean up location data
-- Handle cases where location might be a single string without comma
UPDATE public.properties SET country = 'United States' WHERE country IS NULL AND (address ILIKE '%USA%' OR address ILIKE '%United States%');
UPDATE public.properties SET country = 'UK' WHERE country IS NULL AND (address ILIKE '%UK%' OR address ILIKE '%United Kingdom%');

-- 3. Standardize listing types
UPDATE public.properties SET property_type = 'buy' WHERE property_type NOT IN ('buy', 'rent', 'land');

-- 4. Add missing specs if needed
UPDATE public.properties SET bedrooms = 0 WHERE bedrooms IS NULL;
UPDATE public.properties SET bathrooms = 0 WHERE bathrooms IS NULL;
UPDATE public.properties SET size_sqm = 0 WHERE size_sqm IS NULL;

-- 5. Set default status for investments
UPDATE public.investment_properties SET status = 'open' WHERE status IS NULL;
