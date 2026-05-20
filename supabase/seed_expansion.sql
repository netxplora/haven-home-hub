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
('Sarah Collins', 'sarah@assetatlas.com', '+2348011112222', '+2348011112222', 'Specializing in luxury waterfront properties across Silicon Valley and Beverly Hills.', 'Senior Luxury Consultant', true, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80'),
('David Osei', 'david@assetatlas.com', '+2348022223333', '+2348022223333', 'Expert in high-yield commercial real estate and fractional investments.', 'Investment Director', true, 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80'),
('Amina Bello', 'amina@assetatlas.com', '+2348033334444', '+2348033334444', 'Your guide to prime residential estates in the heart of Austin.', 'Estate Executive', false, 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&q=80')
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
