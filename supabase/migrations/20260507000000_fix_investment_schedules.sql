-- PATCH: Fix investment_schedules schema to match frontend expectations
-- This migration repairs column names and adds missing columns/policies
-- that were incorrect in the original 20260506000001 migration.

-- 1. Rename columns if they exist with old names
DO $$ 
BEGIN
    -- Rename 'amount' to 'amount_due' if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'investment_schedules' 
        AND column_name = 'amount'
    ) THEN
        ALTER TABLE public.investment_schedules RENAME COLUMN amount TO amount_due;
    END IF;

    -- Rename 'paid_at' to 'paid_date' if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'investment_schedules' 
        AND column_name = 'paid_at'
    ) THEN
        ALTER TABLE public.investment_schedules RENAME COLUMN paid_at TO paid_date;
    END IF;
END $$;

-- 2. Add missing 'amount_paid' column to investment_schedules
ALTER TABLE public.investment_schedules 
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;

-- 3. Fix remaining_balance on user_investments
-- If it's a generated column, we need to drop and re-add as a plain column
DO $$
BEGIN
    -- Check if remaining_balance is a generated column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_investments' 
        AND column_name = 'remaining_balance'
        AND is_generated = 'ALWAYS'
    ) THEN
        ALTER TABLE public.user_investments DROP COLUMN remaining_balance;
        ALTER TABLE public.user_investments ADD COLUMN remaining_balance NUMERIC DEFAULT 0;
        -- Backfill existing records
        UPDATE public.user_investments 
        SET remaining_balance = GREATEST(0, COALESCE(total_amount, 0) - COALESCE(amount_paid, 0));
    END IF;
END $$;

-- 4. Add duration_months column to user_investments if missing
ALTER TABLE public.user_investments
ADD COLUMN IF NOT EXISTS duration_months INTEGER;

-- 5. Add INSERT and UPDATE RLS policies for investment_schedules
-- (original migration only had SELECT policies)

-- Admin INSERT
DROP POLICY IF EXISTS "Admins can insert schedules" ON public.investment_schedules;
CREATE POLICY "Admins can insert schedules" ON public.investment_schedules
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
        )
    );

-- Admin UPDATE
DROP POLICY IF EXISTS "Admins can update schedules" ON public.investment_schedules;
CREATE POLICY "Admins can update schedules" ON public.investment_schedules
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
        )
    );

-- User UPDATE (for paying their own installments)
DROP POLICY IF EXISTS "Users can update own schedules" ON public.investment_schedules;
CREATE POLICY "Users can update own schedules" ON public.investment_schedules
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_investments ui 
            WHERE ui.id = investment_id AND ui.user_id = auth.uid()
        )
    );
