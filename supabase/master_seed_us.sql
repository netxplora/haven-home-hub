-- =========================================================================
-- ASSET ATLAS - US MARKET SEED EXPANSION SCRIPT
-- Run this in your Supabase SQL Editor to populate realistic US listings.
-- =========================================================================

-- 1. Insert Premium Locations
INSERT INTO public.locations (name, slug, image_url, featured)
VALUES
('Beverly Hills, CA', 'beverly-hills-ca', 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=800&q=80', true),
('Manhattan, NY', 'manhattan-ny', 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80', true),
('Miami Beach, FL', 'miami-beach-fl', 'https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=800&q=80', true),
('Aspen, CO', 'aspen-co', 'https://images.unsplash.com/photo-1521484347717-b7156db74384?w=800&q=80', false),
('Austin, TX', 'austin-tx', 'https://images.unsplash.com/photo-1531218150217-5afc40e53181?w=800&q=80', false)
ON CONFLICT (slug) DO NOTHING;

-- 2. Create Dummy Agents (No auth mapping needed for display purposes if user_id is null)
INSERT INTO public.agents (full_name, email, phone, whatsapp, bio, role_title, featured, photo_url)
VALUES
('Sarah Collins', 'sarah@assetatlas.com', '+1 (310) 555-0199', '+13105550199', 'Specializing in luxury residential properties across Beverly Hills and Bel Air.', 'Senior Luxury Consultant', true, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80'),
('David Osei', 'david@assetatlas.com', '+1 (212) 555-0123', '+12125550123', 'Expert in high-yield commercial real estate and fractional investments in Manhattan.', 'Investment Director', true, 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80'),
('Amina Bello', 'amina@assetatlas.com', '+1 (305) 555-0144', '+13055550144', 'Your guide to prime waterfront estates in Miami Beach.', 'Estate Executive', false, 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&q=80')
ON CONFLICT DO NOTHING;

-- 3. Insert Properties (Buy, Rent, Land)
DO $$
DECLARE
    beverly_hills uuid;
    manhattan uuid;
    miami uuid;
    aspen uuid;
    austin uuid;

    sarah_id uuid;
    david_id uuid;
    amina_id uuid;
BEGIN
    SELECT id INTO beverly_hills FROM public.locations WHERE slug = 'beverly-hills-ca';
    SELECT id INTO manhattan FROM public.locations WHERE slug = 'manhattan-ny';
    SELECT id INTO miami FROM public.locations WHERE slug = 'miami-beach-fl';
    SELECT id INTO aspen FROM public.locations WHERE slug = 'aspen-co';
    SELECT id INTO austin FROM public.locations WHERE slug = 'austin-tx';

    SELECT id INTO sarah_id FROM public.agents WHERE email = 'sarah@assetatlas.com';
    SELECT id INTO david_id FROM public.agents WHERE email = 'david@assetatlas.com';
    SELECT id INTO amina_id FROM public.agents WHERE email = 'amina@assetatlas.com';

    INSERT INTO public.properties (
        title, slug, description, property_type, status, price, currency,
        bedrooms, bathrooms, size_sqm, address,
        cover_image_url, features, featured,
        location_id, agent_id
    ) VALUES
    (
        'The Crown Penthouse', 'crown-penthouse-manhattan',
        'An architectural masterpiece soaring above Central Park. This full-floor penthouse features floor-to-ceiling windows, a private wraparound terrace, custom marble detailing, and state-of-the-art smart home integration. Perfect for the discerning buyer seeking ultimate privacy and luxury in NYC.',
        'buy', 'available', 18500000, 'USD',
        4, 5, 650, '157 West 57th Street, Penthouse 88, New York, NY 10019',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1600&q=80',
        '{"features": ["Central Park Views", "Private Elevator", "Wine Cellar", "24/7 Concierge", "Smart Home"]}'::jsonb,
        true, manhattan, david_id
    ),
    (
        'Oceanfront Modern Villa', 'oceanfront-villa-miami',
        'Experience resort-style living in this newly constructed waterfront estate on Star Island. Featuring a private dock, infinity edge pool cascading towards the bay, outdoor kitchen, and tropical landscaping.',
        'buy', 'available', 12500000, 'USD',
        6, 7, 1200, '45 Star Island Drive, Miami Beach, FL 33139',
        'https://images.unsplash.com/photo-1613490908592-fd5e163027cd?w=1600&q=80',
        '{"features": ["Private Dock", "Infinity Pool", "Home Theater", "Outdoor Kitchen", "Guest House"]}'::jsonb,
        true, miami, amina_id
    ),
    (
        'Beverly Hills Estate', 'beverly-hills-estate',
        'A timeless Mediterranean estate situated on 2 acres of manicured grounds north of Sunset Boulevard. Boasts a grand double staircase, a 15-seat screening room, tennis court, and panoramic city views.',
        'buy', 'available', 24000000, 'USD',
        8, 10, 1800, '1000 N Crescent Drive, Beverly Hills, CA 90210',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80',
        '{"features": ["Tennis Court", "Screening Room", "Wine Tasting Room", "Guest House", "City Views"]}'::jsonb,
        true, beverly_hills, sarah_id
    ),
    (
        'Silicon Hills Tech Hub', 'silicon-hills-hub',
        'Premium commercial office space located in the heart of downtown Austin. Designed for modern tech companies with open floor plans, collaboration zones, and advanced networking infrastructure.',
        'rent', 'available', 45000, 'USD',
        0, 4, 3500, '200 Congress Avenue, Austin, TX 78701',
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80',
        '{"features": ["Fiber Internet", "Collaboration Spaces", "On-site Gym", "Cafeteria", "LEED Certified"]}'::jsonb,
        false, austin, david_id
    ),
    (
        'Aspen Ski Chalet', 'aspen-ski-chalet',
        'Ski-in/ski-out luxury chalet on Aspen Mountain. Features vaulted ceilings, massive stone fireplaces, heated driveways, and a private spa to relax after hitting the slopes.',
        'buy', 'available', 15800000, 'USD',
        5, 6, 850, '500 Ute Avenue, Aspen, CO 81611',
        'https://images.unsplash.com/photo-1521484347717-b7156db74384?w=1600&q=80',
        '{"features": ["Ski-In/Ski-Out", "Indoor Spa", "Heated Driveway", "Wine Cellar", "Mountain Views"]}'::jsonb,
        true, aspen, sarah_id
    ),
    (
        'South Beach Penthouse', 'south-beach-penthouse',
        'Luxurious short-term or long-term rental in South Beach. Wraparound balcony overlooking the ocean, fully furnished with designer pieces, and access to five-star hotel amenities.',
        'rent', 'available', 15000, 'USD',
        3, 3, 280, '100 South Pointe Drive, Miami Beach, FL 33139',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1600&q=80',
        '{"features": ["Ocean View", "Fully Furnished", "Hotel Amenities", "Valet Parking", "Concierge"]}'::jsonb,
        false, miami, amina_id
    ),
    (
        'Bel Air Development Parcel', 'bel-air-parcel',
        'Rare 3-acre vacant lot in prime Bel Air with fully approved plans for a 15,000 sq ft modern architectural masterpiece. Unobstructed views of the Pacific Ocean and city skyline.',
        'land', 'available', 8500000, 'USD',
        0, 0, 12140, '1200 Bel Air Road, Los Angeles, CA 90077',
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&q=80',
        '{"features": ["RTI Plans Included", "Ocean Views", "Gated Driveway", "Utilities at Street", "Prime Location"]}'::jsonb,
        true, beverly_hills, sarah_id
    ),
    (
        'Tribeca Loft', 'tribeca-loft',
        'Authentic pre-war loft in Tribeca with exposed brick, original timber beams, and 14-foot ceilings. Fully renovated chef''s kitchen and spa-like bathrooms.',
        'buy', 'available', 6200000, 'USD',
        3, 3, 320, '100 Franklin Street, New York, NY 10013',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1600&q=80',
        '{"features": ["Exposed Brick", "14ft Ceilings", "Chef Kitchen", "Keyed Elevator", "Fireplace"]}'::jsonb,
        false, manhattan, david_id
    )
    ON CONFLICT (slug) DO NOTHING;

    -- 4. Insert Investments
    INSERT INTO public.investment_properties (
        title, slug, description, location, property_type, cover_image_url, 
        total_value, unit_price, total_units, units_sold, min_investment, 
        projected_return_min, projected_return_max, estimated_rental_yield, 
        distribution_frequency, holding_period_months, status, featured
    ) VALUES (
        'Austin Tech Campus Fund I', 
        'austin-tech-campus', 
        'Fractional ownership in a newly developed Class A office park in Austin, Texas, fully leased to Fortune 500 tech companies. Austin remains one of the fastest-growing tech hubs in the US. This campus is uniquely positioned with long-term leases from established technology firms, providing a stable, high-yield cash flow.', 
        'Austin, TX', 
        'commercial', 
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80',
        20000000, 50000, 400, 250, 50000, 
        10.0, 12.5, 8.0, 
        'quarterly', 36, 'open', true
    ),
    (
        'Miami Luxury Condo Development', 
        'miami-condo-dev', 
        'Ground-up development of a 40-unit ultra-luxury condominium tower overlooking Biscayne Bay. The Miami luxury market continues to see unprecedented demand from domestic and international buyers. This project leverages an irreplaceable waterfront parcel with fully approved plans, minimizing entitlement risk.', 
        'Miami, FL', 
        'residential', 
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600&q=80',
        80000000, 100000, 800, 500, 100000, 
        15.0, 18.0, 0.0, 
        'annual', 48, 'open', true
    )
    ON CONFLICT (slug) DO NOTHING;

    -- 5. Insert Blog Data
    INSERT INTO public.blog_categories (name, slug)
    VALUES
    ('US Market Insights', 'us-market-insights'),
    ('Investment Strategies', 'investment-strategies'),
    ('Luxury Living', 'luxury-living')
    ON CONFLICT (slug) DO NOTHING;

END $$;
