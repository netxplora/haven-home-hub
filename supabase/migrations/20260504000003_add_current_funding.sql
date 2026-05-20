-- Add the current_funding column referenced by the payment trigger.
-- Default to 0 for existing rows.
ALTER TABLE public.investment_properties
ADD COLUMN IF NOT EXISTS current_funding numeric NOT NULL DEFAULT 0;
