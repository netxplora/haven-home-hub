-- Migration: Phase 2 Investment Lifecycle Implementation
-- Created: 2026-06-04
-- Purpose: Complete lifecycle, ROI, maturity, audit, and document automation.

COMMIT;

-- ============================================================
-- 1. ENUM UPDATES (OUTSIDE TRANSACTION FOR SAFETY)
-- ============================================================
ALTER TYPE public.investment_status ADD VALUE IF NOT EXISTS 'fully_funded';
ALTER TYPE public.investment_status ADD VALUE IF NOT EXISTS 'preparing_for_roi';
ALTER TYPE public.investment_status ADD VALUE IF NOT EXISTS 'roi_active';
ALTER TYPE public.investment_status ADD VALUE IF NOT EXISTS 'roi_paused';
ALTER TYPE public.investment_status ADD VALUE IF NOT EXISTS 'matured';

ALTER TYPE public.user_investment_status ADD VALUE IF NOT EXISTS 'preparing_for_roi';
ALTER TYPE public.user_investment_status ADD VALUE IF NOT EXISTS 'roi_active';
ALTER TYPE public.user_investment_status ADD VALUE IF NOT EXISTS 'roi_paused';

-- ============================================================
-- 1.5 MODIFY DOCUMENT TEMPLATES CHECK CONSTRAINT
-- ============================================================
ALTER TABLE public.document_templates DROP CONSTRAINT IF EXISTS document_templates_document_type_check;
ALTER TABLE public.document_templates ADD CONSTRAINT document_templates_document_type_check CHECK (document_type = ANY (ARRAY[
    'investment_agreement'::text, 
    'property_purchase'::text, 
    'lease_agreement'::text, 
    'kyc_declaration'::text, 
    'contract_of_sale'::text, 
    'deed_of_assignment'::text, 
    'survey_plan'::text, 
    'allocation_letter'::text, 
    'purchase_receipt'::text, 
    'property_purchase_agreement'::text, 
    'ownership_confirmation'::text, 
    'payment_receipt'::text, 
    'invoice'::text, 
    'reservation_confirmation'::text, 
    'fractional_ownership_certificate'::text, 
    'investment_confirmation_letter'::text, 
    'roi_agreement_summary'::text, 
    'investment_receipt'::text,
    'investment_activation_certificate'::text,
    'roi_commencement_notice'::text,
    'investment_summary_report'::text,
    'investment_completion_report'::text,
    'final_roi_statement'::text,
    'investment_maturity_certificate'::text
]));

-- ============================================================
-- 2. SCHEMA EXPANSION ON USER_INVESTMENTS
-- ============================================================
ALTER TABLE public.user_investments
ADD COLUMN IF NOT EXISTS investment_status TEXT,
ADD COLUMN IF NOT EXISTS funding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS roi_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS roi_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS roi_paused_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS roi_resumed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS maturity_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS roi_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS activation_notes TEXT,
ADD COLUMN IF NOT EXISTS activated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS total_paused_days INTEGER DEFAULT 0;

-- Set default values for existing columns to match the stage
UPDATE public.user_investments 
SET investment_status = 'submitted' 
WHERE investment_status IS NULL AND status = 'pending';

UPDATE public.user_investments 
SET investment_status = 'payment_submitted' 
WHERE investment_status IS NULL AND status = 'payment_under_review';

UPDATE public.user_investments 
SET investment_status = 'units_allocated' 
WHERE investment_status IS NULL AND status = 'confirmed';

UPDATE public.user_investments 
SET investment_status = 'roi_activated', 
    roi_status = 'active', 
    maturity_status = 'maturing',
    roi_start_date = COALESCE(start_date::timestamp with time zone, activated_at, created_at),
    roi_end_date = COALESCE(maturity_date::timestamp with time zone, start_date::timestamp with time zone + interval '12 months')
WHERE investment_status IS NULL AND status = 'active';

UPDATE public.user_investments 
SET investment_status = 'matured', 
    roi_status = 'completed', 
    maturity_status = 'matured'
WHERE investment_status IS NULL AND status = 'matured';

-- ============================================================
-- 3. AUDIT LOG TABLES CREATION
-- ============================================================
CREATE TABLE IF NOT EXISTS public.investment_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID REFERENCES public.user_investments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.roi_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID REFERENCES public.user_investments(id) ON DELETE CASCADE,
    amount_accrued NUMERIC(14,2) NOT NULL,
    roi_percentage NUMERIC(14,2) NOT NULL,
    calculation_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    roi_status_at_time TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.maturity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID REFERENCES public.user_investments(id) ON DELETE CASCADE,
    status_before TEXT,
    status_after TEXT,
    days_remaining INTEGER,
    completion_percentage NUMERIC(14,2),
    logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID REFERENCES public.user_investments(id) ON DELETE CASCADE,
    activated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    roi_start_date TIMESTAMPTZ NOT NULL,
    roi_end_date TIMESTAMPTZ NOT NULL,
    activation_notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS) FOR AUDIT TABLES
-- ============================================================
ALTER TABLE public.investment_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roi_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maturity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own activity logs" ON public.investment_activity_logs;
CREATE POLICY "Users view own activity logs" ON public.investment_activity_logs
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM public.user_investments ui WHERE ui.id = investment_id AND ui.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Users view own roi logs" ON public.roi_logs;
CREATE POLICY "Users view own roi logs" ON public.roi_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.user_investments ui WHERE ui.id = investment_id AND ui.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Users view own maturity logs" ON public.maturity_logs;
CREATE POLICY "Users view own maturity logs" ON public.maturity_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.user_investments ui WHERE ui.id = investment_id AND ui.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Users view own activation logs" ON public.activation_logs;
CREATE POLICY "Users view own activation logs" ON public.activation_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.user_investments ui WHERE ui.id = investment_id AND ui.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- System bypass policies for insertions
DROP POLICY IF EXISTS "System insert activity logs" ON public.investment_activity_logs;
CREATE POLICY "System insert activity logs" ON public.investment_activity_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System insert roi logs" ON public.roi_logs;
CREATE POLICY "System insert roi logs" ON public.roi_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System insert maturity logs" ON public.maturity_logs;
CREATE POLICY "System insert maturity logs" ON public.maturity_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System insert activation logs" ON public.activation_logs;
CREATE POLICY "System insert activation logs" ON public.activation_logs FOR INSERT WITH CHECK (true);

-- ============================================================
-- 5. REBUILD PROPERTY FUNDING COMPLETION TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_investment_fully_funded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If units_sold has reached or exceeded total_units OR current_funding >= total_value, mark as fully_funded
    IF (NEW.units_sold >= NEW.total_units OR NEW.current_funding >= NEW.total_value) AND NEW.status = 'open' THEN
        NEW.status := 'fully_funded';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_property_funding_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_inv RECORD;
BEGIN
    -- If units_sold has reached or exceeded total_units OR current_funding >= total_value, mark as fully_funded
    IF (NEW.units_sold >= NEW.total_units OR NEW.current_funding >= NEW.total_value) AND NEW.status = 'open' THEN
        NEW.status := 'fully_funded';
    END IF;

    -- Trigger when status changes to 'fully_funded' (or legacy 'funded' just in case)
    IF (NEW.status = 'fully_funded' OR NEW.status = 'funded') AND (OLD.status != 'fully_funded' AND OLD.status != 'funded') THEN

        -- Record the funding completion timestamp on the property
        NEW.funding_completed_at := now();

        -- Loop through all confirmed / active user investments for this property
        FOR v_inv IN
            SELECT id, user_id
            FROM public.user_investments
            WHERE property_id = NEW.id AND status IN ('confirmed', 'active_investment', 'active')
        LOOP
            -- Update user investment status to preparing_for_roi
            UPDATE public.user_investments
            SET status = 'preparing_for_roi',
                investment_status = 'funding_completed',
                funding_completed_at = now()
            WHERE id = v_inv.id;

            -- Create Notification for user
            INSERT INTO public.notifications (user_id, type, title, body, link, category)
            VALUES (
                v_inv.user_id,
                'property',
                'Funding Completed: ' || NEW.title,
                'Congratulations! ' || NEW.title || ' has reached full funding. The asset is now awaiting activation.',
                '/invest/portfolio/' || v_inv.id,
                'investment'
            );

            -- Log to investment_activity_logs
            INSERT INTO public.investment_activity_logs (investment_id, user_id, activity_type, description)
            VALUES (
                v_inv.id,
                v_inv.user_id,
                'funding_completed',
                'Property campaign reached 100% funding. Asset awaiting activation.'
            );
        END LOOP;

        -- Notify admins
        INSERT INTO public.notifications (user_id, type, title, body, link, category)
        SELECT 
            ur.user_id,
            'property',
            'Campaign Fully Funded: ' || NEW.title,
            'Investment property ' || NEW.title || ' has reached 100% funding. You can now activate the asset in the Investment Operations Center.',
            '/admin/invest',
            'system'
        FROM public.user_roles ur
        WHERE ur.role = 'admin';

        -- Add a global activity toast for the property being fully funded
        INSERT INTO public.activity_toasts (type, message, property_id)
        VALUES (
            'fractional',
            NEW.title || ' has reached full funding!',
            NEW.id
        );

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on investment_properties without column restrictions
DROP TRIGGER IF EXISTS on_property_funding_complete ON public.investment_properties;
CREATE TRIGGER on_property_funding_complete
    BEFORE UPDATE ON public.investment_properties
    FOR EACH ROW
    EXECUTE FUNCTION public.process_property_funding_completion();

-- ============================================================
-- 6. DYNAMIC DOCUMENT RPC EXTENSION
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_automated_document(
    p_user_id UUID,
    p_payment_id UUID DEFAULT NULL,
    p_document_type TEXT DEFAULT 'purchase_receipt',
    p_investment_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_template RECORD;
    v_profile RECORD;
    v_user_email TEXT;
    v_payment RECORD;
    v_property_title TEXT;
    v_property_location TEXT;
    v_property_type TEXT;
    v_property_id TEXT;
    v_purchase_amount TEXT;
    v_amount_paid TEXT;
    v_outstanding TEXT;
    v_payment_method TEXT;
    v_tx_ref TEXT;
    v_units_owned TEXT;
    v_amount_invested TEXT;
    v_compiled_html TEXT;
    v_doc_ref TEXT;
    v_verify_code TEXT;
    v_doc_name TEXT;
    v_doc_id UUID;
    v_inv_prop_id UUID;
    v_prop_id UUID;
BEGIN
    -- 1. Get the active template for this document type
    SELECT * INTO v_template
    FROM public.document_templates
    WHERE document_type = p_document_type
      AND is_active = true
    ORDER BY version DESC
    LIMIT 1;

    IF v_template.id IS NULL THEN
        RAISE EXCEPTION 'No active template found for document type: %', p_document_type;
    END IF;

    -- 2. Get investor profile data
    SELECT p.id, p.full_name, p.phone
    INTO v_profile
    FROM public.profiles p
    WHERE p.id = p_user_id;

    IF v_profile.id IS NULL THEN
        RAISE EXCEPTION 'User profile not found for user_id: %', p_user_id;
    END IF;

    -- Get email from auth.users
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = p_user_id;

    -- 3. Gather payment + property data
    v_property_title := 'N/A';
    v_property_location := 'N/A';
    v_property_type := 'N/A';
    v_property_id := 'N/A';
    v_purchase_amount := 'N/A';
    v_amount_paid := '0';
    v_outstanding := '0';
    v_payment_method := 'N/A';
    v_tx_ref := 'N/A';
    v_units_owned := 'N/A';
    v_amount_invested := 'N/A';
    v_inv_prop_id := NULL;
    v_prop_id := NULL;

    IF p_investment_id IS NOT NULL THEN
        SELECT property_id INTO v_inv_prop_id
        FROM public.user_investments
        WHERE id = p_investment_id;

        IF v_inv_prop_id IS NOT NULL THEN
            SELECT title, location, property_type, id::TEXT, total_value::TEXT
            INTO v_property_title, v_property_location, v_property_type, v_property_id, v_purchase_amount
            FROM public.investment_properties
            WHERE id = v_inv_prop_id;

            SELECT COALESCE(ui.units_owned::TEXT, 'N/A'),
                   COALESCE(ui.total_amount::TEXT, ui.amount_invested::TEXT, 'N/A'),
                   COALESCE(ui.amount_paid::TEXT, '0'),
                   COALESCE(ui.remaining_balance::TEXT, '0')
            INTO v_units_owned, v_amount_invested, v_amount_paid, v_outstanding
            FROM public.user_investments ui
            WHERE ui.id = p_investment_id;
            
            v_payment_method := 'system';
            v_tx_ref := p_investment_id::TEXT;
        END IF;
    ELSIF p_payment_id IS NOT NULL THEN
        SELECT * INTO v_payment
        FROM public.payments
        WHERE id = p_payment_id;

        IF v_payment.id IS NOT NULL THEN
            v_amount_paid := COALESCE(v_payment.amount::TEXT, '0');
            v_payment_method := COALESCE(v_payment.provider::TEXT, 'N/A');
            v_tx_ref := COALESCE(v_payment.reference, v_payment.external_reference, v_payment.id::TEXT);

            IF v_payment.investment_property_id IS NOT NULL THEN
                v_inv_prop_id := v_payment.investment_property_id;
                SELECT title, location, property_type, id::TEXT, total_value::TEXT
                INTO v_property_title, v_property_location, v_property_type, v_property_id, v_purchase_amount
                FROM public.investment_properties
                WHERE id = v_payment.investment_property_id;

                SELECT COALESCE(ui.units_owned::TEXT, 'N/A'),
                       COALESCE(ui.total_amount::TEXT, ui.amount_invested::TEXT, 'N/A'),
                       COALESCE(ui.amount_paid::TEXT, '0'),
                       COALESCE(ui.remaining_balance::TEXT, '0')
                INTO v_units_owned, v_amount_invested, v_amount_paid, v_outstanding
                FROM public.user_investments ui
                WHERE ui.user_id = p_user_id
                  AND ui.property_id = v_payment.investment_property_id
                ORDER BY ui.created_at DESC
                LIMIT 1;

            ELSIF v_payment.property_id IS NOT NULL THEN
                v_prop_id := v_payment.property_id;
                SELECT title, COALESCE(address, ''), property_type::TEXT, id::TEXT, price::TEXT
                INTO v_property_title, v_property_location, v_property_type, v_property_id, v_purchase_amount
                FROM public.properties
                WHERE id = v_payment.property_id;

                v_outstanding := GREATEST(0, COALESCE(v_purchase_amount::NUMERIC, 0) - COALESCE(v_amount_paid::NUMERIC, 0))::TEXT;
            END IF;
        END IF;
    END IF;

    -- 4. Generate unique references
    v_doc_ref := 'HHH-' || UPPER(LEFT(gen_random_uuid()::TEXT, 8));
    v_verify_code := UPPER(LEFT(md5(gen_random_uuid()::TEXT || now()::TEXT), 16));
    v_doc_name := v_template.name || ' - ' || v_property_title;

    -- 5. Compile template
    v_compiled_html := v_template.content_html;

    v_compiled_html := REPLACE(v_compiled_html, '{{investor_name}}', COALESCE(v_profile.full_name, 'N/A'));
    v_compiled_html := REPLACE(v_compiled_html, '{{investor_email}}', COALESCE(v_user_email, 'N/A'));
    v_compiled_html := REPLACE(v_compiled_html, '{{investor_phone}}', COALESCE(v_profile.phone, 'N/A'));
    v_compiled_html := REPLACE(v_compiled_html, '{{investor_address}}', 'On file');
    v_compiled_html := REPLACE(v_compiled_html, '{{property_name}}', COALESCE(v_property_title, 'N/A'));
    v_compiled_html := REPLACE(v_compiled_html, '{{property_location}}', COALESCE(v_property_location, 'N/A'));
    v_compiled_html := REPLACE(v_compiled_html, '{{property_type}}', COALESCE(v_property_type, 'N/A'));
    v_compiled_html := REPLACE(v_compiled_html, '{{property_id}}', COALESCE(v_property_id, 'N/A'));
    v_compiled_html := REPLACE(v_compiled_html, '{{purchase_amount}}', COALESCE(v_purchase_amount, 'N/A'));
    v_compiled_html := REPLACE(v_compiled_html, '{{amount_paid}}', COALESCE(v_amount_paid, '0'));
    v_compiled_html := REPLACE(v_compiled_html, '{{outstanding_balance}}', COALESCE(v_outstanding, '0'));
    v_compiled_html := REPLACE(v_compiled_html, '{{payment_method}}', COALESCE(v_payment_method, 'N/A'));
    v_compiled_html := REPLACE(v_compiled_html, '{{transaction_reference}}', COALESCE(v_tx_ref, 'N/A'));
    v_compiled_html := REPLACE(v_compiled_html, '{{issue_date}}', TO_CHAR(now(), 'DD Month YYYY'));
    v_compiled_html := REPLACE(v_compiled_html, '{{approval_date}}', TO_CHAR(now(), 'DD Month YYYY'));
    v_compiled_html := REPLACE(v_compiled_html, '{{payment_date}}', TO_CHAR(now(), 'DD Month YYYY'));
    v_compiled_html := REPLACE(v_compiled_html, '{{document_reference}}', v_doc_ref);
    v_compiled_html := REPLACE(v_compiled_html, '{{verification_code}}', v_verify_code);
    v_compiled_html := REPLACE(v_compiled_html, '{{units_owned}}', COALESCE(v_units_owned, 'N/A'));
    v_compiled_html := REPLACE(v_compiled_html, '{{amount_invested}}', COALESCE(v_amount_invested, 'N/A'));

    -- 6. Insert compiled document
    v_doc_id := gen_random_uuid();

    INSERT INTO public.user_documents (
        id,
        user_id,
        property_id,
        investment_property_id,
        document_type,
        name,
        file_path,
        status,
        verification_code,
        version,
        metadata,
        created_at,
        updated_at
    ) VALUES (
        v_doc_id,
        p_user_id,
        v_prop_id,
        v_inv_prop_id,
        p_document_type,
        v_doc_name,
        'generated://' || v_doc_id::TEXT,
        'available',
        v_verify_code,
        1,
        jsonb_build_object(
            'reference_id', v_doc_ref,
            'verification_code', v_verify_code,
            'template_id', v_template.id,
            'template_version', v_template.version,
            'payment_id', p_payment_id,
            'investment_id', p_investment_id,
            'document_snapshot', v_compiled_html,
            'generated_at', now()::TEXT
        ),
        now(),
        now()
    );

    -- 7. Send notification
    BEGIN
        PERFORM public.create_notification(
            p_user_id,
            'document_ready',
            'Legal Document Ready',
            'Your ' || REPLACE(p_document_type, '_', ' ') || ' document for ' || v_property_title || ' is now available in your documents center.',
            '/dashboard?tab=documents',
            jsonb_build_object('document_id', v_doc_id, 'document_type', p_document_type)
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN v_doc_id;
END;
$$;

-- ============================================================
-- 7. ADMIN ACTIONS: ACTIVATION, PAUSE, RESUME, OTHER CONTROLS
-- ============================================================
CREATE OR REPLACE FUNCTION public.activate_property_roi(
    p_property_id UUID,
    p_admin_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prop RECORD;
    v_inv RECORD;
    v_term_months INTEGER;
    v_roi_start TIMESTAMPTZ;
    v_roi_end TIMESTAMPTZ;
    v_maturity_d DATE;
BEGIN
    -- Check admin
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    -- Fetch property
    SELECT * INTO v_prop FROM public.investment_properties WHERE id = p_property_id;
    IF v_prop.id IS NULL THEN
        RAISE EXCEPTION 'Property not found.';
    END IF;

    -- Update property status to roi_active
    UPDATE public.investment_properties
    SET status = 'roi_active',
        updated_at = now()
    WHERE id = p_property_id;

    v_term_months := COALESCE(v_prop.holding_period_months, 12);
    v_roi_start := now();
    v_roi_end := v_roi_start + (v_term_months || ' months')::interval;
    v_maturity_d := v_roi_end::date;

    -- Loop and activate all investments in 'preparing_for_roi' status
    FOR v_inv IN
        SELECT id, user_id
        FROM public.user_investments
        WHERE property_id = p_property_id AND status = 'preparing_for_roi'
    LOOP
        -- Update user investment
        UPDATE public.user_investments
        SET status = 'roi_active',
            investment_status = 'roi_activated',
            roi_status = 'active',
            maturity_status = 'maturing',
            roi_start_date = v_roi_start,
            roi_end_date = v_roi_end,
            start_date = v_roi_start::date,
            maturity_date = v_maturity_d,
            activated_at = v_roi_start,
            activated_by = p_admin_id,
            activation_notes = p_notes,
            updated_at = now()
        WHERE id = v_inv.id;

        -- Insert activation_logs
        INSERT INTO public.activation_logs (investment_id, activated_by, activated_at, roi_start_date, roi_end_date, activation_notes)
        VALUES (v_inv.id, p_admin_id, v_roi_start, v_roi_start, v_roi_end, p_notes);

        -- Log to investment_activity_logs
        INSERT INTO public.investment_activity_logs (investment_id, user_id, activity_type, description)
        VALUES (
            v_inv.id,
            v_inv.user_id,
            'roi_activated',
            'ROI Tracking and maturity countdown has officially started.'
        );

        -- Generate automated documents
        BEGIN
            PERFORM public.create_automated_document(
                p_user_id := v_inv.user_id,
                p_payment_id := NULL,
                p_document_type := 'investment_activation_certificate',
                p_investment_id := v_inv.id
            );
            PERFORM public.create_automated_document(
                p_user_id := v_inv.user_id,
                p_payment_id := NULL,
                p_document_type := 'roi_commencement_notice',
                p_investment_id := v_inv.id
            );
            PERFORM public.create_automated_document(
                p_user_id := v_inv.user_id,
                p_payment_id := NULL,
                p_document_type := 'investment_summary_report',
                p_investment_id := v_inv.id
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        -- Notify investor
        INSERT INTO public.notifications (user_id, type, title, body, link, category)
        VALUES (
            v_inv.user_id,
            'investment',
            'Investment Active & ROI Started',
            'ROI tracking has officially begun for your investment in ' || v_prop.title || '. Maturity date: ' || to_char(v_maturity_d, 'Mon DD, YYYY') || '.',
            '/invest/portfolio/' || v_inv.id,
            'investment'
        );
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.pause_property_roi(
    p_property_id UUID,
    p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inv RECORD;
BEGIN
    -- Check admin
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    -- Update property status to roi_paused
    UPDATE public.investment_properties
    SET status = 'roi_paused',
        updated_at = now()
    WHERE id = p_property_id;

    -- Loop and pause all investments in 'roi_active' status
    FOR v_inv IN
        SELECT id, user_id
        FROM public.user_investments
        WHERE property_id = p_property_id AND status = 'roi_active'
    LOOP
        UPDATE public.user_investments
        SET status = 'roi_paused',
            roi_status = 'paused',
            roi_paused_at = now(),
            updated_at = now()
        WHERE id = v_inv.id;

        -- Log to investment_activity_logs
        INSERT INTO public.investment_activity_logs (investment_id, user_id, activity_type, description)
        VALUES (
            v_inv.id,
            v_inv.user_id,
            'roi_paused',
            'ROI Tracking and maturity countdown has been suspended.'
        );
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.resume_property_roi(
    p_property_id UUID,
    p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inv RECORD;
    v_paused_days INTEGER;
BEGIN
    -- Check admin
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    -- Update property status to roi_active
    UPDATE public.investment_properties
    SET status = 'roi_active',
        updated_at = now()
    WHERE id = p_property_id;

    -- Loop and resume all investments in 'roi_paused' status
    FOR v_inv IN
        SELECT id, user_id, roi_paused_at, maturity_date, roi_end_date
        FROM public.user_investments
        WHERE property_id = p_property_id AND status = 'roi_paused'
    LOOP
        -- Calculate paused duration
        v_paused_days := GREATEST(1, EXTRACT(DAY FROM (now() - v_inv.roi_paused_at)));

        UPDATE public.user_investments
        SET status = 'roi_active',
            roi_status = 'active',
            total_paused_days = COALESCE(total_paused_days, 0) + v_paused_days,
            roi_paused_at = NULL,
            roi_resumed_at = now(),
            maturity_date = (v_inv.maturity_date + (v_paused_days || ' days')::interval)::date,
            roi_end_date = v_inv.roi_end_date + (v_paused_days || ' days')::interval,
            updated_at = now()
        WHERE id = v_inv.id;

        -- Log to investment_activity_logs
        INSERT INTO public.investment_activity_logs (investment_id, user_id, activity_type, description)
        VALUES (
            v_inv.id,
            v_inv.user_id,
            'roi_resumed',
            'ROI Tracking and maturity countdown has resumed. Maturity extended by ' || v_paused_days || ' days.'
        );
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.extend_investment_term(
    p_investment_id UUID,
    p_extension_months INTEGER,
    p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inv RECORD;
BEGIN
    -- Check admin
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    SELECT * INTO v_inv FROM public.user_investments WHERE id = p_investment_id;
    IF v_inv.id IS NULL THEN
        RAISE EXCEPTION 'Investment not found.';
    END IF;

    UPDATE public.user_investments
    SET duration_months = COALESCE(duration_months, 12) + p_extension_months,
        roi_end_date = roi_end_date + (p_extension_months || ' months')::interval,
        maturity_date = (maturity_date + (p_extension_months || ' months')::interval)::date,
        updated_at = now()
    WHERE id = p_investment_id;

    -- Log to activity logs
    INSERT INTO public.investment_activity_logs (investment_id, user_id, activity_type, description)
    VALUES (
        p_investment_id,
        v_inv.user_id,
        'extend_term',
        'Investment term extended by ' || p_extension_months || ' months.'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.edit_investment_roi_parameters(
    p_investment_id UUID,
    p_accrued_earnings NUMERIC,
    p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inv RECORD;
BEGIN
    -- Check admin
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    SELECT * INTO v_inv FROM public.user_investments WHERE id = p_investment_id;
    IF v_inv.id IS NULL THEN
        RAISE EXCEPTION 'Investment not found.';
    END IF;

    UPDATE public.user_investments
    SET accrued_earnings = p_accrued_earnings,
        updated_at = now()
    WHERE id = p_investment_id;

    -- Log to activity logs
    INSERT INTO public.investment_activity_logs (investment_id, user_id, activity_type, description)
    VALUES (
        p_investment_id,
        v_inv.user_id,
        'edit_roi_params',
        'Accrued earnings manually adjusted to ' || p_accrued_earnings || ' by admin.'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_investment(
    p_investment_id UUID,
    p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inv RECORD;
BEGIN
    -- Check admin
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    SELECT * INTO v_inv FROM public.user_investments WHERE id = p_investment_id;
    IF v_inv.id IS NULL THEN
        RAISE EXCEPTION 'Investment not found.';
    END IF;

    UPDATE public.user_investments
    SET status = 'cancelled',
        investment_status = 'archived',
        updated_at = now()
    WHERE id = p_investment_id;

    -- Log
    INSERT INTO public.investment_activity_logs (investment_id, user_id, activity_type, description)
    VALUES (
        p_investment_id,
        v_inv.user_id,
        'archive',
        'Investment archived by admin.'
    );
END;
$$;

-- ============================================================
-- 8. CENTRALIZED ROI & MATURITY DAILY ENGINE
-- ============================================================
CREATE OR REPLACE FUNCTION public.run_daily_investment_updates()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inv RECORD;
    v_days_elapsed INTEGER;
    v_total_days INTEGER;
    v_expected_roi NUMERIC(14,2);
    v_accrued NUMERIC(14,2);
    v_progress NUMERIC(5,2);
    v_remaining_days INTEGER;
    v_remaining_months INTEGER;
    v_remaining_roi NUMERIC(14,2);
    v_maturity_status TEXT;
    v_roi_status TEXT;
    v_investment_status TEXT;
    v_term_months INTEGER;
    v_status_before TEXT;
    v_status_after TEXT;
BEGIN
    -- Iterate over active investments
    FOR v_inv IN
        SELECT ui.*, ip.projected_return_min, ip.holding_period_months, ip.title as property_title
        FROM public.user_investments ui
        JOIN public.investment_properties ip ON ui.property_id = ip.id
        WHERE ui.status IN ('roi_active', 'active') 
           OR ui.roi_status = 'active'
    LOOP
        v_term_months := COALESCE(v_inv.duration_months, v_inv.holding_period_months, 12);
        
        IF v_inv.roi_start_date IS NOT NULL AND v_inv.roi_end_date IS NOT NULL THEN
            v_total_days := GREATEST(1, EXTRACT(DAY FROM (v_inv.roi_end_date - v_inv.roi_start_date)));
            
            -- adjust days elapsed for paused time (if any)
            v_days_elapsed := EXTRACT(DAY FROM (now() - v_inv.roi_start_date)) - COALESCE(v_inv.total_paused_days, 0);
            v_days_elapsed := GREATEST(0, LEAST(v_total_days, v_days_elapsed));
            
            -- Expected ROI at maturity
            v_expected_roi := v_inv.amount_invested * (COALESCE(v_inv.projected_return_min, 10) / 100.0) * (v_term_months / 12.0);
            
            -- Current ROI Earned (Linear Day-by-Day Accrual)
            v_accrued := ROUND(v_expected_roi * (v_days_elapsed::numeric / v_total_days::numeric), 2);
            v_remaining_roi := GREATEST(0.00, v_expected_roi - v_accrued);
            
            -- Maturity Progress
            v_progress := ROUND((v_days_elapsed::numeric / v_total_days::numeric) * 100.0, 2);
            v_remaining_days := GREATEST(0, v_total_days - v_days_elapsed);
            v_remaining_months := FLOOR(v_remaining_days / 30);
            
            v_status_before := v_inv.status::text;
            
            -- Check if matured
            IF v_days_elapsed >= v_total_days OR now() >= v_inv.roi_end_date THEN
                v_maturity_status := 'matured';
                v_roi_status := 'completed';
                v_investment_status := 'matured';
                v_status_after := 'matured';
                
                UPDATE public.user_investments
                SET status = 'matured',
                    investment_status = 'matured',
                    roi_status = 'completed',
                    maturity_status = 'matured',
                    accrued_earnings = v_expected_roi,
                    withdrawable_balance = amount_invested + v_expected_roi, -- Return Principal + ROI to balance
                    updated_at = now()
                WHERE id = v_inv.id;
                
                -- Generate Maturity documents
                BEGIN
                    PERFORM public.create_automated_document(
                        p_user_id := v_inv.user_id,
                        p_payment_id := NULL,
                        p_document_type := 'investment_completion_report',
                        p_investment_id := v_inv.id
                    );
                    PERFORM public.create_automated_document(
                        p_user_id := v_inv.user_id,
                        p_payment_id := NULL,
                        p_document_type := 'final_roi_statement',
                        p_investment_id := v_inv.id
                    );
                    PERFORM public.create_automated_document(
                        p_user_id := v_inv.user_id,
                        p_payment_id := NULL,
                        p_document_type := 'investment_maturity_certificate',
                        p_investment_id := v_inv.id
                    );
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
                
                -- Notify investor
                INSERT INTO public.notifications (user_id, type, title, body, link, category)
                VALUES (
                    v_inv.user_id,
                    'investment',
                    'Investment Reached Maturity: ' || v_inv.property_title,
                    'Congratulations! Your investment in ' || v_inv.property_title || ' has reached full maturity. Your principal and accrued returns are now available in your balance.',
                    '/invest/portfolio/' || v_inv.id,
                    'investment'
                );
            ELSE
                v_maturity_status := 'maturing';
                v_roi_status := 'active';
                v_investment_status := 'maturity_started';
                v_status_after := 'roi_active';
                
                UPDATE public.user_investments
                SET accrued_earnings = v_accrued,
                    updated_at = now()
                WHERE id = v_inv.id;
            END IF;
            
            -- Insert into roi_logs
            INSERT INTO public.roi_logs (investment_id, amount_accrued, roi_percentage, roi_status_at_time)
            VALUES (v_inv.id, v_accrued, ROUND((v_accrued / NULLIF(v_inv.amount_invested, 0)) * 100, 2), v_roi_status);
            
            -- Insert into maturity_logs
            INSERT INTO public.maturity_logs (investment_id, status_before, status_after, days_remaining, completion_percentage)
            VALUES (v_inv.id, v_status_before, v_status_after, v_remaining_days, v_progress);
            
        END IF;
    END LOOP;
END;
$$;

-- ============================================================
-- 9. ENRICH PORTFOLIO SUMMARY & DETAIL RPCS
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_investment_detail_enriched(p_investment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_inv RECORD;
    v_prop RECORD;
    v_result jsonb;
    v_documents jsonb;
    v_property_documents jsonb;
    v_activity jsonb;
    v_audit_logs jsonb;
    v_payments jsonb;
    v_maturity_progress NUMERIC := 0;
    v_remaining_days INTEGER := 0;
    v_remaining_months INTEGER := 0;
    v_maturity_status TEXT := 'not_started';
    v_start_epoch BIGINT;
    v_end_epoch BIGINT;
    v_now_epoch BIGINT;
    v_expected_roi NUMERIC := 0;
    v_remaining_roi NUMERIC := 0;
BEGIN
    -- Fetch the investment
    SELECT * INTO v_inv
    FROM public.user_investments
    WHERE id = p_investment_id;

    IF v_inv IS NULL THEN
        RAISE EXCEPTION 'Investment not found.';
    END IF;

    -- Access control: owner or admin
    IF v_inv.user_id != auth.uid() AND NOT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    -- Fetch the property
    SELECT * INTO v_prop
    FROM public.investment_properties
    WHERE id = v_inv.property_id;

    -- Calculate expected and remaining ROI
    v_expected_roi := v_inv.amount_invested * (COALESCE(v_prop.projected_return_min, 10) / 100.0) * (COALESCE(v_inv.duration_months, v_prop.holding_period_months, 12) / 12.0);
    v_remaining_roi := GREATEST(0.00, v_expected_roi - COALESCE(v_inv.accrued_earnings, 0));

    -- Calculate maturity progress
    IF v_inv.roi_start_date IS NOT NULL AND v_inv.roi_end_date IS NOT NULL THEN
        v_start_epoch := EXTRACT(EPOCH FROM v_inv.roi_start_date::timestamp);
        v_end_epoch := EXTRACT(EPOCH FROM v_inv.roi_end_date::timestamp);
        v_now_epoch := EXTRACT(EPOCH FROM now());
        
        IF v_now_epoch >= v_end_epoch OR v_inv.status = 'matured' THEN
            v_maturity_progress := 100;
            v_remaining_days := 0;
            v_remaining_months := 0;
            v_maturity_status := 'matured';
        ELSIF v_now_epoch <= v_start_epoch THEN
            v_maturity_progress := 0;
            v_remaining_days := CEIL((v_end_epoch - v_start_epoch)::numeric / 86400);
            v_remaining_months := FLOOR(v_remaining_days / 30);
            v_maturity_status := 'not_started';
        ELSE
            -- Adjust for paused times if computing live
            v_maturity_progress := LEAST(100, ROUND(((v_now_epoch - v_start_epoch - (COALESCE(v_inv.total_paused_days, 0) * 86400))::numeric / NULLIF(v_end_epoch - v_start_epoch, 0)) * 100, 2));
            v_remaining_days := CEIL((v_end_epoch - v_now_epoch)::numeric / 86400);
            v_remaining_months := FLOOR(v_remaining_days / 30);
            IF v_maturity_progress > 90 THEN
                v_maturity_status := 'nearing_maturity';
            ELSE
                v_maturity_status := 'in_progress';
            END IF;
        END IF;
    END IF;

    -- Fetch signed documents
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', sd.id,
            'document_type', sd.document_type,
            'signed_at', sd.signed_at,
            'signature_data', sd.signature_data,
            'document_snapshot', sd.document_snapshot
        ) ORDER BY sd.signed_at DESC
    ), '[]'::jsonb)
    INTO v_documents
    FROM public.signed_documents sd
    WHERE sd.reference_id = p_investment_id;

    -- Fetch general property documents
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', pd.id,
            'title', pd.title,
            'document_type', pd.document_type,
            'url', pd.url,
            'created_at', pd.created_at
        ) ORDER BY pd.created_at DESC
    ), '[]'::jsonb)
    INTO v_property_documents
    FROM public.property_documents pd
    WHERE pd.property_id = v_inv.property_id;

    -- Fetch recent activity toasts
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', at.id,
            'type', at.type,
            'message', at.message,
            'created_at', at.created_at
        ) ORDER BY at.created_at DESC
    ), '[]'::jsonb)
    INTO v_activity
    FROM (
        SELECT * FROM public.activity_toasts
        WHERE property_id = v_inv.property_id
        ORDER BY created_at DESC
        LIMIT 10
    ) at;

    -- Fetch audit logs
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', log.id,
            'action_type', log.action_type,
            'field_changed', log.field_changed,
            'old_value', log.old_value,
            'new_value', log.new_value,
            'created_at', log.created_at
        ) ORDER BY log.created_at DESC
    ), '[]'::jsonb)
    INTO v_audit_logs
    FROM (
        SELECT id, action_type, field_changed, old_value, new_value, created_at FROM public.portfolio_audit_logs WHERE investment_id = p_investment_id
        UNION ALL
        SELECT id, activity_type as action_type, 'lifecycle' as field_changed, '' as old_value, description as new_value, created_at FROM public.investment_activity_logs WHERE investment_id = p_investment_id
        ORDER BY created_at DESC
        LIMIT 20
    ) log;

    -- Fetch related payments
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', p.id,
            'amount', p.amount,
            'currency', p.currency,
            'status', p.status,
            'payment_type', p.payment_type,
            'provider', p.provider,
            'reference', p.reference,
            'created_at', p.created_at
        ) ORDER BY p.created_at DESC
    ), '[]'::jsonb)
    INTO v_payments
    FROM public.payments p
    WHERE p.investment_id = v_inv.id OR (p.user_id = v_inv.user_id AND p.investment_property_id = v_inv.property_id);

    -- Build result
    v_result := jsonb_build_object(
        'investment', jsonb_build_object(
            'id', v_inv.id,
            'user_id', v_inv.user_id,
            'property_id', v_inv.property_id,
            'status', v_inv.status,
            'investment_status', COALESCE(v_inv.investment_status, 'submitted'),
            'investment_type', v_inv.investment_type,
            'amount_invested', v_inv.amount_invested,
            'total_amount', v_inv.total_amount,
            'units_owned', v_inv.units_owned,
            'accrued_earnings', COALESCE(v_inv.accrued_earnings, 0),
            'withdrawable_balance', COALESCE(v_inv.withdrawable_balance, 0),
            'total_withdrawn', COALESCE(v_inv.total_withdrawn, 0),
            'start_date', v_inv.start_date,
            'maturity_date', v_inv.maturity_date,
            'roi_start_date', v_inv.roi_start_date,
            'roi_end_date', v_inv.roi_end_date,
            'roi_paused_at', v_inv.roi_paused_at,
            'roi_resumed_at', v_inv.roi_resumed_at,
            'roi_status', COALESCE(v_inv.roi_status, 'inactive'),
            'maturity_status', COALESCE(v_inv.maturity_status, 'inactive'),
            'total_paused_days', COALESCE(v_inv.total_paused_days, 0),
            'activated_at', v_inv.activated_at,
            'approved_at', v_inv.approved_at,
            'created_at', v_inv.created_at,
            'updated_at', v_inv.updated_at,
            'payment_id', v_inv.payment_id,
            'admin_notes', v_inv.admin_notes,
            'rejection_reason', v_inv.rejection_reason,
            'secondary_market_enabled', v_inv.secondary_market_enabled,
            'amount_paid', COALESCE(v_inv.amount_paid, 0),
            'remaining_balance', COALESCE(v_inv.remaining_balance, 0),
            'monthly_installment_amount', v_inv.monthly_installment_amount,
            'next_payment_due', v_inv.next_payment_due,
            'down_payment_amount', v_inv.down_payment_amount,
            'completion_percentage', COALESCE(v_inv.completion_percentage, 0),
            'duration_months', v_inv.duration_months
        ),
        'property', jsonb_build_object(
            'id', v_prop.id,
            'slug', v_prop.slug,
            'title', v_prop.title,
            'description', v_prop.description,
            'location', v_prop.location,
            'city', v_prop.city,
            'state', v_prop.state,
            'country', v_prop.country,
            'property_type', v_prop.property_type,
            'property_category', v_prop.property_category,
            'cover_image_url', v_prop.cover_image_url,
            'total_value', v_prop.total_value,
            'unit_price', v_prop.unit_price,
            'total_units', v_prop.total_units,
            'units_sold', v_prop.units_sold,
            'current_funding', v_prop.current_funding,
            'status', v_prop.status,
            'currency', v_prop.currency,
            'projected_return_min', v_prop.projected_return_min,
            'projected_return_max', v_prop.projected_return_max,
            'estimated_rental_yield', v_prop.estimated_rental_yield,
            'distribution_frequency', v_prop.distribution_frequency,
            'holding_period_months', v_prop.holding_period_months,
            'income_model', v_prop.income_model,
            'risk_notes', v_prop.risk_notes,
            'funding_completed_at', v_prop.funding_completed_at
        ),
        'maturity', jsonb_build_object(
            'progress_percent', v_maturity_progress,
            'remaining_days', v_remaining_days,
            'remaining_months', v_remaining_months,
            'status', v_maturity_status
        ),
        'roi', jsonb_build_object(
            'expected_roi', v_expected_roi,
            'remaining_roi', v_remaining_roi,
            'accrued_earnings', COALESCE(v_inv.accrued_earnings, 0)
        ),
        'documents', v_documents,
        'property_documents', v_property_documents,
        'activity', v_activity,
        'audit_logs', v_audit_logs,
        'payments', v_payments
    );

    RETURN v_result;
END;
$$;

-- ============================================================
-- 10. SEED THE 6 NEW LEGAL DOCUMENT TEMPLATES
-- ============================================================
INSERT INTO public.document_templates (id, name, content_html, document_type, is_active, version) VALUES
(
    '0a8f8d68-12a1-4328-874e-5e8ef81d6f28',
    'Investment Activation Certificate',
    '<div class="legal-doc" style="font-family: ''Times New Roman'', Times, serif; color: #0f172a; max-width: 800px; margin: 0 auto; line-height: 1.6; padding: 50px; border: 1px solid #cbd5e1; background: #fff; box-shadow: inset 0 0 0 1px #0f172a, inset 0 0 0 4px #fff, inset 0 0 0 5px #0f172a;">
        <div style="text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 20px; margin-bottom: 45px;">
            <h1 style="font-size: 30px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 0;">INVESTMENT ACTIVATION CERTIFICATE</h1>
            <p style="font-size: 13px; font-weight: bold; color: #475569; margin: 8px 0 0 0; text-transform: uppercase;">Haven Home Hub Investment Registry</p>
            <p style="font-size: 11px; font-family: monospace; color: #94a3b8; margin: 15px 0 0 0; text-align: right;">REF: {{document_reference}}</p>
        </div>

        <div style="margin-bottom: 35px; text-align: justify;">
            <p>This document officially certifies that the fractional property investment detailed below has been formally activated into the Haven Home Hub ROI Engine. ROI accrual and holding periods commenced on the specified Activation Date.</p>
        </div>

        <div style="background-color: #f8fafc; padding: 25px; border: 1px solid #e2e8f0; margin-bottom: 40px; border-radius: 4px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tbody>
                    <tr><td style="padding: 6px 0; font-weight: bold; width: 35%;">Registered Investor:</td><td>{{investor_name}}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: bold;">Property Title:</td><td>{{property_name}}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: bold;">Units Allocated:</td><td>{{units_owned}} Units</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: bold;">Principal Investment:</td><td>{{amount_invested}}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: bold;">Activation Date:</td><td>{{issue_date}}</td></tr>
                </tbody>
            </table>
        </div>

        <div style="text-align: justify; margin-bottom: 60px;">
            <p>From the date of activation, this investment is bound to the target yield guidelines and governance structures of the Haven Home Hub Trust. Transfer, fractional trade, or liquidity operations are subject to lock-up covenants.</p>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 60px;">
            <div style="width: 40%; text-align: center;">
                <div style="border-bottom: 1px solid #0f172a; height: 50px; margin-bottom: 10px;"></div>
                <p style="font-weight: bold; margin: 0; font-size: 13px;">Registrar</p>
                <p style="font-size: 11px; color: #64748b; margin-top: 2px;">Haven Home Hub</p>
            </div>
            <div style="width: 40%; text-align: center; position: relative;" id="signature-block">
                <div style="border-bottom: 1px solid #0f172a; height: 50px; margin-bottom: 10px;"></div>
                <p style="font-weight: bold; margin: 0; font-size: 13px;">Trustee Representative</p>
                <p style="font-size: 11px; color: #64748b; margin-top: 2px;">Authorized Signatory</p>
            </div>
        </div>

        <div style="margin-top: 80px; border-top: 1px solid #cbd5e1; padding-top: 15px; font-family: monospace; font-size: 10px; color: #64748b; text-align: center;">
            <p>VERIFICATION CODE: {{verification_code}} | SECURE SYSTEM DOCUMENT</p>
        </div>
    </div>',
    'investment_activation_certificate',
    true,
    1
),
(
    '0a8f8d68-12a1-4328-874e-5e8ef81d6f29',
    'ROI Commencement Notice',
    '<div class="legal-doc" style="font-family: ''Times New Roman'', Times, serif; color: #0f172a; max-width: 800px; margin: 0 auto; line-height: 1.6; padding: 50px; border: 1px solid #cbd5e1; background: #fff; box-shadow: inset 0 0 0 1px #0f172a, inset 0 0 0 4px #fff, inset 0 0 0 5px #0f172a;">
        <div style="text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 20px; margin-bottom: 45px;">
            <h1 style="font-size: 30px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 0;">ROI COMMENCEMENT NOTICE</h1>
            <p style="font-size: 13px; font-weight: bold; color: #475569; margin: 8px 0 0 0; text-transform: uppercase;">Haven Home Hub Financial Operations</p>
            <p style="font-size: 11px; font-family: monospace; color: #94a3b8; margin: 15px 0 0 0; text-align: right;">REF: {{document_reference}}</p>
        </div>

        <div style="margin-bottom: 35px; text-align: justify;">
            <p>Dear {{investor_name}},</p>
            <p>We are pleased to notify you that the property development or acquisition phase for <strong>{{property_name}}</strong> has reached completion. ROI tracking is now live. Please review the commencement parameters below:</p>
        </div>

        <div style="background-color: #f8fafc; padding: 25px; border: 1px solid #e2e8f0; margin-bottom: 40px; border-radius: 4px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tbody>
                    <tr><td style="padding: 6px 0; font-weight: bold; width: 35%;">Investment Amount:</td><td>{{amount_invested}}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: bold;">Units Owned:</td><td>{{units_owned}} Units</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: bold;">Commencement Date:</td><td>{{issue_date}}</td></tr>
                </tbody>
            </table>
        </div>

        <p>Accrued returns will accumulate daily and reflect on your dashboard. Balance updates and payout distribution frequencies are defined in the property prospectus.</p>

        <div style="margin-top: 80px; border-top: 1px solid #cbd5e1; padding-top: 15px; font-family: monospace; font-size: 10px; color: #64748b; text-align: center;">
            <p>VERIFICATION CODE: {{verification_code}} | SECURE SYSTEM DOCUMENT</p>
        </div>
    </div>',
    'roi_commencement_notice',
    true,
    1
),
(
    '0a8f8d68-12a1-4328-874e-5e8ef81d6f30',
    'Investment Summary Report',
    '<div class="legal-doc" style="font-family: ''Times New Roman'', Times, serif; color: #0f172a; max-width: 800px; margin: 0 auto; line-height: 1.6; padding: 50px; border: 1px solid #cbd5e1; background: #fff; box-shadow: inset 0 0 0 1px #0f172a, inset 0 0 0 4px #fff, inset 0 0 0 5px #0f172a;">
        <div style="text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 20px; margin-bottom: 45px;">
            <h1 style="font-size: 30px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 0;">INVESTMENT SUMMARY REPORT</h1>
            <p style="font-size: 13px; font-weight: bold; color: #475569; margin: 8px 0 0 0; text-transform: uppercase;">Haven Home Hub Portfolio Management</p>
            <p style="font-size: 11px; font-family: monospace; color: #94a3b8; margin: 15px 0 0 0; text-align: right;">REF: {{document_reference}}</p>
        </div>

        <div style="margin-bottom: 35px;">
            <h3 style="font-size: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px;">Investor Profile</h3>
            <p>Name: {{investor_name}}</p>
            <p>Email: {{investor_email}}</p>
        </div>

        <div style="margin-bottom: 35px;">
            <h3 style="font-size: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px;">Asset Parameters</h3>
            <p>Property: {{property_name}}</p>
            <p>Location: {{property_location}}</p>
            <p>Units Owned: {{units_owned}} Units</p>
            <p>Principal Amount: {{amount_invested}}</p>
        </div>

        <div style="margin-top: 80px; border-top: 1px solid #cbd5e1; padding-top: 15px; font-family: monospace; font-size: 10px; color: #64748b; text-align: center;">
            <p>VERIFICATION CODE: {{verification_code}} | SECURE SYSTEM DOCUMENT</p>
        </div>
    </div>',
    'investment_summary_report',
    true,
    1
),
(
    '0a8f8d68-12a1-4328-874e-5e8ef81d6f31',
    'Investment Completion Report',
    '<div class="legal-doc" style="font-family: ''Times New Roman'', Times, serif; color: #0f172a; max-width: 800px; margin: 0 auto; line-height: 1.6; padding: 50px; border: 1px solid #cbd5e1; background: #fff; box-shadow: inset 0 0 0 1px #0f172a, inset 0 0 0 4px #fff, inset 0 0 0 5px #0f172a;">
        <div style="text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 20px; margin-bottom: 45px;">
            <h1 style="font-size: 30px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 0;">INVESTMENT COMPLETION REPORT</h1>
            <p style="font-size: 13px; font-weight: bold; color: #475569; margin: 8px 0 0 0; text-transform: uppercase;">Haven Home Hub Trust Operations</p>
            <p style="font-size: 11px; font-family: monospace; color: #94a3b8; margin: 15px 0 0 0; text-align: right;">REF: {{document_reference}}</p>
        </div>

        <div style="margin-bottom: 35px; text-align: justify;">
            <p>We are pleased to report that your investment holding in <strong>{{property_name}}</strong> has reached full maturity. The term has successfully completed in accordance with the Trust Covenant.</p>
        </div>

        <div style="background-color: #f8fafc; padding: 25px; border: 1px solid #e2e8f0; margin-bottom: 40px; border-radius: 4px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tbody>
                    <tr><td style="padding: 6px 0; font-weight: bold; width: 35%;">Investor Name:</td><td>{{investor_name}}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: bold;">Property Title:</td><td>{{property_name}}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: bold;">Initial Capital:</td><td>{{amount_invested}}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: bold;">Maturity Date:</td><td>{{issue_date}}</td></tr>
                </tbody>
            </table>
        </div>

        <div style="margin-top: 80px; border-top: 1px solid #cbd5e1; padding-top: 15px; font-family: monospace; font-size: 10px; color: #64748b; text-align: center;">
            <p>VERIFICATION CODE: {{verification_code}} | SECURE SYSTEM DOCUMENT</p>
        </div>
    </div>',
    'investment_completion_report',
    true,
    1
),
(
    '0a8f8d68-12a1-4328-874e-5e8ef81d6f32',
    'Final ROI Statement',
    '<div class="legal-doc" style="font-family: ''Times New Roman'', Times, serif; color: #0f172a; max-width: 800px; margin: 0 auto; line-height: 1.6; padding: 50px; border: 1px solid #cbd5e1; background: #fff; box-shadow: inset 0 0 0 1px #0f172a, inset 0 0 0 4px #fff, inset 0 0 0 5px #0f172a;">
        <div style="text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 20px; margin-bottom: 45px;">
            <h1 style="font-size: 30px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 0;">FINAL ROI STATEMENT</h1>
            <p style="font-size: 13px; font-weight: bold; color: #475569; margin: 8px 0 0 0; text-transform: uppercase;">Haven Home Hub Ledger Department</p>
            <p style="font-size: 11px; font-family: monospace; color: #94a3b8; margin: 15px 0 0 0; text-align: right;">REF: {{document_reference}}</p>
        </div>

        <div style="margin-bottom: 35px;">
            <h3 style="font-size: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px;">Maturity Ledger Summary</h3>
            <p>Investor Name: {{investor_name}}</p>
            <p>Asset: {{property_name}}</p>
            <p>Capital Invested: {{amount_invested}}</p>
            <p>Accrued Returns: Fully Earned</p>
        </div>

        <div style="margin-top: 80px; border-top: 1px solid #cbd5e1; padding-top: 15px; font-family: monospace; font-size: 10px; color: #64748b; text-align: center;">
            <p>VERIFICATION CODE: {{verification_code}} | SECURE SYSTEM DOCUMENT</p>
        </div>
    </div>',
    'final_roi_statement',
    true,
    1
),
(
    '0a8f8d68-12a1-4328-874e-5e8ef81d6f33',
    'Investment Maturity Certificate',
    '<div class="legal-doc" style="font-family: ''Times New Roman'', Times, serif; color: #0f172a; max-width: 800px; margin: 0 auto; line-height: 1.6; padding: 50px; border: 1px solid #cbd5e1; background: #fff; box-shadow: inset 0 0 0 1px #0f172a, inset 0 0 0 4px #fff, inset 0 0 0 5px #0f172a;">
        <div style="text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 20px; margin-bottom: 45px;">
            <h1 style="font-size: 30px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 0;">INVESTMENT MATURITY CERTIFICATE</h1>
            <p style="font-size: 13px; font-weight: bold; color: #475569; margin: 8px 0 0 0; text-transform: uppercase;">Haven Home Hub Registry Department</p>
            <p style="font-size: 11px; font-family: monospace; color: #94a3b8; margin: 15px 0 0 0; text-align: right;">REF: {{document_reference}}</p>
        </div>

        <div style="margin-bottom: 35px; text-align: justify;">
            <p>This certifies that the fractional property investment holding in <strong>{{property_name}}</strong> has reached absolute maturity on the specified Maturity Date.</p>
        </div>

        <div style="background-color: #f8fafc; padding: 25px; border: 1px solid #e2e8f0; margin-bottom: 40px; border-radius: 4px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tbody>
                    <tr><td style="padding: 6px 0; font-weight: bold; width: 35%;">Registered Owner:</td><td>{{investor_name}}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: bold;">Asset:</td><td>{{property_name}}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: bold;">Capital Returned:</td><td>{{amount_invested}}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: bold;">Maturity Date:</td><td>{{issue_date}}</td></tr>
                </tbody>
            </table>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 60px;">
            <div style="width: 40%; text-align: center;">
                <div style="border-bottom: 1px solid #0f172a; height: 50px; margin-bottom: 10px;"></div>
                <p style="font-weight: bold; margin: 0; font-size: 13px;">Registrar</p>
                <p style="font-size: 11px; color: #64748b; margin-top: 2px;">Haven Home Hub</p>
            </div>
            <div style="width: 40%; text-align: center; position: relative;" id="signature-block">
                <div style="border-bottom: 1px solid #0f172a; height: 50px; margin-bottom: 10px;"></div>
                <p style="font-weight: bold; margin: 0; font-size: 13px;">Authorized Trustee</p>
                <p style="font-size: 11px; color: #64748b; margin-top: 2px;">Legal Executrix</p>
            </div>
        </div>

        <div style="margin-top: 80px; border-top: 1px solid #cbd5e1; padding-top: 15px; font-family: monospace; font-size: 10px; color: #64748b; text-align: center;">
            <p>VERIFICATION CODE: {{verification_code}} | SECURE SYSTEM MATURED DOCUMENT</p>
        </div>
    </div>',
    'investment_maturity_certificate',
    true,
    1
)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, 
    content_html = EXCLUDED.content_html, 
    document_type = EXCLUDED.document_type,
    is_active = EXCLUDED.is_active, 
    version = EXCLUDED.version;
