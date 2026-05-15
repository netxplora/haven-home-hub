-- Fix for receipt generation trigger: get email from auth.users

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
            SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
            SELECT email INTO v_user_email FROM auth.users WHERE id = NEW.user_id;
            
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
            
            -- Insert notification
            INSERT INTO public.notifications (user_id, title, body, type, category, priority, action_url)
            VALUES (
                NEW.user_id, 
                'Receipt Generated', 
                'Your payment receipt ' || v_receipt_id || ' is now available.', 
                'payment_confirmed',
                'financial',
                'normal',
                '/dashboard?tab=receipts'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
