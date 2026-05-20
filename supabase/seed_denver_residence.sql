-- =========================================================================
-- DENVER CUL-DE-SAC RESIDENCE - 3272 S WABASH CT
-- Extracted from Redfin/Zillow listing for platform seeding.
-- =========================================================================

DO $$
DECLARE
    denver_id uuid;
    sarah_id uuid;
    v_property_id uuid;
BEGIN
    -- 1. Ensure Denver location exists
    INSERT INTO public.locations (name, slug, image_url, featured)
    VALUES ('Denver, CO', 'denver-co', '/property_denver_wabash_cover.png', true)
    ON CONFLICT (slug) DO UPDATE SET featured = true
    RETURNING id INTO denver_id;

    -- 2. Get Agent ID (Sarah Collins)
    SELECT id INTO sarah_id FROM public.agents WHERE email = 'sarah@assetatlas.com' LIMIT 1;

    -- 3. Insert Property
    INSERT INTO public.properties (
        title, 
        slug, 
        description, 
        price, 
        currency, 
        property_type, 
        status, 
        location_id, 
        address, 
        bedrooms, 
        bathrooms, 
        parking_spaces, 
        size_sqm, 
        year_built, 
        internal_id, 
        inspection_availability,
        features, 
        agent_id, 
        featured, 
        cover_image_url,
        nearby_pois
    ) VALUES (
        'The Wabash Court Residence', 
        '3272-s-wabash-ct-denver', 
        'Nestled at the end of a tranquil cul-de-sac near the Highline Canal, this meticulously renovated tri-level residence offers the perfect blend of mid-century charm and contemporary luxury. \n\nThe heart of the home is a stunning open-concept kitchen featuring an expansive quartz island, professional-grade stainless steel appliances, and a large western-facing bay window that bathes the space in natural light. The primary suite serves as a private sanctuary with a fully remodeled en-suite bath, dual vanities, and a designer walk-in shower.\n\nOutdoor living is elevated with a private deck and patio, a charming greenhouse, and a lush garden area. Significant structural updates include a new roof and sewer line installed in 2026, ensuring peace of mind for years to come. The unfinished basement provides a versatile canvas for a home office, workshop, or additional living space.',
        715000, 
        'USD', 
        'buy', 
        'available', 
        denver_id, 
        '3272 S Wabash Ct, Denver, CO 80231', 
        4, 
        3, 
        2, 
        262.35, 
        1965, 
        'PROP-DEN-3272', 
        'Available for private tours Monday-Saturday. Contact Sarah Collins for appointment details.',
        '["Renovated Open Kitchen", "Quartz Island", "Bay Window", "Primary Suite", "Remodeled En-suite", "Private Deck", "Greenhouse", "Garden Area", "Cul-de-sac Location", "Near Highline Canal", "New Roof (2026)", "New Sewer Line (2026)", "2-Car Attached Garage", "Hardwood Floors", "Unfinished Basement"]'::jsonb, 
        sarah_id, 
        true, 
        '/property_denver_wabash_cover.png',
        '[
            {"name": "Highline Canal Trail", "type": "Recreation", "distance": "0.2 miles"},
            {"name": "Hamilton Middle School", "type": "Education", "distance": "0.8 miles"},
            {"name": "Kennedy Golf Course", "type": "Recreation", "distance": "1.5 miles"},
            {"name": "Whole Foods Market", "type": "Shopping", "distance": "2.1 miles"}
        ]'::jsonb
    ) ON CONFLICT (slug) 
    DO UPDATE SET 
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        features = EXCLUDED.features,
        nearby_pois = EXCLUDED.nearby_pois,
        internal_id = EXCLUDED.internal_id,
        inspection_availability = EXCLUDED.inspection_availability,
        cover_image_url = EXCLUDED.cover_image_url
    RETURNING id INTO v_property_id;

    -- 4. Insert Gallery Images
    -- Clear old images if updating
    DELETE FROM public.property_images WHERE property_id = v_property_id;
    
    INSERT INTO public.property_images (property_id, url, alt_text, sort_order)
    VALUES 
        (v_property_id, '/property_denver_wabash_cover.png', 'Wabash Court Residence Exterior', 0),
        (v_property_id, '/property_denver_wabash_kitchen.png', 'Modern Renovated Kitchen with Quartz Island', 1),
        (v_property_id, '/property_denver_wabash_bathroom.png', 'Designer Primary En-suite Bathroom', 2);

            
END $$;
