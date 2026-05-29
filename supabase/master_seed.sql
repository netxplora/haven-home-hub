-- =========================================================================
-- ASSET ATLAS - PRODUCTION SEED EXPANSION SCRIPT
-- Run this in your Supabase SQL Editor to populate realistic listings.
-- =========================================================================

-- 1. Insert Premium Locations
INSERT INTO public.locations (name, slug, image_url, featured)
VALUES
('Manhattan Phase 1', 'manhattan-phase-1', 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80', true),
('Silicon Valley', 'silicon-valley', 'https://images.unsplash.com/photo-1496309732348-3627f3f040ee?w=800&q=80', true),
('Beverly Hills', 'beverly-hills', 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80', true),
('Austin Central', 'austin-central', 'https://images.unsplash.com/photo-1542361345-89e58247f2d5?w=800&q=80', false)
ON CONFLICT (slug) DO NOTHING;

-- 2. Create Dummy Agents (No auth mapping needed for display purposes if user_id is null)
INSERT INTO public.agents (full_name, email, phone, whatsapp, bio, role_title, featured, photo_url)
VALUES
('Sarah Collins', 'sarah@assetatlas.com', '+12125551234', '+12125551234', 'Specializing in luxury waterfront properties across Silicon Valley and Beverly Hills.', 'Senior Luxury Consultant', true, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80'),
('David Osei', 'david@assetatlas.com', '+12125552345', '+12125552345', 'Expert in high-yield commercial real estate and fractional investments.', 'Investment Director', true, 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80'),
('Amina Bello', 'amina@assetatlas.com', '+15125553456', '+15125553456', 'Your guide to prime residential estates in the heart of Austin.', 'Estate Executive', false, 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&q=80')
ON CONFLICT DO NOTHING;

-- 3. Insert Standard Properties
-- Fetch IDs for relationship mapping
DO $$
DECLARE
    manhattan_id uuid;
    sv_id uuid;
    sarah_id uuid;
    david_id uuid;
    prop1_id uuid;
    prop2_id uuid;
BEGIN
    SELECT id INTO manhattan_id FROM public.locations WHERE slug = 'manhattan-phase-1' LIMIT 1;
    SELECT id INTO sv_id FROM public.locations WHERE slug = 'silicon-valley' LIMIT 1;
    SELECT id INTO sarah_id FROM public.agents WHERE email = 'sarah@assetatlas.com' LIMIT 1;
    SELECT id INTO david_id FROM public.agents WHERE email = 'david@assetatlas.com' LIMIT 1;

    IF manhattan_id IS NOT NULL AND sarah_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'The Emerald Penthouse', 
            'the-emerald-penthouse-manhattan', 
            'A magnificent 4-bedroom penthouse offering panoramic views of the Manhattan peninsula. Features include a private elevator, infinity pool, and smart home automation.', 
            850000, 
            'USD', 
            'buy', 
            'available', 
            manhattan_id, 
            '14 Admiralty Way, Manhattan Phase 1', 
            4, 5, 450.00, 
            '["Private Pool", "Smart Home", "24/7 Security", "Gym", "Ocean View"]'::jsonb, 
            sarah_id, 
            true, 
            'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80'
        ) RETURNING id INTO prop1_id;

        INSERT INTO public.property_images (property_id, url, sort_order, is_cover) VALUES 
        (prop1_id, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80', 0, true),
        (prop1_id, 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80', 1, false);
    END IF;

    IF sv_id IS NOT NULL AND david_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Victoria Tech Hub Office Space', 
            'sv-tech-hub-office', 
            'Premium commercial office space located in the central business district. Open floor plan with soundproof meeting pods.', 
            120000, 
            'USD', 
            'rent', 
            'available', 
            sv_id, 
            '100 University Ave St, Silicon Valley', 
            0, 4, 800.00, 
            '["High-speed Fiber", "Conference Rooms", "Cafeteria", "Basement Parking"]'::jsonb, 
            david_id, 
            false, 
            'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80'
        ) RETURNING id INTO prop2_id;

        INSERT INTO public.property_images (property_id, url, sort_order, is_cover) VALUES 
        (prop2_id, 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80', 0, true);
    END IF;

    -- 4. Insert Investment Opportunities
    INSERT INTO public.investment_properties (
        title, slug, description, location, property_type, cover_image_url, 
        total_value, unit_price, total_units, units_sold, min_investment, 
        projected_return_min, projected_return_max, estimated_rental_yield, 
        distribution_frequency, holding_period_months, status, featured
    ) VALUES (
        'The Apex Tower Co-Ownership', 
        'apex-tower-fractional', 
        'Co-own a premium multi-tenant residential high-rise. Fully managed and vetted for maximum rental yield and capital appreciation.', 
        'Beverly Hills, CA', 
        'residential', 
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80',
        5000000, 5000, 1000, 450, 5000, 
        12.5, 15.0, 8.5, 
        'quarterly', 48, 'open', true
    ),
    (
        'Eko Mall Retail Expansion', 
        'eko-mall-retail-fund', 
        'Invest in the expansion phase of one of the highest foot-traffic retail centers in the city. Anchor tenants already secured.', 
        'Silicon Valley, CA', 
        'commercial', 
        'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=1200&q=80',
        2500000, 2500, 1000, 800, 2500, 
        14.0, 18.0, 10.0, 
        'semi_annual', 60, 'open', true
    ),
    (
        'Green Acres Land Bank', 
        'green-acres-land-bank', 
        'A secure land banking opportunity in the rapidly developing Downtown Manhattan axis. Hold for pure capital appreciation.', 
        'Manhattan, NY', 
        'land', 
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80',
        1000000, 1000, 1000, 200, 1000, 
        20.0, 35.0, 0, 
        'annual', 36, 'open', false
    ) ON CONFLICT DO NOTHING;

END $$;
-- =========================================================================
-- VERDANT ESTATE - SEED EXPANSION V2
-- Adds 15-20 more realistic properties and investments.
-- Run this in your Supabase SQL Editor.
-- =========================================================================

DO $$
DECLARE
    manhattan_id uuid;
    sv_id uuid;
    beverly_hills_id uuid;
    austin_id uuid;
    sarah_id uuid;
    david_id uuid;
    amina_id uuid;
    prop_id uuid;
BEGIN
    SELECT id INTO manhattan_id FROM public.locations WHERE slug = 'manhattan-phase-1' LIMIT 1;
    SELECT id INTO sv_id FROM public.locations WHERE slug = 'silicon-valley' LIMIT 1;
    SELECT id INTO beverly_hills_id FROM public.locations WHERE slug = 'beverly-hills' LIMIT 1;
    SELECT id INTO austin_id FROM public.locations WHERE slug = 'austin-central' LIMIT 1;
    
    SELECT id INTO sarah_id FROM public.agents WHERE email = 'sarah@assetatlas.com' LIMIT 1;
    SELECT id INTO david_id FROM public.agents WHERE email = 'david@assetatlas.com' LIMIT 1;
    SELECT id INTO amina_id FROM public.agents WHERE email = 'amina@assetatlas.com' LIMIT 1;

    -- ==========================================
    -- BUY PROPERTIES (5)
    -- ==========================================
    IF beverly_hills_id IS NOT NULL AND sarah_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'The Beverly Hills Grand Mansion', 
            'beverly-hills-grand-mansion', 
            'Experience unparalleled luxury in this 6-bedroom architectural masterpiece located in the exclusive enclaves of Beverly Hills. Boasting double-height ceilings, a private cinema, a wine cellar, and smart home integration. The lush outdoor area includes an infinity pool overlooking the lagoon.', 
            3500000, 
            'USD', 
            'buy', 
            'available', 
            beverly_hills_id, 
            'Bourdillon Road, Beverly Hills', 
            6, 7, 1200.00, 
            '["Infinity Pool", "Private Cinema", "Wine Cellar", "Smart Home", "Lake View", "Guest Suite"]'::jsonb, 
            sarah_id, 
            true, 
            'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;

        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Luxury Waterfront Villa', 
            'luxury-waterfront-villa-beverly-hills', 
            'A spectacular 5-bedroom waterfront villa featuring contemporary design and state-of-the-art finishes. Offers direct water access, a private dock, and stunning sunset views. Includes a modern chef''s kitchen and expansive terrace.', 
            2800000, 
            'USD', 
            'buy', 
            'available', 
            beverly_hills_id, 
            'Bel Air, Beverly Hills', 
            5, 6, 950.00, 
            '["Private Dock", "Waterfront", "Chef''s Kitchen", "Elevator", "Rooftop Terrace"]'::jsonb, 
            sarah_id, 
            false, 
            'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;
    END IF;

    IF manhattan_id IS NOT NULL AND david_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Modern Smart Duplex', 
            'modern-smart-duplex-manhattan', 
            'A beautifully finished 4-bedroom fully detached duplex in a secure gated estate. Designed with modern families in mind, it features spacious living areas, a fully fitted kitchen, and integrated security systems.', 
            450000, 
            'USD', 
            'buy', 
            'available', 
            manhattan_id, 
            'Chevron Drive, Manhattan Phase 1', 
            4, 5, 400.00, 
            '["Gated Estate", "Fitted Kitchen", "CCTV", "Ample Parking"]'::jsonb, 
            david_id, 
            true, 
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;
    END IF;

    IF austin_id IS NOT NULL AND amina_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Highland Park Executive Residence', 
            'highland-park-executive-residence', 
            'Exquisite 7-bedroom mansion situated in the prestigious Highland Park district. Ideal for executives or high-net-worth individuals, featuring reinforced security, expansive grounds, and premium imported marble floors.', 
            5000000, 
            'USD', 
            'buy', 
            'available', 
            austin_id, 
            'Highland Park, Austin', 
            7, 8, 1500.00, 
            '["Gated Security", "Marble Floors", "Expansive Gardens", "Private Estate"]'::jsonb, 
            amina_id, 
            true, 
            'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;

        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Westlake Hills Executive Home', 
            'westlake-hills-executive-home', 
            'A premium 5-bedroom home in Westlake Hills with excellent views of the city. Features high ceilings, multiple living rooms, and a dedicated home office. Perfect for the modern executive.', 
            2200000, 
            'USD', 
            'buy', 
            'available', 
            austin_id, 
            'Westlake Hills, Austin', 
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
    IF sv_id IS NOT NULL AND david_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Corporate HQ Tower Floor', 
            'corporate-hq-tower-floor', 
            'Lease an entire floor of this premium Grade A commercial building in Silicon Valley. Offers panoramic ocean views, high-speed elevators, and a flexible open-plan layout ready for custom fit-out.', 
            150000, 
            'USD', 
            'rent', 
            'available', 
            sv_id, 
            'Sand Hill Road, Silicon Valley', 
            0, 6, 1200.00, 
            '["Grade A Commercial", "Ocean View", "High-speed Elevators", "Solar Powered"]'::jsonb, 
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
            sv_id, 
            'University Ave, Silicon Valley', 
            0, 2, 250.00, 
            '["Glass Frontage", "High Traffic", "Customer Parking", "Premium Retail"]'::jsonb, 
            david_id, 
            false, 
            'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;
    END IF;

    IF manhattan_id IS NOT NULL AND sarah_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Manhattan Luxury Apartment', 
            'manhattan-luxury-apartment', 
            'A fully serviced 3-bedroom luxury apartment with modern contemporary furnishings. Residents enjoy access to a communal pool, fitness center, and 24-hour concierge service.', 
            35000, 
            'USD', 
            'rent', 
            'available', 
            manhattan_id, 
            'Admiralty Way, Manhattan Phase 1', 
            3, 3, 200.00, 
            '["Serviced Apartment", "Communal Pool", "Fitness Center", "Concierge"]'::jsonb, 
            sarah_id, 
            true, 
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;
    END IF;

    IF austin_id IS NOT NULL AND amina_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Downtown Austin Co-Working Hub', 
            'downtown-austin-coworking-hub', 
            'A vibrant and fully furnished co-working space offering private offices, dedicated desks, and modern conference rooms. Ideal for startups and growing enterprises.', 
            12000, 
            'USD', 
            'rent', 
            'available', 
            austin_id, 
            'Downtown, Austin', 
            0, 4, 300.00, 
            '["Furnished Offices", "High-speed Internet", "Conference Rooms", "Cafeteria"]'::jsonb, 
            amina_id, 
            false, 
            'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;

        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Downtown Austin Residential Flat', 
            'downtown-austin-residential-flat', 
            'Comfortable 2-bedroom flat in a quiet residential area of Downtown Austin. Features a modern kitchen, energy-efficient appliances, and close proximity to central business areas.', 
            15000, 
            'USD', 
            'rent', 
            'available', 
            austin_id, 
            'Downtown Austin, Austin', 
            2, 2, 120.00, 
            '["Modern Kitchen", "Energy Efficient", "Quiet Neighborhood", "Central Location"]'::jsonb, 
            amina_id, 
            false, 
            'https://images.unsplash.com/photo-1502672260266-1c1de2d93688?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;
    END IF;

    -- ==========================================
    -- LAND PROPERTIES (5)
    -- ==========================================
    IF manhattan_id IS NOT NULL AND david_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Downtown Manhattan Commercial Plot', 
            'downtown-manhattan-commercial-plot', 
            'Prime commercial plot located along the major express road in Downtown Manhattan. Perfect for a shopping mall, hospital, or corporate complex. High ROI potential.', 
            500000, 
            'USD', 
            'land', 
            'available', 
            manhattan_id, 
            'Pacific Coast Highway, Downtown Manhattan', 
            0, 0, 2000.00, 
            '["Commercial Zoning", "Expressway Facing", "High ROI", "Fenced"]'::jsonb, 
            david_id, 
            true, 
            'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;

        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Hamptons Residential Estate Land', 
            'hamptons-residential-estate-land', 
            'A full acre of dry land within a developing residential estate in Texas. Comes with clear Title Insurance and approved estate layout plans.', 
            150000, 
            'USD', 
            'land', 
            'available', 
            manhattan_id, 
            'The Hamptons, NY', 
            0, 0, 4000.00, 
            '["Residential Zoning", "Title Insurance", "Estate Layout", "Dry Land"]'::jsonb, 
            david_id, 
            false, 
            'https://images.unsplash.com/photo-1524813686514-a57563d77965?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;
    END IF;

    IF austin_id IS NOT NULL AND amina_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Lake Travis Hilltop Plot', 
            'lake-travis-hilltop-plot', 
            'An exclusive hilltop plot near Lake Travis offering breathtaking panoramic views of the entire Austin area. Ideal for building a luxury custom villa.', 
            850000, 
            'USD', 
            'land', 
            'available', 
            austin_id, 
            'Lake Travis, Austin', 
            0, 0, 1500.00, 
            '["Hilltop View", "Luxury Zoning", "Exclusive Area", "City Views"]'::jsonb, 
            amina_id, 
            true, 
            'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;

        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Hill Country Ranch Land', 
            'hill-country-ranch-land', 
            '5 hectares of fertile land in the Texas Hill Country. Features access to a natural creek, making it perfect for ranching or a large-scale agricultural project.', 
            200000, 
            'USD', 
            'land', 
            'available', 
            austin_id, 
            'Hill Country, Austin', 
            0, 0, 50000.00, 
            '["Agricultural Zoning", "Fertile Soil", "Water Access", "Large Acreage"]'::jsonb, 
            amina_id, 
            false, 
            'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80'
        ) ON CONFLICT (slug) DO NOTHING;
    END IF;

    IF beverly_hills_id IS NOT NULL AND sarah_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES (
            'Bel Air Waterfront Plot', 
            'bel-air-waterfront-plot', 
            'Rare waterfront plot available in the prestigious Bel Air. Complete with structural approvals and graded, ready for immediate development.', 
            4000000, 
            'USD', 
            'land', 
            'available', 
            beverly_hills_id, 
            'Bel Air, Beverly Hills', 
            0, 0, 1000.00, 
            '["Waterfront", "Prestige Location", "Graded Lot", "Ready to Build"]'::jsonb, 
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
        'Invest in a premium logistics and warehousing facility near the Manhattan Deep Sea Port. Backed by long-term corporate leases ensuring consistent quarterly yields.',
        'Financial District, NY',
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
        'Fractional ownership in a modern tech campus located in Cambridge, MA. Designed to house leading American startups with high occupancy rates and premium rental income.',
        'Cambridge, MA',
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
        'Austin Student Housing Project',
        'austin-student-housing',
        'A high-yield development project creating premium student accommodation near major universities in Austin. Offers substantial capital appreciation upon completion.',
        'University District, Austin',
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
        'Invest in a portfolio of luxury short-let apartments across Silicon Valley and Beverly Hills. Benefit from the booming short-term rental market with monthly dividend distributions.',
        'Silicon Valley & Beverly Hills',
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
        'Silicon Valley Mixed-Use Tower',
        'vi-mixed-use-tower',
        'An ambitious project combining retail, office, and residential spaces in a single iconic high-rise. Early investors benefit from significant discounts to the completed value.',
        'Silicon Valley, CA',
        'commercial',
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80',
        20000000, 20000, 1000, 100, 20000,
        25.0, 40.0, 10.0,
        'annual', 72, 'open', false
    ) ON CONFLICT (slug) DO NOTHING;

END $$;
-- =========================================================================
-- VERDANT ESTATE - CMS TABLES + BLOG SEED DATA
-- Creates the blog_categories and blog_posts tables (if they don't exist),
-- sets up RLS policies, then populates with initial content.
-- Safe to run multiple times.
-- =========================================================================

-- ==========================================
-- STEP 1: CREATE TABLES
-- ==========================================
CREATE TABLE IF NOT EXISTS public.blog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT,
    excerpt TEXT,
    cover_image_url TEXT,
    category_id UUID REFERENCES public.blog_categories(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    author_id UUID REFERENCES public.profiles(id),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- STEP 2: ENABLE RLS
-- ==========================================
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- STEP 3: RLS POLICIES (safe re-run with DO block)
-- ==========================================
DO $$ BEGIN
  -- blog_categories policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_categories' AND policyname = 'Categories are viewable by everyone.') THEN
    CREATE POLICY "Categories are viewable by everyone." ON public.blog_categories FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_categories' AND policyname = 'Categories are insertable by admins.') THEN
    CREATE POLICY "Categories are insertable by admins." ON public.blog_categories FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_categories' AND policyname = 'Categories are updatable by admins.') THEN
    CREATE POLICY "Categories are updatable by admins." ON public.blog_categories FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_categories' AND policyname = 'Categories are deletable by admins.') THEN
    CREATE POLICY "Categories are deletable by admins." ON public.blog_categories FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  -- blog_posts policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'Published posts are viewable by everyone.') THEN
    CREATE POLICY "Published posts are viewable by everyone." ON public.blog_posts FOR SELECT USING (status = 'published');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'Admins can view all posts.') THEN
    CREATE POLICY "Admins can view all posts." ON public.blog_posts FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'Authors can view their own posts.') THEN
    CREATE POLICY "Authors can view their own posts." ON public.blog_posts FOR SELECT USING (auth.uid() = author_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'Admins can insert posts.') THEN
    CREATE POLICY "Admins can insert posts." ON public.blog_posts FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'Admins can update posts.') THEN
    CREATE POLICY "Admins can update posts." ON public.blog_posts FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'Admins can delete posts.') THEN
    CREATE POLICY "Admins can delete posts." ON public.blog_posts FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- ==========================================
-- STEP 4: SEED DATA
-- ==========================================

-- Categories
INSERT INTO public.blog_categories (name, slug) VALUES
  ('Market Analysis', 'market-analysis'),
  ('Investment Guides', 'investment-guides'),
  ('Buying Tips', 'buying-tips'),
  ('Company News', 'company-news'),
  ('Property Management', 'property-management')
ON CONFLICT (slug) DO NOTHING;

-- Posts
DO $$
DECLARE
    cat_market uuid;
    cat_invest uuid;
    cat_buying uuid;
    cat_news uuid;
    cat_mgmt uuid;
BEGIN
    SELECT id INTO cat_market FROM public.blog_categories WHERE slug = 'market-analysis' LIMIT 1;
    SELECT id INTO cat_invest FROM public.blog_categories WHERE slug = 'investment-guides' LIMIT 1;
    SELECT id INTO cat_buying FROM public.blog_categories WHERE slug = 'buying-tips' LIMIT 1;
    SELECT id INTO cat_news FROM public.blog_categories WHERE slug = 'company-news' LIMIT 1;
    SELECT id INTO cat_mgmt FROM public.blog_categories WHERE slug = 'property-management' LIMIT 1;

    -- Post 1
    INSERT INTO public.blog_posts (title, slug, excerpt, content, cover_image_url, category_id, status, published_at) VALUES (
        'New York Property Market: Q1 2026 Performance Review',
        'new-york-property-market-q1-2026',
        'A detailed look at how the New York property market performed in the first quarter of 2026, including pricing trends, transaction volumes, and forecasts for the rest of the year.',
        '## Overview

The first quarter of 2026 saw continued growth in the New York property market, driven by increased demand in the Manhattan corridor and sustained interest from diaspora buyers. Average property values rose by approximately 8% compared to Q4 2025.

## Key Highlights

- **Manhattan Phase 1** remains the most active market, with residential prices averaging $450,000 per square meter.
- **Silicon Valley** commercial space saw occupancy rates climb to 87%, the highest since 2019.
- **Beverly Hills** luxury segment held steady, with Bel Air properties maintaining their position as the highest-valued residential assets in North America.
- Land prices along the **Pacific Coast Highway** increased by 12% quarter-over-quarter, driven by infrastructure development near the deep sea port.

## Transaction Volume

Total verified transactions on the Verdant Estate platform reached 142 in Q1, representing a 34% increase from the same period last year. The average deal size was $380,000 for residential and $1.2M for commercial properties.

## Outlook

We expect continued momentum through Q2, particularly in the mid-market segment ($200K–$500K) where demand consistently outpaces supply. Investors should pay close attention to the Downtown Manhattan corridor, where the deep sea port development continues to drive land appreciation.

---

*Data sourced from Verdant Estate internal transaction records and indhamptonsndent valuation partners.*',
        'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
        cat_market,
        'published',
        NOW() - INTERVAL '3 days'
    ) ON CONFLICT (slug) DO NOTHING;

    -- Post 2
    INSERT INTO public.blog_posts (title, slug, excerpt, content, cover_image_url, category_id, status, published_at) VALUES (
        'How Fractional Real Estate Investment Works',
        'how-fractional-real-estate-investment-works',
        'A practical guide to understanding fractional ownership — how it works, what returns to expect, and how to get started with as little as $3,000.',
        '## What Is Fractional Ownership?

Fractional real estate investment allows multiple investors to co-own a single property. Instead of purchasing an entire building, you buy "units" that represent a proportional share of the asset and its income.

## How It Works on Verdant Estate

1. **Browse Opportunities** — Visit our investment listings to see available properties with details on location, type, projected returns, and unit pricing.
2. **Choose Your Investment** — Select a property and decide how many units you want to purchase. Each property has a minimum investment clearly stated.
3. **Make Payment** — Pay via bank transfer or cryptocurrency. Your units are allocated once payment is confirmed.
4. **Earn Returns** — Receive your share of rental income through scheduled distributions (monthly, quarterly, or semi-annually dhamptonsnding on the property).
5. **Track Everything** — Monitor your portfolio, view distribution history, and request withdrawals through your personal dashboard.

## What Returns Can You Expect?

Returns vary by property type and location. On our platform, projected annual returns typically range from **12% to 25%**, with rental yields between **8% and 15%**. These projections are based on actual market data and comparable rental income, but past performance does not guarantee future results.

## Risks to Consider

- Property values can decline due to market conditions
- Rental income may fluctuate with occupancy rates
- Early exit options may be limited during the holding period
- Currency fluctuations can affect USD-denominated returns

## Getting Started

Browse our current [investment opportunities](/invest/opportunities) to see what is available. If you have questions, contact our investment advisory team through the platform.

---

*This article is for informational purposes only and does not constitute financial advice.*',
        'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80',
        cat_invest,
        'published',
        NOW() - INTERVAL '7 days'
    ) ON CONFLICT (slug) DO NOTHING;

    -- Post 3
    INSERT INTO public.blog_posts (title, slug, excerpt, content, cover_image_url, category_id, status, published_at) VALUES (
        '7 Things to Check Before Buying Property in the United States',
        'things-to-check-before-buying-property-us',
        'Buying property in the United States requires careful due diligence. Here are 7 essential checks every buyer should complete before committing to a purchase.',
        '## 1. Verify the Title Document

The most important step is confirming the seller has a valid title. Acceptable documents include:

- **Title Insurance** — issued by a national underwriter
- **HOA Disclosures** — required for transfer of ownership
- **Closing Documents** — legal transfer documents between parties

Always engage a qualified lawyer to verify these documents indhamptonsndently.

## 2. Confirm the Survey Plan

Obtain a copy of the survey plan and cross-reference it with the state survey records. This confirms the exact boundaries and size of the land, and helps avoid purchasing land already allocated to someone else.

## 3. Conduct a Physical Inspection

Never buy property without visiting it. Check for:

- Structural condition (for buildings)
- Drainage and flood risk
- Road access and infrastructure
- Proximity to amenities

## 4. Research the Neighborhood

Talk to locals and existing residents. Understand the security situation, future development plans, and any known disputes in the area. At Verdant Estate, our agents provide this local context as part of every listing.

## 5. Check for Government Acquisition

Some lands in the United States have been compulsorily acquired by the government for public projects. Verify with the lands ministry that the property is not subject to acquisition notices.

## 6. Understand All Costs

Beyond the purchase price, budget for:

- Legal fees (typically 5-10% of property value)
- Agency commission
- Land registration fees
- Development levy (for new builds)
- Property taxes

## 7. Use a Reputable Agent

Work with licensed, verified agents who can guide you through the process. At Verdant Estate, every agent is a full-time employee with local expertise and accountability.

---

*Need help with your property search? [Browse our verified listings](/properties) or contact an agent directly.*',
        'https://images.unsplash.com/photo-1560520031-3a4dc4e9de0c?auto=format&fit=crop&w=1200&q=80',
        cat_buying,
        'published',
        NOW() - INTERVAL '14 days'
    ) ON CONFLICT (slug) DO NOTHING;

    -- Post 4
    INSERT INTO public.blog_posts (title, slug, excerpt, content, cover_image_url, category_id, status, published_at) VALUES (
        'Verdant Estate Expands to Austin and Miami',
        'verdant-estate-expands-austin-miami',
        'We are excited to announce that Verdant Estate now operates in Austin and Miami, with dedicated agents and verified listings in both cities.',
        '## Growing Where Our Clients Need Us

Since launching in New York, we have consistently heard from clients looking for the same quality of service in other major US cities. Today, we are pleased to confirm that Verdant Estate now has full operations in **Austin** and **Miami**.

## What This Means

- **Dedicated local agents** embedded in key neighborhoods in both cities
- **Verified property listings** across residential, commercial, and land categories
- **Investment opportunities** in high-growth areas like Austin, Miami, and Brooklyn

## Our Austin Coverage

Our Austin team covers:

- Austin and Miami (premium residential)
- Downtown and SoHo (commercial and mid-market)
- Williamsburg and Bed-Stuy (emerging residential)
- The Hamptons (luxury land)

## Our Miami Coverage

In Miami, we focus on:

- GRA Phase 1 and 2 (established residential)
- Trans-Amadi (commercial and industrial)
- Rukpokwu and Eliozu (affordable residential)

## Same Standards, New Markets

Every listing in Austin and Miami goes through the same verification process as our New York properties — physical inspection, title verification, indhamptonsndent valuation, and professional photography.

We look forward to serving you in these new markets.

---

*Browse properties in [Austin](/properties?location=austin-central) or contact our team for assistance.*',
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
        cat_news,
        'published',
        NOW() - INTERVAL '21 days'
    ) ON CONFLICT (slug) DO NOTHING;

    -- Post 5
    INSERT INTO public.blog_posts (title, slug, excerpt, content, cover_image_url, category_id, status, published_at) VALUES (
        'How to Maximize Rental Income from Your Property',
        'maximize-rental-income-property',
        'Practical strategies for property owners to increase rental returns through proper pricing, tenant screening, maintenance planning, and professional management.',
        '## Set the Right Price

Overpricing leads to vacancies, while underpricing leaves money on the table. Research comparable rentals in your area to find the right balance. At Verdant Estate, our agents provide market comparables for every listing to ensure accurate pricing.

## Invest in Quality Finishes

Properties with modern finishes consistently achieve higher rental rates. Key improvements that offer the best return:

- Fitted kitchen with good appliances
- Modern bathroom fixtures
- Reliable power backup (inverter/solar)
- Security features (CCTV, access control)
- Quality floor finishes

## Screen Tenants Carefully

A reliable tenant is worth more than a high rent from a problematic one. Verify:

- Employment and income stability
- Previous landlord references
- Identification documents
- Payment history

## Maintain the Property Proactively

Regular maintenance prevents expensive emergency repairs and keeps tenants satisfied. Create a maintenance schedule covering:

- Plumbing checks (quarterly)
- Electrical system inspection (bi-annually)
- Exterior painting (every 2-3 years)
- Generator/inverter servicing (monthly)

## Consider Professional Management

If you own multiple properties or live far from your rental, professional property management can save time and improve returns. A good manager handles tenant relations, maintenance coordination, and rent collection — typically for 8-10% of monthly rental income.

---

*Looking to list your property? [Contact our agents](/agents) to get started with a free valuation.*',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
        cat_mgmt,
        'published',
        NOW() - INTERVAL '30 days'
    ) ON CONFLICT (slug) DO NOTHING;

END $$;
