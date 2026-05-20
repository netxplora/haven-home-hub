-- Add virtual tour URL support for 3D walkthroughs (Matterport, etc.)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS virtual_tour_url TEXT;

COMMENT ON COLUMN properties.virtual_tour_url IS 'URL to a 3D virtual tour (Matterport, Zillow 3D, etc.)';
