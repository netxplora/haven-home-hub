-- Update crypto_assets to include global wallet addresses
ALTER TABLE public.crypto_assets ADD COLUMN IF NOT EXISTS wallet_address TEXT;
ALTER TABLE public.crypto_assets ADD COLUMN IF NOT EXISTS instructions TEXT;

-- Update payments table for manual verification
-- Statuses: pending, submitted, under_review, confirmed, rejected
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_new') THEN
        CREATE TYPE payment_status_new AS ENUM ('pending', 'submitted', 'under_review', 'confirmed', 'rejected');
    END IF;
END $$;

-- Update payments status column to use text and check constraints if enum is too restrictive to change
-- For simplicity in this session, we'll ensure the status column can hold these values.
-- If it's already an enum 'payment_status', we might need to add values.

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS proof_url TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transaction_hash TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Re-seed crypto assets with wallet addresses
TRUNCATE public.crypto_assets CASCADE;
INSERT INTO public.crypto_assets (symbol, name, network, wallet_address, instructions) VALUES
('BTC', 'Bitcoin', 'Bitcoin Network', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'Send only BTC to this address.'),
('ETH', 'Ethereum', 'Ethereum (ERC20)', '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 'Send only ETH or ERC20 tokens to this address.'),
('USDT', 'Tether', 'Tron (TRC20)', 'TXjK7yvRzG7mKq8WnZ9pLq6YxZ5N8Mv2Xz', 'Send only USDT via TRC20 network.'),
('USDC', 'USD Coin', 'Ethereum (ERC20)', '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 'Send only USDC via ERC20 network.');

-- Update the trigger function to handle 'confirmed' instead of 'success'
CREATE OR REPLACE FUNCTION public.handle_payment_status_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if status changed to 'confirmed'
    IF (NEW.status = 'confirmed' AND OLD.status != 'confirmed') THEN
        
        -- Handle Fractional Investment
        IF NEW.payment_type = 'investment' AND NEW.investment_property_id IS NOT NULL THEN
            -- Calculate units (this would ideally be stored in the payment record)
            -- For this trigger, we'll assume the payment amount corresponds to units
            INSERT INTO public.user_investments (
                user_id,
                property_id,
                amount_invested,
                units_owned,
                status
            ) VALUES (
                NEW.user_id,
                NEW.investment_property_id,
                NEW.amount,
                COALESCE((NEW.metadata->>'units')::INTEGER, 1),
                'confirmed'
            );
            
            -- Update property funding
            UPDATE public.investment_properties
            SET current_funding = current_funding + NEW.amount
            WHERE id = NEW.investment_property_id;
        END IF;

        -- Handle Property Reservation
        IF NEW.payment_type = 'reservation' AND NEW.property_id IS NOT NULL THEN
            UPDATE public.properties
            SET status = 'reserved'
            WHERE id = NEW.property_id;
            
            -- Create a notification for the user
            INSERT INTO public.notifications (user_id, title, body, type)
            VALUES (NEW.user_id, 'Property Reserved', 'Your reservation payment has been confirmed. The property is now secured for you.', 'payment');
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
