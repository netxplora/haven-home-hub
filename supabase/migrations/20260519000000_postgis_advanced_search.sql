-- Enable PostGIS extension for spatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add a geometry column to the properties table to store lat/lon points
ALTER TABLE properties ADD COLUMN IF NOT EXISTS location_geom geometry(Point, 4326);

-- Backfill the new location_geom column with existing latitude and longitude data
UPDATE properties 
SET location_geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location_geom IS NULL;

-- Create an index on the geometry column for fast spatial lookups
CREATE INDEX IF NOT EXISTS idx_properties_location_geom ON properties USING GIST (location_geom);

-- Create a function to keep the location_geom column updated automatically
CREATE OR REPLACE FUNCTION update_property_location_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location_geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  ELSE
    NEW.location_geom := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run the function before insert or update
DROP TRIGGER IF EXISTS trg_update_property_location_geom ON properties;
CREATE TRIGGER trg_update_property_location_geom
BEFORE INSERT OR UPDATE OF latitude, longitude ON properties
FOR EACH ROW
EXECUTE FUNCTION update_property_location_geom();

-- Create an RPC to find properties within a specific radius
CREATE OR REPLACE FUNCTION properties_within_radius(
  lon double precision, 
  lat double precision, 
  radius_km double precision
)
RETURNS SETOF properties
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT *
  FROM properties
  WHERE status = 'available' 
  AND ST_DWithin(
    location_geom,
    ST_SetSRID(ST_MakePoint(lon, lat), 4326),
    radius_km * 1000 -- Convert km to meters
  )
  ORDER BY ST_Distance(
    location_geom,
    ST_SetSRID(ST_MakePoint(lon, lat), 4326)
  ) ASC;
$$;
