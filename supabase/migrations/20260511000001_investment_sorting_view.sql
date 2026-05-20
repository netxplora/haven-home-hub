-- Migration: Add calculated fields for investment sorting
-- Created: 2026-05-11

-- 1. Create a view for better investment sorting and filtering
CREATE OR REPLACE VIEW public.investment_opportunities_v AS
SELECT 
    *,
    ((projected_return_min + projected_return_max) / 2.0) as roi_avg,
    CASE 
        WHEN total_units > 0 THEN (units_sold::float / total_units::float) * 100 
        ELSE 0 
    END as funding_progress
FROM public.investment_properties;

-- 2. Grant access to the view
GRANT SELECT ON public.investment_opportunities_v TO anon, authenticated;
