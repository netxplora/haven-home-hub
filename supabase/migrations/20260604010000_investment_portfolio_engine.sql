-- ============================================================
-- Investment Portfolio Engine & Audit Layer
-- Created: 2026-06-04
-- Purpose:
--   1. Create portfolio_audit_logs for full change tracking
--   2. Automatic audit trigger on user_investments changes
--   3. Enhanced get_investor_portfolio_summary RPC
--   4. get_portfolio_growth_history RPC for charts
-- ============================================================


-- ============================================================
-- 1. PORTFOLIO AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.portfolio_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    investment_id UUID REFERENCES public.user_investments(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'transfer', 'status_change'
    field_changed TEXT,
    old_value TEXT,
    new_value TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.portfolio_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all audit logs
CREATE POLICY "Admins can view all audit logs" ON public.portfolio_audit_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs" ON public.portfolio_audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- System (triggers) can insert
CREATE POLICY "System can insert audit logs" ON public.portfolio_audit_logs
    FOR INSERT WITH CHECK (true);

-- Admins can insert audit logs
CREATE POLICY "Admins can insert audit logs" ON public.portfolio_audit_logs
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );


-- ============================================================
-- 2. AUTOMATIC AUDIT TRIGGER ON user_investments
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_investment_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_id UUID;
    v_action TEXT;
BEGIN
    -- Try to detect if an admin is making this change
    BEGIN
        SELECT auth.uid() INTO v_admin_id;
        IF v_admin_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.user_roles WHERE user_id = v_admin_id AND role = 'admin'
        ) THEN
            v_admin_id := NULL; -- Not admin, just the user themselves
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_admin_id := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.portfolio_audit_logs (investment_id, user_id, admin_id, action_type, field_changed, new_value)
        VALUES (NEW.id, NEW.user_id, v_admin_id, 'create', 'investment', 
                jsonb_build_object('status', NEW.status, 'units', NEW.units_owned, 'amount', COALESCE(NEW.total_amount, NEW.amount_invested))::text);
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        -- Track status changes
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            INSERT INTO public.portfolio_audit_logs (investment_id, user_id, admin_id, action_type, field_changed, old_value, new_value)
            VALUES (NEW.id, NEW.user_id, v_admin_id, 'status_change', 'status', OLD.status, NEW.status);
        END IF;

        -- Track units changes
        IF NEW.units_owned IS DISTINCT FROM OLD.units_owned THEN
            INSERT INTO public.portfolio_audit_logs (investment_id, user_id, admin_id, action_type, field_changed, old_value, new_value)
            VALUES (NEW.id, NEW.user_id, v_admin_id, 'update', 'units_owned', OLD.units_owned::text, NEW.units_owned::text);
        END IF;

        -- Track amount changes
        IF NEW.amount_invested IS DISTINCT FROM OLD.amount_invested THEN
            INSERT INTO public.portfolio_audit_logs (investment_id, user_id, admin_id, action_type, field_changed, old_value, new_value)
            VALUES (NEW.id, NEW.user_id, v_admin_id, 'update', 'amount_invested', OLD.amount_invested::text, NEW.amount_invested::text);
        END IF;

        -- Track accrued earnings changes
        IF NEW.accrued_earnings IS DISTINCT FROM OLD.accrued_earnings THEN
            INSERT INTO public.portfolio_audit_logs (investment_id, user_id, admin_id, action_type, field_changed, old_value, new_value)
            VALUES (NEW.id, NEW.user_id, v_admin_id, 'update', 'accrued_earnings', COALESCE(OLD.accrued_earnings, 0)::text, COALESCE(NEW.accrued_earnings, 0)::text);
        END IF;

        -- Track start_date changes
        IF NEW.start_date IS DISTINCT FROM OLD.start_date THEN
            INSERT INTO public.portfolio_audit_logs (investment_id, user_id, admin_id, action_type, field_changed, old_value, new_value)
            VALUES (NEW.id, NEW.user_id, v_admin_id, 'update', 'start_date', OLD.start_date::text, NEW.start_date::text);
        END IF;

        -- Track maturity_date changes
        IF NEW.maturity_date IS DISTINCT FROM OLD.maturity_date THEN
            INSERT INTO public.portfolio_audit_logs (investment_id, user_id, admin_id, action_type, field_changed, old_value, new_value)
            VALUES (NEW.id, NEW.user_id, v_admin_id, 'update', 'maturity_date', OLD.maturity_date::text, NEW.maturity_date::text);
        END IF;

        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.portfolio_audit_logs (investment_id, user_id, admin_id, action_type, field_changed, old_value)
        VALUES (OLD.id, OLD.user_id, v_admin_id, 'delete', 'investment',
                jsonb_build_object('status', OLD.status, 'units', OLD.units_owned, 'amount', COALESCE(OLD.total_amount, OLD.amount_invested))::text);
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_user_investments ON public.user_investments;
CREATE TRIGGER audit_user_investments
    AFTER INSERT OR UPDATE OR DELETE ON public.user_investments
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_investment_changes();


-- ============================================================
-- 3. ENHANCED get_investor_portfolio_summary RPC
--    Replaces frontend calculations with DB truth
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_investor_portfolio_summary(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_total_invested NUMERIC := 0;
    v_total_accrued NUMERIC := 0;
    v_total_returns NUMERIC := 0;
    v_active_count INTEGER := 0;
    v_pending_count INTEGER := 0;
    v_completed_count INTEGER := 0;
    v_total_units INTEGER := 0;
    v_nav NUMERIC := 0;
    v_roi_percent NUMERIC := 0;
    v_projected_min NUMERIC := 0;
    v_projected_max NUMERIC := 0;
BEGIN
    -- Access control: user can query own, admin can query any
    IF p_user_id != auth.uid() AND NOT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    -- Active/confirmed totals
    SELECT
        COALESCE(SUM(COALESCE(ui.total_amount, ui.amount_invested, 0)), 0),
        COALESCE(SUM(COALESCE(ui.accrued_earnings, 0)), 0),
        COALESCE(SUM(ui.units_owned), 0)
    INTO v_total_invested, v_total_accrued, v_total_units
    FROM public.user_investments ui
    WHERE ui.user_id = p_user_id
      AND ui.status IN ('active', 'confirmed', 'completed');

    -- Active count
    SELECT COUNT(*) INTO v_active_count
    FROM public.user_investments
    WHERE user_id = p_user_id AND status IN ('active', 'confirmed');

    -- Pending count
    SELECT COUNT(*) INTO v_pending_count
    FROM public.user_investments
    WHERE user_id = p_user_id AND status IN ('awaiting_payment', 'payment_under_review', 'pending');

    -- Completed count
    SELECT COUNT(*) INTO v_completed_count
    FROM public.user_investments
    WHERE user_id = p_user_id AND status = 'completed';

    -- Returns from payouts
    SELECT COALESCE(SUM(amount_received), 0) INTO v_total_returns
    FROM public.returns
    WHERE user_id = p_user_id;

    -- NAV = invested + accrued + returns
    v_nav := v_total_invested + v_total_accrued + v_total_returns;

    -- ROI %
    IF v_total_invested > 0 THEN
        v_roi_percent := ROUND(((v_total_accrued + v_total_returns) / v_total_invested) * 100, 2);
    END IF;

    -- Weighted projected returns
    SELECT
        COALESCE(
            SUM(COALESCE(ui.total_amount, ui.amount_invested, 0) * ip.projected_return_min) /
            NULLIF(SUM(COALESCE(ui.total_amount, ui.amount_invested, 0)), 0), 0
        ),
        COALESCE(
            SUM(COALESCE(ui.total_amount, ui.amount_invested, 0) * ip.projected_return_max) /
            NULLIF(SUM(COALESCE(ui.total_amount, ui.amount_invested, 0)), 0), 0
        )
    INTO v_projected_min, v_projected_max
    FROM public.user_investments ui
    JOIN public.investment_properties ip ON ip.id = ui.property_id
    WHERE ui.user_id = p_user_id
      AND ui.status IN ('active', 'confirmed');

    RETURN jsonb_build_object(
        'nav', v_nav,
        'total_invested', v_total_invested,
        'total_accrued', v_total_accrued,
        'total_returns', v_total_returns,
        'total_earnings', v_total_accrued + v_total_returns,
        'roi_percent', v_roi_percent,
        'active_investments', v_active_count,
        'pending_investments', v_pending_count,
        'completed_investments', v_completed_count,
        'total_units_owned', v_total_units,
        'projected_return_min', ROUND(v_projected_min, 2),
        'projected_return_max', ROUND(v_projected_max, 2)
    );
END;
$$;


-- ============================================================
-- 4. PORTFOLIO GROWTH HISTORY RPC
--    Returns monthly snapshots for the chart
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_portfolio_growth_history(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_result jsonb := '[]'::jsonb;
    v_month RECORD;
    v_invested NUMERIC;
    v_accrued NUMERIC;
BEGIN
    -- Access control
    IF p_user_id != auth.uid() AND NOT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    -- Generate last 6 months
    FOR v_month IN
        SELECT generate_series(
            date_trunc('month', CURRENT_DATE - interval '5 months'),
            date_trunc('month', CURRENT_DATE),
            interval '1 month'
        ) AS month_start
    LOOP
        -- Sum invested amount for investments created before or during this month
        SELECT
            COALESCE(SUM(COALESCE(ui.total_amount, ui.amount_invested, 0)), 0),
            COALESCE(SUM(COALESCE(ui.accrued_earnings, 0)), 0)
        INTO v_invested, v_accrued
        FROM public.user_investments ui
        WHERE ui.user_id = p_user_id
          AND ui.status IN ('active', 'confirmed', 'completed')
          AND ui.created_at <= (v_month.month_start + interval '1 month');

        v_result := v_result || jsonb_build_object(
            'month', to_char(v_month.month_start, 'Mon'),
            'year', to_char(v_month.month_start, 'YYYY'),
            'invested', v_invested,
            'value', v_invested + v_accrued
        );
    END LOOP;

    RETURN v_result;
END;
$$;


-- ============================================================
-- 5. GRANT PERMISSIONS
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_investor_portfolio_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_portfolio_growth_history(uuid) TO authenticated;
