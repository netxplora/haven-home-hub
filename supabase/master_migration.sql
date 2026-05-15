
-- =========================
-- ENUMS
-- =========================
CREATE TYPE public.app_role AS ENUM ('admin', 'agent', 'user');
CREATE TYPE public.property_type AS ENUM ('buy', 'rent', 'land');
CREATE TYPE public.property_status AS ENUM ('available', 'reserved', 'sold');
CREATE TYPE public.inquiry_status AS ENUM ('new', 'in_progress', 'resolved', 'closed');
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- USER ROLES
-- =========================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Security-definer role check (avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =========================
-- LOCATIONS
-- =========================
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- AGENTS
-- =========================
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  bio TEXT,
  photo_url TEXT,
  role_title TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- PROPERTIES
-- =========================
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  property_type public.property_type NOT NULL,
  status public.property_status NOT NULL DEFAULT 'available',
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  address TEXT,
  bedrooms INT,
  bathrooms INT,
  size_sqm NUMERIC(10,2),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  video_url TEXT,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  featured BOOLEAN NOT NULL DEFAULT false,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_properties_type ON public.properties(property_type);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_properties_location ON public.properties(location_id);
CREATE INDEX idx_properties_agent ON public.properties(agent_id);
CREATE INDEX idx_properties_featured ON public.properties(featured);

-- =========================
-- PROPERTY IMAGES
-- =========================
CREATE TABLE public.property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_cover BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_property_images_property ON public.property_images(property_id);

-- =========================
-- SAVED PROPERTIES
-- =========================
CREATE TABLE public.saved_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, property_id)
);

-- =========================
-- INQUIRIES
-- =========================
CREATE TABLE public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  status public.inquiry_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- BOOKINGS (inspections)
-- =========================
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  preferred_date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  status public.booking_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- ENABLE RLS
-- =========================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- =========================
-- RLS POLICIES
-- =========================

-- PROFILES
CREATE POLICY "Profiles: own row select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Profiles: own row update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles: own row insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles: admin all" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- USER ROLES
CREATE POLICY "Roles: read own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Roles: admin manage" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- LOCATIONS (public read, admin write)
CREATE POLICY "Locations: public read" ON public.locations FOR SELECT USING (true);
CREATE POLICY "Locations: admin write" ON public.locations FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- AGENTS (public read, admin write, agent can update own row)
CREATE POLICY "Agents: public read" ON public.agents FOR SELECT USING (true);
CREATE POLICY "Agents: admin write" ON public.agents FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Agents: self update" ON public.agents FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- PROPERTIES (public read, admin write, assigned agent update)
CREATE POLICY "Properties: public read" ON public.properties FOR SELECT USING (true);
CREATE POLICY "Properties: admin write" ON public.properties FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Properties: agent update assigned" ON public.properties FOR UPDATE TO authenticated USING (
  agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
) WITH CHECK (
  agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
);

-- PROPERTY IMAGES (public read, admin write)
CREATE POLICY "PropertyImages: public read" ON public.property_images FOR SELECT USING (true);
CREATE POLICY "PropertyImages: admin write" ON public.property_images FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- SAVED PROPERTIES (owner only)
CREATE POLICY "Saved: own select" ON public.saved_properties FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Saved: own insert" ON public.saved_properties FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Saved: own delete" ON public.saved_properties FOR DELETE TO authenticated USING (user_id = auth.uid());

-- INQUIRIES (anyone can create; owner/agent/admin read; agent/admin update)
CREATE POLICY "Inquiries: public insert" ON public.inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Inquiries: own read" ON public.inquiries FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(),'admin')
  OR agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
);
CREATE POLICY "Inquiries: agent admin update" ON public.inquiries FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
) WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
);
CREATE POLICY "Inquiries: admin delete" ON public.inquiries FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- BOOKINGS (anyone can create; owner/agent/admin read; agent/admin update)
CREATE POLICY "Bookings: public insert" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Bookings: own read" ON public.bookings FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(),'admin')
  OR agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
);
CREATE POLICY "Bookings: agent admin update" ON public.bookings FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
) WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
);
CREATE POLICY "Bookings: admin delete" ON public.bookings FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- =========================
-- TRIGGERS
-- =========================

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tr_agents_updated BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tr_properties_updated BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tr_inquiries_updated BEFORE UPDATE ON public.inquiries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tr_bookings_updated BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + default 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- STORAGE BUCKET
-- =========================
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-media', 'property-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Property media public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'property-media');

CREATE POLICY "Property media admin upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'property-media' AND public.has_role(auth.uid(),'admin')
  );

CREATE POLICY "Property media admin update" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'property-media' AND public.has_role(auth.uid(),'admin')
  );

CREATE POLICY "Property media admin delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'property-media' AND public.has_role(auth.uid(),'admin')
  );

-- 1. Tighten "Inquiries: public insert" — disallow setting a user_id that isn't yours
DROP POLICY "Inquiries: public insert" ON public.inquiries;
CREATE POLICY "Inquiries: insert"
ON public.inquiries FOR INSERT
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);

-- 2. Tighten "Bookings: public insert"
DROP POLICY "Bookings: public insert" ON public.bookings;
CREATE POLICY "Bookings: insert"
ON public.bookings FOR INSERT
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);

-- 3. Restrict storage SELECT so the bucket can't be listed by anyone
DROP POLICY "Property media public read" ON storage.objects;
-- Public can fetch by direct URL (the bucket is public), but listing via the API now requires admin
CREATE POLICY "Property media admin list"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'property-media' AND public.has_role(auth.uid(),'admin'));

-- 4. Lock down the SECURITY DEFINER signup trigger function
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 5. Make sure search_path is explicit on set_updated_at as well
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  title TEXT,
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reviews_target_check CHECK (property_id IS NOT NULL OR agent_id IS NOT NULL),
  CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5)
);

CREATE UNIQUE INDEX reviews_unique_user_property ON public.reviews(user_id, property_id) WHERE property_id IS NOT NULL;
CREATE UNIQUE INDEX reviews_unique_user_agent ON public.reviews(user_id, agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX reviews_property_idx ON public.reviews(property_id);
CREATE INDEX reviews_agent_idx ON public.reviews(agent_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews: public read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Reviews: own insert" ON public.reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Reviews: own update" ON public.reviews FOR UPDATE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Reviews: own delete" ON public.reviews FOR DELETE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER reviews_set_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage policies for property-media so admins can upload, agents can upload to their assigned properties
CREATE POLICY "PropertyMedia: public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-media');

CREATE POLICY "PropertyMedia: admin write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'property-media' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "PropertyMedia: admin update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'property-media' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'property-media' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "PropertyMedia: admin delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'property-media' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "PropertyMedia: agent write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'property-media'
  AND EXISTS (SELECT 1 FROM public.agents a WHERE a.user_id = auth.uid())
);
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
REVOKE EXECUTE ON FUNCTION public.allocate_investment_units(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_investment_units(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_investment_units(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_investment_units(uuid, integer) TO service_role;

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

-- Lock down create_notification: only service role / postgres should call it
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, notification_type, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

-- Replace user_available_balance with a no-arg version that uses auth.uid()
DROP FUNCTION IF EXISTS public.user_available_balance(uuid);

CREATE OR REPLACE FUNCTION public.user_available_balance()
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT SUM(amount_received) FROM public.returns WHERE user_id = auth.uid()), 0
  ) - COALESCE(
    (SELECT SUM(amount) FROM public.withdrawal_requests
     WHERE user_id = auth.uid() AND status IN ('pending','approved','processing','completed')), 0
  );
$$;

REVOKE EXECUTE ON FUNCTION public.user_available_balance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_available_balance() TO authenticated;
-- Create CMS tables
CREATE TABLE public.blog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT,
    excerpt TEXT,
    cover_image_url TEXT,
    category_id UUID REFERENCES public.blog_categories(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    author_id UUID REFERENCES public.profiles(id),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Categories: readable by everyone, writable by admins
CREATE POLICY "Categories are viewable by everyone." ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "Categories are insertable by admins." ON public.blog_categories FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Categories are updatable by admins." ON public.blog_categories FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Categories are deletable by admins." ON public.blog_categories FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Posts: published posts readable by everyone, drafts readable by author/admin, writable by admins
CREATE POLICY "Published posts are viewable by everyone." ON public.blog_posts FOR SELECT USING (status = 'published');
CREATE POLICY "Admins can view all posts." ON public.blog_posts FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authors can view their own posts." ON public.blog_posts FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "Admins can insert posts." ON public.blog_posts FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update posts." ON public.blog_posts FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete posts." ON public.blog_posts FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
