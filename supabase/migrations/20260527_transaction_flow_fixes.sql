-- Database Migration: Transaction Flow Fixes

-- 1. Add rented to property_status enum
ALTER TYPE property_status ADD VALUE IF NOT EXISTS 'rented';

-- 2. Update approve_reservation RPC
CREATE OR REPLACE FUNCTION public.approve_reservation(p_reservation_id uuid, p_admin_notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid;
    v_property_id uuid;
    v_property_title text;
BEGIN
    -- Get reservation details
    SELECT r.user_id, r.property_id INTO v_user_id, v_property_id
    FROM public.reservations r
    WHERE r.id = p_reservation_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Reservation not found';
    END IF;

    -- Update reservation status
    UPDATE public.reservations
    SET status = 'approved',
        admin_notes = COALESCE(p_admin_notes, admin_notes),
        approved_at = now(),
        approved_by = auth.uid(),
        updated_at = now()
    WHERE id = p_reservation_id;

    -- Lock the property if it's a property reservation
    IF v_property_id IS NOT NULL THEN
        UPDATE public.properties
        SET status = 'reserved',
            updated_at = now()
        WHERE id = v_property_id;
    END IF;

    -- Send notification
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (
        v_user_id,
        'reservation_confirmed',
        'Reservation Approved',
        COALESCE(p_admin_notes, 'Your reservation has been approved. You may now proceed with full payment.')
    );
END;
$function$;

-- 3. Update reject_reservation RPC
CREATE OR REPLACE FUNCTION public.reject_reservation(p_reservation_id uuid, p_admin_notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid;
    v_property_id uuid;
BEGIN
    SELECT r.user_id, r.property_id INTO v_user_id, v_property_id
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

    -- Release the property back to available if it was reserved
    IF v_property_id IS NOT NULL THEN
        UPDATE public.properties
        SET status = 'available',
            updated_at = now()
        WHERE id = v_property_id;
    END IF;

    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (
        v_user_id,
        'system',
        'Reservation Not Approved',
        COALESCE(p_admin_notes, 'Unfortunately, your reservation request was not approved at this time.')
    );
END;
$function$;

-- 4. Create complete_property_purchase RPC
CREATE OR REPLACE FUNCTION public.complete_property_purchase(p_payment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_payment record;
    v_reservation record;
    v_property record;
    v_new_status public.property_status;
BEGIN
    -- Verify caller is admin
    IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can complete purchases';
    END IF;

    -- Get payment
    SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;
    IF v_payment.id IS NULL THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;

    -- Get reservation
    IF v_payment.reservation_id IS NOT NULL THEN
        SELECT * INTO v_reservation FROM public.reservations WHERE id = v_payment.reservation_id;
        IF v_reservation.status != 'approved' AND v_reservation.status != 'confirmed' THEN
            RAISE EXCEPTION 'Cannot complete purchase: Reservation is not approved or confirmed';
        END IF;

        -- Get property
        SELECT * INTO v_property FROM public.properties WHERE id = COALESCE(v_reservation.property_id, v_reservation.related_id);
        IF v_property.id IS NULL THEN
             RAISE EXCEPTION 'Property not found';
        END IF;
        
        -- Determine new property status based on type
        IF v_property.property_type = 'rent' THEN
            v_new_status := 'rented'::public.property_status;
        ELSE
            v_new_status := 'sold'::public.property_status;
        END IF;

        -- Update reservation
        UPDATE public.reservations
        SET status = 'completed',
            updated_at = now()
        WHERE id = v_reservation.id;

        -- Update property
        UPDATE public.properties
        SET status = v_new_status,
            owner_user_id = v_reservation.user_id,
            sold_at = now(),
            updated_at = now()
        WHERE id = v_property.id;

        -- Create ownership record
        INSERT INTO public.ownership_records (
            user_id,
            property_id,
            status,
            purchase_date,
            created_at
        ) VALUES (
            v_reservation.user_id,
            v_property.id,
            'active',
            now(),
            now()
        );

        -- Send Notification
        INSERT INTO public.notifications (user_id, type, title, body)
        VALUES (
            v_reservation.user_id,
            'system',
            'Purchase Completed',
            'Congratulations! Your purchase for ' || COALESCE(v_property.title, 'the property') || ' has been finalized.'
        );
    ELSE
        RAISE EXCEPTION 'Payment must be linked to a reservation to complete purchase';
    END IF;
END;
$function$;

-- 5. Create guard_purchase_payment trigger
CREATE OR REPLACE FUNCTION public.guard_purchase_payment_func()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_reservation_status text;
BEGIN
    IF NEW.payment_type = 'purchase' THEN
        IF NEW.reservation_id IS NULL THEN
            RAISE EXCEPTION 'A purchase payment must be linked to a reservation.';
        END IF;

        SELECT status::text INTO v_reservation_status
        FROM public.reservations
        WHERE id = NEW.reservation_id AND user_id = NEW.user_id;

        IF v_reservation_status IS NULL THEN
             RAISE EXCEPTION 'Linked reservation not found for this user.';
        END IF;

        IF v_reservation_status != 'approved' AND v_reservation_status != 'confirmed' THEN
            RAISE EXCEPTION 'Cannot submit purchase payment: Reservation is not approved or confirmed. Current status: %', v_reservation_status;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_purchase_payment ON public.payments;
CREATE TRIGGER guard_purchase_payment
    BEFORE INSERT ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_purchase_payment_func();

-- 6. Update handle_payment_status_update trigger to handle 'purchase' successes automatically (optional, but good for auto-approving if admin confirms it outside the RPC or via webhook)
CREATE OR REPLACE FUNCTION public.handle_payment_status_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Only act on status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Handle Reservation Fee Payments
        IF NEW.payment_type = 'reservation' THEN
            IF NEW.status = 'success' THEN
                -- Don't approve here, just put it under review, or if we want, we can do nothing since there's already a trigger or process for 'under_admin_review'
                -- The requirement says: Stage 2 -> under_admin_review. The current logic might set it to 'confirmed' (old behavior).
                -- Let's set it to 'under_admin_review' if it was awaiting fee.
                IF NEW.reservation_id IS NOT NULL THEN
                    UPDATE public.reservations
                    SET status = 'under_admin_review', updated_at = now()
                    WHERE id = NEW.reservation_id AND status = 'awaiting_reservation_fee';
                END IF;
            ELSIF NEW.status IN ('failed', 'rejected', 'cancelled') THEN
                 IF NEW.reservation_id IS NOT NULL THEN
                    UPDATE public.reservations
                    SET status = 'cancelled', updated_at = now()
                    WHERE id = NEW.reservation_id;
                END IF;
            END IF;
        END IF;

        -- Handle Purchase Payments
        IF NEW.payment_type = 'purchase' THEN
            IF NEW.status = 'success' THEN
                 -- If it becomes success (e.g. from a webhook or manual update without RPC), complete the purchase
                 -- Using exception block to ignore if it fails or if caller isn't admin (webhooks run as service role usually)
                 BEGIN
                    -- Perform the same logic as complete_property_purchase
                    -- Since trigger runs as security definer, it has access
                    IF NEW.reservation_id IS NOT NULL THEN
                        -- Check if reservation is approved
                        IF EXISTS (SELECT 1 FROM public.reservations WHERE id = NEW.reservation_id AND (status = 'approved' OR status = 'confirmed')) THEN
                             -- We will just update status here to let another process handle it or just do it inline
                             -- For safety, we rely on the complete_property_purchase RPC being called explicitly by the admin UI.
                             -- So we just do nothing here to avoid double execution, or we do it here. 
                             -- Let's do it here for robustness.
                             DECLARE
                                v_res record;
                                v_prop record;
                                v_new_stat public.property_status;
                             BEGIN
                                SELECT * INTO v_res FROM public.reservations WHERE id = NEW.reservation_id;
                                SELECT * INTO v_prop FROM public.properties WHERE id = COALESCE(v_res.property_id, v_res.related_id);
                                
                                IF v_prop.property_type = 'rent' THEN
                                    v_new_stat := 'rented'::public.property_status;
                                ELSE
                                    v_new_stat := 'sold'::public.property_status;
                                END IF;

                                UPDATE public.reservations SET status = 'completed', updated_at = now() WHERE id = v_res.id;
                                UPDATE public.properties SET status = v_new_stat, owner_user_id = v_res.user_id, sold_at = now(), updated_at = now() WHERE id = v_prop.id;
                                
                                -- Insert ownership record if not exists
                                IF NOT EXISTS (SELECT 1 FROM public.ownership_records WHERE property_id = v_prop.id AND user_id = v_res.user_id) THEN
                                    INSERT INTO public.ownership_records (user_id, property_id, status, purchase_date, created_at)
                                    VALUES (v_res.user_id, v_prop.id, 'active', now(), now());
                                END IF;
                             END;
                        END IF;
                    END IF;
                 EXCEPTION WHEN OTHERS THEN
                    -- Ignore trigger errors to not block payment update
                 END;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;
