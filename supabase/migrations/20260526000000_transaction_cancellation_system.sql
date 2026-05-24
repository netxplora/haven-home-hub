-- Supabase Migration: Transaction Cancellation System
-- Created: 2026-05-26
-- Purpose:
--   1. Add 'cancelled' to payment_status enum
--   2. Extend handle_payment_status_update to sync cancelled state
--   3. Create cancel_payment and cancel_reservation RPCs for investors
--   4. Create admin_delete_payment RPC for history cleanup

-- ============================================================
-- 1. ADD 'cancelled' VALUE TO payment_status ENUM
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'payment_status' AND e.enumlabel = 'cancelled'
    ) THEN
        ALTER TYPE public.payment_status ADD VALUE 'cancelled';
    END IF;
END $$;


-- ============================================================
-- 2. EXTEND SYNC TRIGGER FUNCTION FOR CANCELLATION
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_payment_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_res_status text;
BEGIN
    -- Only act if status changed
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        -- Map payment status to reservation/investment/booking status (for the reservations table sync)
        v_res_status := CASE 
            WHEN NEW.status = 'success' THEN 'confirmed'
            WHEN NEW.status = 'failed' THEN 'failed'
            WHEN NEW.status = 'cancelled' THEN 'cancelled'
            WHEN NEW.status = 'processing' THEN 'processing'
            ELSE 'pending'
        END;

        -- A. Handle success (Fulfillment)
        IF NEW.status = 'success' THEN
            PERFORM public.handle_payment_fulfillment(NEW.id);
        END IF;

        -- Handle processing (Payment under review)
        IF NEW.status = 'processing' THEN
            IF NEW.payment_type = 'investment' AND NEW.investment_id IS NOT NULL THEN
                UPDATE public.user_investments 
                SET status = 'payment_under_review' 
                WHERE id = NEW.investment_id AND status = 'awaiting_payment';
            END IF;
        END IF;

        -- B. Handle failure/cancellation (Reversion & Notification)
        IF NEW.status IN ('failed', 'cancelled') THEN
            -- Revert standard property status if it was a reservation
            IF NEW.payment_type = 'reservation' AND NEW.property_id IS NOT NULL THEN
                UPDATE public.properties SET status = 'available' WHERE id = NEW.property_id;
            END IF;

            -- Revert investment property status if it was a reservation
            IF NEW.payment_type = 'reservation' AND NEW.investment_property_id IS NOT NULL THEN
                UPDATE public.investment_properties SET status = 'open' WHERE id = NEW.investment_property_id;
            END IF;
            
            -- Revert investment status if it was an investment
            IF NEW.payment_type = 'investment' AND NEW.investment_id IS NOT NULL THEN
                UPDATE public.user_investments SET status = 'cancelled' WHERE id = NEW.investment_id;
            END IF;

            IF NEW.status = 'failed' THEN
                PERFORM public.create_notification(
                    NEW.user_id,
                    'payment_failed',
                    'Payment Failed',
                    'Your recent payment was rejected or failed. Please contact support or try again.',
                    '/dashboard/wallet',
                    jsonb_build_object('payment_id', NEW.id, 'reason', NEW.metadata->>'rejection_reason')
                );

                -- Fallback sync for reservation if reservation_id is missing
                IF NEW.payment_type = 'reservation' AND NEW.reservation_id IS NULL THEN
                    UPDATE public.reservations
                    SET reservation_fee_status = 'failed',
                        updated_at = now()
                    WHERE user_id = NEW.user_id 
                      AND related_id = COALESCE(NEW.property_id, NEW.investment_property_id)
                      AND status IN ('pending', 'awaiting_reservation_fee');
                END IF;
            ELSIF NEW.status = 'cancelled' THEN
                PERFORM public.create_notification(
                    NEW.user_id,
                    'payment_failed',
                    'Payment Cancelled',
                    'Your pending payment hold has been successfully cancelled and the property hold released.',
                    '/dashboard?tab=transactions',
                    jsonb_build_object('payment_id', NEW.id)
                );

                -- Fallback sync for reservation if reservation_id is missing
                IF NEW.payment_type = 'reservation' AND NEW.reservation_id IS NULL THEN
                    UPDATE public.reservations
                    SET status = 'cancelled',
                        reservation_fee_status = 'failed',
                        updated_at = now()
                    WHERE user_id = NEW.user_id 
                      AND related_id = COALESCE(NEW.property_id, NEW.investment_property_id)
                      AND status IN ('pending', 'awaiting_reservation_fee');
                END IF;
            END IF;
        END IF;

        -- C. Sync status to reservations table if linked via reservation_id
        IF NEW.reservation_id IS NOT NULL THEN
            BEGIN
                UPDATE public.reservations
                SET status = v_res_status::public.reservation_status,
                    reservation_fee_status = CASE 
                        WHEN NEW.status = 'success' THEN 'paid'::public.payment_fulfillment_status
                        WHEN NEW.status = 'failed' THEN 'failed'::public.payment_fulfillment_status
                        WHEN NEW.status = 'cancelled' THEN 'failed'::public.payment_fulfillment_status
                        ELSE reservation_fee_status
                    END,
                    updated_at = now()
                WHERE id = NEW.reservation_id;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;


-- ============================================================
-- 3. INVESTOR CANCELLATION RPC FUNCTIONS
-- ============================================================

-- A. Cancel pending payment
CREATE OR REPLACE FUNCTION public.cancel_payment(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment record;
BEGIN
    -- Fetch payment
    SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;

    -- Safety checks
    IF v_payment.id IS NULL THEN
        RAISE EXCEPTION 'Payment not found.';
    END IF;

    IF v_payment.user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied. You can only cancel your own payments.';
    END IF;

    IF v_payment.status != 'pending' THEN
        RAISE EXCEPTION 'Only pending payments can be cancelled. Current status: %', v_payment.status;
    END IF;

    -- Perform cancellation
    UPDATE public.payments
    SET status = 'cancelled',
        updated_at = now()
    WHERE id = p_payment_id;
END;
$$;

-- B. Cancel pending/awaiting fee reservation
CREATE OR REPLACE FUNCTION public.cancel_reservation(p_reservation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_res record;
BEGIN
    -- Fetch reservation
    SELECT * INTO v_res FROM public.reservations WHERE id = p_reservation_id;

    -- Safety checks
    IF v_res.id IS NULL THEN
        RAISE EXCEPTION 'Reservation not found.';
    END IF;

    IF v_res.user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied. You can only cancel your own reservations.';
    END IF;

    IF v_res.status NOT IN ('pending', 'awaiting_reservation_fee') THEN
        RAISE EXCEPTION 'Only pending or awaiting payment reservations can be cancelled.';
    END IF;

    -- Revert reservation status
    UPDATE public.reservations
    SET status = 'cancelled',
        updated_at = now()
    WHERE id = p_reservation_id;

    -- Revert property status to available
    IF v_res.property_id IS NOT NULL THEN
        UPDATE public.properties
        SET status = 'available',
            updated_at = now()
        WHERE id = v_res.property_id;
    END IF;

    IF v_res.investment_property_id IS NOT NULL THEN
        UPDATE public.investment_properties
        SET status = 'open',
            updated_at = now()
        WHERE id = v_res.investment_property_id;
    END IF;

    -- Cancel any pending payments associated with this reservation
    UPDATE public.payments
    SET status = 'cancelled',
        updated_at = now()
    WHERE (reservation_id = p_reservation_id OR (user_id = auth.uid() AND (metadata->>'reservation_id' = p_reservation_id::text OR metadata->>'booking_id' = p_reservation_id::text)))
      AND status = 'pending';
END;
$$;


-- ============================================================
-- 4. ADMIN MANUAL HISTORY CLEANUP RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_delete_payment(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify admin role
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Administrator privileges required.';
    END IF;

    -- Delete audit logs, receipts, and payment record
    DELETE FROM public.receipts WHERE payment_id = p_payment_id;
    DELETE FROM public.payment_audit_logs WHERE payment_id = p_payment_id;
    DELETE FROM public.payments WHERE id = p_payment_id;
END;
$$;
