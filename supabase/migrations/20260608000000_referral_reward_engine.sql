-- ============================================================
-- Migration: Automated Referral Reward Engine
-- Created: 2026-06-08
-- Purpose: Create the complete referral infrastructure including
--          referral tracking, reward wallet, audit log, and
--          automated triggers for code generation, referral
--          linking, and reward distribution.
-- ============================================================

-- ============================================================
-- 1. EXTEND PROFILES TABLE
-- ============================================================

-- Unique referral code per user (format: HVN-XXXXXX)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Track who referred this user
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);


-- ============================================================
-- 2. REFERRALS TABLE
-- ============================================================
-- Tracks referrer → referred relationships with status lifecycle

CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'registered'
        CHECK (status IN ('registered', 'qualified', 'pending_reward', 'approved', 'paid', 'rejected', 'flagged')),
    bonus_earned NUMERIC(14,2) NOT NULL DEFAULT 0,
    trigger_event TEXT,          -- e.g. 'investment_confirmed', 'purchase_completed'
    trigger_reference_id UUID,   -- ID of the investment/payment that triggered the reward
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (referrer_id, referred_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

CREATE TRIGGER tr_referrals_updated
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 3. REFERRAL REWARDS TABLE (Wallet Ledger)
-- ============================================================
-- Every credit/debit to a user's referral wallet is a row here.

CREATE TABLE IF NOT EXISTS public.referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'credit'
        CHECK (type IN ('credit', 'debit', 'withdrawal', 'adjustment')),
    amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    balance_after NUMERIC(14,2) NOT NULL DEFAULT 0,
    description TEXT,
    reference_id UUID,           -- Investment/payment ID that generated this reward
    status TEXT NOT NULL DEFAULT 'completed'
        CHECK (status IN ('pending', 'completed', 'reversed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_referral_rewards_user ON public.referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referral ON public.referral_rewards(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_type ON public.referral_rewards(type);


-- ============================================================
-- 4. REFERRAL AUDIT LOG
-- ============================================================
-- System-level audit trail for fraud detection and admin review.

CREATE TABLE IF NOT EXISTS public.referral_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    is_fraud_flag BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_referral_audit_referral ON public.referral_audit_log(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_audit_fraud ON public.referral_audit_log(is_fraud_flag) WHERE is_fraud_flag = true;


-- ============================================================
-- 5. RLS POLICIES
-- ============================================================

-- REFERRALS: users see their own (as referrer or referred); admins see all
DROP POLICY IF EXISTS "Referrals: own read" ON public.referrals;
CREATE POLICY "Referrals: own read" ON public.referrals
    FOR SELECT TO authenticated
    USING (
        referrer_id = auth.uid()
        OR referred_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
    );

DROP POLICY IF EXISTS "Referrals: admin manage" ON public.referrals;
CREATE POLICY "Referrals: admin manage" ON public.referrals
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow system/trigger inserts (SECURITY DEFINER functions bypass RLS,
-- but we need a policy for the initial insert context)
DROP POLICY IF EXISTS "Referrals: system insert" ON public.referrals;
CREATE POLICY "Referrals: system insert" ON public.referrals
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- REFERRAL REWARDS: users see their own; admins see all
DROP POLICY IF EXISTS "Rewards: own read" ON public.referral_rewards;
CREATE POLICY "Rewards: own read" ON public.referral_rewards
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
    );

DROP POLICY IF EXISTS "Rewards: admin manage" ON public.referral_rewards;
CREATE POLICY "Rewards: admin manage" ON public.referral_rewards
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- AUDIT LOG: admin-only
DROP POLICY IF EXISTS "Audit: admin read" ON public.referral_audit_log;
CREATE POLICY "Audit: admin read" ON public.referral_audit_log
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Audit: admin manage" ON public.referral_audit_log;
CREATE POLICY "Audit: admin manage" ON public.referral_audit_log
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- ============================================================
-- 6. REFERRAL CODE GENERATOR FUNCTION
-- ============================================================
-- Generates a unique code in format HVN-XXXXXX (alphanumeric uppercase)

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
    v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    v_i INT;
BEGIN
    LOOP
        v_code := 'HVN-';
        FOR v_i IN 1..6 LOOP
            v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
        END LOOP;

        SELECT EXISTS(
            SELECT 1 FROM public.profiles WHERE referral_code = v_code
        ) INTO v_exists;

        IF NOT v_exists THEN
            RETURN v_code;
        END IF;
    END LOOP;
END;
$$;


-- ============================================================
-- 7. UPDATED handle_new_user() TRIGGER
-- ============================================================
-- Replaces the original to also:
--   (a) Generate a unique referral code
--   (b) Link to referrer if referral_code was provided at signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_referral_code TEXT;
    v_referrer_id UUID;
    v_provided_code TEXT;
BEGIN
    -- Generate unique referral code for this new user
    v_referral_code := public.generate_referral_code();

    -- Extract referral code provided during signup (if any)
    v_provided_code := UPPER(TRIM(COALESCE(NEW.raw_user_meta_data->>'referral_code', '')));

    -- Look up the referrer by their code
    IF v_provided_code != '' THEN
        SELECT id INTO v_referrer_id
        FROM public.profiles
        WHERE referral_code = v_provided_code;
    END IF;

    -- Create the profile with referral code and referrer link
    INSERT INTO public.profiles (id, full_name, referral_code, referred_by)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        v_referral_code,
        v_referrer_id
    );

    -- Create default user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');

    -- If a valid referrer was found, create the referral relationship
    IF v_referrer_id IS NOT NULL AND v_referrer_id != NEW.id THEN
        INSERT INTO public.referrals (referrer_id, referred_id, status)
        VALUES (v_referrer_id, NEW.id, 'registered')
        ON CONFLICT (referrer_id, referred_id) DO NOTHING;

        -- Log the referral event
        INSERT INTO public.referral_audit_log (referral_id, actor_id, action, details)
        SELECT r.id, NEW.id, 'referral_created',
            jsonb_build_object(
                'referrer_code', v_provided_code,
                'referred_email', NEW.email
            )
        FROM public.referrals r
        WHERE r.referrer_id = v_referrer_id AND r.referred_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;


-- ============================================================
-- 8. BACKFILL: Generate codes for existing users without one
-- ============================================================

DO $$
DECLARE
    r RECORD;
    v_code TEXT;
BEGIN
    FOR r IN SELECT id FROM public.profiles WHERE referral_code IS NULL
    LOOP
        v_code := public.generate_referral_code();
        UPDATE public.profiles SET referral_code = v_code WHERE id = r.id;
    END LOOP;
END;
$$;


-- ============================================================
-- 9. REWARD TRIGGER ON INVESTMENT CONFIRMATION
-- ============================================================
-- When an investment is confirmed (status → 'confirmed'), check if
-- the investor was referred. If so, calculate and credit the reward.

CREATE OR REPLACE FUNCTION public.process_referral_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_referrer_id UUID;
    v_referral_id UUID;
    v_bonus_pct NUMERIC;
    v_max_cap NUMERIC;
    v_min_investment NUMERIC;
    v_reward_amount NUMERIC;
    v_current_balance NUMERIC;
    v_investment_amount NUMERIC;
    v_already_rewarded BOOLEAN;
BEGIN
    -- Only fire when status changes TO 'confirmed'
    IF NEW.status != 'confirmed' OR OLD.status = 'confirmed' THEN
        RETURN NEW;
    END IF;

    -- Get the investment amount
    v_investment_amount := COALESCE(NEW.total_amount, NEW.amount_paid, 0);

    -- Check if this investor was referred
    SELECT p.referred_by INTO v_referrer_id
    FROM public.profiles p
    WHERE p.id = NEW.user_id;

    IF v_referrer_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get the referral relationship
    SELECT r.id INTO v_referral_id
    FROM public.referrals r
    WHERE r.referrer_id = v_referrer_id AND r.referred_id = NEW.user_id;

    IF v_referral_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Check if reward was already given for this specific investment
    SELECT EXISTS(
        SELECT 1 FROM public.referral_rewards
        WHERE referral_id = v_referral_id
          AND reference_id = NEW.id
          AND type = 'credit'
          AND status = 'completed'
    ) INTO v_already_rewarded;

    IF v_already_rewarded THEN
        RETURN NEW;
    END IF;

    -- Load config values (with safe defaults)
    SELECT COALESCE((
        SELECT (value #>> '{}')::numeric FROM public.system_configs WHERE key = 'referral_bonus_pct'
    ), 5) INTO v_bonus_pct;

    SELECT COALESCE((
        SELECT (s.value #>> '{}')::numeric FROM public.system_configs s WHERE s.key = 'referral_max_bonus_cap'
    ), 500) INTO v_max_cap;

    SELECT COALESCE((
        SELECT (s.value #>> '{}')::numeric FROM public.system_configs s WHERE s.key = 'referral_min_investment'
    ), 1000) INTO v_min_investment;

    -- Check minimum investment threshold
    IF v_investment_amount < v_min_investment THEN
        -- Update referral status to qualified but no reward yet
        UPDATE public.referrals
        SET status = 'qualified', updated_at = now()
        WHERE id = v_referral_id AND status = 'registered';

        RETURN NEW;
    END IF;

    -- Calculate reward
    v_reward_amount := LEAST(
        ROUND(v_investment_amount * (v_bonus_pct / 100), 2),
        v_max_cap
    );

    IF v_reward_amount <= 0 THEN
        RETURN NEW;
    END IF;

    -- Get referrer's current wallet balance
    SELECT COALESCE(SUM(
        CASE WHEN type IN ('credit', 'adjustment') THEN amount
             WHEN type IN ('debit', 'withdrawal') THEN -amount
             ELSE 0
        END
    ), 0) INTO v_current_balance
    FROM public.referral_rewards
    WHERE user_id = v_referrer_id AND status = 'completed';

    -- Credit the reward
    INSERT INTO public.referral_rewards (
        user_id, referral_id, type, amount, balance_after,
        description, reference_id, status
    ) VALUES (
        v_referrer_id,
        v_referral_id,
        'credit',
        v_reward_amount,
        v_current_balance + v_reward_amount,
        'Referral bonus: ' || v_bonus_pct || '% of $' || v_investment_amount || ' investment',
        NEW.id,
        'completed'
    );

    -- Update referral record
    UPDATE public.referrals
    SET status = 'paid',
        bonus_earned = COALESCE(bonus_earned, 0) + v_reward_amount,
        trigger_event = 'investment_confirmed',
        trigger_reference_id = NEW.id,
        updated_at = now()
    WHERE id = v_referral_id;

    -- Audit log
    INSERT INTO public.referral_audit_log (referral_id, actor_id, action, details)
    VALUES (
        v_referral_id,
        v_referrer_id,
        'reward_credited',
        jsonb_build_object(
            'investment_id', NEW.id,
            'investment_amount', v_investment_amount,
            'reward_amount', v_reward_amount,
            'bonus_pct', v_bonus_pct,
            'new_balance', v_current_balance + v_reward_amount
        )
    );

    -- Send notification to referrer
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
        v_referrer_id,
        'system',
        'Referral Reward Earned',
        'You earned $' || v_reward_amount || ' from a referral investment. Check your referral wallet for details.',
        '/dashboard?tab=referrals'
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_reward_on_investment ON public.user_investments;

CREATE TRIGGER trg_referral_reward_on_investment
AFTER UPDATE ON public.user_investments
FOR EACH ROW
EXECUTE FUNCTION public.process_referral_reward();


-- ============================================================
-- 10. ADMIN RPC: Approve/Reject Referral Rewards
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_update_referral_status(
    p_referral_id UUID,
    p_new_status TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_referral RECORD;
BEGIN
    -- Verify caller is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    -- Validate status
    IF p_new_status NOT IN ('registered', 'qualified', 'pending_reward', 'approved', 'paid', 'rejected', 'flagged') THEN
        RAISE EXCEPTION 'Invalid status: %', p_new_status;
    END IF;

    -- Get current referral
    SELECT * INTO v_referral FROM public.referrals WHERE id = p_referral_id;
    IF v_referral IS NULL THEN
        RAISE EXCEPTION 'Referral not found';
    END IF;

    -- Update status
    UPDATE public.referrals
    SET status = p_new_status,
        notes = COALESCE(p_notes, notes),
        updated_at = now()
    WHERE id = p_referral_id;

    -- If rejecting, reverse any pending rewards
    IF p_new_status = 'rejected' THEN
        UPDATE public.referral_rewards
        SET status = 'reversed'
        WHERE referral_id = p_referral_id AND status = 'pending';
    END IF;

    -- Audit log
    INSERT INTO public.referral_audit_log (referral_id, actor_id, action, details)
    VALUES (
        p_referral_id,
        auth.uid(),
        'status_updated_by_admin',
        jsonb_build_object(
            'old_status', v_referral.status,
            'new_status', p_new_status,
            'notes', p_notes
        )
    );
END;
$$;


-- ============================================================
-- 11. ADMIN RPC: Flag Referral for Fraud Review
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_flag_referral(
    p_referral_id UUID,
    p_reason TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    UPDATE public.referrals
    SET status = 'flagged',
        notes = COALESCE(p_reason, 'Flagged for review'),
        updated_at = now()
    WHERE id = p_referral_id;

    INSERT INTO public.referral_audit_log (referral_id, actor_id, action, details, is_fraud_flag)
    VALUES (
        p_referral_id,
        auth.uid(),
        'flagged_for_fraud',
        jsonb_build_object('reason', p_reason),
        true
    );
END;
$$;


-- ============================================================
-- 12. WALLET BALANCE VIEW FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_referral_wallet_balance(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(SUM(
        CASE WHEN type IN ('credit', 'adjustment') THEN amount
             WHEN type IN ('debit', 'withdrawal') THEN -amount
             ELSE 0
        END
    ), 0)
    FROM public.referral_rewards
    WHERE user_id = p_user_id AND status = 'completed';
$$;


-- ============================================================
-- 13. SEED ADDITIONAL CONFIG VALUES
-- ============================================================

INSERT INTO public.system_configs (key, value, category, description) VALUES
    ('referral_max_bonus_cap', '"500"', 'referrals', 'Maximum referral bonus amount in USD'),
    ('referral_min_investment', '"1000"', 'referrals', 'Minimum investment required for referral reward')
ON CONFLICT (key) DO NOTHING;
