-- Add external_url column to properties to prevent duplicate imports and track sources
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS external_url text UNIQUE;

-- Add a status for drafts if it's not supported by the current check constraint.
-- Currently, the properties table might have a status like 'available', 'sold', 'rented'.
-- Wait, the current status is usually just text. Let's make sure it can be 'draft'.
