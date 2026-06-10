-- Migration: Document Compiler Enhancement
-- Created: 2026-06-09
-- Purpose: Support all required document placeholders and provide valid fallbacks to prevent literal {{variable}} printing.

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
    v_purchase_amount := '$0.00';
    v_amount_paid := '$0.00';
    v_outstanding := '$0.00';
    v_payment_method := 'N/A';
    v_tx_ref := 'N/A';
    v_units_owned := '0';
    v_amount_invested := '$0.00';
    v_inv_prop_id := NULL;
    v_prop_id := NULL;

    IF p_investment_id IS NOT NULL THEN
        SELECT property_id INTO v_inv_prop_id
        FROM public.user_investments
        WHERE id = p_investment_id;

        IF v_inv_prop_id IS NOT NULL THEN
            SELECT title, location, property_type, id::TEXT, '$' || TO_CHAR(total_value, 'FM999,999,999.00')
            INTO v_property_title, v_property_location, v_property_type, v_property_id, v_purchase_amount
            FROM public.investment_properties
            WHERE id = v_inv_prop_id;

            SELECT COALESCE(ui.units_owned::TEXT, '0'),
                   '$' || TO_CHAR(COALESCE(ui.total_amount, ui.amount_invested, 0), 'FM999,999,999.00'),
                   '$' || TO_CHAR(COALESCE(ui.amount_paid, 0), 'FM999,999,999.00'),
                   '$' || TO_CHAR(COALESCE(ui.remaining_balance, 0), 'FM999,999,999.00')
            INTO v_units_owned, v_amount_invested, v_amount_paid, v_outstanding
            FROM public.user_investments ui
            WHERE ui.id = p_investment_id;
            
            v_payment_method := 'System Ledger';
            v_tx_ref := p_investment_id::TEXT;
        END IF;
    ELSIF p_payment_id IS NOT NULL THEN
        SELECT * INTO v_payment
        FROM public.payments
        WHERE id = p_payment_id;

        IF v_payment.id IS NOT NULL THEN
            v_amount_paid := '$' || TO_CHAR(COALESCE(v_payment.amount, 0), 'FM999,999,999.00');
            v_payment_method := COALESCE(v_payment.provider::TEXT, 'N/A');
            v_tx_ref := COALESCE(v_payment.reference, v_payment.external_reference, v_payment.id::TEXT);

            IF v_payment.investment_property_id IS NOT NULL THEN
                v_inv_prop_id := v_payment.investment_property_id;
                SELECT title, location, property_type, id::TEXT, '$' || TO_CHAR(total_value, 'FM999,999,999.00')
                INTO v_property_title, v_property_location, v_property_type, v_property_id, v_purchase_amount
                FROM public.investment_properties
                WHERE id = v_payment.investment_property_id;

                SELECT COALESCE(ui.units_owned::TEXT, '0'),
                       '$' || TO_CHAR(COALESCE(ui.total_amount, ui.amount_invested, 0), 'FM999,999,999.00'),
                       '$' || TO_CHAR(COALESCE(ui.amount_paid, 0), 'FM999,999,999.00'),
                       '$' || TO_CHAR(COALESCE(ui.remaining_balance, 0), 'FM999,999,999.00')
                INTO v_units_owned, v_amount_invested, v_amount_paid, v_outstanding
                FROM public.user_investments ui
                WHERE ui.user_id = p_user_id
                  AND ui.property_id = v_payment.investment_property_id
                ORDER BY ui.created_at DESC
                LIMIT 1;

            ELSIF v_payment.property_id IS NOT NULL THEN
                v_prop_id := v_payment.property_id;
                SELECT title, COALESCE(address, ''), property_type::TEXT, id::TEXT, '$' || TO_CHAR(price, 'FM999,999,999.00')
                INTO v_property_title, v_property_location, v_property_type, v_property_id, v_purchase_amount
                FROM public.properties
                WHERE id = v_payment.property_id;

                v_outstanding := '$' || TO_CHAR(GREATEST(0, COALESCE((SELECT price FROM public.properties WHERE id = v_payment.property_id), 0) - COALESCE(v_payment.amount, 0)), 'FM999,999,999.00');
            END IF;
        END IF;
    END IF;

    -- 4. Generate unique references
    v_doc_ref := 'HHH-' || UPPER(LEFT(gen_random_uuid()::TEXT, 8));
    v_verify_code := UPPER(LEFT(md5(gen_random_uuid()::TEXT || now()::TEXT), 16));
    v_doc_name := v_template.name || ' - ' || v_property_title;

    -- 5. Compile template
    v_compiled_html := v_template.content_html;

    -- Standard Placeholders
    v_compiled_html := REPLACE(v_compiled_html, '{{investor_name}}', COALESCE(v_profile.full_name, 'N/A'));
    v_compiled_html := REPLACE(v_compiled_html, '{{investor_email}}', COALESCE(v_user_email, 'N/A'));
    v_compiled_html := REPLACE(v_compiled_html, '{{investor_phone}}', COALESCE(v_profile.phone, 'N/A'));
    v_compiled_html := REPLACE(v_compiled_html, '{{investor_address}}', 'On file');
    v_compiled_html := REPLACE(v_compiled_html, '{{property_name}}', COALESCE(v_property_title, 'N/A'));
    v_compiled_html := REPLACE(v_compiled_html, '{{property_location}}', COALESCE(v_property_location, 'N/A'));
    v_compiled_html := REPLACE(v_compiled_html, '{{property_type}}', COALESCE(v_property_type, 'N/A'));
    v_compiled_html := REPLACE(v_compiled_html, '{{property_id}}', COALESCE(v_property_id, 'N/A'));
    v_compiled_html := REPLACE(v_compiled_html, '{{purchase_amount}}', COALESCE(v_purchase_amount, '$0.00'));
    v_compiled_html := REPLACE(v_compiled_html, '{{amount_paid}}', COALESCE(v_amount_paid, '$0.00'));
    v_compiled_html := REPLACE(v_compiled_html, '{{outstanding_balance}}', COALESCE(v_outstanding, '$0.00'));
    v_compiled_html := REPLACE(v_compiled_html, '{{payment_method}}', COALESCE(v_payment_method, 'N/A'));
    v_compiled_html := REPLACE(v_compiled_html, '{{transaction_reference}}', COALESCE(v_tx_ref, 'N/A'));
    v_compiled_html := REPLACE(v_compiled_html, '{{issue_date}}', TO_CHAR(now(), 'DD Month YYYY'));
    v_compiled_html := REPLACE(v_compiled_html, '{{approval_date}}', TO_CHAR(now(), 'DD Month YYYY'));
    v_compiled_html := REPLACE(v_compiled_html, '{{payment_date}}', TO_CHAR(now(), 'DD Month YYYY'));
    v_compiled_html := REPLACE(v_compiled_html, '{{document_reference}}', v_doc_ref);
    v_compiled_html := REPLACE(v_compiled_html, '{{verification_code}}', v_verify_code);
    v_compiled_html := REPLACE(v_compiled_html, '{{units_owned}}', COALESCE(v_units_owned, '0'));
    v_compiled_html := REPLACE(v_compiled_html, '{{amount_invested}}', COALESCE(v_amount_invested, '$0.00'));

    -- Extended Placeholders (to prevent {{variable}} from printing)
    -- The PrintDocument.tsx frontend dynamically injects actual signatures into the #signature-block div.
    -- We replace these variables with an empty string or the correct markup.
    v_compiled_html := REPLACE(v_compiled_html, '{{admin_signature}}', '<div id="signature-block"><div style="border-bottom: 1px solid #000; width: 100%; height: 55px; margin-bottom: 5px;"></div></div>');
    v_compiled_html := REPLACE(v_compiled_html, '{{company_signature}}', '<div id="signature-block"><div style="border-bottom: 1px solid #000; width: 100%; height: 55px; margin-bottom: 5px;"></div></div>');
    v_compiled_html := REPLACE(v_compiled_html, '{{company_seal}}', '');
    v_compiled_html := REPLACE(v_compiled_html, '{{company_logo}}', '<img src="/logo.png" alt="Haven Home Hub Logo" style="max-height: 50px; width: auto;" />');
    v_compiled_html := REPLACE(v_compiled_html, '{{ownership_details}}', 'Verified Ownership Share: ' || COALESCE(v_units_owned, '0') || ' Unit(s)');
    v_compiled_html := REPLACE(v_compiled_html, '{{investment_details}}', 'Investment Value: ' || COALESCE(v_amount_invested, '$0.00'));

    -- Final cleanup pass for any remaining placeholders
    v_compiled_html := REGEXP_REPLACE(v_compiled_html, '\{\{[a-zA-Z0-9_]+\}\}', 'N/A', 'g');

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
