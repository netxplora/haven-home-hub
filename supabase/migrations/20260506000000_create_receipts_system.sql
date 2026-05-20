-- 1. Create Receipts Table
CREATE SEQUENCE IF NOT EXISTS receipts_seq START 1;

CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id TEXT NOT NULL UNIQUE,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT,
    user_email TEXT,
    amount_paid NUMERIC NOT NULL,
    currency TEXT NOT NULL,
    payment_method TEXT,
    transaction_reference TEXT,
    type TEXT,
    metadata JSONB,
    status TEXT DEFAULT 'Confirmed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own receipts" ON public.receipts;
CREATE POLICY "Users can view their own receipts" ON public.receipts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all receipts" ON public.receipts;
CREATE POLICY "Admins can view all receipts" ON public.receipts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
        )
    );

-- Trigger Function
CREATE OR REPLACE FUNCTION generate_receipt_on_payment_success()
RETURNS TRIGGER AS $$
DECLARE
    v_receipt_id TEXT;
    v_user_name TEXT;
    v_user_email TEXT;
BEGIN
    -- Only trigger when payment status becomes 'success'
    IF NEW.status = 'success' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'success') THEN
        
        -- Check if receipt already exists
        IF NOT EXISTS (SELECT 1 FROM public.receipts WHERE payment_id = NEW.id) THEN
            
            -- Generate REC-XXXXXX ID
            v_receipt_id := 'REC-' || to_char(nextval('receipts_seq'), 'FM000000');
            
            -- Fetch user details
            SELECT full_name, email INTO v_user_name, v_user_email FROM public.profiles WHERE id = NEW.user_id;
            
            INSERT INTO public.receipts (
                receipt_id, payment_id, user_id, 
                user_name, user_email, amount_paid, currency, 
                payment_method, transaction_reference, 
                type, metadata
            ) VALUES (
                v_receipt_id, NEW.id, NEW.user_id,
                v_user_name, v_user_email, NEW.amount, NEW.currency,
                NEW.provider, NEW.reference,
                NEW.payment_type, NEW.metadata
            );
            
            -- Optional: insert notification
            INSERT INTO public.notifications (user_id, title, body, type)
            VALUES (NEW.user_id, 'Receipt Generated', 'Your payment receipt ' || v_receipt_id || ' is now available.', 'payment');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger
DROP TRIGGER IF EXISTS on_payment_success_receipt ON public.payments;
CREATE TRIGGER on_payment_success_receipt
    AFTER INSERT OR UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION generate_receipt_on_payment_success();
