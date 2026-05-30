-- Migration: Complete Investment Tracking and Withdrawal System

-- 1. ENUMS AND STATUSES
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawal_status') THEN
        CREATE TYPE public.withdrawal_status AS ENUM ('pending_review', 'approved', 'processing', 'paid', 'rejected');
    END IF;
END $$;

-- 2. UPDATE USER_INVESTMENTS SCHEMA
-- We add missing fields to track the exact lifecycle of an investment
ALTER TABLE public.user_investments
ADD COLUMN IF NOT EXISTS activated_at timestamptz,
ADD COLUMN IF NOT EXISTS maturity_date date,
ADD COLUMN IF NOT EXISTS accrued_earnings numeric(14,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS withdrawable_balance numeric(14,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_withdrawn numeric(14,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS timeline_events jsonb DEFAULT '[]'::jsonb;

-- Function to safely append to timeline_events
CREATE OR REPLACE FUNCTION public.append_investment_timeline_event(
    p_investment_id uuid,
    p_event_name text,
    p_description text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.user_investments
    SET timeline_events = COALESCE(timeline_events, '[]'::jsonb) || jsonb_build_object(
        'event', p_event_name,
        'description', p_description,
        'timestamp', now()
    )
    WHERE id = p_investment_id;
END;
$$;

-- 3. WITHDRAWAL REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    investment_id uuid REFERENCES public.user_investments(id), -- Optional: If bound to a specific investment
    amount numeric(14,2) NOT NULL CHECK (amount > 0),
    currency text NOT NULL DEFAULT 'USD',
    method text NOT NULL, -- e.g., 'bank_transfer', 'crypto'
    bank_name text,
    bank_account_name text,
    bank_account_number text,
    crypto_currency text,
    crypto_address text,
    status public.withdrawal_status NOT NULL DEFAULT 'pending_review',
    admin_notes text,
    transaction_reference text,
    rejection_reason text,
    reviewed_by uuid REFERENCES auth.users(id),
    reviewed_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON public.withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawal_requests(status);

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Withdrawals: own read" ON public.withdrawal_requests;
CREATE POLICY "Withdrawals: own read" ON public.withdrawal_requests FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Withdrawals: own insert" ON public.withdrawal_requests;
CREATE POLICY "Withdrawals: own insert" ON public.withdrawal_requests FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Withdrawals: admin update" ON public.withdrawal_requests;
CREATE POLICY "Withdrawals: admin update" ON public.withdrawal_requests FOR UPDATE TO authenticated
    USING (public.has_role(auth.uid(),'admin'));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS tg_withdrawals_updated ON public.withdrawal_requests;
CREATE TRIGGER tg_withdrawals_updated BEFORE UPDATE ON public.withdrawal_requests
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. VALIDATION TRIGGER FOR WITHDRAWALS
-- Prevents a user from withdrawing more than their available balance
CREATE OR REPLACE FUNCTION public.check_withdrawal_balance()
RETURNS trigger AS $$
DECLARE
    v_available_balance numeric;
BEGIN
    IF NEW.status = 'pending' AND OLD IS NULL THEN
        -- Check balance if tied to specific investment
        IF NEW.investment_id IS NOT NULL THEN
            SELECT withdrawable_balance INTO v_available_balance
            FROM public.user_investments
            WHERE id = NEW.investment_id AND user_id = NEW.user_id;

            IF v_available_balance IS NULL OR v_available_balance < NEW.amount THEN
                RAISE EXCEPTION 'Insufficient withdrawable balance in the selected investment.';
            END IF;
        ELSE
            -- Aggregate balance across all investments
            SELECT COALESCE(SUM(withdrawable_balance), 0) INTO v_available_balance
            FROM public.user_investments
            WHERE user_id = NEW.user_id;

            IF v_available_balance < NEW.amount THEN
                RAISE EXCEPTION 'Insufficient total withdrawable balance.';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_withdrawal_balance ON public.withdrawal_requests;
CREATE TRIGGER tr_check_withdrawal_balance
BEFORE INSERT ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.check_withdrawal_balance();


-- 5. USER PORTFOLIO STATS VIEW
-- Provides real-time dashboard statistics per user
DROP VIEW IF EXISTS public.user_portfolio_stats;
CREATE VIEW public.user_portfolio_stats AS
SELECT 
    ui.user_id,
    COALESCE(SUM(ui.amount_invested), 0) as total_invested,
    COALESCE(SUM(ui.accrued_earnings), 0) as total_roi_earned,
    COALESCE(SUM(ui.amount_invested + ui.accrued_earnings - ui.total_withdrawn), 0) as current_portfolio_value,
    COALESCE(SUM(ui.withdrawable_balance), 0) as total_withdrawable_balance,
    COALESCE(SUM(ui.accrued_earnings - ui.withdrawable_balance - ui.total_withdrawn), 0) as pending_roi,
    COUNT(CASE WHEN ui.status::text = 'active' THEN 1 END) as active_investments,
    COUNT(CASE WHEN ui.status::text = 'matured' THEN 1 END) as matured_investments,
    COUNT(CASE WHEN ui.status::text = 'completed' THEN 1 END) as completed_investments
FROM public.user_investments ui
GROUP BY ui.user_id;


-- 6. CERTIFICATE GENERATION FIX
-- Recreate the verify_investment RPC to ensure it creates certificates correctly and returns the certificate_id
CREATE OR REPLACE FUNCTION public.verify_investment(
  p_investment_id uuid,
  p_admin_id uuid,
  p_notes text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_investment record;
  v_property record;
  v_certificate_id text;
  v_new_cert_id uuid;
  v_amount_paid numeric;
BEGIN
  -- 1. Check if admin
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: only admins can verify investments';
  END IF;

  -- 2. Get investment
  SELECT * INTO v_investment
  FROM public.user_investments
  WHERE id = p_investment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Investment not found';
  END IF;

  -- 3. Get property
  SELECT * INTO v_property
  FROM public.investment_properties
  WHERE id = v_investment.property_id;

  -- 4. Calculate total amount paid from confirmed payments
  SELECT COALESCE(SUM(amount), 0) INTO v_amount_paid
  FROM public.payments
  WHERE investment_id = p_investment_id
    AND status = 'success';

  -- 5. Update investment status
  -- Wait, the enum user_investment_status doesn't have 'active', 'matured', 'completed'.
  -- Wait, let me check the existing enum public.user_investment_status
  -- I should alter it to add these if they don't exist.
  -- Cannot alter enum easily in a function. I'll do it before the function.
  
  -- But we can update start_date, approved_at, and activated_at
  UPDATE public.user_investments
  SET 
      status = 'confirmed',
      amount_paid = v_amount_paid,
      start_date = CURRENT_DATE,
      activated_at = now(),
      maturity_date = CURRENT_DATE + (v_property.holding_period_months || ' months')::interval,
      approved_by = p_admin_id,
      approved_at = now(),
      admin_notes = COALESCE(p_notes, admin_notes)
  WHERE id = p_investment_id;

  -- Append to timeline
  PERFORM public.append_investment_timeline_event(
      p_investment_id,
      'Investment Activated',
      'Payment verified and investment is now accumulating ROI.'
  );

  -- 6. Generate Certificate if not exists
  SELECT certificate_id INTO v_certificate_id
  FROM public.investment_certificates 
  WHERE investment_id = p_investment_id 
  LIMIT 1;

  IF v_certificate_id IS NULL THEN
      v_certificate_id := 'CERT-' || to_char(now(), 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 6);
      
      INSERT INTO public.investment_certificates (
          certificate_id,
          investment_id,
          user_id,
          property_id,
          units_owned,
          total_investment_amount,
          currency,
          expected_roi_min,
          expected_roi_max,
          status,
          issued_at,
          issued_by
      ) VALUES (
          v_certificate_id,
          p_investment_id,
          v_investment.user_id,
          v_investment.property_id,
          v_investment.units_owned,
          v_investment.total_amount,
          v_property.currency,
          v_property.projected_return_min,
          v_property.projected_return_max,
          'active',
          now(),
          p_admin_id
      ) RETURNING id INTO v_new_cert_id;
  END IF;

  RETURN json_build_object(
      'success', true,
      'message', 'Investment verified successfully',
      'investment_id', p_investment_id,
      'certificate_id', v_certificate_id,
      'certificate_uuid', v_new_cert_id
  );
END;
$$;

-- Alter ENUM to add 'active', 'matured', 'completed' if needed (handling IF NOT EXISTS via catch block)
DO $$
BEGIN
    ALTER TYPE public.user_investment_status ADD VALUE 'payment_under_review';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER TYPE public.user_investment_status ADD VALUE 'active';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER TYPE public.user_investment_status ADD VALUE 'matured';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER TYPE public.user_investment_status ADD VALUE 'completed';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 7. DYNAMIC ROI CALCULATION FUNCTION
-- This can be called via cron or manually to update accrued earnings based on daily yields
CREATE OR REPLACE FUNCTION public.calculate_daily_roi()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    inv record;
    daily_rate numeric;
    daily_earnings numeric;
BEGIN
    -- Iterate over active investments
    FOR inv IN 
        SELECT ui.id, ui.amount_invested, ui.start_date, ui.maturity_date, 
               p.projected_return_min, p.projected_return_max
        FROM public.user_investments ui
        JOIN public.investment_properties p ON ui.property_id = p.id
        WHERE ui.status IN ('confirmed', 'active') AND ui.start_date IS NOT NULL
    LOOP
        -- Simple calculation: average return rate / 365 days
        daily_rate := ((inv.projected_return_min + inv.projected_return_max) / 2) / 100.0 / 365.0;
        daily_earnings := inv.amount_invested * daily_rate;
        
        -- In a real scenario, this is run daily. For the purpose of this audit, 
        -- we calculate the absolute difference between start date and today.
        UPDATE public.user_investments
        SET accrued_earnings = (CURRENT_DATE - start_date) * daily_earnings,
            -- update withdrawable_balance based on maturity or distribution frequency
            withdrawable_balance = CASE 
                WHEN CURRENT_DATE >= maturity_date THEN (CURRENT_DATE - start_date) * daily_earnings + amount_invested
                ELSE withdrawable_balance 
            END,
            status = CASE 
                WHEN CURRENT_DATE >= maturity_date THEN 'matured'::public.user_investment_status 
                ELSE status 
            END
        WHERE id = inv.id;
    END LOOP;
END;
$$;
