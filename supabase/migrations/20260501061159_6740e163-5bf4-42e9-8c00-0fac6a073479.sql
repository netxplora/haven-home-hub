
-- Notifications + Withdrawals

-- Enums
CREATE TYPE public.notification_type AS ENUM (
  'payment_confirmed', 'payment_failed', 'investment_confirmed',
  'booking_confirmed', 'payout_received', 'withdrawal_submitted',
  'withdrawal_approved', 'withdrawal_rejected', 'withdrawal_completed', 'system'
);

CREATE TYPE public.withdrawal_status AS ENUM (
  'pending', 'approved', 'processing', 'completed', 'rejected', 'failed'
);

CREATE TYPE public.withdrawal_method AS ENUM ('bank_transfer', 'crypto');

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type notification_type NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notif: own read" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Notif: own update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Notif: admin write" ON public.notifications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Helper function (SECURITY DEFINER) so server-side flows can write notifications
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid, _type notification_type, _title text,
  _body text DEFAULT '', _link text DEFAULT NULL, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.notifications(user_id, type, title, body, link, metadata)
  VALUES (_user_id, _type, _title, _body, _link, _metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- Withdrawal requests
CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  method withdrawal_method NOT NULL,
  status withdrawal_status NOT NULL DEFAULT 'pending',
  -- Bank
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  -- Crypto
  crypto_currency text,
  crypto_address text,
  -- Admin
  admin_notes text,
  transaction_reference text,
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_withdrawals_user ON public.withdrawal_requests(user_id, created_at DESC);
CREATE INDEX idx_withdrawals_status ON public.withdrawal_requests(status, created_at DESC);

CREATE TRIGGER trg_withdrawals_updated
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Withdrawals: own read" ON public.withdrawal_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Withdrawals: own insert" ON public.withdrawal_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Withdrawals: own cancel" ON public.withdrawal_requests
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status IN ('pending', 'rejected'));

CREATE POLICY "Withdrawals: admin update" ON public.withdrawal_requests
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Withdrawals: admin delete" ON public.withdrawal_requests
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Helper to compute available balance for a user (returns earned minus completed/pending withdrawals)
CREATE OR REPLACE FUNCTION public.user_available_balance(_user_id uuid)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT SUM(amount_received) FROM public.returns WHERE user_id = _user_id), 0
  ) - COALESCE(
    (SELECT SUM(amount) FROM public.withdrawal_requests
     WHERE user_id = _user_id AND status IN ('pending','approved','processing','completed')), 0
  );
$$;
