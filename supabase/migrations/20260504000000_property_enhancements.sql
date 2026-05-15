-- 1. Add coordinates to properties table
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric;

-- 2. Create Sequence for auto property IDs
CREATE SEQUENCE IF NOT EXISTS property_internal_id_seq START WITH 1000;

-- 3. Create Trigger to assign PROP-XXXX to internal_id
CREATE OR REPLACE FUNCTION public.set_property_internal_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.internal_id IS NULL OR NEW.internal_id = '' OR NEW.internal_id LIKE 'PROP-1%' THEN
        NEW.internal_id := 'PROP-' || nextval('property_internal_id_seq');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_property_internal_id ON public.properties;
CREATE TRIGGER tr_property_internal_id
BEFORE INSERT ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.set_property_internal_id();
