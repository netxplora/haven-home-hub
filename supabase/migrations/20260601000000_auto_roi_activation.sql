-- Migration: Add trigger to automatically activate ROI tracking when property funding reaches 100%

CREATE OR REPLACE FUNCTION public.process_property_funding_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_inv RECORD;
    v_maturity_date DATE;
BEGIN
    -- Only trigger when status changes to 'funded'
    IF NEW.status = 'funded' AND OLD.status != 'funded' THEN
        
        -- Loop through all confirmed user investments for this property
        FOR v_inv IN 
            SELECT id, user_id 
            FROM public.user_investments 
            WHERE property_id = NEW.id AND status = 'confirmed'
        LOOP
            -- Calculate maturity date
            v_maturity_date := CURRENT_DATE + (COALESCE(NEW.holding_period_months, 12) || ' months')::interval;

            -- Update user investment
            UPDATE public.user_investments
            SET status = 'active',
                start_date = CURRENT_DATE,
                maturity_date = v_maturity_date,
                activated_at = now()
            WHERE id = v_inv.id;

            -- Create Notification
            INSERT INTO public.notifications (user_id, type, title, body, category)
            VALUES (
                v_inv.user_id,
                'investment_active',
                'ROI Tracking Started: ' || NEW.title,
                'Congratulations! ' || NEW.title || ' has reached full funding. Your investment is now active and ROI tracking has begun. Maturity date: ' || to_char(v_maturity_date, 'Mon DD, YYYY') || '.',
                'investment'
            );
        END LOOP;
        
        -- Add a global activity toast for the property being fully funded
        INSERT INTO public.activity_toasts (type, message, property_id)
        VALUES (
            'fractional',
            NEW.title || ' is now fully funded!',
            NEW.id
        );
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_property_funding_complete ON public.investment_properties;
CREATE TRIGGER on_property_funding_complete
AFTER UPDATE OF status ON public.investment_properties
FOR EACH ROW
EXECUTE FUNCTION public.process_property_funding_completion();
