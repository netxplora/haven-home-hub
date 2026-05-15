-- Create crypto_assets table to manage supported cryptocurrencies
CREATE TABLE IF NOT EXISTS public.crypto_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL UNIQUE, -- e.g., BTC, ETH, USDT
    name TEXT NOT NULL, -- e.g., Bitcoin, Ethereum, Tether
    network TEXT NOT NULL, -- e.g., Bitcoin, Ethereum (ERC20), Tron (TRC20)
    contract_address TEXT, -- For tokens
    is_active BOOLEAN DEFAULT true,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on crypto_assets
ALTER TABLE public.crypto_assets ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active crypto assets
CREATE POLICY "Allow public read of active crypto assets" 
ON public.crypto_assets FOR SELECT 
USING (is_active = true);

-- Add some default assets
INSERT INTO public.crypto_assets (symbol, name, network) VALUES
('BTC', 'Bitcoin', 'Bitcoin'),
('ETH', 'Ethereum', 'Ethereum (ERC20)'),
('USDT', 'Tether', 'Ethereum (ERC20)'),
('USDT', 'Tether', 'Tron (TRC20)'),
('USDC', 'USD Coin', 'Ethereum (ERC20)')
ON CONFLICT (symbol) DO NOTHING;

-- Extend payments table with more crypto metadata if needed (already has basic fields)
-- Ensure RLS allows users to see their own payments
CREATE POLICY "Users can view their own crypto payments"
ON public.payments FOR SELECT
USING (auth.uid() = user_id);

-- Create a function to handle payment status changes and trigger side effects
CREATE OR REPLACE FUNCTION public.handle_payment_status_update()
RETURNS TRIGGER AS $$
BEGIN
    -- If payment becomes success, trigger business logic
    IF NEW.status = 'success' AND OLD.status != 'success' THEN
        -- Handle Investment Unit Allocation
        IF NEW.payment_type = 'investment' AND NEW.investment_property_id IS NOT NULL THEN
            INSERT INTO public.user_investments (user_id, property_id, amount_invested, status)
            VALUES (NEW.user_id, NEW.investment_property_id, NEW.amount, 'confirmed');
            
            -- Update units_sold in investment_properties
            UPDATE public.investment_properties 
            SET units_sold = units_sold + (NEW.amount / unit_price)
            WHERE id = NEW.investment_property_id;
        END IF;

        -- Handle Property Booking/Reservation Confirmation
        IF NEW.payment_type IN ('booking', 'reservation') AND NEW.property_id IS NOT NULL THEN
            UPDATE public.properties 
            SET status = 'reserved'
            WHERE id = NEW.property_id;
            
            IF NEW.booking_id IS NOT NULL THEN
                UPDATE public.bookings 
                SET status = 'confirmed'
                WHERE id = NEW.booking_id;
            END IF;
        END IF;

        -- Notify user
        INSERT INTO public.notifications (user_id, title, body, type)
        VALUES (NEW.user_id, 'Payment Confirmed', 'Your payment of ' || NEW.amount || ' ' || NEW.currency || ' has been verified.', 'payment_confirmed');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for payment status updates
CREATE TRIGGER on_payment_status_update
AFTER UPDATE OF status ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_payment_status_update();
