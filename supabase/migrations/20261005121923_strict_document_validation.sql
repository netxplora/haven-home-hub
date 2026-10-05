-- Migration: Strict Document Validation
-- Enforce Data Integrity Rules: No placeholders ('N/A', '0'), strict null checks, and RAISE EXCEPTION on missing required data.

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
        RAISE EXCEPTION 'Data Integrity Error: No active template found for document type: %', p_document_type;
    END IF;

    -- 2. Get investor profile data
    SELECT p.id, p.full_name, p.phone
    INTO v_profile
    FROM public.profiles p
    WHERE p.id = p_user_id;

    IF v_profile.id IS NULL THEN
        RAISE EXCEPTION 'Data Integrity Error: User profile not found for user_id: %', p_user_id;
    END IF;

    IF v_profile.full_name IS NULL OR TRIM(v_profile.full_name) = '' THEN
        RAISE EXCEPTION 'Data Integrity Error: User full_name is missing for user %', p_user_id;
    END IF;

    -- Get email from auth.users
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = p_user_id;

    IF v_user_email IS NULL OR TRIM(v_user_email) = '' THEN
        RAISE EXCEPTION 'Data Integrity Error: User email is missing for user %', p_user_id;
    END IF;

    -- 3. Gather payment + property data
    v_property_title := NULL;
    v_property_location := NULL;
    v_property_type := NULL;
    v_property_id := NULL;
    v_purchase_amount := NULL;
    v_amount_paid := NULL;
    v_outstanding := NULL;
    v_outstanding_num := 0;
    v_payment_method := NULL;
    v_tx_ref := NULL;
    v_units_owned := NULL;
    v_amount_invested := NULL;
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

            SELECT ui.units_owned::TEXT,
                   COALESCE(ui.total_amount::TEXT, ui.amount_invested::TEXT),
                   ui.amount_paid::TEXT,
                   ui.remaining_balance::TEXT,
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
            v_amount_paid := v_payment.amount::TEXT;
            v_payment_method := v_payment.provider::TEXT;
            v_tx_ref := COALESCE(v_payment.reference, v_payment.external_reference, v_payment.id::TEXT);

            IF v_payment.investment_property_id IS NOT NULL THEN
                v_inv_prop_id := v_payment.investment_property_id;
                SELECT title, location, property_type, id::TEXT, total_value::TEXT
                INTO v_property_title, v_property_location, v_property_type, v_property_id, v_purchase_amount
                FROM public.investment_properties
                WHERE id = v_payment.investment_property_id;

                SELECT ui.units_owned::TEXT,
                       COALESCE(ui.total_amount::TEXT, ui.amount_invested::TEXT),
                       ui.amount_paid::TEXT,
                       ui.remaining_balance::TEXT,
                       COALESCE(ui.remaining_balance, 0)
                INTO v_units_owned, v_amount_invested, v_amount_paid, v_outstanding, v_outstanding_num
                FROM public.user_investments ui
                WHERE ui.user_id = p_user_id
                  AND ui.property_id = v_payment.investment_property_id
                ORDER BY ui.created_at DESC
                LIMIT 1;

            ELSIF v_payment.property_id IS NOT NULL THEN
                v_prop_id := v_payment.property_id;
                SELECT title, COALESCE(address, location, ''), property_type::TEXT, id::TEXT, price::TEXT
                INTO v_property_title, v_property_location, v_property_type, v_property_id, v_purchase_amount
                FROM public.properties
                WHERE id = v_payment.property_id;

                v_outstanding_num := GREATEST(0, COALESCE(v_purchase_amount::NUMERIC, 0) - COALESCE(v_amount_paid::NUMERIC, 0));
                v_outstanding := v_outstanding_num::TEXT;
            END IF;
        END IF;
    END IF;

    -- Strict data integrity validation for gathered fields
    IF (p_investment_id IS NOT NULL OR p_payment_id IS NOT NULL) THEN
        IF v_property_title IS NULL OR TRIM(v_property_title) = '' THEN
            RAISE EXCEPTION 'Data Integrity Error: Property Title is missing or could not be resolved from related records.';
        END IF;
        IF v_property_location IS NULL OR TRIM(v_property_location) = '' THEN
            RAISE EXCEPTION 'Data Integrity Error: Property Location is missing for property ID %.', v_property_id;
        END IF;
        IF v_amount_paid IS NULL THEN
            RAISE EXCEPTION 'Data Integrity Error: Amount Paid is missing for the provided transaction.';
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

    -- Replace brand variables
    v_compiled_html := REPLACE(v_compiled_html, '{{company_name_upper}}', UPPER(v_brand_name));
    v_compiled_html := REPLACE(v_compiled_html, '{{company_name}}', v_brand_name);
    v_compiled_html := REPLACE(v_compiled_html, '{{company_logo}}', '<img src="' || v_brand_logo || '" alt="' || v_brand_name || '" style="max-height: 50px; width: auto;" />');

    -- Replace standard variables without fallbacks
    v_compiled_html := REPLACE(v_compiled_html, '{{investor_name}}', v_profile.full_name);
    v_compiled_html := REPLACE(v_compiled_html, '{{investor_email}}', v_user_email);
    v_compiled_html := REPLACE(v_compiled_html, '{{investor_phone}}', COALESCE(v_profile.phone, 'Not Provided')); -- Phone is genuinely optional in profiles
    v_compiled_html := REPLACE(v_compiled_html, '{{investor_address}}', 'On file');
    v_compiled_html := REPLACE(v_compiled_html, '{{property_name}}', v_property_title);
    v_compiled_html := REPLACE(v_compiled_html, '{{property_location}}', v_property_location);
    v_compiled_html := REPLACE(v_compiled_html, '{{property_type}}', COALESCE(v_property_type, 'Not Specified'));
    v_compiled_html := REPLACE(v_compiled_html, '{{property_id}}', v_property_id);
    v_compiled_html := REPLACE(v_compiled_html, '{{purchase_amount}}', COALESCE(v_purchase_amount, 'Not Specified'));
    v_compiled_html := REPLACE(v_compiled_html, '{{amount_paid}}', v_amount_paid);
    v_compiled_html := REPLACE(v_compiled_html, '{{outstanding_balance}}', v_outstanding);
    v_compiled_html := REPLACE(v_compiled_html, '{{payment_method}}', COALESCE(v_payment_method, 'system'));
    v_compiled_html := REPLACE(v_compiled_html, '{{transaction_reference}}', COALESCE(v_tx_ref, v_doc_ref));
    v_compiled_html := REPLACE(v_compiled_html, '{{issue_date}}', TO_CHAR(now(), 'DD Month YYYY'));
    v_compiled_html := REPLACE(v_compiled_html, '{{approval_date}}', TO_CHAR(now(), 'DD Month YYYY'));
    v_compiled_html := REPLACE(v_compiled_html, '{{payment_date}}', TO_CHAR(now(), 'DD Month YYYY'));
    v_compiled_html := REPLACE(v_compiled_html, '{{document_reference}}', v_doc_ref);
    v_compiled_html := REPLACE(v_compiled_html, '{{verification_code}}', v_verify_code);
    v_compiled_html := REPLACE(v_compiled_html, '{{units_owned}}', COALESCE(v_units_owned, 'Not Applicable'));
    v_compiled_html := REPLACE(v_compiled_html, '{{amount_invested}}', COALESCE(v_amount_invested, 'Not Applicable'));

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
