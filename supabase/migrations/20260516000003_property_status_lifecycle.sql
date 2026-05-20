-- Migration: Add missing property statuses and sync logic
COMMIT;

ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'awaiting_payment';
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'payment_under_review';

-- Trigger function to automatically mark a property as sold when a reservation is completed
CREATE OR REPLACE FUNCTION sync_property_sold_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If a reservation becomes completed, the property is fully sold
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Standard properties
        IF NEW.property_id IS NOT NULL THEN
            UPDATE public.properties
            SET status = 'sold', updated_at = now()
            WHERE id = NEW.property_id AND status != 'sold';
            
            -- Insert a global ownership record
            INSERT INTO public.ownership_records (
                user_id,
                property_id,
                status,
                purchase_date
            )
            VALUES (
                NEW.user_id,
                NEW.property_id,
                'active',
                now()
            )
            ON CONFLICT (user_id, property_id) DO NOTHING;
        END IF;
    END IF;
    
    -- If reservation is approved, awaiting payment
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        IF NEW.property_id IS NOT NULL THEN
            UPDATE public.properties
            SET status = 'awaiting_payment', updated_at = now()
            WHERE id = NEW.property_id;
        END IF;
    END IF;

    -- If reservation is cancelled or expired, free the property
    IF (NEW.status = 'cancelled' OR NEW.status = 'expired' OR NEW.status = 'rejected') AND (OLD.status != 'cancelled' AND OLD.status != 'expired' AND OLD.status != 'rejected') THEN
        IF NEW.property_id IS NOT NULL THEN
            UPDATE public.properties
            SET status = 'available', updated_at = now()
            WHERE id = NEW.property_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_property_sold ON public.reservations;
CREATE TRIGGER trigger_sync_property_sold
    AFTER UPDATE OF status ON public.reservations
    FOR EACH ROW
    EXECUTE FUNCTION sync_property_sold_status();

-- Ensure payment processing sets payment_under_review
CREATE OR REPLACE FUNCTION sync_property_payment_review()
RETURNS TRIGGER AS $$
BEGIN
    -- If a payment for a reservation goes into processing
    IF NEW.status = 'processing' AND NEW.payment_type = 'reservation' THEN
        IF NEW.property_id IS NOT NULL THEN
            UPDATE public.properties
            SET status = 'payment_under_review', updated_at = now()
            WHERE id = NEW.property_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_property_review ON public.payments;
CREATE TRIGGER trigger_sync_property_review
    AFTER INSERT OR UPDATE OF status ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION sync_property_payment_review();
