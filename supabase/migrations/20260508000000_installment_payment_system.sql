-- ============================================================
-- INSTALLMENT PAYMENT SYSTEM — Full Migration
-- ============================================================

-- 1. Add installment configuration to investment_properties
ALTER TABLE public.investment_properties
ADD COLUMN IF NOT EXISTS installment_available BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS min_down_payment_pct NUMERIC(5,2) NOT NULL DEFAULT 20,
ADD COLUMN IF NOT EXISTS max_installment_months INTEGER NOT NULL DEFAULT 24;

-- 2. Add installment-specific columns to user_investments
ALTER TABLE public.user_investments
ADD COLUMN IF NOT EXISTS down_payment_amount NUMERIC(14,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_installment_amount NUMERIC(14,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_percentage NUMERIC(5,2) DEFAULT 0;

-- 3. Add payment linkage and schedule metadata to investment_schedules
ALTER TABLE public.investment_schedules
ADD COLUMN IF NOT EXISTS payment_id UUID,
ADD COLUMN IF NOT EXISTS transaction_reference TEXT,
ADD COLUMN IF NOT EXISTS installment_number INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_down_payment BOOLEAN DEFAULT false;

-- Admin UPDATE policy for investment_schedules
DROP POLICY IF EXISTS "Admins can update schedules" ON public.investment_schedules;
CREATE POLICY "Admins can update schedules" ON public.investment_schedules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- User UPDATE policy for investment_schedules (own schedules only)
DROP POLICY IF EXISTS "Users can update own schedules" ON public.investment_schedules;
CREATE POLICY "Users can update own schedules" ON public.investment_schedules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_investments ui
      WHERE ui.id = investment_id AND ui.user_id = auth.uid()
    )
  );

-- 4. Backfill completion_percentage for existing records
UPDATE public.user_investments
SET completion_percentage = CASE
  WHEN COALESCE(total_amount, 0) > 0
    THEN LEAST(100, ROUND((COALESCE(amount_paid, 0) / total_amount) * 100, 2))
  ELSE 100
END
WHERE completion_percentage = 0 OR completion_percentage IS NULL;

-- 5. Function: Recalculate investment balances after a schedule payment
CREATE OR REPLACE FUNCTION public.recalculate_investment_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_paid NUMERIC;
  v_total_amount NUMERIC;
  v_new_balance NUMERIC;
  v_new_pct NUMERIC;
  v_new_status TEXT;
  v_next_due DATE;
BEGIN
  -- Only trigger when a schedule is marked as paid
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    -- Sum all paid amounts for this investment
    SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_paid
    FROM public.investment_schedules
    WHERE investment_id = NEW.investment_id AND status = 'paid';

    -- Get the investment total (including down payment)
    SELECT total_amount, amount_paid INTO v_total_amount, v_total_paid
    FROM public.user_investments
    WHERE id = NEW.investment_id;

    -- Add down payment + schedule payments
    SELECT
      COALESCE(ui.down_payment_amount, 0) + COALESCE(sched_paid.total, 0)
    INTO v_total_paid
    FROM public.user_investments ui
    LEFT JOIN (
      SELECT investment_id, SUM(amount_paid) AS total
      FROM public.investment_schedules
      WHERE investment_id = NEW.investment_id AND status = 'paid'
      GROUP BY investment_id
    ) sched_paid ON sched_paid.investment_id = ui.id
    WHERE ui.id = NEW.investment_id;

    SELECT total_amount INTO v_total_amount
    FROM public.user_investments WHERE id = NEW.investment_id;

    v_new_balance := GREATEST(0, v_total_amount - v_total_paid);
    v_new_pct := CASE WHEN v_total_amount > 0 THEN LEAST(100, ROUND((v_total_paid / v_total_amount) * 100, 2)) ELSE 100 END;

    -- Determine new status
    IF v_new_balance <= 0 THEN
      v_new_status := 'completed';
    ELSE
      v_new_status := 'active';
    END IF;

    -- Find the next unpaid due date
    SELECT MIN(due_date) INTO v_next_due
    FROM public.investment_schedules
    WHERE investment_id = NEW.investment_id AND status != 'paid';

    -- Update the investment record
    UPDATE public.user_investments
    SET
      amount_paid = v_total_paid,
      remaining_balance = v_new_balance,
      completion_percentage = v_new_pct,
      next_payment_due = v_next_due,
      status = v_new_status
    WHERE id = NEW.investment_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_investment_balance ON public.investment_schedules;
CREATE TRIGGER trg_recalc_investment_balance
  AFTER UPDATE ON public.investment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_investment_balance();

-- 6. Function: Auto-mark overdue schedules
CREATE OR REPLACE FUNCTION public.mark_overdue_schedules()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark pending schedules past due date as overdue
  UPDATE public.investment_schedules
  SET status = 'overdue'
  WHERE status = 'pending'
    AND due_date < CURRENT_DATE;

  -- Mark investments with overdue schedules
  UPDATE public.user_investments ui
  SET status = 'overdue'
  WHERE ui.investment_type = 'installment'
    AND ui.status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.investment_schedules s
      WHERE s.investment_id = ui.id
        AND s.status = 'overdue'
    );

  -- Mark long-overdue investments (90+ days) as defaulted
  UPDATE public.user_investments ui
  SET status = 'defaulted'
  WHERE ui.investment_type = 'installment'
    AND ui.status IN ('active', 'overdue')
    AND EXISTS (
      SELECT 1 FROM public.investment_schedules s
      WHERE s.investment_id = ui.id
        AND s.status = 'overdue'
        AND s.due_date < CURRENT_DATE - INTERVAL '90 days'
    );
END;
$$;

-- 7. DELETE policy for admin on investment_schedules
DROP POLICY IF EXISTS "Admins can delete schedules" ON public.investment_schedules;
CREATE POLICY "Admins can delete schedules" ON public.investment_schedules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- 8. User INSERT policy for investment_schedules (for self-payment records)
DROP POLICY IF EXISTS "Users can insert own schedules" ON public.investment_schedules;
CREATE POLICY "Users can insert own schedules" ON public.investment_schedules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_investments ui
      WHERE ui.id = investment_id AND ui.user_id = auth.uid()
    )
  );

-- 9. Add index for schedule lookups
CREATE INDEX IF NOT EXISTS idx_schedules_investment ON public.investment_schedules(investment_id);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON public.investment_schedules(status);
CREATE INDEX IF NOT EXISTS idx_schedules_due_date ON public.investment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_investments_type ON public.user_investments(investment_type);
