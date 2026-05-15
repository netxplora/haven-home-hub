-- =========================================================================
-- GLOBAL EXPANSION SEED SCRIPT
-- United States & United Kingdom Properties
-- =========================================================================

-- 1. Insert Locations
INSERT INTO public.locations (name, slug, image_url, featured) VALUES
('New York City, NY', 'new-york-city', 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80', true),
('Los Angeles, CA', 'los-angeles', 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=800&q=80', true),
('Houston, TX', 'houston', 'https://images.unsplash.com/photo-1531218150217-5afc4a15e022?w=800&q=80', false),
('London, UK', 'london', 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80', true),
('Manchester, UK', 'manchester', 'https://images.unsplash.com/photo-1519690889869-e705e59f72d1?w=800&q=80', false),
('Birmingham, UK', 'birmingham', 'https://images.unsplash.com/photo-1596706018318-7f4f6e522b51?w=800&q=80', false)
ON CONFLICT (slug) DO NOTHING;

-- 2. Insert Agents
INSERT INTO public.agents (full_name, email, phone, whatsapp, bio, role_title, featured, photo_url) VALUES
('Michael Sterling', 'michael.s@assetatlas.com', '+12125550199', '+12125550199', 'NYC Luxury Real Estate Expert.', 'Senior Broker - NY', true, 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80'),
('Emma Watson', 'emma.w@assetatlas.com', '+442071234567', '+442071234567', 'London Prime Property Consultant.', 'Director - UK', true, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80'),
('James Carter', 'james.c@assetatlas.com', '+13105550188', '+13105550188', 'LA Estates & Mansions specialist.', 'Estate Director - LA', false, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80'),
('Oliver Smith', 'oliver.s@assetatlas.com', '+441617123456', '+441617123456', 'Manchester Commercial & Residential focus.', 'Senior Consultant', false, 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80')
ON CONFLICT DO NOTHING;

DO $$
DECLARE
    loc_id uuid;
    ag_id uuid;
BEGIN

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'new-york-city' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'michael.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Luxury Manhattan Penthouse 1', 'prop-buy-0', 'Premium property located in New York City, NY. Fully equipped with modern amenities, perfect for luxury living or high-end investment.', 3181276, 'USD', 'buy', 'available', loc_id, '123 Main St, New York City, NY', 5, 4, 553, '["Pool", "Smart Home", "Security"]'::jsonb, ag_id, true, 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'los-angeles' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'james.c@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Downtown Loft 1', 'prop-rent-0', 'Outstanding rental opportunity in Los Angeles, CA. Features exceptional finishing, flexible leasing terms, and prime location.', 11623, 'USD', 'rent', 'available', loc_id, '456 Rental Ave, Los Angeles, CA', 3, 3, 262, '["Furnished", "Gym Access", "Concierge"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'houston' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'michael.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Commercial Plot 1', 'prop-land-0', 'Exceptional land offering in Houston, TX. Ready for development with all necessary zoning approvals in place.', 1562580, 'USD', 'land', 'available', loc_id, '789 Plot Rd, Houston, TX', 0, 0, 8839, '["Zoned Commercial", "Water Access", "Road Facing"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;
  
    SELECT id INTO loc_id FROM public.locations WHERE slug = 'los-angeles' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'james.c@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Beverly Hills Mansion 2', 'prop-buy-1', 'Premium property located in Los Angeles, CA. Fully equipped with modern amenities, perfect for luxury living or high-end investment.', 4346707, 'USD', 'buy', 'available', loc_id, '123 Main St, Los Angeles, CA', 4, 4, 529, '["Pool", "Smart Home", "Security"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'houston' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'michael.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Oceanfront Condo 2', 'prop-rent-1', 'Outstanding rental opportunity in Houston, TX. Features exceptional finishing, flexible leasing terms, and prime location.', 10047, 'USD', 'rent', 'available', loc_id, '456 Rental Ave, Houston, TX', 1, 3, 244, '["Furnished", "Gym Access", "Concierge"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1502672260266-1c1de2d93688?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'london' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'emma.w@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Commercial Development Plot 2', 'prop-land-1', 'Exceptional land offering in London, UK. Ready for development with all necessary zoning approvals in place.', 1366670, 'GBP', 'land', 'available', loc_id, '789 Plot Rd, London, UK', 0, 0, 9182, '["Zoned Commercial", "Water Access", "Road Facing"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1524813686514-a57563d77965?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;
  
    SELECT id INTO loc_id FROM public.locations WHERE slug = 'houston' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'michael.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Houston Suburban Home 3', 'prop-buy-2', 'Premium property located in Houston, TX. Fully equipped with modern amenities, perfect for luxury living or high-end investment.', 2999938, 'USD', 'buy', 'available', loc_id, '123 Main St, Houston, TX', 3, 5, 361, '["Pool", "Smart Home", "Security"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'london' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'emma.w@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Salford Quays Apartment 3', 'prop-rent-2', 'Outstanding rental opportunity in London, UK. Features exceptional finishing, flexible leasing terms, and prime location.', 10507, 'GBP', 'rent', 'available', loc_id, '456 Rental Ave, London, UK', 3, 1, 185, '["Furnished", "Gym Access", "Concierge"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'manchester' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'oliver.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Residential Planning Land 3', 'prop-land-2', 'Exceptional land offering in Manchester, UK. Ready for development with all necessary zoning approvals in place.', 636234, 'GBP', 'land', 'available', loc_id, '789 Plot Rd, Manchester, UK', 0, 0, 10125, '["Zoned Commercial", "Water Access", "Road Facing"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;
  
    SELECT id INTO loc_id FROM public.locations WHERE slug = 'london' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'emma.w@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Birmingham Suburb Home 4', 'prop-buy-3', 'Premium property located in London, UK. Fully equipped with modern amenities, perfect for luxury living or high-end investment.', 2879128, 'GBP', 'buy', 'available', loc_id, '123 Main St, London, UK', 3, 4, 407, '["Pool", "Smart Home", "Security"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'manchester' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'oliver.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Edgbaston Family Home 4', 'prop-rent-3', 'Outstanding rental opportunity in Manchester, UK. Features exceptional finishing, flexible leasing terms, and prime location.', 12003, 'GBP', 'rent', 'available', loc_id, '456 Rental Ave, Manchester, UK', 4, 2, 239, '["Furnished", "Gym Access", "Concierge"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'birmingham' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'emma.w@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Industrial Estate Plot 4', 'prop-land-3', 'Exceptional land offering in Birmingham, UK. Ready for development with all necessary zoning approvals in place.', 521541, 'GBP', 'land', 'available', loc_id, '789 Plot Rd, Birmingham, UK', 0, 0, 3765, '["Zoned Commercial", "Water Access", "Road Facing"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;
  
    SELECT id INTO loc_id FROM public.locations WHERE slug = 'manchester' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'oliver.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Chelsea Luxury Flat 5', 'prop-buy-4', 'Premium property located in Manchester, UK. Fully equipped with modern amenities, perfect for luxury living or high-end investment.', 516575, 'GBP', 'buy', 'available', loc_id, '123 Main St, Manchester, UK', 2, 2, 153, '["Pool", "Smart Home", "Security"]'::jsonb, ag_id, true, 'https://images.unsplash.com/photo-1600566753086-00f18efc204a?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'birmingham' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'emma.w@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Notting Hill Flat 5', 'prop-rent-4', 'Outstanding rental opportunity in Birmingham, UK. Features exceptional finishing, flexible leasing terms, and prime location.', 9708, 'GBP', 'rent', 'available', loc_id, '456 Rental Ave, Birmingham, UK', 3, 3, 93, '["Furnished", "Gym Access", "Concierge"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'new-york-city' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'michael.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Suburban Lot 5', 'prop-land-4', 'Exceptional land offering in New York City, NY. Ready for development with all necessary zoning approvals in place.', 1581305, 'USD', 'land', 'available', loc_id, '789 Plot Rd, New York City, NY', 0, 0, 4048, '["Zoned Commercial", "Water Access", "Road Facing"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;
  
    SELECT id INTO loc_id FROM public.locations WHERE slug = 'birmingham' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'emma.w@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Mayfair Townhouse 6', 'prop-buy-5', 'Premium property located in Birmingham, UK. Fully equipped with modern amenities, perfect for luxury living or high-end investment.', 1038625, 'GBP', 'buy', 'available', loc_id, '123 Main St, Birmingham, UK', 3, 5, 505, '["Pool", "Smart Home", "Security"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'new-york-city' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'michael.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Downtown Loft 6', 'prop-rent-5', 'Outstanding rental opportunity in New York City, NY. Features exceptional finishing, flexible leasing terms, and prime location.', 2311, 'USD', 'rent', 'available', loc_id, '456 Rental Ave, New York City, NY', 1, 2, 174, '["Furnished", "Gym Access", "Concierge"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'los-angeles' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'james.c@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Commercial Plot 6', 'prop-land-5', 'Exceptional land offering in Los Angeles, CA. Ready for development with all necessary zoning approvals in place.', 1706762, 'USD', 'land', 'available', loc_id, '789 Plot Rd, Los Angeles, CA', 0, 0, 8246, '["Zoned Commercial", "Water Access", "Road Facing"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;
  
    SELECT id INTO loc_id FROM public.locations WHERE slug = 'new-york-city' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'michael.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Beverly Hills Mansion 7', 'prop-buy-6', 'Premium property located in New York City, NY. Fully equipped with modern amenities, perfect for luxury living or high-end investment.', 690918, 'USD', 'buy', 'available', loc_id, '123 Main St, New York City, NY', 2, 5, 582, '["Pool", "Smart Home", "Security"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'los-angeles' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'james.c@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Oceanfront Condo 7', 'prop-rent-6', 'Outstanding rental opportunity in Los Angeles, CA. Features exceptional finishing, flexible leasing terms, and prime location.', 4053, 'USD', 'rent', 'available', loc_id, '456 Rental Ave, Los Angeles, CA', 4, 3, 317, '["Furnished", "Gym Access", "Concierge"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1502672260266-1c1de2d93688?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'houston' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'michael.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Residential Acreage 7', 'prop-land-6', 'Exceptional land offering in Houston, TX. Ready for development with all necessary zoning approvals in place.', 217718, 'USD', 'land', 'available', loc_id, '789 Plot Rd, Houston, TX', 0, 0, 8463, '["Zoned Commercial", "Water Access", "Road Facing"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1524813686514-a57563d77965?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;
  
    SELECT id INTO loc_id FROM public.locations WHERE slug = 'los-angeles' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'james.c@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Houston Suburban Home 8', 'prop-buy-7', 'Premium property located in Los Angeles, CA. Fully equipped with modern amenities, perfect for luxury living or high-end investment.', 1294841, 'USD', 'buy', 'available', loc_id, '123 Main St, Los Angeles, CA', 3, 5, 514, '["Pool", "Smart Home", "Security"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'houston' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'michael.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Tech Hub Workspace 8', 'prop-rent-7', 'Outstanding rental opportunity in Houston, TX. Features exceptional finishing, flexible leasing terms, and prime location.', 11867, 'USD', 'rent', 'available', loc_id, '456 Rental Ave, Houston, TX', 4, 2, 212, '["Furnished", "Gym Access", "Concierge"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'london' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'emma.w@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Residential Planning Land 8', 'prop-land-7', 'Exceptional land offering in London, UK. Ready for development with all necessary zoning approvals in place.', 407872, 'GBP', 'land', 'available', loc_id, '789 Plot Rd, London, UK', 0, 0, 1933, '["Zoned Commercial", "Water Access", "Road Facing"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;
  
    SELECT id INTO loc_id FROM public.locations WHERE slug = 'houston' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'michael.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Central Park Apartment 9', 'prop-buy-8', 'Premium property located in Houston, TX. Fully equipped with modern amenities, perfect for luxury living or high-end investment.', 3953765, 'USD', 'buy', 'available', loc_id, '123 Main St, Houston, TX', 4, 4, 360, '["Pool", "Smart Home", "Security"]'::jsonb, ag_id, true, 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'london' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'emma.w@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Edgbaston Family Home 9', 'prop-rent-8', 'Outstanding rental opportunity in London, UK. Features exceptional finishing, flexible leasing terms, and prime location.', 9569, 'GBP', 'rent', 'available', loc_id, '456 Rental Ave, London, UK', 2, 1, 297, '["Furnished", "Gym Access", "Concierge"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'manchester' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'oliver.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Industrial Estate Plot 9', 'prop-land-8', 'Exceptional land offering in Manchester, UK. Ready for development with all necessary zoning approvals in place.', 1582265, 'GBP', 'land', 'available', loc_id, '789 Plot Rd, Manchester, UK', 0, 0, 8479, '["Zoned Commercial", "Water Access", "Road Facing"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;
  
    SELECT id INTO loc_id FROM public.locations WHERE slug = 'london' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'emma.w@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Chelsea Luxury Flat 10', 'prop-buy-9', 'Premium property located in London, UK. Fully equipped with modern amenities, perfect for luxury living or high-end investment.', 4232750, 'GBP', 'buy', 'available', loc_id, '123 Main St, London, UK', 2, 3, 575, '["Pool", "Smart Home", "Security"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1600566753086-00f18efc204a?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'manchester' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'oliver.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Notting Hill Flat 10', 'prop-rent-9', 'Outstanding rental opportunity in Manchester, UK. Features exceptional finishing, flexible leasing terms, and prime location.', 5381, 'GBP', 'rent', 'available', loc_id, '456 Rental Ave, Manchester, UK', 3, 3, 326, '["Furnished", "Gym Access", "Concierge"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'birmingham' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'emma.w@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Brownfield Regeneration Site 10', 'prop-land-9', 'Exceptional land offering in Birmingham, UK. Ready for development with all necessary zoning approvals in place.', 1112137, 'GBP', 'land', 'available', loc_id, '789 Plot Rd, Birmingham, UK', 0, 0, 3697, '["Zoned Commercial", "Water Access", "Road Facing"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;
  
    SELECT id INTO loc_id FROM public.locations WHERE slug = 'manchester' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'oliver.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Mayfair Townhouse 11', 'prop-buy-10', 'Premium property located in Manchester, UK. Fully equipped with modern amenities, perfect for luxury living or high-end investment.', 3576690, 'GBP', 'buy', 'available', loc_id, '123 Main St, Manchester, UK', 5, 5, 578, '["Pool", "Smart Home", "Security"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'birmingham' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'emma.w@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Canary Wharf Office 11', 'prop-rent-10', 'Outstanding rental opportunity in Birmingham, UK. Features exceptional finishing, flexible leasing terms, and prime location.', 14494, 'GBP', 'rent', 'available', loc_id, '456 Rental Ave, Birmingham, UK', 4, 2, 56, '["Furnished", "Gym Access", "Concierge"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'new-york-city' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'michael.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Commercial Plot 11', 'prop-land-10', 'Exceptional land offering in New York City, NY. Ready for development with all necessary zoning approvals in place.', 270060, 'USD', 'land', 'available', loc_id, '789 Plot Rd, New York City, NY', 0, 0, 7378, '["Zoned Commercial", "Water Access", "Road Facing"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;
  
    SELECT id INTO loc_id FROM public.locations WHERE slug = 'birmingham' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'emma.w@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Kensington Apartment 12', 'prop-buy-11', 'Premium property located in Birmingham, UK. Fully equipped with modern amenities, perfect for luxury living or high-end investment.', 1524912, 'GBP', 'buy', 'available', loc_id, '123 Main St, Birmingham, UK', 5, 4, 330, '["Pool", "Smart Home", "Security"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'new-york-city' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'michael.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Oceanfront Condo 12', 'prop-rent-11', 'Outstanding rental opportunity in New York City, NY. Features exceptional finishing, flexible leasing terms, and prime location.', 15229, 'USD', 'rent', 'available', loc_id, '456 Rental Ave, New York City, NY', 1, 2, 197, '["Furnished", "Gym Access", "Concierge"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1502672260266-1c1de2d93688?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'los-angeles' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'james.c@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Residential Acreage 12', 'prop-land-11', 'Exceptional land offering in Los Angeles, CA. Ready for development with all necessary zoning approvals in place.', 1672542, 'USD', 'land', 'available', loc_id, '789 Plot Rd, Los Angeles, CA', 0, 0, 2860, '["Zoned Commercial", "Water Access", "Road Facing"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1524813686514-a57563d77965?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;
  
    SELECT id INTO loc_id FROM public.locations WHERE slug = 'new-york-city' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'michael.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Houston Suburban Home 13', 'prop-buy-12', 'Premium property located in New York City, NY. Fully equipped with modern amenities, perfect for luxury living or high-end investment.', 2218606, 'USD', 'buy', 'available', loc_id, '123 Main St, New York City, NY', 2, 2, 588, '["Pool", "Smart Home", "Security"]'::jsonb, ag_id, true, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'los-angeles' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'james.c@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Tech Hub Workspace 13', 'prop-rent-12', 'Outstanding rental opportunity in Los Angeles, CA. Features exceptional finishing, flexible leasing terms, and prime location.', 5976, 'USD', 'rent', 'available', loc_id, '456 Rental Ave, Los Angeles, CA', 1, 2, 248, '["Furnished", "Gym Access", "Concierge"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'houston' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'michael.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Development Land 13', 'prop-land-12', 'Exceptional land offering in Houston, TX. Ready for development with all necessary zoning approvals in place.', 761858, 'USD', 'land', 'available', loc_id, '789 Plot Rd, Houston, TX', 0, 0, 1323, '["Zoned Commercial", "Water Access", "Road Facing"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;
  
    SELECT id INTO loc_id FROM public.locations WHERE slug = 'los-angeles' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'james.c@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Central Park Apartment 14', 'prop-buy-13', 'Premium property located in Los Angeles, CA. Fully equipped with modern amenities, perfect for luxury living or high-end investment.', 3925198, 'USD', 'buy', 'available', loc_id, '123 Main St, Los Angeles, CA', 2, 3, 261, '["Pool", "Smart Home", "Security"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'houston' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'michael.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Suburban Townhouse 14', 'prop-rent-13', 'Outstanding rental opportunity in Houston, TX. Features exceptional finishing, flexible leasing terms, and prime location.', 1692, 'USD', 'rent', 'available', loc_id, '456 Rental Ave, Houston, TX', 4, 2, 319, '["Furnished", "Gym Access", "Concierge"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'london' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'emma.w@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Industrial Estate Plot 14', 'prop-land-13', 'Exceptional land offering in London, UK. Ready for development with all necessary zoning approvals in place.', 1103235, 'GBP', 'land', 'available', loc_id, '789 Plot Rd, London, UK', 0, 0, 8848, '["Zoned Commercial", "Water Access", "Road Facing"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;
  
    SELECT id INTO loc_id FROM public.locations WHERE slug = 'houston' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'michael.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Hollywood Hills Villa 15', 'prop-buy-14', 'Premium property located in Houston, TX. Fully equipped with modern amenities, perfect for luxury living or high-end investment.', 3040571, 'USD', 'buy', 'available', loc_id, '123 Main St, Houston, TX', 5, 4, 182, '["Pool", "Smart Home", "Security"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1600566753086-00f18efc204a?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'london' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'emma.w@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Notting Hill Flat 15', 'prop-rent-14', 'Outstanding rental opportunity in London, UK. Features exceptional finishing, flexible leasing terms, and prime location.', 8341, 'GBP', 'rent', 'available', loc_id, '456 Rental Ave, London, UK', 1, 2, 270, '["Furnished", "Gym Access", "Concierge"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'manchester' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'oliver.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Brownfield Regeneration Site 15', 'prop-land-14', 'Exceptional land offering in Manchester, UK. Ready for development with all necessary zoning approvals in place.', 1458543, 'GBP', 'land', 'available', loc_id, '789 Plot Rd, Manchester, UK', 0, 0, 7142, '["Zoned Commercial", "Water Access", "Road Facing"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;
  
    SELECT id INTO loc_id FROM public.locations WHERE slug = 'london' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'emma.w@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Mayfair Townhouse 16', 'prop-buy-15', 'Premium property located in London, UK. Fully equipped with modern amenities, perfect for luxury living or high-end investment.', 1079954, 'GBP', 'buy', 'available', loc_id, '123 Main St, London, UK', 3, 4, 449, '["Pool", "Smart Home", "Security"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'manchester' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'oliver.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Canary Wharf Office 16', 'prop-rent-15', 'Outstanding rental opportunity in Manchester, UK. Features exceptional finishing, flexible leasing terms, and prime location.', 3890, 'GBP', 'rent', 'available', loc_id, '456 Rental Ave, Manchester, UK', 2, 3, 80, '["Furnished", "Gym Access", "Concierge"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'birmingham' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'emma.w@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Greenfield Site 16', 'prop-land-15', 'Exceptional land offering in Birmingham, UK. Ready for development with all necessary zoning approvals in place.', 134976, 'GBP', 'land', 'available', loc_id, '789 Plot Rd, Birmingham, UK', 0, 0, 7887, '["Zoned Commercial", "Water Access", "Road Facing"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;
  
    SELECT id INTO loc_id FROM public.locations WHERE slug = 'manchester' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'oliver.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Kensington Apartment 17', 'prop-buy-16', 'Premium property located in Manchester, UK. Fully equipped with modern amenities, perfect for luxury living or high-end investment.', 2531694, 'GBP', 'buy', 'available', loc_id, '123 Main St, Manchester, UK', 4, 3, 410, '["Pool", "Smart Home", "Security"]'::jsonb, ag_id, true, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'birmingham' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'emma.w@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Soho Studio 17', 'prop-rent-16', 'Outstanding rental opportunity in Birmingham, UK. Features exceptional finishing, flexible leasing terms, and prime location.', 10128, 'GBP', 'rent', 'available', loc_id, '456 Rental Ave, Birmingham, UK', 4, 3, 340, '["Furnished", "Gym Access", "Concierge"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1502672260266-1c1de2d93688?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'new-york-city' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'michael.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Residential Acreage 17', 'prop-land-16', 'Exceptional land offering in New York City, NY. Ready for development with all necessary zoning approvals in place.', 498045, 'USD', 'land', 'available', loc_id, '789 Plot Rd, New York City, NY', 0, 0, 10557, '["Zoned Commercial", "Water Access", "Road Facing"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1524813686514-a57563d77965?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;
  
    SELECT id INTO loc_id FROM public.locations WHERE slug = 'birmingham' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'emma.w@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Manchester City Center Flat 18', 'prop-buy-17', 'Premium property located in Birmingham, UK. Fully equipped with modern amenities, perfect for luxury living or high-end investment.', 3238049, 'GBP', 'buy', 'available', loc_id, '123 Main St, Birmingham, UK', 3, 5, 402, '["Pool", "Smart Home", "Security"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'new-york-city' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'michael.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Tech Hub Workspace 18', 'prop-rent-17', 'Outstanding rental opportunity in New York City, NY. Features exceptional finishing, flexible leasing terms, and prime location.', 4464, 'USD', 'rent', 'available', loc_id, '456 Rental Ave, New York City, NY', 1, 3, 221, '["Furnished", "Gym Access", "Concierge"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'los-angeles' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'james.c@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Development Land 18', 'prop-land-17', 'Exceptional land offering in Los Angeles, CA. Ready for development with all necessary zoning approvals in place.', 470370, 'USD', 'land', 'available', loc_id, '789 Plot Rd, Los Angeles, CA', 0, 0, 8383, '["Zoned Commercial", "Water Access", "Road Facing"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;
  
    SELECT id INTO loc_id FROM public.locations WHERE slug = 'new-york-city' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'michael.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Central Park Apartment 19', 'prop-buy-18', 'Premium property located in New York City, NY. Fully equipped with modern amenities, perfect for luxury living or high-end investment.', 924048, 'USD', 'buy', 'available', loc_id, '123 Main St, New York City, NY', 2, 4, 446, '["Pool", "Smart Home", "Security"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'los-angeles' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'james.c@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Suburban Townhouse 19', 'prop-rent-18', 'Outstanding rental opportunity in Los Angeles, CA. Features exceptional finishing, flexible leasing terms, and prime location.', 7156, 'USD', 'rent', 'available', loc_id, '456 Rental Ave, Los Angeles, CA', 1, 1, 160, '["Furnished", "Gym Access", "Concierge"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'houston' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'michael.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Industrial Zone Plot 19', 'prop-land-18', 'Exceptional land offering in Houston, TX. Ready for development with all necessary zoning approvals in place.', 1245802, 'USD', 'land', 'available', loc_id, '789 Plot Rd, Houston, TX', 0, 0, 2367, '["Zoned Commercial", "Water Access", "Road Facing"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;
  
    SELECT id INTO loc_id FROM public.locations WHERE slug = 'los-angeles' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'james.c@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Hollywood Hills Villa 20', 'prop-buy-19', 'Premium property located in Los Angeles, CA. Fully equipped with modern amenities, perfect for luxury living or high-end investment.', 1623975, 'USD', 'buy', 'available', loc_id, '123 Main St, Los Angeles, CA', 2, 5, 409, '["Pool", "Smart Home", "Security"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1600566753086-00f18efc204a?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'houston' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'michael.s@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('City Center Studio 20', 'prop-rent-19', 'Outstanding rental opportunity in Houston, TX. Features exceptional finishing, flexible leasing terms, and prime location.', 5208, 'USD', 'rent', 'available', loc_id, '456 Rental Ave, Houston, TX', 2, 3, 265, '["Furnished", "Gym Access", "Concierge"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = 'london' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = 'emma.w@assetatlas.com' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('Brownfield Regeneration Site 20', 'prop-land-19', 'Exceptional land offering in London, UK. Ready for development with all necessary zoning approvals in place.', 107182, 'GBP', 'land', 'available', loc_id, '789 Plot Rd, London, UK', 0, 0, 4361, '["Zoned Commercial", "Water Access", "Road Facing"]'::jsonb, ag_id, false, 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&q=80') ON CONFLICT (slug) DO NOTHING;
    END IF;
  
END $$;

-- Insert Fractional Investments

  INSERT INTO public.investment_properties (
      title, slug, description, location, property_type, cover_image_url,
      total_value, unit_price, total_units, units_sold, min_investment,
      projected_return_min, projected_return_max, estimated_rental_yield,
      distribution_frequency, holding_period_months, status, featured
  ) VALUES (
      'London Logistics Fund Phase 1', 'inv-prop-0', 'Fractional ownership in high-yield commercial/residential assets located in London, UK. Managed by top-tier asset managers with consistent historical performance.', 'London, UK', 'commercial', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
      15800643, 4267, 3702, 913, 8534,
      10.8, 19.9, 5.6,
      'monthly', 24, 'open', true
  ) ON CONFLICT (slug) DO NOTHING;
  
  INSERT INTO public.investment_properties (
      title, slug, description, location, property_type, cover_image_url,
      total_value, unit_price, total_units, units_sold, min_investment,
      projected_return_min, projected_return_max, estimated_rental_yield,
      distribution_frequency, holding_period_months, status, featured
  ) VALUES (
      'New York Retail Park Phase 1', 'inv-prop-1', 'Fractional ownership in high-yield commercial/residential assets located in New York City, NY. Managed by top-tier asset managers with consistent historical performance.', 'New York City, NY', 'residential', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80',
      19864499, 2079, 9554, 1973, 4158,
      10.8, 17.0, 8.8,
      'quarterly', 36, 'open', false
  ) ON CONFLICT (slug) DO NOTHING;
  
  INSERT INTO public.investment_properties (
      title, slug, description, location, property_type, cover_image_url,
      total_value, unit_price, total_units, units_sold, min_investment,
      projected_return_min, projected_return_max, estimated_rental_yield,
      distribution_frequency, holding_period_months, status, featured
  ) VALUES (
      'Manchester Residential Block Phase 1', 'inv-prop-2', 'Fractional ownership in high-yield commercial/residential assets located in Manchester, UK. Managed by top-tier asset managers with consistent historical performance.', 'Manchester, UK', 'commercial', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
      4788282, 3387, 1413, 862, 6774,
      10.2, 16.9, 9.1,
      'semi_annual', 48, 'open', false
  ) ON CONFLICT (slug) DO NOTHING;
  
  INSERT INTO public.investment_properties (
      title, slug, description, location, property_type, cover_image_url,
      total_value, unit_price, total_units, units_sold, min_investment,
      projected_return_min, projected_return_max, estimated_rental_yield,
      distribution_frequency, holding_period_months, status, featured
  ) VALUES (
      'Texas Student Housing Phase 1', 'inv-prop-3', 'Fractional ownership in high-yield commercial/residential assets located in Houston, TX. Managed by top-tier asset managers with consistent historical performance.', 'Houston, TX', 'residential', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
      18341627, 3702, 4954, 1810, 7404,
      11.7, 16.2, 5.3,
      'annual', 60, 'open', true
  ) ON CONFLICT (slug) DO NOTHING;
  
  INSERT INTO public.investment_properties (
      title, slug, description, location, property_type, cover_image_url,
      total_value, unit_price, total_units, units_sold, min_investment,
      projected_return_min, projected_return_max, estimated_rental_yield,
      distribution_frequency, holding_period_months, status, featured
  ) VALUES (
      'LA Tech Office Hub Phase 1', 'inv-prop-4', 'Fractional ownership in high-yield commercial/residential assets located in Los Angeles, CA. Managed by top-tier asset managers with consistent historical performance.', 'Los Angeles, CA', 'commercial', 'https://images.unsplash.com/photo-1600566753086-00f18efc204a?w=1200&q=80',
      16265884, 4231, 3844, 3000, 8462,
      11.4, 15.6, 8.7,
      'monthly', 24, 'open', false
  ) ON CONFLICT (slug) DO NOTHING;
  
  INSERT INTO public.investment_properties (
      title, slug, description, location, property_type, cover_image_url,
      total_value, unit_price, total_units, units_sold, min_investment,
      projected_return_min, projected_return_max, estimated_rental_yield,
      distribution_frequency, holding_period_months, status, featured
  ) VALUES (
      'London Logistics Fund Phase 2', 'inv-prop-5', 'Fractional ownership in high-yield commercial/residential assets located in London, UK. Managed by top-tier asset managers with consistent historical performance.', 'London, UK', 'residential', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
      18705087, 1651, 11329, 971, 3302,
      14.3, 17.8, 7.6,
      'quarterly', 36, 'open', false
  ) ON CONFLICT (slug) DO NOTHING;
  
  INSERT INTO public.investment_properties (
      title, slug, description, location, property_type, cover_image_url,
      total_value, unit_price, total_units, units_sold, min_investment,
      projected_return_min, projected_return_max, estimated_rental_yield,
      distribution_frequency, holding_period_months, status, featured
  ) VALUES (
      'New York Retail Park Phase 2', 'inv-prop-6', 'Fractional ownership in high-yield commercial/residential assets located in New York City, NY. Managed by top-tier asset managers with consistent historical performance.', 'New York City, NY', 'commercial', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80',
      8704898, 982, 8864, 3963, 1964,
      11.1, 15.0, 9.6,
      'semi_annual', 48, 'open', true
  ) ON CONFLICT (slug) DO NOTHING;
  
  INSERT INTO public.investment_properties (
      title, slug, description, location, property_type, cover_image_url,
      total_value, unit_price, total_units, units_sold, min_investment,
      projected_return_min, projected_return_max, estimated_rental_yield,
      distribution_frequency, holding_period_months, status, featured
  ) VALUES (
      'Manchester Residential Block Phase 2', 'inv-prop-7', 'Fractional ownership in high-yield commercial/residential assets located in Manchester, UK. Managed by top-tier asset managers with consistent historical performance.', 'Manchester, UK', 'residential', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
      7942074, 2115, 3755, 2137, 4230,
      14.7, 15.0, 8.9,
      'annual', 60, 'open', false
  ) ON CONFLICT (slug) DO NOTHING;
  
  INSERT INTO public.investment_properties (
      title, slug, description, location, property_type, cover_image_url,
      total_value, unit_price, total_units, units_sold, min_investment,
      projected_return_min, projected_return_max, estimated_rental_yield,
      distribution_frequency, holding_period_months, status, featured
  ) VALUES (
      'Texas Student Housing Phase 2', 'inv-prop-8', 'Fractional ownership in high-yield commercial/residential assets located in Houston, TX. Managed by top-tier asset managers with consistent historical performance.', 'Houston, TX', 'commercial', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
      14947336, 3571, 4185, 2376, 7142,
      13.3, 17.0, 8.2,
      'monthly', 24, 'open', false
  ) ON CONFLICT (slug) DO NOTHING;
  
  INSERT INTO public.investment_properties (
      title, slug, description, location, property_type, cover_image_url,
      total_value, unit_price, total_units, units_sold, min_investment,
      projected_return_min, projected_return_max, estimated_rental_yield,
      distribution_frequency, holding_period_months, status, featured
  ) VALUES (
      'LA Tech Office Hub Phase 2', 'inv-prop-9', 'Fractional ownership in high-yield commercial/residential assets located in Los Angeles, CA. Managed by top-tier asset managers with consistent historical performance.', 'Los Angeles, CA', 'residential', 'https://images.unsplash.com/photo-1600566753086-00f18efc204a?w=1200&q=80',
      4676737, 2135, 2190, 1493, 4270,
      12.5, 16.8, 6.0,
      'quarterly', 36, 'open', true
  ) ON CONFLICT (slug) DO NOTHING;
  
  INSERT INTO public.investment_properties (
      title, slug, description, location, property_type, cover_image_url,
      total_value, unit_price, total_units, units_sold, min_investment,
      projected_return_min, projected_return_max, estimated_rental_yield,
      distribution_frequency, holding_period_months, status, featured
  ) VALUES (
      'London Logistics Fund Phase 3', 'inv-prop-10', 'Fractional ownership in high-yield commercial/residential assets located in London, UK. Managed by top-tier asset managers with consistent historical performance.', 'London, UK', 'commercial', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
      21011239, 2256, 9313, 6051, 4512,
      14.5, 18.5, 6.2,
      'semi_annual', 48, 'open', false
  ) ON CONFLICT (slug) DO NOTHING;
  
  INSERT INTO public.investment_properties (
      title, slug, description, location, property_type, cover_image_url,
      total_value, unit_price, total_units, units_sold, min_investment,
      projected_return_min, projected_return_max, estimated_rental_yield,
      distribution_frequency, holding_period_months, status, featured
  ) VALUES (
      'New York Retail Park Phase 3', 'inv-prop-11', 'Fractional ownership in high-yield commercial/residential assets located in New York City, NY. Managed by top-tier asset managers with consistent historical performance.', 'New York City, NY', 'residential', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80',
      21648798, 3656, 5921, 953, 7312,
      13.0, 16.4, 7.3,
      'annual', 60, 'open', false
  ) ON CONFLICT (slug) DO NOTHING;
  
  INSERT INTO public.investment_properties (
      title, slug, description, location, property_type, cover_image_url,
      total_value, unit_price, total_units, units_sold, min_investment,
      projected_return_min, projected_return_max, estimated_rental_yield,
      distribution_frequency, holding_period_months, status, featured
  ) VALUES (
      'Manchester Residential Block Phase 3', 'inv-prop-12', 'Fractional ownership in high-yield commercial/residential assets located in Manchester, UK. Managed by top-tier asset managers with consistent historical performance.', 'Manchester, UK', 'commercial', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
      21879660, 2632, 8312, 180, 5264,
      13.2, 16.6, 10.0,
      'monthly', 24, 'open', true
  ) ON CONFLICT (slug) DO NOTHING;
  
  INSERT INTO public.investment_properties (
      title, slug, description, location, property_type, cover_image_url,
      total_value, unit_price, total_units, units_sold, min_investment,
      projected_return_min, projected_return_max, estimated_rental_yield,
      distribution_frequency, holding_period_months, status, featured
  ) VALUES (
      'Texas Student Housing Phase 3', 'inv-prop-13', 'Fractional ownership in high-yield commercial/residential assets located in Houston, TX. Managed by top-tier asset managers with consistent historical performance.', 'Houston, TX', 'residential', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
      6159502, 5170, 1191, 935, 10340,
      14.5, 18.1, 7.5,
      'quarterly', 36, 'open', false
  ) ON CONFLICT (slug) DO NOTHING;
  
  INSERT INTO public.investment_properties (
      title, slug, description, location, property_type, cover_image_url,
      total_value, unit_price, total_units, units_sold, min_investment,
      projected_return_min, projected_return_max, estimated_rental_yield,
      distribution_frequency, holding_period_months, status, featured
  ) VALUES (
      'LA Tech Office Hub Phase 3', 'inv-prop-14', 'Fractional ownership in high-yield commercial/residential assets located in Los Angeles, CA. Managed by top-tier asset managers with consistent historical performance.', 'Los Angeles, CA', 'commercial', 'https://images.unsplash.com/photo-1600566753086-00f18efc204a?w=1200&q=80',
      5397685, 3541, 1524, 857, 7082,
      12.3, 15.4, 8.8,
      'semi_annual', 48, 'open', false
  ) ON CONFLICT (slug) DO NOTHING;
  
  INSERT INTO public.investment_properties (
      title, slug, description, location, property_type, cover_image_url,
      total_value, unit_price, total_units, units_sold, min_investment,
      projected_return_min, projected_return_max, estimated_rental_yield,
      distribution_frequency, holding_period_months, status, featured
  ) VALUES (
      'London Logistics Fund Phase 4', 'inv-prop-15', 'Fractional ownership in high-yield commercial/residential assets located in London, UK. Managed by top-tier asset managers with consistent historical performance.', 'London, UK', 'residential', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
      5594071, 5180, 1079, 562, 10360,
      12.0, 16.9, 9.2,
      'annual', 60, 'open', true
  ) ON CONFLICT (slug) DO NOTHING;
  
  INSERT INTO public.investment_properties (
      title, slug, description, location, property_type, cover_image_url,
      total_value, unit_price, total_units, units_sold, min_investment,
      projected_return_min, projected_return_max, estimated_rental_yield,
      distribution_frequency, holding_period_months, status, featured
  ) VALUES (
      'New York Retail Park Phase 4', 'inv-prop-16', 'Fractional ownership in high-yield commercial/residential assets located in New York City, NY. Managed by top-tier asset managers with consistent historical performance.', 'New York City, NY', 'commercial', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80',
      11791638, 4876, 2418, 1931, 9752,
      10.2, 18.6, 7.1,
      'monthly', 24, 'open', false
  ) ON CONFLICT (slug) DO NOTHING;
  
  INSERT INTO public.investment_properties (
      title, slug, description, location, property_type, cover_image_url,
      total_value, unit_price, total_units, units_sold, min_investment,
      projected_return_min, projected_return_max, estimated_rental_yield,
      distribution_frequency, holding_period_months, status, featured
  ) VALUES (
      'Manchester Residential Block Phase 4', 'inv-prop-17', 'Fractional ownership in high-yield commercial/residential assets located in Manchester, UK. Managed by top-tier asset managers with consistent historical performance.', 'Manchester, UK', 'residential', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
      5504748, 5487, 1003, 534, 10974,
      12.0, 19.0, 7.6,
      'quarterly', 36, 'open', false
  ) ON CONFLICT (slug) DO NOTHING;
  
  INSERT INTO public.investment_properties (
      title, slug, description, location, property_type, cover_image_url,
      total_value, unit_price, total_units, units_sold, min_investment,
      projected_return_min, projected_return_max, estimated_rental_yield,
      distribution_frequency, holding_period_months, status, featured
  ) VALUES (
      'Texas Student Housing Phase 4', 'inv-prop-18', 'Fractional ownership in high-yield commercial/residential assets located in Houston, TX. Managed by top-tier asset managers with consistent historical performance.', 'Houston, TX', 'commercial', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
      14752353, 3497, 4218, 2283, 6994,
      12.3, 16.1, 9.3,
      'semi_annual', 48, 'open', true
  ) ON CONFLICT (slug) DO NOTHING;
  
  INSERT INTO public.investment_properties (
      title, slug, description, location, property_type, cover_image_url,
      total_value, unit_price, total_units, units_sold, min_investment,
      projected_return_min, projected_return_max, estimated_rental_yield,
      distribution_frequency, holding_period_months, status, featured
  ) VALUES (
      'LA Tech Office Hub Phase 4', 'inv-prop-19', 'Fractional ownership in high-yield commercial/residential assets located in Los Angeles, CA. Managed by top-tier asset managers with consistent historical performance.', 'Los Angeles, CA', 'residential', 'https://images.unsplash.com/photo-1600566753086-00f18efc204a?w=1200&q=80',
      16845071, 1161, 14509, 5319, 2322,
      13.0, 15.1, 7.4,
      'annual', 60, 'open', false
  ) ON CONFLICT (slug) DO NOTHING;
  