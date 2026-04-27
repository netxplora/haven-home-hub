
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
