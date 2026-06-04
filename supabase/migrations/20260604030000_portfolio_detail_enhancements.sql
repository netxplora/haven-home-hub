-- ============================================================
-- Portfolio Detail Enhancements Migration
-- Created: 2026-06-04
-- Purpose:
--   1. Add funding_completed_at to investment_properties
--   2. Update the funding completion trigger to record the date
--   3. Create get_investment_detail_enriched RPC
-- ============================================================


-- ============================================================
-- 1. ADD funding_completed_at COLUMN
-- ============================================================
ALTER TABLE public.investment_properties
ADD COLUMN IF NOT EXISTS funding_completed_at TIMESTAMPTZ;


-- ============================================================
-- 2. UPDATE TRIGGER to record funding_completed_at
--    Re-creates process_property_funding_completion()
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_property_funding_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_inv RECORD;
    v_maturity_date DATE;
BEGIN
    -- Only trigger when status changes to 'funded'
    IF NEW.status = 'funded' AND OLD.status != 'funded' THEN

        -- Record the funding completion timestamp on the property
        NEW.funding_completed_at := now();

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

-- Recreate trigger (BEFORE UPDATE so we can modify NEW)
DROP TRIGGER IF EXISTS on_property_funding_complete ON public.investment_properties;
CREATE TRIGGER on_property_funding_complete
BEFORE UPDATE OF status ON public.investment_properties
FOR EACH ROW
EXECUTE FUNCTION public.process_property_funding_completion();


-- ============================================================
-- 3. get_investment_detail_enriched RPC
--    Returns everything the portfolio detail page needs
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_investment_detail_enriched(p_investment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_inv RECORD;
    v_prop RECORD;
    v_result jsonb;
    v_documents jsonb;
    v_property_documents jsonb;
    v_activity jsonb;
    v_audit_logs jsonb;
    v_payments jsonb;
    v_maturity_progress NUMERIC := 0;
    v_remaining_days INTEGER := 0;
    v_remaining_months INTEGER := 0;
    v_maturity_status TEXT := 'not_started';
    v_start_epoch BIGINT;
    v_end_epoch BIGINT;
    v_now_epoch BIGINT;
BEGIN
    -- Fetch the investment
    SELECT * INTO v_inv
    FROM public.user_investments
    WHERE id = p_investment_id;

    IF v_inv IS NULL THEN
        RAISE EXCEPTION 'Investment not found.';
    END IF;

    -- Access control: owner or admin
    IF v_inv.user_id != auth.uid() AND NOT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    -- Fetch the property
    SELECT * INTO v_prop
    FROM public.investment_properties
    WHERE id = v_inv.property_id;

    -- Calculate maturity progress
    IF v_inv.start_date IS NOT NULL AND v_inv.maturity_date IS NOT NULL THEN
        v_start_epoch := EXTRACT(EPOCH FROM v_inv.start_date::timestamp);
        v_end_epoch := EXTRACT(EPOCH FROM v_inv.maturity_date::timestamp);
        v_now_epoch := EXTRACT(EPOCH FROM now());
        
        IF v_now_epoch >= v_end_epoch THEN
            v_maturity_progress := 100;
            v_remaining_days := 0;
            v_remaining_months := 0;
            v_maturity_status := 'matured';
        ELSIF v_now_epoch <= v_start_epoch THEN
            v_maturity_progress := 0;
            v_remaining_days := CEIL((v_end_epoch - v_start_epoch)::numeric / 86400);
            v_remaining_months := FLOOR(v_remaining_days / 30);
            v_maturity_status := 'not_started';
        ELSE
            v_maturity_progress := LEAST(100, ROUND(((v_now_epoch - v_start_epoch)::numeric / NULLIF(v_end_epoch - v_start_epoch, 0)) * 100, 2));
            v_remaining_days := CEIL((v_end_epoch - v_now_epoch)::numeric / 86400);
            v_remaining_months := FLOOR(v_remaining_days / 30);
            IF v_maturity_progress > 90 THEN
                v_maturity_status := 'nearing_maturity';
            ELSE
                v_maturity_status := 'in_progress';
            END IF;
        END IF;
    END IF;

    -- Fetch signed documents
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', sd.id,
            'document_type', sd.document_type,
            'signed_at', sd.signed_at,
            'signature_data', sd.signature_data,
            'document_snapshot', sd.document_snapshot
        ) ORDER BY sd.signed_at DESC
    ), '[]'::jsonb)
    INTO v_documents
    FROM public.signed_documents sd
    WHERE sd.reference_id = p_investment_id;

    -- Fetch general property documents
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', pd.id,
            'title', pd.title,
            'document_type', pd.document_type,
            'url', pd.url,
            'created_at', pd.created_at
        ) ORDER BY pd.created_at DESC
    ), '[]'::jsonb)
    INTO v_property_documents
    FROM public.property_documents pd
    WHERE pd.property_id = v_inv.property_id;

    -- Fetch recent activity toasts
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', at.id,
            'type', at.type,
            'message', at.message,
            'created_at', at.created_at
        ) ORDER BY at.created_at DESC
    ), '[]'::jsonb)
    INTO v_activity
    FROM (
        SELECT * FROM public.activity_toasts
        WHERE property_id = v_inv.property_id
        ORDER BY created_at DESC
        LIMIT 10
    ) at;

    -- Fetch audit logs
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', pal.id,
            'action_type', pal.action_type,
            'field_changed', pal.field_changed,
            'old_value', pal.old_value,
            'new_value', pal.new_value,
            'admin_id', pal.admin_id,
            'created_at', pal.created_at
        ) ORDER BY pal.created_at DESC
    ), '[]'::jsonb)
    INTO v_audit_logs
    FROM (
        SELECT * FROM public.portfolio_audit_logs
        WHERE investment_id = p_investment_id
        ORDER BY created_at DESC
        LIMIT 20
    ) pal;

    -- Fetch related payments
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', p.id,
            'amount', p.amount,
            'currency', p.currency,
            'status', p.status,
            'payment_type', p.payment_type,
            'provider', p.provider,
            'reference', p.reference,
            'created_at', p.created_at
        ) ORDER BY p.created_at DESC
    ), '[]'::jsonb)
    INTO v_payments
    FROM public.payments p
    WHERE p.investment_id = v_inv.id OR p.user_id = v_inv.user_id;

    -- Build result
    v_result := jsonb_build_object(
        'investment', jsonb_build_object(
            'id', v_inv.id,
            'user_id', v_inv.user_id,
            'property_id', v_inv.property_id,
            'status', v_inv.status,
            'investment_type', v_inv.investment_type,
            'amount_invested', v_inv.amount_invested,
            'total_amount', v_inv.total_amount,
            'units_owned', v_inv.units_owned,
            'accrued_earnings', COALESCE(v_inv.accrued_earnings, 0),
            'withdrawable_balance', COALESCE(v_inv.withdrawable_balance, 0),
            'total_withdrawn', COALESCE(v_inv.total_withdrawn, 0),
            'start_date', v_inv.start_date,
            'maturity_date', v_inv.maturity_date,
            'activated_at', v_inv.activated_at,
            'approved_at', v_inv.approved_at,
            'created_at', v_inv.created_at,
            'updated_at', v_inv.updated_at,
            'payment_id', v_inv.payment_id,
            'admin_notes', v_inv.admin_notes,
            'rejection_reason', v_inv.rejection_reason,
            'secondary_market_enabled', v_inv.secondary_market_enabled,
            'amount_paid', COALESCE(v_inv.amount_paid, 0),
            'remaining_balance', COALESCE(v_inv.remaining_balance, 0),
            'monthly_installment_amount', v_inv.monthly_installment_amount,
            'next_payment_due', v_inv.next_payment_due,
            'down_payment_amount', v_inv.down_payment_amount,
            'completion_percentage', COALESCE(v_inv.completion_percentage, 0),
            'duration_months', v_inv.duration_months
        ),
        'property', jsonb_build_object(
            'id', v_prop.id,
            'slug', v_prop.slug,
            'title', v_prop.title,
            'description', v_prop.description,
            'location', v_prop.location,
            'city', v_prop.city,
            'state', v_prop.state,
            'country', v_prop.country,
            'property_type', v_prop.property_type,
            'property_category', v_prop.property_category,
            'cover_image_url', v_prop.cover_image_url,
            'total_value', v_prop.total_value,
            'unit_price', v_prop.unit_price,
            'total_units', v_prop.total_units,
            'units_sold', v_prop.units_sold,
            'current_funding', v_prop.current_funding,
            'status', v_prop.status,
            'currency', v_prop.currency,
            'projected_return_min', v_prop.projected_return_min,
            'projected_return_max', v_prop.projected_return_max,
            'estimated_rental_yield', v_prop.estimated_rental_yield,
            'distribution_frequency', v_prop.distribution_frequency,
            'holding_period_months', v_prop.holding_period_months,
            'income_model', v_prop.income_model,
            'risk_notes', v_prop.risk_notes,
            'funding_completed_at', v_prop.funding_completed_at
        ),
        'maturity', jsonb_build_object(
            'progress_percent', v_maturity_progress,
            'remaining_days', v_remaining_days,
            'remaining_months', v_remaining_months,
            'status', v_maturity_status
        ),
        'documents', v_documents,
        'property_documents', v_property_documents,
        'activity', v_activity,
        'audit_logs', v_audit_logs,
        'payments', v_payments
    );

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_investment_detail_enriched(uuid) TO authenticated;
