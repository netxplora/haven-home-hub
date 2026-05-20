-- Migration: Investment Management RPCs & System Configuration
-- Created: 2026-05-14
-- Purpose: Create missing admin RPCs for investment approval/rejection,
--          create system_configs table, and add auto-close trigger.

-- ============================================================
-- 1. INVESTMENT MANAGEMENT RPCs
-- ============================================================

-- 1a. Approve an investment application
CREATE OR REPLACE FUNCTION public.approve_investment(p_investment_id uuid, p_admin_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid;
    v_property_title text;
BEGIN
    -- Get investment details
    SELECT ui.user_id, ip.title
    INTO v_user_id, v_property_title
    FROM public.user_investments ui
    JOIN public.investment_properties ip ON ip.id = ui.property_id
    WHERE ui.id = p_investment_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Investment not found';
    END IF;

    -- Update investment status to confirmed
    UPDATE public.user_investments
    SET status = 'confirmed',
        updated_at = now()
    WHERE id = p_investment_id;

    -- Send notification to user
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
        v_user_id,
        'system',
        'Investment Approved',
        COALESCE(p_admin_notes, 'Your investment in ' || v_property_title || ' has been approved. You can now track your returns in your portfolio.'),
        '/invest/portfolio'
    );
END;
$function$;

-- 1b. Reject an investment application
CREATE OR REPLACE FUNCTION public.reject_investment(p_investment_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid;
    v_property_id uuid;
    v_units integer;
    v_property_title text;
BEGIN
    -- Get investment details
    SELECT ui.user_id, ui.property_id, ui.units_owned, ip.title
    INTO v_user_id, v_property_id, v_units, v_property_title
    FROM public.user_investments ui
    JOIN public.investment_properties ip ON ip.id = ui.property_id
    WHERE ui.id = p_investment_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Investment not found';
    END IF;

    -- Update investment status to rejected
    UPDATE public.user_investments
    SET status = 'rejected',
        updated_at = now()
    WHERE id = p_investment_id;

    -- Release the allocated units back to the pool
    UPDATE public.investment_properties
    SET units_sold = GREATEST(0, units_sold - v_units)
    WHERE id = v_property_id;

    -- Send notification to user
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (
        v_user_id,
        'system',
        'Investment Application Update',
        COALESCE(p_reason, 'Your investment application for ' || v_property_title || ' was not approved at this time. Please contact support for more information.')
    );
END;
$function$;

-- 1c. Request more information for an investment
CREATE OR REPLACE FUNCTION public.request_info_investment(p_investment_id uuid, p_message text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid;
    v_property_title text;
BEGIN
    SELECT ui.user_id, ip.title
    INTO v_user_id, v_property_title
    FROM public.user_investments ui
    JOIN public.investment_properties ip ON ip.id = ui.property_id
    WHERE ui.id = p_investment_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Investment not found';
    END IF;

    UPDATE public.user_investments
    SET status = 'information_requested',
        updated_at = now()
    WHERE id = p_investment_id;

    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
        v_user_id,
        'system',
        'Additional Information Needed',
        COALESCE(p_message, 'We need additional information regarding your investment in ' || v_property_title || '. Please check your dashboard for details.'),
        '/dashboard?tab=investments'
    );
END;
$function$;


-- ============================================================
-- 2. SYSTEM CONFIGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.system_configs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    key text NOT NULL UNIQUE,
    value jsonb NOT NULL DEFAULT '""'::jsonb,
    category text NOT NULL DEFAULT 'general',
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;

-- Only admins (via service_role or admin check) can read/write configs
DROP POLICY IF EXISTS "Admins can manage configs" ON public.system_configs;
CREATE POLICY "Admins can manage configs" ON public.system_configs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Seed default configuration values
INSERT INTO public.system_configs (key, value, category, description) VALUES
    ('reservation_fee', '"500"', 'reservations', 'Default reservation fee in USD'),
    ('reservation_expiry_hours', '"48"', 'reservations', 'Hours before unpaid reservations auto-expire'),
    ('min_down_payment_pct', '"20"', 'investments', 'Minimum down payment percentage for installment plans'),
    ('max_installment_months', '"24"', 'investments', 'Maximum number of months for installment plans'),
    ('referral_bonus_pct', '"5"', 'referrals', 'Referral bonus as percentage of first investment'),
    ('platform_fee_pct', '"2"', 'fees', 'Platform service fee percentage on transactions'),
    ('kyc_required_for_invest', '"true"', 'compliance', 'Whether KYC verification is required before investing'),
    ('auto_approve_threshold', '"1000"', 'investments', 'Investments below this amount are auto-approved')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- 3. AUTO-CLOSE INVESTMENT PROPERTY WHEN FULLY FUNDED
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_investment_fully_funded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- If units_sold has reached or exceeded total_units, mark as funded
    IF NEW.units_sold >= NEW.total_units AND NEW.status = 'open' THEN
        NEW.status := 'funded';
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auto_close_funded ON public.investment_properties;

CREATE TRIGGER trg_auto_close_funded
BEFORE UPDATE ON public.investment_properties
FOR EACH ROW
EXECUTE FUNCTION public.check_investment_fully_funded();


-- ============================================================
-- 4. INSTALLMENT PAYMENT PROCESSING TRIGGER
-- ============================================================
-- When a payment of type 'installment' succeeds, automatically:
-- (a) Mark the corresponding schedule entry as paid
-- (b) Update user_investments balance tracking
-- (c) Advance next_payment_due

CREATE OR REPLACE FUNCTION public.handle_installment_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_investment_id uuid;
    v_schedule_id uuid;
    v_new_paid numeric;
    v_total numeric;
    v_next_due date;
BEGIN
    -- Only process successful installment payments
    IF NEW.status != 'success' OR OLD.status = 'success' THEN
        RETURN NEW;
    END IF;
    IF NEW.payment_type != 'installment' THEN
        RETURN NEW;
    END IF;

    -- Get investment_id from payment metadata
    v_investment_id := (NEW.metadata->>'investment_id')::uuid;
    IF v_investment_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Find the earliest unpaid schedule entry for this investment
    SELECT id INTO v_schedule_id
    FROM public.investment_schedules
    WHERE investment_id = v_investment_id
      AND status = 'pending'
    ORDER BY installment_number ASC
    LIMIT 1;

    IF v_schedule_id IS NOT NULL THEN
        -- Mark schedule entry as paid
        UPDATE public.investment_schedules
        SET status = 'paid',
            paid_date = now(),
            amount_paid = NEW.amount,
            updated_at = now()
        WHERE id = v_schedule_id;
    END IF;

    -- Update user_investments balance
    UPDATE public.user_investments
    SET amount_paid = COALESCE(amount_paid, 0) + NEW.amount,
        remaining_balance = GREATEST(0, COALESCE(total_amount, 0) - (COALESCE(amount_paid, 0) + NEW.amount)),
        completion_percentage = CASE
            WHEN COALESCE(total_amount, 0) > 0
            THEN LEAST(100, ROUND(((COALESCE(amount_paid, 0) + NEW.amount) / total_amount) * 100))
            ELSE 100
        END,
        updated_at = now()
    WHERE id = v_investment_id;

    -- Find and set next payment due date
    SELECT due_date INTO v_next_due
    FROM public.investment_schedules
    WHERE investment_id = v_investment_id
      AND status = 'pending'
    ORDER BY installment_number ASC
    LIMIT 1;

    IF v_next_due IS NOT NULL THEN
        UPDATE public.user_investments
        SET next_payment_due = v_next_due
        WHERE id = v_investment_id;
    ELSE
        -- All installments paid — mark investment as active
        UPDATE public.user_investments
        SET status = 'active',
            next_payment_due = NULL
        WHERE id = v_investment_id;
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_installment_payment ON public.payments;

CREATE TRIGGER trg_installment_payment
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_installment_payment();
