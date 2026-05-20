-- =============================================
-- Dynamic Featured Properties System
-- =============================================

-- Add featured priority and timestamp columns
ALTER TABLE properties ADD COLUMN IF NOT EXISTS featured_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS featured_at TIMESTAMPTZ;

-- Auto-set featured_at when featured is toggled on
CREATE OR REPLACE FUNCTION set_featured_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.featured = true AND (OLD.featured IS DISTINCT FROM true) THEN
    NEW.featured_at := now();
  ELSIF NEW.featured = false THEN
    NEW.featured_at := NULL;
    NEW.featured_order := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_featured_timestamp ON properties;
CREATE TRIGGER trg_set_featured_timestamp
BEFORE UPDATE OF featured ON properties
FOR EACH ROW
EXECUTE FUNCTION set_featured_timestamp();

-- Also handle INSERT
CREATE OR REPLACE FUNCTION set_featured_timestamp_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.featured = true AND NEW.featured_at IS NULL THEN
    NEW.featured_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_featured_timestamp_insert ON properties;
CREATE TRIGGER trg_set_featured_timestamp_insert
BEFORE INSERT ON properties
FOR EACH ROW
EXECUTE FUNCTION set_featured_timestamp_insert();

-- Create an index for fast featured property lookups
CREATE INDEX IF NOT EXISTS idx_properties_featured ON properties (featured, featured_order, featured_at DESC)
WHERE featured = true;

-- Auto-unfeatured sold/archived properties
CREATE OR REPLACE FUNCTION auto_unfeature_property()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'sold' AND NEW.featured = true THEN
    NEW.featured := false;
    NEW.featured_at := NULL;
    NEW.featured_order := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_unfeature_property ON properties;
CREATE TRIGGER trg_auto_unfeature_property
BEFORE UPDATE OF status ON properties
FOR EACH ROW
EXECUTE FUNCTION auto_unfeature_property();

-- Backfill: set featured_at for any existing featured properties
UPDATE properties SET featured_at = created_at WHERE featured = true AND featured_at IS NULL;
