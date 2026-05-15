-- Platform hardening migration: admin_response, reservation expiry, revenue tracking

-- 1. Add admin_response column to inquiries
ALTER TABLE public.inquiries 
ADD COLUMN IF NOT EXISTS admin_response TEXT,
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE;

-- 2. Add reservation expiry support to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS hold_hours INTEGER DEFAULT 48;

-- 3. Create a function to auto-expire stale reservations
CREATE OR REPLACE FUNCTION expire_stale_reservations()
RETURNS void AS $$
BEGIN
    -- Mark pending/processing reservations as failed if past expiry
    UPDATE public.payments
    SET status = 'failed'
    WHERE payment_type = 'reservation'
      AND status IN ('pending', 'processing')
      AND expires_at IS NOT NULL
      AND expires_at < NOW();
      
    -- Also update property status back to available if reservation expires
    UPDATE public.properties p
    SET status = 'available'
    FROM public.payments pay
    WHERE pay.property_id = p.id
      AND pay.payment_type = 'reservation'
      AND pay.status = 'failed'
      AND p.status = 'reserved'
      AND pay.expires_at IS NOT NULL
      AND pay.expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Auto-set expires_at on new reservation payments
CREATE OR REPLACE FUNCTION set_reservation_expiry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_type = 'reservation' AND NEW.expires_at IS NULL THEN
        NEW.expires_at := NOW() + (COALESCE(NEW.hold_hours, 48) || ' hours')::INTERVAL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_reservation_set_expiry ON public.payments;
CREATE TRIGGER on_reservation_set_expiry
    BEFORE INSERT ON public.payments
    FOR EACH ROW
    WHEN (NEW.payment_type = 'reservation')
    EXECUTE FUNCTION set_reservation_expiry();

-- 5. Add property ownership tracking
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved'; -- pending, approved, rejected

-- 6. Enable Supabase Realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.investment_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.receipts;
