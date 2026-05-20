CREATE OR REPLACE FUNCTION public.trigger_sync_reservation_from_booking()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_agent_user_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO reservations (user_id, type, related_id, status, agent_id)
    VALUES (NEW.user_id, 'property', NEW.id, 'pending', NEW.agent_id);
    
    -- New booking notification for agent
    IF NEW.agent_id IS NOT NULL THEN
        SELECT user_id INTO v_agent_user_id FROM agents WHERE id = NEW.agent_id;
        
        IF v_agent_user_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, title, body, type)
            VALUES (
                v_agent_user_id,
                'New Inspection Booking',
                'A client has requested an inspection for one of your properties.',
                'system'
            );
        END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
      UPDATE reservations SET status = 'confirmed', agent_id = NEW.agent_id WHERE related_id = NEW.id;
      
      -- Notify User
      IF NEW.user_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, body, type)
        VALUES (NEW.user_id, 'Inspection Confirmed', 'Your property inspection has been confirmed by the agent.', 'booking_confirmed');
      END IF;
      
    ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      UPDATE reservations SET status = 'cancelled', agent_id = NEW.agent_id WHERE related_id = NEW.id;
      
      -- Notify User
      IF NEW.user_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, body, type)
        VALUES (NEW.user_id, 'Inspection Cancelled', 'Your property inspection has been cancelled.', 'system');
      END IF;
      
    ELSE
      UPDATE reservations SET agent_id = NEW.agent_id WHERE related_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
