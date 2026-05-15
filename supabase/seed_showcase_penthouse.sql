-- =========================================================================
-- ENRICH SECOND SHOWCASE PROPERTY - THE GRAND PENTHOUSE
-- Adds detailed metadata and internal ID.
-- =========================================================================

DO $$
DECLARE
    penthouse_id UUID;
BEGIN
    -- Get the ID of The Grand Penthouse
    SELECT id INTO penthouse_id FROM public.properties WHERE slug = 'the-grand-penthouse' LIMIT 1;

    IF penthouse_id IS NOT NULL THEN
        -- Update detailed info
        UPDATE public.properties SET
            parking_spaces = 2,
            year_built = 2022,
            internal_id = 'PROP-8812',
            nearby_pois = '[
                {"name": "Victoria Island Business District", "type": "Office", "distance": "0.5km"},
                {"name": "Eko Hotel & Suites", "type": "Hotel", "distance": "0.7km"},
                {"name": "Red Door Gallery", "type": "Art", "distance": "0.3km"}
            ]'::jsonb,
            inspection_availability = 'Viewings by appointment only. Saturday & Sunday, 12:00 PM - 5:00 PM.',
            features = '["Rooftop Terrace", "Private Elevator", "Panoramic City View", "Smart Home Integration", "Concierge Service", "Underground Parking", "Gym Access"]'::jsonb
        WHERE id = penthouse_id;
    END IF;
END $$;
