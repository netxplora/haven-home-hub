-- Add new columns to user_investments
ALTER TABLE public.user_investments 
ADD COLUMN IF NOT EXISTS investment_type TEXT DEFAULT 'full',
ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS next_payment_due DATE,
ADD COLUMN IF NOT EXISTS duration_months INTEGER;

-- Update existing records to have sane defaults
UPDATE public.user_investments 
SET 
  total_amount = amount_invested,
  amount_paid = amount_invested,
  remaining_balance = 0
WHERE total_amount = 0 OR total_amount IS NULL;

-- Create investment schedules table
CREATE TABLE IF NOT EXISTS public.investment_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID NOT NULL REFERENCES public.user_investments(id) ON DELETE CASCADE,
    amount_due NUMERIC NOT NULL,
    amount_paid NUMERIC DEFAULT 0,
    due_date DATE NOT NULL,
    paid_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending', -- pending, paid, overdue
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.investment_schedules ENABLE ROW LEVEL SECURITY;

-- SELECT policies
DROP POLICY IF EXISTS "Admins can view schedules" ON public.investment_schedules;
CREATE POLICY "Admins can view schedules" ON public.investment_schedules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can view own schedules" ON public.investment_schedules;
CREATE POLICY "Users can view own schedules" ON public.investment_schedules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_investments ui 
            WHERE ui.id = investment_id AND ui.user_id = auth.uid()
        )
    );

-- INSERT policies (admin can create schedules, system can insert on behalf of admin)
DROP POLICY IF EXISTS "Admins can insert schedules" ON public.investment_schedules;
CREATE POLICY "Admins can insert schedules" ON public.investment_schedules
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
        )
    );

-- UPDATE policies (admin can update, users can update their own)
DROP POLICY IF EXISTS "Admins can update schedules" ON public.investment_schedules;
CREATE POLICY "Admins can update schedules" ON public.investment_schedules
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can update own schedules" ON public.investment_schedules;
CREATE POLICY "Users can update own schedules" ON public.investment_schedules
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_investments ui 
            WHERE ui.id = investment_id AND ui.user_id = auth.uid()
        )
    );
