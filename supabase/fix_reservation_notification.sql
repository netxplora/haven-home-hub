-- Step 1: Add 'reservation_confirmed' to the notification_type enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'reservation_confirmed';

-- Step 2: Replace approve_reservation to use the correct enum value
CREATE OR REPLACE FUNCTION public.approve_reservation(p_reservation_id uuid, p_admin_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid;
    v_property_title text;
BEGIN
    -- Get reservation details
    SELECT r.user_id INTO v_user_id
    FROM public.reservations r
    WHERE r.id = p_reservation_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Reservation not found';
    END IF;

    -- Update reservation status
    UPDATE public.reservations
    SET status = 'confirmed',
        admin_notes = COALESCE(p_admin_notes, admin_notes),
        updated_at = now()
    WHERE id = p_reservation_id;

    -- Send notification using the correct enum value
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (
        v_user_id,
        'reservation_confirmed',
        'Reservation Approved',
        COALESCE(p_admin_notes, 'Your reservation has been approved. You may now proceed with your payment.')
    );
END;
$function$;

-- Step 3: Replace reject_reservation to use correct enum value and parameter name
DROP FUNCTION IF EXISTS public.reject_reservation(uuid, text);
CREATE OR REPLACE FUNCTION public.reject_reservation(p_reservation_id uuid, p_admin_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid;
BEGIN
    SELECT r.user_id INTO v_user_id
    FROM public.reservations r
    WHERE r.id = p_reservation_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Reservation not found';
    END IF;

    UPDATE public.reservations
    SET status = 'rejected',
        admin_notes = COALESCE(p_admin_notes, admin_notes),
        updated_at = now()
    WHERE id = p_reservation_id;

    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (
        v_user_id,
        'system',
        'Reservation Not Approved',
        COALESCE(p_admin_notes, 'Unfortunately, your reservation request was not approved at this time.')
    );
END;
$function$;

-- Step 4: Replace request_info_reservation to use correct enum value and parameter name
DROP FUNCTION IF EXISTS public.request_info_reservation(uuid, text);
CREATE OR REPLACE FUNCTION public.request_info_reservation(p_reservation_id uuid, p_admin_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid;
BEGIN
    SELECT r.user_id INTO v_user_id
    FROM public.reservations r
    WHERE r.id = p_reservation_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Reservation not found';
    END IF;

    UPDATE public.reservations
    SET status = 'information_requested',
        admin_notes = COALESCE(p_admin_notes, admin_notes),
        updated_at = now()
    WHERE id = p_reservation_id;

    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (
        v_user_id,
        'system',
        'Additional Information Requested',
        COALESCE(p_admin_notes, 'Our team has requested additional information for your reservation. Please check your dashboard.')
    );
END;
$function$;
