-- Migration: Unified User Transactions View
-- Description: Creates a unified view for both primary payments and secondary market transactions to enable proper pagination

CREATE OR REPLACE VIEW public.unified_user_transactions AS
SELECT 
    p.id as transaction_id,
    p.user_id,
    p.created_at,
    p.payment_type::text,
    p.status::text,
    p.amount,
    p.currency,
    p.provider::text as payment_method,
    p.reference,
    p.property_id,
    p.investment_id,
    false as is_marketplace,
    NULL::integer as units_traded,
    NULL::numeric as price_per_unit,
    pr.title as property_title,
    ip.title as investment_property_title
FROM public.payments p
LEFT JOIN public.properties pr ON p.property_id = pr.id
LEFT JOIN public.investment_properties ip ON p.property_id = ip.id

UNION ALL

SELECT
    smt.id as transaction_id,
    smt.buyer_id as user_id,
    smt.created_at,
    'marketplace_buy' as payment_type,
    'success' as status,
    (smt.units_traded * smt.price_per_unit) as amount,
    COALESCE(ip.currency, 'USD') as currency,
    smt.payment_method::text,
    'TX-' || UPPER(SUBSTRING(smt.id::text FROM 1 FOR 8)) as reference,
    sml.property_id,
    sml.investment_id,
    true as is_marketplace,
    smt.units_traded,
    smt.price_per_unit,
    NULL as property_title,
    COALESCE(ip.title, 'Marketplace Trade') as investment_property_title
FROM public.secondary_market_transactions smt
JOIN public.secondary_market_listings sml ON smt.listing_id = sml.id
LEFT JOIN public.investment_properties ip ON sml.property_id = ip.id

UNION ALL

SELECT
    smt.id as transaction_id,
    smt.seller_id as user_id,
    smt.created_at,
    'marketplace_sell' as payment_type,
    'success' as status,
    (smt.units_traded * smt.price_per_unit) as amount,
    COALESCE(ip.currency, 'USD') as currency,
    smt.payment_method::text,
    'TX-' || UPPER(SUBSTRING(smt.id::text FROM 1 FOR 8)) as reference,
    sml.property_id,
    sml.investment_id,
    true as is_marketplace,
    smt.units_traded,
    smt.price_per_unit,
    NULL as property_title,
    COALESCE(ip.title, 'Marketplace Trade') as investment_property_title
FROM public.secondary_market_transactions smt
JOIN public.secondary_market_listings sml ON smt.listing_id = sml.id
LEFT JOIN public.investment_properties ip ON sml.property_id = ip.id;
