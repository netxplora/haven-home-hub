-- Migration: Dynamic Brand Settings in Document Templates
-- Purpose: Replace all hardcoded company names and colors in document templates
-- with dynamic {{company_name}} / {{company_name_upper}} template variables,
-- and update the create_automated_document RPC to resolve them from brand_settings.

-- ============================================================
-- 1. PATCH ALL EXISTING TEMPLATES: Replace hardcoded names with template tags
-- ============================================================

-- Replace exact hardcoded company names in ALL template content_html
UPDATE public.document_templates
SET content_html = REPLACE(content_html, 'Haven Home Hub Investment Registry', '{{company_name}} Investment Registry'),
    updated_at = now()
WHERE content_html LIKE '%Haven Home Hub Investment Registry%';

UPDATE public.document_templates
SET content_html = REPLACE(content_html, 'Haven Home Hub Financial Operations', '{{company_name}} Financial Operations'),
    updated_at = now()
WHERE content_html LIKE '%Haven Home Hub Financial Operations%';

UPDATE public.document_templates
SET content_html = REPLACE(content_html, 'Haven Home Hub Portfolio Management', '{{company_name}} Portfolio Management'),
    updated_at = now()
WHERE content_html LIKE '%Haven Home Hub Portfolio Management%';

UPDATE public.document_templates
SET content_html = REPLACE(content_html, 'Haven Home Hub Trust Operations', '{{company_name}} Trust Operations'),
    updated_at = now()
WHERE content_html LIKE '%Haven Home Hub Trust Operations%';

UPDATE public.document_templates
SET content_html = REPLACE(content_html, 'Haven Home Hub Ledger Department', '{{company_name}} Ledger Department'),
    updated_at = now()
WHERE content_html LIKE '%Haven Home Hub Ledger Department%';

UPDATE public.document_templates
SET content_html = REPLACE(content_html, 'Haven Home Hub Registry Department', '{{company_name}} Registry Department'),
    updated_at = now()
WHERE content_html LIKE '%Haven Home Hub Registry Department%';

UPDATE public.document_templates
SET content_html = REPLACE(content_html, 'Haven Home Hub Legal Registry', '{{company_name}} Legal Registry'),
    updated_at = now()
WHERE content_html LIKE '%Haven Home Hub Legal Registry%';

UPDATE public.document_templates
SET content_html = REPLACE(content_html, 'Haven Home Hub Registrations', '{{company_name}} Registrations'),
    updated_at = now()
WHERE content_html LIKE '%Haven Home Hub Registrations%';

UPDATE public.document_templates
SET content_html = REPLACE(content_html, 'Haven Home Hub Transactions', '{{company_name}} Transactions'),
    updated_at = now()
WHERE content_html LIKE '%Haven Home Hub Transactions%';

UPDATE public.document_templates
SET content_html = REPLACE(content_html, 'Haven Home Hub Property Asset', '{{company_name}} Property Asset'),
    updated_at = now()
WHERE content_html LIKE '%Haven Home Hub Property Asset%';

UPDATE public.document_templates
SET content_html = REPLACE(content_html, 'Haven Home Hub Authority', '{{company_name}} Authority'),
    updated_at = now()
WHERE content_html LIKE '%Haven Home Hub Authority%';

UPDATE public.document_templates
SET content_html = REPLACE(content_html, 'Haven Home Hub Trust', '{{company_name}} Trust'),
    updated_at = now()
WHERE content_html LIKE '%Haven Home Hub Trust%';

-- Replace standalone company name references (must come after the compound ones above)
UPDATE public.document_templates
SET content_html = REPLACE(content_html, 'Haven Home Hub Limited', '{{company_name}} Limited'),
    updated_at = now()
WHERE content_html LIKE '%Haven Home Hub Limited%';

UPDATE public.document_templates
SET content_html = REPLACE(content_html, 'Haven Home Hub', '{{company_name}}'),
    updated_at = now()
WHERE content_html LIKE '%Haven Home Hub%';

-- Replace uppercase/header references
UPDATE public.document_templates
SET content_html = REPLACE(content_html, 'HAVEN HOME HUB', '{{company_name_upper}}'),
    updated_at = now()
WHERE content_html LIKE '%HAVEN HOME HUB%';

-- Replace hardcoded rose/amber certificate colors with neutral document colors
UPDATE public.document_templates
SET content_html = REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(content_html,
            'text-rose-800', 'text-primary'),
          'text-rose-900', 'text-primary'),
        'border-rose-800', 'border-primary'),
      'border-rose-500/20', 'border-primary/20'),
    updated_at = now()
WHERE content_html LIKE '%rose-%';

UPDATE public.document_templates
SET content_html = REPLACE(content_html, 'bg-amber-50/10', 'bg-primary/5'),
    updated_at = now()
WHERE content_html LIKE '%bg-amber-50/10%';

-- Replace hardcoded HHH beacon references in survey plan
UPDATE public.document_templates
SET content_html = REPLACE(content_html, 'Beacon ID #HHH-', 'Beacon ID #{{document_reference}}-'),
    updated_at = now()
WHERE content_html LIKE '%Beacon ID #HHH-%';


-- ============================================================
-- 2. UPDATE create_automated_document RPC
--    to resolve {{company_name}}, {{company_name_upper}}, and
--    {{company_logo}} from brand_settings at generation time
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
    v_outstanding_num NUMERIC;
    v_brand_name TEXT;
    v_brand_logo TEXT;
    v_doc_ref_prefix TEXT;
BEGIN
    -- 0. Fetch brand settings for dynamic company name resolution
    SELECT platform_name, logo_url
    INTO v_brand_name, v_brand_logo
    FROM public.brand_settings
    LIMIT 1;

    -- Fallback if no brand record
    v_brand_name := COALESCE(v_brand_name, 'Haven Home Hub');
    v_brand_logo := COALESCE(v_brand_logo, '/logo.png');
    v_doc_ref_prefix := UPPER(LEFT(v_brand_name, 3));

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
    v_outstanding_num := 0;
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
                   COALESCE(ui.remaining_balance::TEXT, '0'),
                   COALESCE(ui.remaining_balance, 0)
            INTO v_units_owned, v_amount_invested, v_amount_paid, v_outstanding, v_outstanding_num
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
                       COALESCE(ui.remaining_balance::TEXT, '0'),
                       COALESCE(ui.remaining_balance, 0)
                INTO v_units_owned, v_amount_invested, v_amount_paid, v_outstanding, v_outstanding_num
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

                v_outstanding_num := GREATEST(0, COALESCE(v_purchase_amount::NUMERIC, 0) - COALESCE(v_amount_paid::NUMERIC, 0));
                v_outstanding := v_outstanding_num::TEXT;
            END IF;
        END IF;
    END IF;

    -- 4. Generate unique references (using dynamic brand prefix)
    v_doc_ref := v_doc_ref_prefix || '-' || UPPER(LEFT(gen_random_uuid()::TEXT, 8));
    v_verify_code := UPPER(LEFT(md5(gen_random_uuid()::TEXT || now()::TEXT), 16));
    v_doc_name := v_template.name || ' - ' || v_property_title;

    -- 5. Compile template
    v_compiled_html := v_template.content_html;

    -- Handle conditional blocks
    IF v_outstanding_num > 0 THEN
        -- Keep OUTSTANDING block content, remove tags
        v_compiled_html := regexp_replace(v_compiled_html, '\[\[IF_OUTSTANDING\]\]', '', 'g');
        v_compiled_html := regexp_replace(v_compiled_html, '\[\[ENDIF_OUTSTANDING\]\]', '', 'g');
        -- Remove NOT_OUTSTANDING block entirely
        v_compiled_html := regexp_replace(v_compiled_html, '\[\[IF_NOT_OUTSTANDING\]\][\s\S]*?\[\[ENDIF_NOT_OUTSTANDING\]\]', '', 'g');
    ELSE
        -- Remove OUTSTANDING block entirely
        v_compiled_html := regexp_replace(v_compiled_html, '\[\[IF_OUTSTANDING\]\][\s\S]*?\[\[ENDIF_OUTSTANDING\]\]', '', 'g');
        -- Keep NOT_OUTSTANDING block content, remove tags
        v_compiled_html := regexp_replace(v_compiled_html, '\[\[IF_NOT_OUTSTANDING\]\]', '', 'g');
        v_compiled_html := regexp_replace(v_compiled_html, '\[\[ENDIF_NOT_OUTSTANDING\]\]', '', 'g');
    END IF;

    -- Replace brand variables (MUST come before standard variables)
    v_compiled_html := REPLACE(v_compiled_html, '{{company_name_upper}}', UPPER(v_brand_name));
    v_compiled_html := REPLACE(v_compiled_html, '{{company_name}}', v_brand_name);
    v_compiled_html := REPLACE(v_compiled_html, '{{company_logo}}', '<img src="' || v_brand_logo || '" alt="' || v_brand_name || '" style="max-height: 50px; width: auto;" />');

    -- Replace standard variables
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
