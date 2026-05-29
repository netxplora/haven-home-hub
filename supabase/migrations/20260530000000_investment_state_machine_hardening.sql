-- ============================================================
-- Investment State Machine Hardening Migration
-- Created: 2026-05-30
-- Purpose:
--   1. Add 'rejected' to user_investment_status enum
--   2. Create atomic cancel_investment RPC (releases units)
--   3. Create admin reject_investment RPC (releases units + notifies)
--   4. Create admin refund_investment RPC (releases units + notifies)
--   5. Fix payment status trigger to release units on failure/cancellation
--   6. Create calculate_portfolio_roi RPC
--   7. Create admin pause/resume campaign RPCs
--   8. Create admin adjust_investment_allocation RPC
-- ============================================================


-- ============================================================
-- 1. ADD MISSING ENUM VALUES
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'user_investment_status' AND e.enumlabel = 'rejected'
    ) THEN
        ALTER TYPE public.user_investment_status ADD VALUE 'rejected';
    END IF;
END $$;


-- ============================================================
-- 2. ATOMIC CANCEL INVESTMENT RPC (Investor-facing)
--    Cancels investment + releases reserved units atomically
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_investment(p_investment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inv record;
BEGIN
    -- Lock and fetch the investment
    SELECT * INTO v_inv
    FROM public.user_investments
    WHERE id = p_investment_id
    FOR UPDATE;

    IF v_inv.id IS NULL THEN
        RAISE EXCEPTION 'Investment not found.';
    END IF;

    -- Only the owner can cancel their own investment
    IF v_inv.user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied. You can only cancel your own investments.';
    END IF;

    -- Only allow cancellation of pre-active investments
    IF v_inv.status NOT IN ('awaiting_payment', 'pending', 'payment_under_review') THEN
        RAISE EXCEPTION 'Only pending or awaiting payment investments can be cancelled. Current status: %', v_inv.status;
    END IF;

    -- 1. Update investment status
    UPDATE public.user_investments
    SET status = 'cancelled',
        updated_at = now()
    WHERE id = p_investment_id;

    -- 2. Release reserved units back to property pool
    PERFORM public.release_investment_units(v_inv.property_id, v_inv.units_owned);

    -- 3. Cancel any associated pending/processing payments
    UPDATE public.payments
    SET status = 'cancelled',
        updated_at = now()
    WHERE investment_id = p_investment_id
      AND status IN ('pending', 'processing');

    -- 4. Cancel associated pending investment schedules
    UPDATE public.investment_schedules
    SET status = 'cancelled'
    WHERE investment_id = p_investment_id
      AND status IN ('pending', 'awaiting_payment');

    -- 5. Notify the user
    INSERT INTO public.notifications (user_id, type, title, body, link, category, priority)
    VALUES (
        v_inv.user_id,
        'investment',
        'Investment Cancelled',
        'Your investment commitment has been cancelled and the reserved units have been released.',
        '/dashboard?tab=investments',
        'financial',
        'normal'
    );
END;
$$;


-- ============================================================
-- 3. ADMIN REJECT INVESTMENT RPC
--    Rejects a pending investment + releases units + notifies user
-- ============================================================
CREATE OR REPLACE FUNCTION public.reject_investment(
    p_investment_id uuid,
    p_reason text DEFAULT 'Investment application did not meet approval criteria.'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inv record;
    v_prop_title text;
BEGIN
    -- Verify admin role
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Administrator privileges required.';
    END IF;

    -- Lock and fetch the investment
    SELECT ui.*, ip.title INTO v_inv
    FROM public.user_investments ui
    JOIN public.investment_properties ip ON ip.id = ui.property_id
    WHERE ui.id = p_investment_id
    FOR UPDATE OF ui;

    IF v_inv.id IS NULL THEN
        RAISE EXCEPTION 'Investment not found.';
    END IF;

    -- Only reject non-active investments
    IF v_inv.status IN ('active', 'completed') THEN
        RAISE EXCEPTION 'Cannot reject an already active or completed investment.';
    END IF;

    v_prop_title := v_inv.title;

    -- 1. Update investment status to rejected
    UPDATE public.user_investments
    SET status = 'rejected',
        updated_at = now()
    WHERE id = p_investment_id;

    -- 2. Release reserved units
    PERFORM public.release_investment_units(v_inv.property_id, v_inv.units_owned);

    -- 3. Cancel associated payments
    UPDATE public.payments
    SET status = 'failed',
        updated_at = now(),
        metadata = metadata || jsonb_build_object('rejection_reason', p_reason)
    WHERE investment_id = p_investment_id
      AND status IN ('pending', 'processing');

    -- 4. Cancel associated schedules
    UPDATE public.investment_schedules
    SET status = 'cancelled'
    WHERE investment_id = p_investment_id
      AND status IN ('pending', 'awaiting_payment');

    -- 5. Notify user
    INSERT INTO public.notifications (user_id, type, title, body, link, category, priority)
    VALUES (
        v_inv.user_id,
        'investment',
        'Investment Application Rejected',
        'Your investment application for "' || COALESCE(v_prop_title, 'a property') || '" was not approved. Reason: ' || p_reason,
        '/dashboard?tab=investments',
        'financial',
        'high'
    );
END;
$$;


-- ============================================================
-- 4. ADMIN REFUND INVESTMENT RPC
--    Refunds an active investment + releases units + notifies user
-- ============================================================
CREATE OR REPLACE FUNCTION public.refund_investment(
    p_investment_id uuid,
    p_reason text DEFAULT 'Investment refund processed by administrator.'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inv record;
    v_prop_title text;
BEGIN
    -- Verify admin role
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Administrator privileges required.';
    END IF;

    -- Lock and fetch the investment
    SELECT ui.*, ip.title INTO v_inv
    FROM public.user_investments ui
    JOIN public.investment_properties ip ON ip.id = ui.property_id
    WHERE ui.id = p_investment_id
    FOR UPDATE OF ui;

    IF v_inv.id IS NULL THEN
        RAISE EXCEPTION 'Investment not found.';
    END IF;

    IF v_inv.status = 'refunded' THEN
        RAISE EXCEPTION 'Investment has already been refunded.';
    END IF;

    v_prop_title := v_inv.title;

    -- 1. Update investment status
    UPDATE public.user_investments
    SET status = 'refunded',
        updated_at = now()
    WHERE id = p_investment_id;

    -- 2. Release units back to property pool
    PERFORM public.release_investment_units(v_inv.property_id, v_inv.units_owned);

    -- 3. Mark associated payments as refunded
    UPDATE public.payments
    SET status = 'refunded',
        updated_at = now(),
        metadata = metadata || jsonb_build_object('refund_reason', p_reason, 'refunded_at', now()::text)
    WHERE investment_id = p_investment_id
      AND status IN ('pending', 'processing', 'success');

    -- 4. Cancel associated schedules
    UPDATE public.investment_schedules
    SET status = 'cancelled'
    WHERE investment_id = p_investment_id
      AND status IN ('pending', 'awaiting_payment');

    -- 5. Notify user
    INSERT INTO public.notifications (user_id, type, title, body, link, category, priority)
    VALUES (
        v_inv.user_id,
        'investment',
        'Investment Refund Processed',
        'Your investment in "' || COALESCE(v_prop_title, 'a property') || '" has been refunded. Reason: ' || p_reason || '. The refund will be processed to your original payment method.',
        '/dashboard?tab=investments',
        'financial',
        'high'
    );
END;
$$;


-- ============================================================
-- 5. FIX PAYMENT STATUS TRIGGER TO RELEASE UNITS
--    When payment fails/cancelled, release investment units
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_payment_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_res_status text;
    v_inv_units integer;
    v_inv_property_id uuid;
BEGIN
    -- Only act if status changed
    IF NEW.status IS DISTINCT FROM OLD.status THEN
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

        -- B. Handle failure/cancellation (Reversion, Unit Release & Notification)
        IF NEW.status IN ('failed', 'cancelled') THEN
            -- Revert standard property status if it was a reservation
            IF NEW.payment_type = 'reservation' AND NEW.property_id IS NOT NULL THEN
                UPDATE public.properties SET status = 'available' WHERE id = NEW.property_id;
            END IF;

            -- Revert investment property status if it was a reservation
            IF NEW.payment_type = 'reservation' AND NEW.investment_property_id IS NOT NULL THEN
                UPDATE public.investment_properties SET status = 'open' WHERE id = NEW.investment_property_id;
            END IF;
            
            -- Revert investment status AND release units if it was an investment
            IF NEW.payment_type = 'investment' AND NEW.investment_id IS NOT NULL THEN
                -- Fetch units and property from the investment for rollback
                SELECT units_owned, property_id 
                INTO v_inv_units, v_inv_property_id
                FROM public.user_investments 
                WHERE id = NEW.investment_id
                  AND status IN ('awaiting_payment', 'payment_under_review', 'pending');

                IF v_inv_units IS NOT NULL AND v_inv_property_id IS NOT NULL THEN
                    -- Cancel the investment
                    UPDATE public.user_investments 
                    SET status = 'cancelled' 
                    WHERE id = NEW.investment_id;

                    -- Release units back to the property pool
                    PERFORM public.release_investment_units(v_inv_property_id, v_inv_units);
                END IF;
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
-- 6. CALCULATE PORTFOLIO ROI RPC
--    Returns aggregated portfolio metrics for a user
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_portfolio_roi(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_total_invested numeric := 0;
    v_total_returns numeric := 0;
    v_active_count integer := 0;
    v_total_units integer := 0;
    v_pending_count integer := 0;
    v_outstanding_balance numeric := 0;
    v_roi_percent numeric := 0;
    v_projected_annual_min numeric := 0;
    v_projected_annual_max numeric := 0;
BEGIN
    -- Verify access: user can only query their own portfolio, admin can query any
    IF p_user_id != auth.uid() AND NOT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    -- Active investments totals
    SELECT 
        COALESCE(SUM(COALESCE(ui.total_amount, ui.amount_invested)), 0),
        COUNT(*),
        COALESCE(SUM(ui.units_owned), 0),
        COALESCE(SUM(CASE WHEN ui.investment_type = 'installment' THEN COALESCE(ui.remaining_balance, 0) ELSE 0 END), 0)
    INTO v_total_invested, v_active_count, v_total_units, v_outstanding_balance
    FROM public.user_investments ui
    WHERE ui.user_id = p_user_id
      AND ui.status IN ('active', 'confirmed', 'completed');

    -- Pending investments count
    SELECT COUNT(*) INTO v_pending_count
    FROM public.user_investments
    WHERE user_id = p_user_id
      AND status IN ('awaiting_payment', 'payment_under_review', 'pending');

    -- Total returns received
    SELECT COALESCE(SUM(amount_received), 0) INTO v_total_returns
    FROM public.returns
    WHERE user_id = p_user_id;

    -- Calculate actual ROI
    IF v_total_invested > 0 THEN
        v_roi_percent := ROUND((v_total_returns / v_total_invested) * 100, 2);
    END IF;

    -- Calculate weighted projected return range
    SELECT 
        COALESCE(
            SUM(COALESCE(ui.total_amount, ui.amount_invested) * ip.projected_return_min) / 
            NULLIF(SUM(COALESCE(ui.total_amount, ui.amount_invested)), 0),
            0
        ),
        COALESCE(
            SUM(COALESCE(ui.total_amount, ui.amount_invested) * ip.projected_return_max) / 
            NULLIF(SUM(COALESCE(ui.total_amount, ui.amount_invested)), 0),
            0
        )
    INTO v_projected_annual_min, v_projected_annual_max
    FROM public.user_investments ui
    JOIN public.investment_properties ip ON ip.id = ui.property_id
    WHERE ui.user_id = p_user_id
      AND ui.status IN ('active', 'confirmed');

    RETURN jsonb_build_object(
        'total_invested', v_total_invested,
        'total_returns', v_total_returns,
        'roi_percent', v_roi_percent,
        'active_investments', v_active_count,
        'pending_investments', v_pending_count,
        'total_units_owned', v_total_units,
        'outstanding_balance', v_outstanding_balance,
        'projected_return_min', ROUND(v_projected_annual_min, 2),
        'projected_return_max', ROUND(v_projected_annual_max, 2)
    );
END;
$$;


-- ============================================================
-- 7. ADMIN CAMPAIGN CONTROLS
-- ============================================================

-- Pause an investment campaign
CREATE OR REPLACE FUNCTION public.pause_investment_campaign(p_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Administrator privileges required.';
    END IF;

    UPDATE public.investment_properties
    SET status = 'paused', updated_at = now()
    WHERE id = p_property_id AND status = 'open';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Property not found or not in open status.';
    END IF;
END;
$$;

-- Resume an investment campaign
CREATE OR REPLACE FUNCTION public.resume_investment_campaign(p_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Administrator privileges required.';
    END IF;

    UPDATE public.investment_properties
    SET status = 'open', updated_at = now()
    WHERE id = p_property_id AND status = 'paused';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Property not found or not in paused status.';
    END IF;
END;
$$;


-- ============================================================
-- 8. ADMIN ADJUST ALLOCATION RPC
--    Manually adjust units for off-platform corrections
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_adjust_investment_allocation(
    p_investment_id uuid,
    p_new_units integer,
    p_reason text DEFAULT 'Manual allocation adjustment by administrator.'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inv record;
    v_diff integer;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Administrator privileges required.';
    END IF;

    IF p_new_units < 1 THEN
        RAISE EXCEPTION 'Units must be at least 1.';
    END IF;

    -- Lock the investment
    SELECT * INTO v_inv
    FROM public.user_investments
    WHERE id = p_investment_id
    FOR UPDATE;

    IF v_inv.id IS NULL THEN
        RAISE EXCEPTION 'Investment not found.';
    END IF;

    v_diff := p_new_units - v_inv.units_owned;

    IF v_diff > 0 THEN
        -- Allocating more units — check availability
        IF NOT (SELECT public.allocate_investment_units(v_inv.property_id, v_diff)) THEN
            RAISE EXCEPTION 'Not enough available units to increase allocation.';
        END IF;
    ELSIF v_diff < 0 THEN
        -- Releasing units
        PERFORM public.release_investment_units(v_inv.property_id, ABS(v_diff));
    END IF;

    -- Update the investment record
    UPDATE public.user_investments
    SET units_owned = p_new_units,
        amount_invested = p_new_units * (
            SELECT unit_price FROM public.investment_properties WHERE id = v_inv.property_id
        ),
        total_amount = p_new_units * (
            SELECT unit_price FROM public.investment_properties WHERE id = v_inv.property_id
        ),
        updated_at = now()
    WHERE id = p_investment_id;

    -- Log the adjustment as a notification
    INSERT INTO public.notifications (user_id, type, title, body, link, category, priority)
    VALUES (
        v_inv.user_id,
        'investment',
        'Investment Allocation Updated',
        'Your investment allocation has been adjusted from ' || v_inv.units_owned || ' to ' || p_new_units || ' units. Reason: ' || p_reason,
        '/dashboard?tab=investments',
        'financial',
        'high'
    );
END;
$$;


-- ============================================================
-- 9. GRANT PERMISSIONS
-- ============================================================
-- Investor-facing RPCs
GRANT EXECUTE ON FUNCTION public.cancel_investment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_portfolio_roi(uuid) TO authenticated;

-- Admin-only RPCs (service_role for edge functions, authenticated for admin UI)
GRANT EXECUTE ON FUNCTION public.reject_investment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_investment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pause_investment_campaign(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resume_investment_campaign(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_investment_allocation(uuid, integer, text) TO authenticated;
