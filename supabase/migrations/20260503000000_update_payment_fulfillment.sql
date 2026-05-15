-- Update the handle_payment_fulfillment function to match the standard statuses: failed and confirmed

CREATE OR REPLACE FUNCTION public.handle_payment_fulfillment()
RETURNS TRIGGER AS $$
DECLARE
  v_units_allocated boolean;
  v_payment_type public.payment_type;
BEGIN
  -- Only proceed if status changed to 'confirmed' or 'success'
  IF (NEW.status = 'confirmed' OR NEW.status = 'success') AND (OLD.status != 'confirmed' AND OLD.status != 'success') THEN
    
    v_payment_type := NEW.payment_type;

    -- 1. Handle Investment
    IF v_payment_type = 'investment' AND NEW.investment_id IS NOT NULL THEN
      -- Update user_investments status
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

    -- 2. Handle Booking
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

    -- 3. Handle Reservation
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
