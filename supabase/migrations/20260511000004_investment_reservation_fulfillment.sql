-- Update investment_status enum to include 'reserved'
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'investment_status' AND e.enumlabel = 'reserved') THEN 
        ALTER TYPE investment_status ADD VALUE 'reserved'; 
    END IF; 
END $$;

-- Update handle_payment_fulfillment to support investment property reservations
CREATE OR REPLACE FUNCTION handle_payment_fulfillment(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment record;
BEGIN
    -- Fetch the payment record
    SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;
    
    -- Safety check: only proceed if status is success
    IF v_payment.status != 'success' THEN
        RETURN;
    END IF;

    -- 1. Handle Investment fulfillment
    IF v_payment.payment_type = 'investment' AND v_payment.investment_id IS NOT NULL THEN
        -- Update user_investments status to 'confirmed'
        UPDATE public.user_investments 
        SET status = 'confirmed',
            updated_at = now()
        WHERE id = v_payment.investment_id;

        -- Notify user
        PERFORM public.create_notification(
            v_payment.user_id,
            'investment_confirmed',
            'Investment Confirmed',
            'Your investment of ' || v_payment.amount || ' ' || v_payment.currency || ' has been confirmed.',
            '/dashboard/investments',
            jsonb_build_object('payment_id', v_payment.id, 'investment_id', v_payment.investment_id)
        );
    END IF;

    -- 2. Handle Booking fulfillment
    IF v_payment.payment_type = 'booking' AND v_payment.booking_id IS NOT NULL THEN
        -- Update bookings status to 'confirmed'
        UPDATE public.bookings
        SET status = 'confirmed',
            updated_at = now()
        WHERE id = v_payment.booking_id;

        -- Notify user
        PERFORM public.create_notification(
            v_payment.user_id,
            'booking_confirmed',
            'Booking Confirmed',
            'Your property booking/inspection has been confirmed.',
            '/dashboard/bookings',
            jsonb_build_object('payment_id', v_payment.id, 'booking_id', v_payment.booking_id)
        );
    END IF;

    -- 3. Handle Property Reservation fulfillment (Standard)
    IF v_payment.payment_type = 'reservation' AND v_payment.property_id IS NOT NULL THEN
        -- Update properties status to 'reserved'
        UPDATE public.properties
        SET status = 'reserved',
            updated_at = now()
        WHERE id = v_payment.property_id;

        -- Notify user
        PERFORM public.create_notification(
            v_payment.user_id,
            'payment_confirmed',
            'Property Reserved',
            'The property has been successfully reserved for you.',
            '/marketplace',
            jsonb_build_object('payment_id', v_payment.id, 'property_id', v_payment.property_id)
        );
    END IF;

    -- 4. Handle Investment Property Reservation fulfillment
    IF v_payment.payment_type = 'reservation' AND v_payment.investment_property_id IS NOT NULL THEN
        -- Update investment properties status to 'reserved'
        UPDATE public.investment_properties
        SET status = 'reserved',
            updated_at = now()
        WHERE id = v_payment.investment_property_id;

        -- Notify user
        PERFORM public.create_notification(
            v_payment.user_id,
            'payment_confirmed',
            'Investment Property Reserved',
            'The investment property has been successfully reserved for you for 48 hours.',
            '/dashboard?tab=reservations',
            jsonb_build_object('payment_id', v_payment.id, 'investment_property_id', v_payment.investment_property_id)
        );
    END IF;
END;
$$;

-- Update handle_payment_status_update to handle reversion for investment property reservations
CREATE OR REPLACE FUNCTION handle_payment_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_res_status text;
BEGIN
    -- Only act if status changed
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        -- Map payment status to reservation/investment/booking status (for the reservations table sync)
        v_res_status := CASE 
            WHEN NEW.status = 'success' THEN 'confirmed'
            WHEN NEW.status = 'failed' THEN 'failed'
            WHEN NEW.status = 'processing' THEN 'processing'
            ELSE 'pending'
        END;

        -- A. Handle success (Fulfillment)
        IF NEW.status = 'success' THEN
            PERFORM public.handle_payment_fulfillment(NEW.id);
        END IF;

        -- B. Handle failure (Reversion & Notification)
        IF NEW.status = 'failed' THEN
            -- Revert standard property status if it was a reservation
            IF NEW.payment_type = 'reservation' AND NEW.property_id IS NOT NULL THEN
                UPDATE public.properties SET status = 'available' WHERE id = NEW.property_id;
            END IF;

            -- Revert investment property status if it was a reservation
            IF NEW.payment_type = 'reservation' AND NEW.investment_property_id IS NOT NULL THEN
                UPDATE public.investment_properties SET status = 'open' WHERE id = NEW.investment_property_id;
            END IF;
            
            -- Revert investment status if it was an investment
            IF NEW.payment_type = 'investment' AND NEW.investment_id IS NOT NULL THEN
                UPDATE public.user_investments SET status = 'cancelled' WHERE id = NEW.investment_id;
            END IF;

            -- Notify user of failure
            PERFORM public.create_notification(
                NEW.user_id,
                'payment_failed',
                'Payment Failed',
                'Your recent payment proof was rejected or failed. Please contact support or try again.',
                '/dashboard/wallet',
                jsonb_build_object('payment_id', NEW.id, 'reason', NEW.metadata->>'rejection_reason')
            );
        END IF;

        -- C. Sync status to reservations table if linked via reservation_id
        IF NEW.reservation_id IS NOT NULL THEN
            BEGIN
                UPDATE public.reservations
                SET status = v_res_status::public.reservation_status,
                    updated_at = now()
                WHERE id = NEW.reservation_id;
            EXCEPTION WHEN OTHERS THEN
                -- If reservation_status enum mismatch or other error, fallback to text if possible or ignore
                NULL;
            END;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
