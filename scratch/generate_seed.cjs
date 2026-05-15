const fs = require('fs');

const locations = [
  { name: 'New York City, NY', slug: 'new-york-city', img: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80', featured: true, country: 'US', curr: 'USD' },
  { name: 'Los Angeles, CA', slug: 'los-angeles', img: 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=800&q=80', featured: true, country: 'US', curr: 'USD' },
  { name: 'Houston, TX', slug: 'houston', img: 'https://images.unsplash.com/photo-1531218150217-5afc4a15e022?w=800&q=80', featured: false, country: 'US', curr: 'USD' },
  { name: 'London, UK', slug: 'london', img: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80', featured: true, country: 'UK', curr: 'GBP' },
  { name: 'Manchester, UK', slug: 'manchester', img: 'https://images.unsplash.com/photo-1519690889869-e705e59f72d1?w=800&q=80', featured: false, country: 'UK', curr: 'GBP' },
  { name: 'Birmingham, UK', slug: 'birmingham', img: 'https://images.unsplash.com/photo-1596706018318-7f4f6e522b51?w=800&q=80', featured: false, country: 'UK', curr: 'GBP' }
];

const agents = [
  { name: 'Michael Sterling', email: 'michael.s@assetatlas.com', locs: ['new-york-city', 'houston'] },
  { name: 'Emma Watson', email: 'emma.w@assetatlas.com', locs: ['london', 'birmingham'] },
  { name: 'James Carter', email: 'james.c@assetatlas.com', locs: ['los-angeles'] },
  { name: 'Oliver Smith', email: 'oliver.s@assetatlas.com', locs: ['manchester'] }
];

let sql = `-- =========================================================================
-- GLOBAL EXPANSION SEED SCRIPT
-- United States & United Kingdom Properties
-- =========================================================================

-- 1. Insert Locations
INSERT INTO public.locations (name, slug, image_url, featured) VALUES
${locations.map(l => `('${l.name}', '${l.slug}', '${l.img}', ${l.featured})`).join(',\n')}
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
`;

const images = {
  buy: [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
    'https://images.unsplash.com/photo-1600566753086-00f18efc204a?w=1200&q=80'
  ],
  rent: [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1de2d93688?w=1200&q=80',
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&q=80',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80'
  ],
  land: [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80',
    'https://images.unsplash.com/photo-1524813686514-a57563d77965?w=1200&q=80',
    'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=1200&q=80',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&q=80'
  ]
};

const prefixes = {
  US: {
    buy: ['Luxury Manhattan Penthouse', 'Beverly Hills Mansion', 'Houston Suburban Home', 'Central Park Apartment', 'Hollywood Hills Villa'],
    rent: ['Downtown Loft', 'Oceanfront Condo', 'Tech Hub Workspace', 'Suburban Townhouse', 'City Center Studio'],
    land: ['Commercial Plot', 'Residential Acreage', 'Development Land', 'Industrial Zone Plot', 'Suburban Lot']
  },
  UK: {
    buy: ['Mayfair Townhouse', 'Kensington Apartment', 'Manchester City Center Flat', 'Birmingham Suburb Home', 'Chelsea Luxury Flat'],
    rent: ['Canary Wharf Office', 'Soho Studio', 'Salford Quays Apartment', 'Edgbaston Family Home', 'Notting Hill Flat'],
    land: ['Greenfield Site', 'Commercial Development Plot', 'Residential Planning Land', 'Industrial Estate Plot', 'Brownfield Regeneration Site']
  }
};

let propertyCount = 1;

for (let i = 0; i < 20; i++) {
  // Generate Buy
  const locBuy = locations[i % locations.length];
  const agBuy = agents.find(a => a.locs.includes(locBuy.slug)) || agents[0];
  const tBuy = prefixes[locBuy.country].buy[i % 5] + ' ' + (i+1);
  const pBuy = Math.floor(Math.random() * 4000000) + 500000;
  const currBuy = locBuy.curr;
  const imgBuy = images.buy[i % 5];
  
  // Generate Rent
  const locRent = locations[(i + 1) % locations.length];
  const agRent = agents.find(a => a.locs.includes(locRent.slug)) || agents[0];
  const tRent = prefixes[locRent.country].rent[i % 5] + ' ' + (i+1);
  const pRent = Math.floor(Math.random() * 15000) + 1500;
  const currRent = locRent.curr;
  const imgRent = images.rent[i % 5];

  // Generate Land
  const locLand = locations[(i + 2) % locations.length];
  const agLand = agents.find(a => a.locs.includes(locLand.slug)) || agents[0];
  const tLand = prefixes[locLand.country].land[i % 5] + ' ' + (i+1);
  const pLand = Math.floor(Math.random() * 2000000) + 100000;
  const currLand = locLand.curr;
  const imgLand = images.land[i % 5];

  sql += `
    SELECT id INTO loc_id FROM public.locations WHERE slug = '${locBuy.slug}' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = '${agBuy.email}' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('${tBuy}', 'prop-buy-${i}', 'Premium property located in ${locBuy.name}. Fully equipped with modern amenities, perfect for luxury living or high-end investment.', ${pBuy}, '${currBuy}', 'buy', 'available', loc_id, '123 Main St, ${locBuy.name}', ${Math.floor(Math.random() * 5) + 2}, ${Math.floor(Math.random() * 4) + 2}, ${Math.floor(Math.random() * 500) + 100}, '["Pool", "Smart Home", "Security"]'::jsonb, ag_id, ${i%4===0}, '${imgBuy}') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = '${locRent.slug}' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = '${agRent.email}' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('${tRent}', 'prop-rent-${i}', 'Outstanding rental opportunity in ${locRent.name}. Features exceptional finishing, flexible leasing terms, and prime location.', ${pRent}, '${currRent}', 'rent', 'available', loc_id, '456 Rental Ave, ${locRent.name}', ${Math.floor(Math.random() * 4) + 1}, ${Math.floor(Math.random() * 3) + 1}, ${Math.floor(Math.random() * 300) + 50}, '["Furnished", "Gym Access", "Concierge"]'::jsonb, ag_id, false, '${imgRent}') ON CONFLICT (slug) DO NOTHING;
    END IF;

    SELECT id INTO loc_id FROM public.locations WHERE slug = '${locLand.slug}' LIMIT 1;
    SELECT id INTO ag_id FROM public.agents WHERE email = '${agLand.email}' LIMIT 1;
    IF loc_id IS NOT NULL AND ag_id IS NOT NULL THEN
        INSERT INTO public.properties (title, slug, description, price, currency, property_type, status, location_id, address, bedrooms, bathrooms, size_sqm, features, agent_id, featured, cover_image_url)
        VALUES ('${tLand}', 'prop-land-${i}', 'Exceptional land offering in ${locLand.name}. Ready for development with all necessary zoning approvals in place.', ${pLand}, '${currLand}', 'land', 'available', loc_id, '789 Plot Rd, ${locLand.name}', 0, 0, ${Math.floor(Math.random() * 10000) + 1000}, '["Zoned Commercial", "Water Access", "Road Facing"]'::jsonb, ag_id, false, '${imgLand}') ON CONFLICT (slug) DO NOTHING;
    END IF;
  `;
}

sql += `\nEND $$;\n\n`;

// 4. Investment Properties
sql += `-- Insert Fractional Investments\n`;

const investPrefixes = [
  { t: 'London Logistics Fund', loc: 'London, UK', curr: 'GBP' },
  { t: 'New York Retail Park', loc: 'New York City, NY', curr: 'USD' },
  { t: 'Manchester Residential Block', loc: 'Manchester, UK', curr: 'GBP' },
  { t: 'Texas Student Housing', loc: 'Houston, TX', curr: 'USD' },
  { t: 'LA Tech Office Hub', loc: 'Los Angeles, CA', curr: 'USD' }
];

for (let i = 0; i < 20; i++) {
  const p = investPrefixes[i % 5];
  const title = p.t + ' Phase ' + (Math.floor(i/5) + 1);
  const val = Math.floor(Math.random() * 20000000) + 2000000;
  const unit = Math.floor(Math.random() * 5000) + 500;
  
  sql += `
  INSERT INTO public.investment_properties (
      title, slug, description, location, property_type, cover_image_url,
      total_value, unit_price, total_units, units_sold, min_investment,
      projected_return_min, projected_return_max, estimated_rental_yield,
      distribution_frequency, holding_period_months, status, featured
  ) VALUES (
      '${title}', 'inv-prop-${i}', 'Fractional ownership in high-yield commercial/residential assets located in ${p.loc}. Managed by top-tier asset managers with consistent historical performance.', '${p.loc}', '${i%2===0 ? 'commercial' : 'residential'}', '${images.buy[i%5]}',
      ${val}, ${unit}, ${Math.floor(val/unit)}, ${Math.floor((val/unit)*Math.random()*0.8)}, ${unit * 2},
      ${(Math.random() * 5 + 10).toFixed(1)}, ${(Math.random() * 5 + 15).toFixed(1)}, ${(Math.random() * 5 + 5).toFixed(1)},
      '${['monthly', 'quarterly', 'semi_annual', 'annual'][i%4]}', ${[24, 36, 48, 60][i%4]}, 'open', ${i%3===0}
  ) ON CONFLICT (slug) DO NOTHING;
  `;
}

fs.writeFileSync('c:/Users/ADMIN/Documents/New Website/haven-home-hub/supabase/seed_us_uk_expansion.sql', sql);
console.log('Seed generated!');
