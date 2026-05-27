-- Migration: Create Automated Document RPC & Payment Integration
-- Purpose: Implements the core document generation engine and hooks it into the payment lifecycle.

-- ============================================================================
-- 0. ADD NOTIFICATION TYPE
-- ============================================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'notification_type' AND e.enumlabel = 'document_ready') THEN
        ALTER TYPE public.notification_type ADD VALUE 'document_ready';
    END IF;
END $$;

-- ============================================================================
-- 1. CREATE_AUTOMATED_DOCUMENT RPC
-- This is the core engine: given a user, optional payment, and document type,
-- it fetches the active template, gathers investor/property/payment data,
-- replaces all placeholders, and inserts a verified document record.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_automated_document(
    p_user_id UUID,
    p_payment_id UUID DEFAULT NULL,
    p_document_type TEXT DEFAULT 'purchase_receipt'
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

    -- 3. Gather payment + property data (if payment is linked)
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

    IF p_payment_id IS NOT NULL THEN
        SELECT * INTO v_payment
        FROM public.payments
        WHERE id = p_payment_id;

        IF v_payment.id IS NOT NULL THEN
            v_amount_paid := COALESCE(v_payment.amount::TEXT, '0');
            v_payment_method := COALESCE(v_payment.provider::TEXT, 'N/A');
            v_tx_ref := COALESCE(v_payment.reference, v_payment.external_reference, v_payment.id::TEXT);

            -- Investment property path
            IF v_payment.investment_property_id IS NOT NULL THEN
                v_inv_prop_id := v_payment.investment_property_id;
                SELECT title, location, property_type, id::TEXT, total_value::TEXT
                INTO v_property_title, v_property_location, v_property_type, v_property_id, v_purchase_amount
                FROM public.investment_properties
                WHERE id = v_payment.investment_property_id;

                -- Get investment-specific fields
                SELECT COALESCE(ui.units_owned::TEXT, 'N/A'),
                       COALESCE(ui.amount_invested::TEXT, 'N/A'),
                       COALESCE(ui.amount_paid::TEXT, '0'),
                       COALESCE(GREATEST(0, ui.amount_invested - ui.amount_paid)::TEXT, '0')
                INTO v_units_owned, v_amount_invested, v_amount_paid, v_outstanding
                FROM public.user_investments ui
                WHERE ui.user_id = p_user_id
                  AND ui.property_id = v_payment.investment_property_id
                ORDER BY ui.created_at DESC
                LIMIT 1;

            -- Standard property path
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

    -- 5. Compile template: replace all placeholders
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

    -- 6. Insert the compiled document into user_documents
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
            'document_snapshot', v_compiled_html,
            'generated_at', now()::TEXT
        ),
        now(),
        now()
    );

    -- 7. Send notification to user
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
        -- Notification failure should not block document generation
        NULL;
    END;

    RETURN v_doc_id;
END;
$$;


-- ============================================================================
-- 2. AUTO-GENERATE DOCUMENTS ON PAYMENT FULFILLMENT
-- This function wraps the existing handle_payment_fulfillment to also
-- generate appropriate legal documents after a successful payment.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_documents_on_payment_success()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment RECORD;
    v_has_template BOOLEAN;
BEGIN
    -- Only fire when status changes to 'success'
    IF NEW.status = 'success' AND (OLD.status IS DISTINCT FROM 'success') THEN
        v_payment := NEW;

        -- Generate Purchase Receipt for all successful payments
        SELECT EXISTS(SELECT 1 FROM public.document_templates WHERE document_type = 'purchase_receipt' AND is_active = true) INTO v_has_template;
        IF v_has_template THEN
            BEGIN
                PERFORM public.create_automated_document(v_payment.user_id, v_payment.id, 'purchase_receipt');
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Document generation (purchase_receipt) failed: %', SQLERRM;
            END;
        END IF;

        -- Generate Contract of Sale for investment payments
        IF v_payment.payment_type = 'investment' AND v_payment.investment_property_id IS NOT NULL THEN
            SELECT EXISTS(SELECT 1 FROM public.document_templates WHERE document_type = 'contract_of_sale' AND is_active = true) INTO v_has_template;
            IF v_has_template THEN
                BEGIN
                    PERFORM public.create_automated_document(v_payment.user_id, v_payment.id, 'contract_of_sale');
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE 'Document generation (contract_of_sale) failed: %', SQLERRM;
                END;
            END IF;
        END IF;

        -- Generate Allocation Letter for property reservation payments
        IF v_payment.payment_type = 'reservation' AND (v_payment.property_id IS NOT NULL OR v_payment.investment_property_id IS NOT NULL) THEN
            SELECT EXISTS(SELECT 1 FROM public.document_templates WHERE document_type = 'allocation_letter' AND is_active = true) INTO v_has_template;
            IF v_has_template THEN
                BEGIN
                    PERFORM public.create_automated_document(v_payment.user_id, v_payment.id, 'allocation_letter');
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE 'Document generation (allocation_letter) failed: %', SQLERRM;
                END;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create the trigger on payments table (fires AFTER the existing handle_payment_status_update trigger)
DROP TRIGGER IF EXISTS tg_auto_generate_documents ON public.payments;
CREATE TRIGGER tg_auto_generate_documents
    AFTER UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_documents_on_payment_success();
