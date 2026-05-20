-- =========================================================================
-- SHOWCASE MANSION - IKOKI LAGOON FRONT
-- Fully detailed property with images, POIs, and categorized features.
-- =========================================================================

DO $$
DECLARE
    beverly_hills_id uuid;
    sarah_id uuid;
    mansion_id uuid;
BEGIN
    -- Get IDs
    SELECT id INTO beverly_hills_id FROM public.locations WHERE slug = 'beverly-hills' LIMIT 1;
    SELECT id INTO sarah_id FROM public.agents WHERE email = 'sarah@assetatlas.com' LIMIT 1;

    IF beverly_hills_id IS NOT NULL AND sarah_id IS NOT NULL THEN
        -- Insert Property
        INSERT INTO public.properties (
            title, slug, description, price, currency, property_type, status, 
            location_id, address, bedrooms, bathrooms, parking_spaces, size_sqm, 
            year_built, internal_id, inspection_availability,
            features, agent_id, featured, cover_image_url,
            nearby_pois
        ) VALUES (
            'The Beverly Hills Lagoon Front Mansion', 
            'beverly-hills-lagoon-front-mansion', 
            'Rising elegantly above the Hudson River, this 6-bedroom architectural triumph redefines luxury living in North America. \n\nEvery inch of this 1,200sqm estate has been curated for the most discerning homeowner. From the grand double-height foyer with imported Italian marble to the expansive floor-to-ceiling glass walls that frame panoramic water views, the home is a masterpiece of light and space.\n\nThe gourmet chef''s kitchen features Gaggenau appliances, while the private cinema and glass-walled wine cellar provide unparalleled entertainment options. Outside, an infinity-edge pool blends seamlessly with the lagoon horizon, surrounded by lush manicured gardens and a private boat dock.',
            4200000, 'USD', 'buy', 'available', 
            beverly_hills_id, 'No. 12 Alexander Road, Beverly Hills, CA', 
            6, 8, 10, 1200.00, 
            2023, 'AG-IK-001', 'Private viewing by appointment only. Minimum 24-hour notice required.',
            '["Infinity Pool", "Private Cinema", "Wine Cellar", "Smart Home", "Lagoon View", "Waterfront", "Private Dock", "Gaggenau Kitchen", "Staff Quarters", "CCTV", "Bulletproof Security", "Backup Power", "Marble Floors", "Elevator", "Home Office"]'::jsonb, 
            sarah_id, true, 
            'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80',
            '[
                {"name": "St. Saviours School", "type": "International School", "distance": "5 mins"},
                {"name": "Evercare Hospital", "type": "Medical Center", "distance": "12 mins"},
                {"name": "Beverly Hills Club 1938", "type": "Recreational Club", "distance": "8 mins"},
                {"name": "Central Park", "type": "Sports Facility", "distance": "10 mins"}
            ]'::jsonb
        ) ON CONFLICT (slug) 
        DO UPDATE SET 
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            features = EXCLUDED.features,
            nearby_pois = EXCLUDED.nearby_pois,
            internal_id = EXCLUDED.internal_id,
            inspection_availability = EXCLUDED.inspection_availability
        RETURNING id INTO mansion_id;

        -- Insert Additional Images
        DELETE FROM public.property_images WHERE property_id = mansion_id;
        
        INSERT INTO public.property_images (property_id, url, alt_text, sort_order)
        VALUES 
            (mansion_id, 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&q=80', 'Grand Foyer and Staircase', 1),
            (mansion_id, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80', 'Lagoon View Living Room', 2),
            (mansion_id, 'https://images.unsplash.com/photo-1556912177-c54030639a6d?w=1200&q=80', 'Professional Grade Kitchen', 3),
            (mansion_id, 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80', 'Master Suite Terrace', 4),
            (mansion_id, 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80', 'Infinity Pool at Sunset', 5);
            
    END IF;
END $$;
