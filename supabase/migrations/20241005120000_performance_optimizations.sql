-- Phase 2 Performance Optimizations

-- 1. Create RPC for homepage aggregated data
CREATE OR REPLACE FUNCTION get_homepage_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    featured_props json;
    locations_list json;
    site_content_data json;
    blog_teaser json;
    result json;
BEGIN
    SELECT json_agg(row_to_json(p)) INTO featured_props
    FROM (
        SELECT id, slug, title, price, currency, property_type, property_category, status, bedrooms, bathrooms, size_sqm, cover_image_url, address, city, state, country, featured, created_at, (SELECT row_to_json(l) FROM (SELECT name FROM locations WHERE locations.id = properties.location_id) l) as locations
        FROM properties
        WHERE featured = true AND status IN ('available', 'reserved')
        ORDER BY featured_order ASC, featured_at DESC
        LIMIT 8
    ) p;

    SELECT json_agg(row_to_json(l)) INTO locations_list
    FROM (
        SELECT id, name, slug FROM locations ORDER BY name
    ) l;

    SELECT json_agg(row_to_json(s)) INTO site_content_data
    FROM (
        SELECT * FROM site_content
    ) s;

    SELECT json_agg(row_to_json(b)) INTO blog_teaser
    FROM (
        SELECT id, slug, title, excerpt, cover_image_url, published_at, (SELECT row_to_json(bc) FROM (SELECT name FROM blog_categories WHERE blog_categories.id = blog_posts.category_id) bc) as blog_categories
        FROM blog_posts
        WHERE status = 'published'
        ORDER BY published_at DESC
        LIMIT 3
    ) b;

    SELECT json_build_object(
        'featured_properties', COALESCE(featured_props, '[]'::json),
        'locations', COALESCE(locations_list, '[]'::json),
        'site_content', COALESCE(site_content_data, '[]'::json),
        'blog_posts', COALESCE(blog_teaser, '[]'::json)
    ) INTO result;

    RETURN result;
END;
$$;

-- 2. Create RPC for property filter metadata
CREATE OR REPLACE FUNCTION get_property_filter_metadata(country_filter text DEFAULT NULL, state_filter text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'countries', COALESCE((SELECT json_agg(DISTINCT country) FROM properties WHERE country IS NOT NULL), '[]'::json),
        'states', COALESCE((
            SELECT json_agg(DISTINCT state) 
            FROM properties 
            WHERE state IS NOT NULL 
            AND (country_filter IS NULL OR country_filter = 'all' OR country = country_filter)
        ), '[]'::json),
        'cities', COALESCE((
            SELECT json_agg(DISTINCT city) 
            FROM properties 
            WHERE city IS NOT NULL 
            AND (
                (state_filter IS NOT NULL AND state_filter != 'all' AND state = state_filter)
                OR 
                ((state_filter IS NULL OR state_filter = 'all') AND (country_filter IS NULL OR country_filter = 'all' OR country = country_filter))
            )
        ), '[]'::json)
    ) INTO result;
    
    RETURN result;
END;
$$;

-- 3. Create RPC for invest filter metadata
CREATE OR REPLACE FUNCTION get_invest_filter_metadata()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'countries', COALESCE((SELECT json_agg(DISTINCT country) FROM investment_properties WHERE country IS NOT NULL), '[]'::json),
        'cities', COALESCE((SELECT json_agg(DISTINCT city) FROM investment_properties WHERE city IS NOT NULL), '[]'::json)
    ) INTO result;
    
    RETURN result;
END;
$$;

-- 4. Apply composite and regular indexes
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_location_id ON properties(location_id);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_location_composite ON properties(country, state, city);
CREATE INDEX IF NOT EXISTS idx_properties_featured ON properties(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_investment_properties_location_composite ON investment_properties(country, city);
