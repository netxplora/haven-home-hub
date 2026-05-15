-- =========================================================================
-- VERDANT ESTATE - SEED EXPANSION V2
-- Adds 15-20 more realistic properties and investments.
-- Run this in your Supabase SQL Editor.
-- =========================================================================

DO $$
DECLARE
    lekki_id uuid;
    vi_id uuid;
    ikoyi_id uuid;
    abuja_id uuid;
    sarah_id uuid;
    david_id uuid;
    amina_id uuid;
    prop_id uuid;
BEGIN
    SELECT id INTO lekki_id FROM public.locations WHERE slug = 'lekki-phase-1' LIMIT 1;
    SELECT id INTO vi_id FROM public.locations WHERE slug = 'victoria-island' LIMIT 1;
    SELECT id INTO ikoyi_id FROM public.locations WHERE slug = 'ikoyi' LIMIT 1;
    SELECT id INTO abuja_id FROM public.locations WHERE slug = 'abuja-central' LIMIT 1;
    
    SELECT id INTO sarah_id FROM public.agents WHERE email = 'sarah@assetatlas.com' LIMIT 1;
    SELECT id INTO david_id FROM public.agents WHERE email = 'david@assetatlas.com' LIMIT 1;
    SELECT id INTO amina_id FROM public.agents WHERE email = 'amina@assetatlas.com' LIMIT 1;

    -- ==========================================
    -- BUY PROPERTIES (5)
    -- ==========================================
    IF ikoyi_id IS NOT NULL AND sarah_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'The Ikoyi Grand Mansion', 
            'ikoyi-grand-mansion', 
            'Experience unparalleled luxury in this 6-bedroom architectural masterpiece located in the exclusive enclaves of Ikoyi. Boasting double-height ceilings, a private cinema, a wine cellar, and smart home integration. The lush outdoor area includes an infinity pool overlooking the lagoon.', 
            3500000, 
            'USD', 
            'buy', 
            'available', 
            ikoyi_id, 
            'Bourdillon Road, Ikoyi', 
            6, 7, 1200.00, 
            '["Infinity Pool", "Private Cinema", "Wine Cellar", "Smart Home", "Lagoon View", "Staff Quarters"]'::jsonb, 
            sarah_id, 
            true, 
            'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;

        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Luxury Waterfront Villa', 
            'luxury-waterfront-villa-ikoyi', 
            'A spectacular 5-bedroom waterfront villa featuring contemporary design and state-of-the-art finishes. Offers direct water access, a private dock, and stunning sunset views. Includes a modern chef''s kitchen and expansive terrace.', 
            2800000, 
            'USD', 
            'buy', 
            'available', 
            ikoyi_id, 
            'Banana Island, Ikoyi', 
            5, 6, 950.00, 
            '["Private Dock", "Waterfront", "Chef''s Kitchen", "Elevator", "Rooftop Terrace"]'::jsonb, 
            sarah_id, 
            false, 
            'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;
    END IF;

    IF lekki_id IS NOT NULL AND david_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Modern Smart Duplex', 
            'modern-smart-duplex-lekki', 
            'A beautifully finished 4-bedroom fully detached duplex in a secure gated estate. Designed with modern families in mind, it features spacious living areas, a fully fitted kitchen, and integrated security systems.', 
            450000, 
            'USD', 
            'buy', 
            'available', 
            lekki_id, 
            'Chevron Drive, Lekki Phase 1', 
            4, 5, 400.00, 
            '["Gated Estate", "Fitted Kitchen", "CCTV", "Ample Parking"]'::jsonb, 
            david_id, 
            true, 
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;
    END IF;

    IF abuja_id IS NOT NULL AND amina_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Maitama Diplomatic Residence', 
            'maitama-diplomatic-residence', 
            'Exquisite 7-bedroom mansion situated in the prestigious Maitama district. Ideal for diplomatic missions or high-net-worth individuals, featuring bulletproof doors, expansive grounds, and premium imported marble floors.', 
            5000000, 
            'USD', 
            'buy', 
            'available', 
            abuja_id, 
            'Maitama District, Abuja', 
            7, 8, 1500.00, 
            '["Bulletproof Security", "Marble Floors", "Expansive Gardens", "Diplomatic Zone"]'::jsonb, 
            amina_id, 
            true, 
            'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;

        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Asokoro Executive Home', 
            'asokoro-executive-home', 
            'A premium 5-bedroom home in Asokoro with excellent views of the city. Features high ceilings, multiple living rooms, and a dedicated home office. Perfect for the modern executive.', 
            2200000, 
            'USD', 
            'buy', 
            'available', 
            abuja_id, 
            'Asokoro, Abuja', 
            5, 6, 850.00, 
            '["Home Office", "City Views", "High Ceilings", "Secure Compound"]'::jsonb, 
            amina_id, 
            false, 
            'https://images.unsplash.com/photo-1600566753086-00f18efc204a?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;
    END IF;

    -- ==========================================
    -- RENT PROPERTIES (5)
    -- ==========================================
    IF vi_id IS NOT NULL AND david_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Corporate HQ Tower Floor', 
            'corporate-hq-tower-floor', 
            'Lease an entire floor of this premium Grade A commercial building in Victoria Island. Offers panoramic ocean views, high-speed elevators, and a flexible open-plan layout ready for custom fit-out.', 
            150000, 
            'USD', 
            'rent', 
            'available', 
            vi_id, 
            'Ahmadu Bello Way, Victoria Island', 
            0, 6, 1200.00, 
            '["Grade A Commercial", "Ocean View", "High-speed Elevators", "24/7 Power"]'::jsonb, 
            david_id, 
            true, 
            'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;

        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'VI Boutique Retail Space', 
            'vi-boutique-retail-space', 
            'Prime ground-floor retail space on a high-traffic street. Perfect for luxury boutiques or premium showrooms. Includes floor-to-ceiling glass frontage and dedicated customer parking.', 
            80000, 
            'USD', 
            'rent', 
            'available', 
            vi_id, 
            'Adeola Odeku, Victoria Island', 
            0, 2, 250.00, 
            '["Glass Frontage", "High Traffic", "Customer Parking", "Premium Retail"]'::jsonb, 
            david_id, 
            false, 
            'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;
    END IF;

    IF lekki_id IS NOT NULL AND sarah_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Lekki Luxury Apartment', 
            'lekki-luxury-apartment', 
            'A fully serviced 3-bedroom luxury apartment with modern contemporary furnishings. Residents enjoy access to a communal pool, fitness center, and 24-hour concierge service.', 
            35000, 
            'USD', 
            'rent', 
            'available', 
            lekki_id, 
            'Admiralty Way, Lekki Phase 1', 
            3, 3, 200.00, 
            '["Serviced Apartment", "Communal Pool", "Fitness Center", "Concierge"]'::jsonb, 
            sarah_id, 
            true, 
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;
    END IF;

    IF abuja_id IS NOT NULL AND amina_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Wuse 2 Co-Working Hub', 
            'wuse-2-coworking-hub', 
            'A vibrant and fully furnished co-working space offering private offices, dedicated desks, and modern conference rooms. Ideal for startups and growing enterprises.', 
            12000, 
            'USD', 
            'rent', 
            'available', 
            abuja_id, 
            'Wuse 2, Abuja', 
            0, 4, 300.00, 
            '["Furnished Offices", "High-speed Internet", "Conference Rooms", "Cafeteria"]'::jsonb, 
            amina_id, 
            false, 
            'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;

        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Garki Residential Flat', 
            'garki-residential-flat', 
            'Comfortable 2-bedroom flat in a quiet residential area of Garki. Features a fitted kitchen, backup power generator, and close proximity to central business areas.', 
            15000, 
            'USD', 
            'rent', 
            'available', 
            abuja_id, 
            'Garki, Abuja', 
            2, 2, 120.00, 
            '["Fitted Kitchen", "Backup Power", "Quiet Neighborhood", "Central Location"]'::jsonb, 
            amina_id, 
            false, 
            'https://images.unsplash.com/photo-1502672260266-1c1de2d93688?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;
    END IF;

    -- ==========================================
    -- LAND PROPERTIES (5)
    -- ==========================================
    IF lekki_id IS NOT NULL AND david_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Ibeju-Lekki Commercial Plot', 
            'ibeju-lekki-commercial-plot', 
            'Prime commercial plot located along the major express road in Ibeju-Lekki. Perfect for a shopping mall, hospital, or corporate complex. High ROI potential.', 
            500000, 
            'USD', 
            'land', 
            'available', 
            lekki_id, 
            'Lekki-Epe Expressway, Ibeju-Lekki', 
            0, 0, 2000.00, 
            '["Commercial Zoning", "Expressway Facing", "High ROI", "Fenced"]'::jsonb, 
            david_id, 
            true, 
            'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;

        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Epe Residential Estate Land', 
            'epe-residential-estate-land', 
            'A full acre of dry land within a developing residential estate in Epe. Comes with global C of O and approved estate layout plans.', 
            150000, 
            'USD', 
            'land', 
            'available', 
            lekki_id, 
            'Epe, Lagos', 
            0, 0, 4000.00, 
            '["Residential Zoning", "C of O", "Estate Layout", "Dry Land"]'::jsonb, 
            david_id, 
            false, 
            'https://images.unsplash.com/photo-1524813686514-a57563d77965?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;
    END IF;

    IF abuja_id IS NOT NULL AND amina_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Guzape Hilltop Plot', 
            'guzape-hilltop-plot', 
            'An exclusive hilltop plot in Guzape offering breathtaking panoramic views of the entire Abuja city. Ideal for building a luxury custom villa.', 
            850000, 
            'USD', 
            'land', 
            'available', 
            abuja_id, 
            'Guzape, Abuja', 
            0, 0, 1500.00, 
            '["Hilltop View", "Luxury Zoning", "Exclusive Area", "City Views"]'::jsonb, 
            amina_id, 
            true, 
            'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;

        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Kuje Agricultural Land', 
            'kuje-agricultural-land', 
            '5 hectares of fertile agricultural land in Kuje. Features access to a natural stream, making it perfect for mechanized farming or a large-scale poultry project.', 
            200000, 
            'USD', 
            'land', 
            'available', 
            abuja_id, 
            'Kuje, Abuja', 
            0, 0, 50000.00, 
            '["Agricultural Zoning", "Fertile Soil", "Water Access", "Large Acreage"]'::jsonb, 
            amina_id, 
            false, 
            'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;
    END IF;

    IF ikoyi_id IS NOT NULL AND sarah_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Banana Island Waterfront Plot', 
            'banana-island-waterfront-plot', 
            'Rare waterfront plot available in the prestigious Banana Island. Complete with structural approvals and sand-filled, ready for immediate development.', 
            4000000, 
            'USD', 
            'land', 
            'available', 
            ikoyi_id, 
            'Banana Island, Ikoyi', 
            0, 0, 1000.00, 
            '["Waterfront", "Prestige Location", "Sand-filled", "Ready to Build"]'::jsonb, 
            sarah_id, 
            true, 
            'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;
    END IF;

    -- ==========================================
    -- INVESTMENT OPPORTUNITIES (5)
    -- ==========================================
    INSERT INTO public.investment_properties (
        title, slug, description, location, property_type, cover_image_url,
        total_value, unit_price, total_units, units_sold, min_investment,
        projected_return_min, projected_return_max, estimated_rental_yield,
        distribution_frequency, holding_period_months, status, featured
    ) VALUES (
        'The Zenith Logistics Hub',
        'zenith-logistics-hub-v2',
        'Invest in a premium logistics and warehousing facility near the Lekki Deep Sea Port. Backed by long-term corporate leases ensuring consistent quarterly yields.',
        'Lekki Free Trade Zone, Lagos',
        'commercial',
        'https://images.unsplash.com/photo-1586528116311-ad8ed7c15694?w=1200&q=80',
        10000000, 10000, 1000, 200, 10000,
        15.0, 22.0, 12.0,
        'quarterly', 60, 'open', true
    ) ON CONFLICT (slug) DO NOTHING;

    INSERT INTO public.investment_properties (
        title, slug, description, location, property_type, cover_image_url,
        total_value, unit_price, total_units, units_sold, min_investment,
        projected_return_min, projected_return_max, estimated_rental_yield,
        distribution_frequency, holding_period_months, status, featured
    ) VALUES (
        'Aurora Tech Campus',
        'aurora-tech-campus',
        'Fractional ownership in a modern tech campus located in Yaba. Designed to house leading African startups with high occupancy rates and premium rental income.',
        'Yaba, Lagos',
        'commercial',
        'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&q=80',
        4000000, 4000, 1000, 600, 4000,
        18.0, 25.0, 14.0,
        'semi_annual', 48, 'open', true
    ) ON CONFLICT (slug) DO NOTHING;

    INSERT INTO public.investment_properties (
        title, slug, description, location, property_type, cover_image_url,
        total_value, unit_price, total_units, units_sold, min_investment,
        projected_return_min, projected_return_max, estimated_rental_yield,
        distribution_frequency, holding_period_months, status, featured
    ) VALUES (
        'Abuja Student Housing Project',
        'abuja-student-housing',
        'A high-yield development project creating premium student accommodation near major universities in Abuja. Offers substantial capital appreciation upon completion.',
        'Gwarinpa, Abuja',
        'residential',
        'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200&q=80',
        3000000, 3000, 1000, 850, 3000,
        22.0, 30.0, 0.0,
        'annual', 36, 'open', false
    ) ON CONFLICT (slug) DO NOTHING;

    INSERT INTO public.investment_properties (
        title, slug, description, location, property_type, cover_image_url,
        total_value, unit_price, total_units, units_sold, min_investment,
        projected_return_min, projected_return_max, estimated_rental_yield,
        distribution_frequency, holding_period_months, status, featured
    ) VALUES (
        'The Azure Hospitality Fund',
        'azure-hospitality-fund',
        'Invest in a portfolio of luxury short-let apartments across Victoria Island and Ikoyi. Benefit from the booming short-term rental market with monthly dividend distributions.',
        'Victoria Island & Ikoyi',
        'residential',
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
        5000000, 5000, 1000, 400, 5000,
        16.0, 24.0, 15.0,
        'monthly', 60, 'open', true
    ) ON CONFLICT (slug) DO NOTHING;

    INSERT INTO public.investment_properties (
        title, slug, description, location, property_type, cover_image_url,
        total_value, unit_price, total_units, units_sold, min_investment,
        projected_return_min, projected_return_max, estimated_rental_yield,
        distribution_frequency, holding_period_months, status, featured
    ) VALUES (
        'Victoria Island Mixed-Use Tower',
        'vi-mixed-use-tower',
        'An ambitious project combining retail, office, and residential spaces in a single iconic high-rise. Early investors benefit from significant discounts to the completed value.',
        'Victoria Island, Lagos',
        'commercial',
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80',
        20000000, 20000, 1000, 100, 20000,
        25.0, 40.0, 10.0,
        'annual', 72, 'open', false
    ) ON CONFLICT (slug) DO NOTHING;

END $$;
