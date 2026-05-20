CREATE OR REPLACE FUNCTION public.handle_payment_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_prop_type text;
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
        IF NEW.payment_type = 'reservation' THEN
            -- 1. If property_id exists, update properties
            IF NEW.property_id IS NOT NULL THEN
                UPDATE public.properties
                SET status = 'reserved'
                WHERE id = NEW.property_id;
            END IF;

            -- 2. If investment_property_id exists, we don't necessarily reserve the entire property, 
            -- but we should update the reservations table in either case.
            IF NEW.reservation_id IS NOT NULL THEN
                UPDATE public.reservations
                SET status = 'under_admin_review',
                    reservation_fee_status = 'paid',
                    updated_at = now()
                WHERE id = NEW.reservation_id;
            ELSE
                -- Fallback if reservation_id is missing but we have property_id
                UPDATE public.reservations
                SET status = 'under_admin_review',
                    reservation_fee_status = 'paid',
                    updated_at = now()
                WHERE user_id = NEW.user_id 
                  AND related_id = COALESCE(NEW.property_id, NEW.investment_property_id)
                  AND status IN ('pending', 'awaiting_reservation_fee');
            END IF;
            
            INSERT INTO public.notifications (user_id, title, body, type)
            VALUES (NEW.user_id, 'Reservation Payment Confirmed', 'Your reservation payment has been confirmed. The property is now secured under admin review.', 'payment');
        END IF;

        -- Handle Full Property Payment
        IF NEW.payment_type = 'property' AND NEW.property_id IS NOT NULL THEN
            SELECT property_type INTO v_prop_type FROM public.properties WHERE id = NEW.property_id;
            
            UPDATE public.properties
            SET status = CASE 
                            WHEN v_prop_type = 'rent' THEN 'rented'
                            ELSE 'sold'
                         END
            WHERE id = NEW.property_id;
            
            UPDATE public.reservations
            SET status = 'success',
                updated_at = now()
            WHERE user_id = NEW.user_id AND related_id = NEW.property_id AND status = 'confirmed';
            
            INSERT INTO public.notifications (user_id, title, body, type)
            VALUES (NEW.user_id, 'Property Purchase Confirmed', 'Your full payment has been confirmed. The property is now officially yours.', 'payment');
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

        IF NEW.payment_type = 'reservation' AND NEW.reservation_id IS NOT NULL THEN
            UPDATE public.reservations
            SET reservation_fee_status = 'failed',
                updated_at = now()
            WHERE id = NEW.reservation_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;
