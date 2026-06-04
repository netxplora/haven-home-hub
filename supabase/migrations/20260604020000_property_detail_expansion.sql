-- Migration to add Journey, Documents, and Liquidity sections to properties

-- 1. Add Liquidity Rules to investment_properties
ALTER TABLE public.investment_properties
ADD COLUMN IF NOT EXISTS liquidity_rules text;

-- 2. Create property_documents table
CREATE TABLE IF NOT EXISTS public.property_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL REFERENCES public.investment_properties(id) ON DELETE CASCADE,
    title text NOT NULL,
    url text NOT NULL,
    document_type text NOT NULL,
    size_bytes bigint DEFAULT 0,
    document_date date,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS for property_documents
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;

-- Everyone can read documents
DROP POLICY IF EXISTS "property_documents_read_all" ON public.property_documents;
CREATE POLICY "property_documents_read_all"
    ON public.property_documents FOR SELECT
    USING (true);

-- Admins can insert/update/delete documents
DROP POLICY IF EXISTS "property_documents_admin_all" ON public.property_documents;
CREATE POLICY "property_documents_admin_all"
    ON public.property_documents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
        )
    );

-- 3. Create property_journey table
CREATE TABLE IF NOT EXISTS public.property_journey (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL REFERENCES public.investment_properties(id) ON DELETE CASCADE,
    stage_name text NOT NULL,
    description text,
    expected_date date,
    completed_date date,
    status text NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS for property_journey
ALTER TABLE public.property_journey ENABLE ROW LEVEL SECURITY;

-- Everyone can read journey
DROP POLICY IF EXISTS "property_journey_read_all" ON public.property_journey;
CREATE POLICY "property_journey_read_all"
    ON public.property_journey FOR SELECT
    USING (true);

-- Admins can insert/update/delete journey
DROP POLICY IF EXISTS "property_journey_admin_all" ON public.property_journey;
CREATE POLICY "property_journey_admin_all"
    ON public.property_journey FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Safely create trigger for property_documents
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_property_documents_modtime') THEN
        CREATE TRIGGER update_property_documents_modtime
        BEFORE UPDATE ON public.property_documents
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;

-- Safely create trigger for property_journey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_property_journey_modtime') THEN
        CREATE TRIGGER update_property_journey_modtime
        BEFORE UPDATE ON public.property_journey
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;
