-- Migration: Enhance properties and investment properties with granular location and category fields
-- Created: 2026-05-11

-- 1. Enhance properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS property_category TEXT DEFAULT 'house'; -- house, apartment, villa, commercial, land, penthouse

-- 2. Enhance investment_properties table
ALTER TABLE public.investment_properties 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS property_category TEXT DEFAULT 'residential'; -- residential, commercial, industrial, student_housing

-- 3. Update existing properties (Backfill from address/location where possible)

-- US Properties
UPDATE public.properties SET city = 'Denver', state = 'CO', country = 'United States' WHERE address ILIKE '%Denver, CO%';
UPDATE public.properties SET city = 'New York City', state = 'NY', country = 'United States' WHERE address ILIKE '%New York City, NY%';
UPDATE public.properties SET city = 'Los Angeles', state = 'CA', country = 'United States' WHERE address ILIKE '%Los Angeles, CA%';
UPDATE public.properties SET city = 'Houston', state = 'TX', country = 'United States' WHERE address ILIKE '%Houston, TX%';

-- UK Properties
UPDATE public.properties SET city = 'London', country = 'UK' WHERE address ILIKE '%London, UK%';
UPDATE public.properties SET city = 'Manchester', country = 'UK' WHERE address ILIKE '%Manchester, UK%';
UPDATE public.properties SET city = 'Birmingham', country = 'UK' WHERE address ILIKE '%Birmingham, UK%';

-- 4. Update investment properties
UPDATE public.investment_properties SET city = 'London', country = 'UK' WHERE location = 'London, UK';
UPDATE public.investment_properties SET city = 'Manchester', country = 'UK' WHERE location = 'Manchester, UK';
UPDATE public.investment_properties SET city = 'New York City', state = 'NY', country = 'United States' WHERE location = 'New York City, NY';
UPDATE public.investment_properties SET city = 'Los Angeles', state = 'CA', country = 'United States' WHERE location = 'Los Angeles, CA';
UPDATE public.investment_properties SET city = 'Houston', state = 'TX', country = 'United States' WHERE location = 'Houston, TX';

-- 5. Set default categories where appropriate
UPDATE public.properties SET property_category = 'land' WHERE property_type = 'land';
UPDATE public.properties SET property_category = 'house' WHERE property_type IN ('buy', 'rent') AND bedrooms >= 3;
UPDATE public.properties SET property_category = 'apartment' WHERE property_type IN ('buy', 'rent') AND bedrooms < 3;

UPDATE public.investment_properties SET property_category = 'student_housing' WHERE title ILIKE '%student%';
UPDATE public.investment_properties SET property_category = 'commercial' WHERE title ILIKE '%logistics%' OR title ILIKE '%retail%' OR title ILIKE '%office%';
