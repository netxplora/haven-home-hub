CREATE OR REPLACE FUNCTION public.handle_payment_status_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_agent_user_id uuid;
BEGIN
    IF (NEW.status = 'success' AND OLD.status != 'success') THEN
        
        -- Investment
        IF NEW.payment_type = 'investment' AND NEW.investment_property_id IS NOT NULL THEN
            INSERT INTO public.user_investments (
                user_id, property_id, amount_invested, units_owned, status, payment_id
            ) VALUES (
                NEW.user_id, NEW.investment_property_id, NEW.amount,
                COALESCE((NEW.metadata->>'units')::INTEGER, 1), 'confirmed', NEW.id
            );
            UPDATE public.investment_properties
            SET current_funding = current_funding + NEW.amount,
                units_sold = units_sold + COALESCE((NEW.metadata->>'units')::INTEGER, 1)
            WHERE id = NEW.investment_property_id;
            INSERT INTO public.notifications (user_id, title, body, type)
            VALUES (NEW.user_id, 'Investment Confirmed',
              'Your investment payment has been confirmed and units have been allocated to your portfolio.',
              'investment_confirmed');
        END IF;

        -- Property Reservation
        IF NEW.payment_type = 'reservation' AND NEW.property_id IS NOT NULL THEN
            UPDATE public.properties SET status = 'reserved' WHERE id = NEW.property_id;
            
            INSERT INTO public.notifications (user_id, title, body, type)
            VALUES (NEW.user_id, 'Property Reserved',
              'Your reservation payment has been confirmed. The property is now secured for you.',
              'payment_confirmed');
              
            -- Notify Agent
            SELECT a.user_id INTO v_agent_user_id 
            FROM public.properties p 
            JOIN public.agents a ON a.id = p.agent_id 
            WHERE p.id = NEW.property_id;
            
            IF v_agent_user_id IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, title, body, type)
                VALUES (v_agent_user_id, 'Property Reservation Confirmed',
                  'A reservation payment was successfully confirmed for one of your assigned properties.',
                  'system');
            END IF;
        END IF;

        -- Booking
        IF NEW.payment_type = 'booking' AND NEW.booking_id IS NOT NULL THEN
            UPDATE public.bookings SET status = 'confirmed', updated_at = now()
            WHERE id = NEW.booking_id;
            
            INSERT INTO public.notifications (user_id, title, body, type)
            VALUES (NEW.user_id, 'Booking Confirmed',
              'Your booking payment has been confirmed. Your inspection is scheduled.',
              'booking_confirmed');
              
            -- Notify Agent
            SELECT a.user_id INTO v_agent_user_id 
            FROM public.bookings b 
            JOIN public.agents a ON a.id = b.agent_id 
            WHERE b.id = NEW.booking_id;
            
            IF v_agent_user_id IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, title, body, type)
                VALUES (v_agent_user_id, 'Inspection Booking Confirmed',
                  'A client has successfully paid for a booking on one of your properties.',
                  'system');
            END IF;
        END IF;

    END IF;

    -- Failure
    IF NEW.status = 'failed' AND OLD.status != 'failed' THEN
        INSERT INTO public.notifications (user_id, title, body, type)
        VALUES (NEW.user_id, 'Payment Failed',
          'Your recent payment was rejected or failed. Please contact support or try again.',
          'payment_failed');
    END IF;

    RETURN NEW;
END;
$function$;
