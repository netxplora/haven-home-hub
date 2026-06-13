INSERT INTO public.regions (
    name, country, state_province, city, slug, status, is_featured,
    short_description, market_outlook, growth_commentary, investment_notes,
    population_growth, infrastructure_score, rental_demand, property_appreciation, employment_growth, investment_score,
    category, cover_image_url, display_order
) VALUES
(
    'Miami, Florida', 'USA', 'Florida', 'Miami', 'miami-florida', 'published', true,
    'A thriving international hub with strong inbound migration and booming luxury developments.',
    'The Miami real estate market continues to attract global capital, driven by favorable tax policies, high quality of life, and robust tech/finance sector growth.',
    'Population growth is consistently outpacing the national average. Major infrastructure upgrades, including new transit links and port expansions, are fueling long-term value.',
    'Focus on prime waterfront properties and high-density mixed-use developments in the downtown corridor. Yields remain strong despite price appreciation.',
    '+1.8% YoY', 'Expanding', 'Very High', '+8.5% YoY', '+3.2%', '9.1/10',
    'Luxury Market', '/regions/region_major_city_skyline_1781281501942.png', 1
),
(
    'Austin, Texas', 'USA', 'Texas', 'Austin', 'austin-texas', 'published', true,
    'America''s premier technology migration destination, offering high yields and rapid economic expansion.',
    'Austin''s housing market has stabilized into a sustainable growth phase after explosive pandemic-era gains. Corporate relocations continue to drive high-income renter demand.',
    'The "Silicon Hills" effect continues to draw talent. Infrastructure is racing to catch up with population density, creating opportunities in transit-oriented developments.',
    'Multifamily assets in the northern suburbs and tech corridors offer the best risk-adjusted returns. Look for properties with proximity to major tech campuses.',
    '+2.1% YoY', 'Developing', 'High', '+4.2% YoY', '+4.5%', '8.8/10',
    'Technology Hub', '/regions/region_transport_infrastructure_1781281533677.png', 2
),
(
    'Denver, Colorado', 'USA', 'Colorado', 'Denver', 'denver-colorado', 'published', true,
    'A balanced market blending high quality of life with steady economic diversification.',
    'Denver offers a stable investment environment characterized by constrained housing supply and strong demand from young professionals seeking lifestyle amenities.',
    'Transit-oriented development around the RTD light rail system remains a key growth driver. The aerospace and clean energy sectors are providing high-wage employment stability.',
    'Class-B value-add multifamily properties provide excellent yield opportunities. The suburban rental market remains exceptionally tight.',
    '+1.2% YoY', 'High', 'Strong', '+5.1% YoY', '+2.8%', '8.5/10',
    'Emerging Market', '/regions/region_development_1781281576904.png', 3
),
(
    'Nashville, Tennessee', 'USA', 'Tennessee', 'Nashville', 'nashville-tennessee', 'published', true,
    'A culturally rich metropolis experiencing unprecedented corporate investment and demographic shifts.',
    'Nashville''s economy has diversified significantly beyond entertainment, emerging as a healthcare and corporate headquarters hub.',
    'The urban core is seeing massive vertical development, while the surrounding counties are capturing families seeking more space. Infrastructure investments are prioritizing the urban-suburban connection.',
    'Build-to-rent communities in the greater MSA are performing exceptionally well. Urban core condos offer strong short-term rental yields.',
    '+1.9% YoY', 'Improving', 'Very High', '+6.8% YoY', '+3.9%', '8.9/10',
    'Residential', '/regions/region_major_city_skyline_1781281501942.png', 4
)
ON CONFLICT (slug) DO NOTHING;
