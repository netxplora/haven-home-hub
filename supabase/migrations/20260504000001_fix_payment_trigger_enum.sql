-- Fix: Remove 'confirmed' references from payment trigger.
-- The payment_status enum is: ('pending', 'processing', 'success', 'failed', 'refunded')
-- 'confirmed' belongs to user_investment_status and booking_status, NOT payment_status.
-- The trigger was crashing because PostgreSQL casts string literals to the column's enum type
-- and 'confirmed' is not a valid payment_status value.

CREATE OR REPLACE FUNCTION public.handle_payment_fulfillment()
RETURNS TRIGGER AS $$
DECLARE
  v_units_allocated boolean;
  v_payment_type public.payment_type;
BEGIN
  -- Only proceed if status changed to 'success'
  -- ('confirmed' is NOT a valid payment_status — it belongs to user_investment_status/booking_status)
  IF NEW.status = 'success' AND OLD.status != 'success' THEN
    
    v_payment_type := NEW.payment_type;

    -- 1. Handle Investment fulfillment
    IF v_payment_type = 'investment' AND NEW.investment_id IS NOT NULL THEN
      -- Update user_investments status to 'confirmed' (user_investment_status enum)
      UPDATE public.user_investments 
      SET status = 'confirmed',
          updated_at = now()
      WHERE id = NEW.investment_id;

      -- Notify user
      PERFORM public.create_notification(
        NEW.user_id,
        'investment_confirmed',
        'Investment Confirmed',
        'Your investment of ' || NEW.amount || ' ' || NEW.currency || ' has been confirmed.',
        '/dashboard/investments',
        jsonb_build_object('payment_id', NEW.id, 'investment_id', NEW.investment_id)
      );
    END IF;

    -- 2. Handle Booking fulfillment
    IF v_payment_type = 'booking' AND NEW.booking_id IS NOT NULL THEN
      UPDATE public.bookings
      SET status = 'confirmed',
          updated_at = now()
      WHERE id = NEW.booking_id;

      -- Notify user
      PERFORM public.create_notification(
        NEW.user_id,
        'booking_confirmed',
        'Booking Confirmed',
        'Your property booking/inspection has been confirmed.',
        '/dashboard/bookings',
        jsonb_build_object('payment_id', NEW.id, 'booking_id', NEW.booking_id)
      );
    END IF;

    -- 3. Handle Reservation fulfillment
    IF v_payment_type = 'reservation' AND NEW.property_id IS NOT NULL THEN
      UPDATE public.properties
      SET status = 'reserved',
          updated_at = now()
      WHERE id = NEW.property_id;

      -- Notify user
      PERFORM public.create_notification(
        NEW.user_id,
        'payment_confirmed',
        'Property Reserved',
        'The property has been successfully reserved for you.',
        '/marketplace',
        jsonb_build_object('payment_id', NEW.id, 'property_id', NEW.property_id)
      );
    END IF;

  END IF;

  -- Handle Rejection/Failure Notifications
  IF NEW.status = 'failed' AND OLD.status != 'failed' THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'payment_failed',
      'Payment Failed',
      'Your recent payment proof was rejected or failed. Please contact support or try again.',
      '/dashboard/wallet',
      jsonb_build_object('payment_id', NEW.id, 'reason', NEW.metadata->>'rejection_reason')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
