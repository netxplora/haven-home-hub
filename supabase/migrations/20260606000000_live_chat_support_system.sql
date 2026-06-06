-- Live Chat Support Center & Admin Support Management System Migration
-- Created: 2026-06-06

-- 1. Support Categories Table
CREATE TABLE IF NOT EXISTS public.support_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. FAQs Table
CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL,
  is_published BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Support Auto Responses Table
CREATE TABLE IF NOT EXISTS public.support_auto_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL UNIQUE CHECK (event_type IN ('welcome', 'ticket_created', 'ticket_resolved')),
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  user_type TEXT NOT NULL DEFAULT 'guest',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'awaiting_user', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  category_id UUID REFERENCES public.support_categories(id) ON DELETE SET NULL,
  assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5)
);

-- 5. Support Messages Table
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'guest', 'agent', 'system')),
  sender_name TEXT NOT NULL,
  message_text TEXT,
  attachments JSONB DEFAULT '[]'::jsonb, -- Array of {name, url, size, type}
  is_read BOOLEAN DEFAULT false NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. Support Private Notes Table
CREATE TABLE IF NOT EXISTS public.support_private_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 7. Support Ticket Events Table (Audit History)
CREATE TABLE IF NOT EXISTS public.support_ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- e.g., 'created', 'status_change', 'assignment_change', 'escalation', 'note_added', 'file_uploaded'
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 8. Support Roles Table (RBAC)
CREATE TABLE IF NOT EXISTS public.support_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('support_agent', 'manager', 'admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_agent ON public.support_tickets(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_private_notes_ticket_id ON public.support_private_notes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_events_ticket_id ON public.support_ticket_events(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_roles_user_id ON public.support_roles(user_id);

-- Set updated_at trigger helper on modified tables
DROP TRIGGER IF EXISTS trg_support_categories_updated ON public.support_categories;
CREATE TRIGGER trg_support_categories_updated
BEFORE UPDATE ON public.support_categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_faqs_updated ON public.faqs;
CREATE TRIGGER trg_faqs_updated
BEFORE UPDATE ON public.faqs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_support_auto_responses_updated ON public.support_auto_responses;
CREATE TRIGGER trg_support_auto_responses_updated
BEFORE UPDATE ON public.support_auto_responses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_support_tickets_updated ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Support Staff Helper Function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_support_staff(_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF _user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.support_roles WHERE user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable Row Level Security (RLS)
ALTER TABLE public.support_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_auto_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_private_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_roles ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies

-- Categories
DROP POLICY IF EXISTS "Allow public read access to categories" ON public.support_categories;
CREATE POLICY "Allow public read access to categories" ON public.support_categories
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow support staff to manage categories" ON public.support_categories;
CREATE POLICY "Allow support staff to manage categories" ON public.support_categories
  FOR ALL TO authenticated USING (public.is_support_staff(auth.uid())) WITH CHECK (public.is_support_staff(auth.uid()));

-- FAQs
DROP POLICY IF EXISTS "Allow public read access to published FAQs" ON public.faqs;
CREATE POLICY "Allow public read access to published FAQs" ON public.faqs
  FOR SELECT TO public USING (is_published = true OR public.is_support_staff(auth.uid()));

DROP POLICY IF EXISTS "Allow support staff to manage FAQs" ON public.faqs;
CREATE POLICY "Allow support staff to manage FAQs" ON public.faqs
  FOR ALL TO authenticated USING (public.is_support_staff(auth.uid())) WITH CHECK (public.is_support_staff(auth.uid()));

-- Auto Responses
DROP POLICY IF EXISTS "Allow public read access to auto responses" ON public.support_auto_responses;
CREATE POLICY "Allow public read access to auto responses" ON public.support_auto_responses
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow support staff to manage auto responses" ON public.support_auto_responses;
CREATE POLICY "Allow support staff to manage auto responses" ON public.support_auto_responses
  FOR ALL TO authenticated USING (public.is_support_staff(auth.uid())) WITH CHECK (public.is_support_staff(auth.uid()));

-- Tickets
DROP POLICY IF EXISTS "Allow users to read own tickets and staff to read all" ON public.support_tickets;
CREATE POLICY "Allow users to read own tickets and staff to read all" ON public.support_tickets
  FOR SELECT TO public USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    public.is_support_staff(auth.uid()) OR
    (auth.uid() IS NULL) -- Allow guest select by ID from client widget
  );

DROP POLICY IF EXISTS "Allow anyone to create support tickets" ON public.support_tickets;
CREATE POLICY "Allow anyone to create support tickets" ON public.support_tickets
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users to update own tickets and staff to update all" ON public.support_tickets;
CREATE POLICY "Allow users to update own tickets and staff to update all" ON public.support_tickets
  FOR UPDATE TO public USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    public.is_support_staff(auth.uid()) OR
    (auth.uid() IS NULL)
  ) WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    public.is_support_staff(auth.uid()) OR
    (auth.uid() IS NULL)
  );

-- Messages
DROP POLICY IF EXISTS "Allow users to read messages of their tickets" ON public.support_messages;
CREATE POLICY "Allow users to read messages of their tickets" ON public.support_messages
  FOR SELECT TO public USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_id AND (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
        public.is_support_staff(auth.uid()) OR
        (auth.uid() IS NULL)
      )
    )
  );

DROP POLICY IF EXISTS "Allow anyone to send messages to active tickets" ON public.support_messages;
CREATE POLICY "Allow anyone to send messages to active tickets" ON public.support_messages
  FOR INSERT TO public WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_id AND (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
        public.is_support_staff(auth.uid()) OR
        (auth.uid() IS NULL)
      )
    )
  );

DROP POLICY IF EXISTS "Allow messages read update" ON public.support_messages;
CREATE POLICY "Allow messages read update" ON public.support_messages
  FOR UPDATE TO public USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_id AND (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
        public.is_support_staff(auth.uid()) OR
        (auth.uid() IS NULL)
      )
    )
  );

-- Private Notes (Staff Only)
DROP POLICY IF EXISTS "Allow staff to access notes" ON public.support_private_notes;
CREATE POLICY "Allow staff to access notes" ON public.support_private_notes
  FOR ALL TO authenticated USING (public.is_support_staff(auth.uid())) WITH CHECK (public.is_support_staff(auth.uid()));

-- Ticket Events
DROP POLICY IF EXISTS "Allow user and staff read access to events" ON public.support_ticket_events;
CREATE POLICY "Allow user and staff read access to events" ON public.support_ticket_events
  FOR SELECT TO public USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_id AND (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
        public.is_support_staff(auth.uid()) OR
        (auth.uid() IS NULL)
      )
    )
  );

DROP POLICY IF EXISTS "Allow staff to insert events" ON public.support_ticket_events;
CREATE POLICY "Allow staff to insert events" ON public.support_ticket_events
  FOR INSERT TO authenticated WITH CHECK (public.is_support_staff(auth.uid()));

-- Support Roles (Admins Manage, Staff View)
DROP POLICY IF EXISTS "Allow staff to read roles" ON public.support_roles;
CREATE POLICY "Allow staff to read roles" ON public.support_roles
  FOR SELECT TO authenticated USING (public.is_support_staff(auth.uid()));

DROP POLICY IF EXISTS "Allow admins to manage roles" ON public.support_roles;
CREATE POLICY "Allow admins to manage roles" ON public.support_roles
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- 10. Triggers & Automation Function

-- Update ticket last_message_at on new message
CREATE OR REPLACE FUNCTION public.update_support_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.support_tickets
  SET last_message_at = now(), updated_at = now()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_support_ticket_ts ON public.support_messages;
CREATE TRIGGER trg_update_support_ticket_ts
  AFTER INSERT ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_support_ticket_timestamp();

-- Ticket events logger trigger helper
CREATE OR REPLACE FUNCTION public.log_support_ticket_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.support_ticket_events (ticket_id, event_type, details)
  VALUES (
    NEW.id,
    'created',
    jsonb_build_object(
      'name', NEW.name,
      'email', NEW.email,
      'user_type', NEW.user_type,
      'priority', NEW.priority
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_support_ticket_creation ON public.support_tickets;
CREATE TRIGGER trg_log_support_ticket_creation
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_support_ticket_creation();

-- Ticket updates logger trigger helper (status / assignment changes)
CREATE OR REPLACE FUNCTION public.log_support_ticket_updates()
RETURNS TRIGGER AS $$
DECLARE
  v_details JSONB := '{}'::jsonb;
  v_triggered BOOLEAN := false;
BEGIN
  IF OLD.status != NEW.status THEN
    v_details := v_details || jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status);
    v_triggered := true;
    
    -- Insert event for status change
    INSERT INTO public.support_ticket_events (ticket_id, event_type, details, created_by)
    VALUES (NEW.id, 'status_change', jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status), auth.uid());
  END IF;

  IF OLD.assigned_agent_id IS DISTINCT FROM NEW.assigned_agent_id THEN
    v_details := v_details || jsonb_build_object('old_agent', OLD.assigned_agent_id, 'new_agent', NEW.assigned_agent_id);
    v_triggered := true;

    -- Insert event for assignment change
    INSERT INTO public.support_ticket_events (ticket_id, event_type, details, created_by)
    VALUES (NEW.id, 'assignment_change', jsonb_build_object('old_agent', OLD.assigned_agent_id, 'new_agent', NEW.assigned_agent_id), auth.uid());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_support_ticket_updates ON public.support_tickets;
CREATE TRIGGER trg_log_support_ticket_updates
  AFTER UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_support_ticket_updates();

-- Auto Responses Handler Trigger Function
CREATE OR REPLACE FUNCTION public.handle_support_auto_responses()
RETURNS TRIGGER AS $$
DECLARE
  v_welcome_message TEXT;
  v_resolved_message TEXT;
BEGIN
  -- 1. Create Ticket Auto Response (triggers on INSERT of ticket)
  IF TG_OP = 'INSERT' THEN
    -- Fetch active welcome auto-response
    SELECT message INTO v_welcome_message
    FROM public.support_auto_responses
    WHERE event_type = 'welcome' AND is_active = true;

    IF v_welcome_message IS NOT NULL THEN
      INSERT INTO public.support_messages (ticket_id, sender_type, sender_name, message_text)
      VALUES (NEW.id, 'system', 'Haven Support System', v_welcome_message);
    END IF;

    -- Fetch active ticket_created auto-response
    SELECT message INTO v_welcome_message
    FROM public.support_auto_responses
    WHERE event_type = 'ticket_created' AND is_active = true;

    IF v_welcome_message IS NOT NULL THEN
      INSERT INTO public.support_messages (ticket_id, sender_type, sender_name, message_text)
      VALUES (NEW.id, 'system', 'Haven Support System', v_welcome_message);
    END IF;
  END IF;

  -- 2. Resolved Ticket Auto Response (triggers on UPDATE of ticket status to 'resolved')
  IF TG_OP = 'UPDATE' AND OLD.status != 'resolved' AND NEW.status = 'resolved' THEN
    SELECT message INTO v_resolved_message
    FROM public.support_auto_responses
    WHERE event_type = 'ticket_resolved' AND is_active = true;

    IF v_resolved_message IS NOT NULL THEN
      INSERT INTO public.support_messages (ticket_id, sender_type, sender_name, message_text)
      VALUES (NEW.id, 'system', 'Haven Support System', v_resolved_message);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_support_ticket_insert_auto_response ON public.support_tickets;
CREATE TRIGGER trg_support_ticket_insert_auto_response
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_support_auto_responses();

DROP TRIGGER IF EXISTS trg_support_ticket_update_auto_response ON public.support_tickets;
CREATE TRIGGER trg_support_ticket_update_auto_response
  AFTER UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_support_auto_responses();

-- Realtime is enabled automatically since publication is FOR ALL TABLES

-- Seed support_auto_responses with professional default configurations
INSERT INTO public.support_auto_responses (event_type, message, is_active)
VALUES 
  ('welcome', 'Welcome to Haven Home Hub Support Center. Our representatives typically respond within a few minutes.', true),
  ('ticket_created', 'Your support request has been registered successfully. A team member has been notified.', true),
  ('ticket_resolved', 'This conversation has been marked as resolved. If you need further assistance, feel free to reopen it by typing a message.', true)
ON CONFLICT (event_type) DO UPDATE SET message = EXCLUDED.message;

-- Seed default support categories
INSERT INTO public.support_categories (name, description)
VALUES 
  ('General Inquiry', 'General questions about Haven Home Hub services.'),
  ('Investments', 'Inquiries regarding fractional ownership, property tokens, yields, and portfolios.'),
  ('Property Purchases', 'Questions regarding direct purchasing, inspections, and title reserves.'),
  ('Payments & Finance', 'Support for bank deposits, cryptocurrency verification, and withdrawals.'),
  ('Documents & KYC', 'Inquiries regarding identity verification and legal contracts.')
ON CONFLICT (name) DO NOTHING;

-- Seed standard FAQs
INSERT INTO public.faqs (question, answer, category, is_published)
VALUES
  ('How do I invest?', 'To invest fractionally, navigate to the Invest Opportunities page, choose a property listing, select your investment amount, and proceed to checkout using any supported payment method.', 'Investments', true),
  ('How does ROI work?', 'Returns on fractional properties are collected from lease yields and capital appreciation. The distribution of returns is calculated proportionally based on your share ownership and deposited into your balance.', 'Investments', true),
  ('How do I upload payment proof?', 'Once you make a manual bank deposit or crypto payment, go to your Dashboard under Transactions, select the pending payment, and upload your screenshot or document receipt.', 'Payments & Finance', true),
  ('How do I receive my documents?', 'After transaction verification, your legal templates are generated automatically. You can download and digitally sign them directly from the Documents tab on your Dashboard.', 'Documents & KYC', true),
  ('How does property ownership work?', 'Fractional units are backed by physical real estate assets registered under legal entities (LLCs). Investors hold shares in the entity that owns the property, securing legal backing.', 'Investments', true),
  ('How do I withdraw earnings?', 'Go to the Withdrawals section in your Dashboard, click request withdrawal, enter your bank or cryptocurrency wallet details, and submit. The review process is completed by our finance desk.', 'Payments & Finance', true)
ON CONFLICT DO NOTHING;
