-- Migration: Document Processing Notifications for Admins
-- Purpose: Notifies admins when a property is fully purchased so they can prepare ownership documents.

CREATE OR REPLACE FUNCTION notify_admins_on_ownership()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_id uuid;
    v_prop_title text;
    v_user_email text;
BEGIN
    -- Fetch property title
    SELECT title INTO v_prop_title FROM public.properties WHERE id = NEW.property_id;
    
    -- Fetch user email
    SELECT email INTO v_user_email FROM public.profiles WHERE id = NEW.user_id;

    -- Create a notification for all admins
    FOR v_admin_id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin') LOOP
        INSERT INTO public.notifications (
            user_id, type, title, body, link, category, priority
        ) VALUES (
            v_admin_id,
            'system',
            'Property Sold: Documents Required',
            'User ' || COALESCE(v_user_email, 'Unknown') || ' has completed the purchase of "' || COALESCE(v_prop_title, 'Property') || '". Please prepare and upload their Title Insurance and Escrow Instructions.',
            '/admin/documents',
            'financial',
            'high'
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_admins_ownership ON public.ownership_records;
CREATE TRIGGER trigger_notify_admins_ownership
    AFTER INSERT ON public.ownership_records
    FOR EACH ROW
    EXECUTE FUNCTION notify_admins_on_ownership();
