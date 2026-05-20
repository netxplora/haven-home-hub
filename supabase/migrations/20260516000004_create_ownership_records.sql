-- Create ownership_records table (referenced by sync_property_sold_status trigger)
CREATE TABLE IF NOT EXISTS public.ownership_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  purchase_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, property_id)
);

ALTER TABLE public.ownership_records ENABLE ROW LEVEL SECURITY;

-- Users can view their own ownership records
DROP POLICY IF EXISTS "Users can view own ownership" ON public.ownership_records;
CREATE POLICY "Users can view own ownership" ON public.ownership_records
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- Service role / trigger can insert
DROP POLICY IF EXISTS "Service role can insert ownership" ON public.ownership_records;
CREATE POLICY "Service role can insert ownership" ON public.ownership_records
  FOR INSERT WITH CHECK (true);

-- Add missing notification enum values if not already present
DO $$ BEGIN
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'kyc';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'withdrawal';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add purchase payment type if missing
DO $$ BEGIN
  ALTER TYPE public.payment_type ADD VALUE IF NOT EXISTS 'purchase';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
