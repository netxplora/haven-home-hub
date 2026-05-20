-- Update trigger_sync_payment_reservation to support investment property reservations
CREATE OR REPLACE FUNCTION trigger_sync_payment_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  res_id uuid;
  v_rel_id uuid;
  v_type reservation_type;
  v_agent_id uuid;
BEGIN
  -- Determine related_id and type
  IF NEW.booking_id IS NOT NULL THEN
    SELECT id INTO res_id FROM reservations WHERE related_id = NEW.booking_id LIMIT 1;
    NEW.reservation_id := res_id;
    RETURN NEW;
  ELSIF NEW.investment_id IS NOT NULL THEN
    SELECT id INTO res_id FROM reservations WHERE related_id = NEW.investment_id LIMIT 1;
    NEW.reservation_id := res_id;
    RETURN NEW;
  ELSIF NEW.investment_property_id IS NOT NULL AND NEW.payment_type = 'investment' THEN
    v_rel_id := NEW.investment_property_id;
    v_type := 'investment';
  ELSIF NEW.investment_property_id IS NOT NULL AND NEW.payment_type = 'reservation' THEN
    v_rel_id := NEW.investment_property_id;
    v_type := 'investment';
  ELSIF NEW.property_id IS NOT NULL AND NEW.payment_type = 'reservation' THEN
    v_rel_id := NEW.property_id;
    v_type := 'property';
    -- Get agent_id for property
    SELECT agent_id INTO v_agent_id FROM public.properties WHERE id = v_rel_id;
  ELSE
    RETURN NEW;
  END IF;

  -- Try to find existing reservation
  SELECT id INTO res_id FROM reservations 
  WHERE related_id = v_rel_id AND user_id = NEW.user_id AND type = v_type
  LIMIT 1;
  
  -- Create if doesn't exist
  IF res_id IS NULL THEN
      INSERT INTO public.reservations (user_id, type, related_id, status, agent_id)
      VALUES (NEW.user_id, v_type, v_rel_id, 
        CASE 
          WHEN NEW.status = 'success' THEN 'confirmed'::reservation_status 
          ELSE 'pending'::reservation_status 
        END,
        v_agent_id
      )
      RETURNING id INTO res_id;
  END IF;
  
  NEW.reservation_id := res_id;
  
  RETURN NEW;
END;
$$;
