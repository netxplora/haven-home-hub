-- ============================================================
-- PARTNER COMMISSIONS MIGRATION
-- ============================================================

-- Add ownership and commission tracking to properties
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS ownership_type TEXT DEFAULT 'agency' CHECK (ownership_type IN ('agency', 'partner')),
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 0.00; -- Percentage, e.g., 5.00 for 5%

-- Add ownership and commission tracking to investment_properties (optional, but good for consistency)
ALTER TABLE public.investment_properties
ADD COLUMN IF NOT EXISTS ownership_type TEXT DEFAULT 'agency' CHECK (ownership_type IN ('agency', 'partner')),
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 0.00;
