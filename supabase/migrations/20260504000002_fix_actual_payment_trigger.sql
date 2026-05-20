-- Fix the ACTUAL live trigger 'on_payment_status_update' which calls handle_payment_status_update().
-- The previous migration fixed handle_payment_fulfillment() but that trigger was never applied.
-- The real trigger was comparing NEW.status = 'confirmed' which crashes because
-- 'confirmed' is not in the payment_status enum: ('pending','processing','success','failed','refunded').

DROP TRIGGER IF EXISTS on_payment_status_update ON public.payments;

CREATE OR REPLACE FUNCTION public.handle_payment_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Only proceed if status changed to 'success' (valid payment_status enum)
    IF (NEW.status = 'success' AND OLD.status != 'success') THEN
        
        -- Handle Fractional Investment
        IF NEW.payment_type = 'investment' AND NEW.investment_property_id IS NOT NULL THEN
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
            
            UPDATE public.investment_properties
            SET current_funding = current_funding + NEW.amount
            WHERE id = NEW.investment_property_id;
        END IF;

        -- Handle Property Reservation
        IF NEW.payment_type = 'reservation' AND NEW.property_id IS NOT NULL THEN
            UPDATE public.properties
            SET status = 'reserved'
            WHERE id = NEW.property_id;
            
            INSERT INTO public.notifications (user_id, title, body, type)
            VALUES (NEW.user_id, 'Property Reserved', 'Your reservation payment has been confirmed. The property is now secured for you.', 'payment');
        END IF;

        -- Handle Booking
        IF NEW.payment_type = 'booking' AND NEW.booking_id IS NOT NULL THEN
            UPDATE public.bookings
            SET status = 'confirmed',
                updated_at = now()
            WHERE id = NEW.booking_id;
        END IF;

    END IF;

    -- Handle failure notifications
    IF NEW.status = 'failed' AND OLD.status != 'failed' THEN
        INSERT INTO public.notifications (user_id, title, body, type)
        VALUES (NEW.user_id, 'Payment Failed', 'Your recent payment was rejected or failed. Please contact support or try again.', 'payment');
    END IF;

    RETURN NEW;
END;
$function$;

CREATE TRIGGER on_payment_status_update
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_payment_status_update();
