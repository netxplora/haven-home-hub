-- ============ ENUMS ============
CREATE TYPE public.investment_status AS ENUM ('draft','open','funded','closed','paused');
CREATE TYPE public.user_investment_status AS ENUM ('pending','confirmed','cancelled','refunded');
CREATE TYPE public.distribution_frequency AS ENUM ('monthly','quarterly','semi_annual','annual');
CREATE TYPE public.payment_type AS ENUM ('booking','reservation','investment');
CREATE TYPE public.payment_provider AS ENUM ('paystack','flutterwave','crypto','manual_bank');
CREATE TYPE public.payment_status AS ENUM ('pending','processing','success','failed','refunded');

-- ============ INVESTMENT PROPERTIES ============
CREATE TABLE public.investment_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  location text NOT NULL,
  property_type text NOT NULL DEFAULT 'residential',
  cover_image_url text,
  total_value numeric(14,2) NOT NULL CHECK (total_value > 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price > 0),
  total_units integer NOT NULL CHECK (total_units > 0),
  units_sold integer NOT NULL DEFAULT 0 CHECK (units_sold >= 0),
  min_investment numeric(14,2) NOT NULL CHECK (min_investment > 0),
  projected_return_min numeric(5,2) NOT NULL DEFAULT 0,
  projected_return_max numeric(5,2) NOT NULL DEFAULT 0,
  estimated_rental_yield numeric(5,2),
  distribution_frequency public.distribution_frequency NOT NULL DEFAULT 'quarterly',
  holding_period_months integer NOT NULL DEFAULT 36,
  income_model text NOT NULL DEFAULT 'Rental income distributed to unit holders.',
  risk_notes text NOT NULL DEFAULT '',
  status public.investment_status NOT NULL DEFAULT 'draft',
  featured boolean NOT NULL DEFAULT false,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (units_sold <= total_units),
  CHECK (projected_return_max >= projected_return_min)
);

ALTER TABLE public.investment_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "InvProps: public read"
  ON public.investment_properties FOR SELECT USING (true);
CREATE POLICY "InvProps: admin write"
  ON public.investment_properties FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER tg_invprops_updated BEFORE UPDATE ON public.investment_properties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ INVESTMENT PROPERTY IMAGES ============
CREATE TABLE public.investment_property_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.investment_properties(id) ON DELETE CASCADE,
  url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_cover boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.investment_property_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "InvImages: public read" ON public.investment_property_images FOR SELECT USING (true);
CREATE POLICY "InvImages: admin write" ON public.investment_property_images FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ USER INVESTMENTS ============
CREATE TABLE public.user_investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.investment_properties(id) ON DELETE RESTRICT,
  amount_invested numeric(14,2) NOT NULL CHECK (amount_invested > 0),
  units_owned integer NOT NULL CHECK (units_owned > 0),
  status public.user_investment_status NOT NULL DEFAULT 'pending',
  payment_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_investments_user ON public.user_investments(user_id);
CREATE INDEX idx_user_investments_prop ON public.user_investments(property_id);

ALTER TABLE public.user_investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "UserInv: own read"
  ON public.user_investments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "UserInv: own insert"
  ON public.user_investments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "UserInv: admin update"
  ON public.user_investments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "UserInv: admin delete"
  ON public.user_investments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER tg_userinv_updated BEFORE UPDATE ON public.user_investments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PAYOUTS ============
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.investment_properties(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  distribution_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payouts: public read" ON public.payouts FOR SELECT USING (true);
CREATE POLICY "Payouts: admin write" ON public.payouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ RETURNS (per-user payout share) ============
CREATE TABLE public.returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.investment_properties(id) ON DELETE CASCADE,
  payout_id uuid REFERENCES public.payouts(id) ON DELETE SET NULL,
  amount_received numeric(14,2) NOT NULL CHECK (amount_received >= 0),
  distribution_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_returns_user ON public.returns(user_id);
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Returns: own read" ON public.returns FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Returns: admin write" ON public.returns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ PAYMENTS (unified) ============
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  payment_type public.payment_type NOT NULL,
  provider public.payment_provider NOT NULL,
  reference text NOT NULL UNIQUE,
  external_reference text,
  status public.payment_status NOT NULL DEFAULT 'pending',
  -- what this payment is for
  booking_id uuid,
  investment_id uuid,
  investment_property_id uuid,
  property_id uuid,
  crypto_currency text,
  crypto_amount numeric(20,8),
  crypto_address text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_status ON public.payments(status);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payments: own read" ON public.payments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Payments: own insert" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Payments: admin update" ON public.payments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Payments: admin delete" ON public.payments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER tg_payments_updated BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ATOMIC UNIT ALLOCATION ============
CREATE OR REPLACE FUNCTION public.allocate_investment_units(
  _property_id uuid,
  _units integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available integer;
BEGIN
  SELECT (total_units - units_sold) INTO v_available
  FROM public.investment_properties
  WHERE id = _property_id
  FOR UPDATE;

  IF v_available IS NULL THEN
    RAISE EXCEPTION 'Investment property not found';
  END IF;

  IF v_available < _units THEN
    RETURN false;
  END IF;

  UPDATE public.investment_properties
  SET units_sold = units_sold + _units,
      status = CASE WHEN units_sold + _units >= total_units THEN 'funded'::investment_status ELSE status END
  WHERE id = _property_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_investment_units(
  _property_id uuid,
  _units integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.investment_properties
  SET units_sold = GREATEST(0, units_sold - _units),
      status = CASE WHEN status = 'funded' AND (units_sold - _units) < total_units THEN 'open'::investment_status ELSE status END
  WHERE id = _property_id;
END;
$$;