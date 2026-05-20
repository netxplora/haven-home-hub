-- Fix payment fulfillment trigger to check for 'confirmed' instead of 'success'
-- to match the new unified status ENUM 'payment_status'

CREATE OR REPLACE FUNCTION public.handle_payment_status_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Check if payment is confirmed
    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
        
        -- Handle Investment Allocation
        IF NEW.payment_type = 'investment' AND NEW.investment_property_id IS NOT NULL THEN
            -- Update or insert user investment
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
            
            -- Update property funding progress
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
            VALUES (NEW.user_id, 'Property Reserved', 'Your reservation payment has been confirmed. The property is now secured for you.', 'payment_confirmed');
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
        VALUES (NEW.user_id, 'Payment Failed', 'Your recent payment was rejected or failed. Please contact support or try again.', 'payment_failed');
    END IF;

    RETURN NEW;
END;
$function$;
