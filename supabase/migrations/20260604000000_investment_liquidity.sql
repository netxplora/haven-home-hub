-- Add secondary market functionality to user investments
ALTER TABLE public.user_investments 
ADD COLUMN IF NOT EXISTS secondary_market_enabled BOOLEAN DEFAULT false;

-- Add a comment for context
COMMENT ON COLUMN public.user_investments.secondary_market_enabled IS 'Indicates if the investor is allowed to list these units on the secondary market.';
