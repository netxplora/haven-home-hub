CREATE OR REPLACE FUNCTION public.verify_investment(p_investment_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid;
    v_property_id uuid;
    v_amount numeric;
    v_units integer;
    v_currency text;
    v_cert_id uuid;
    v_cert_number text;
    v_prop_title text;
    v_admin_id uuid;
BEGIN
    -- Get the calling admin's ID
    v_admin_id := auth.uid();

    -- Get investment details
    SELECT ui.user_id, ui.property_id, 
           COALESCE(ui.total_amount, ui.amount_invested), 
           ui.units_owned,
           ip.currency,
           ip.title
    INTO v_user_id, v_property_id, v_amount, v_units, v_currency, v_prop_title
    FROM public.user_investments ui
    JOIN public.investment_properties ip ON ip.id = ui.property_id
    WHERE ui.id = p_investment_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Investment not found';
    END IF;

    -- Check if a certificate already exists
    IF EXISTS (SELECT 1 FROM public.investment_certificates WHERE investment_id = p_investment_id) THEN
        RAISE EXCEPTION 'A certificate has already been issued for this investment';
    END IF;

    -- Generate a unique certificate number with Verdant Estate branding
    v_cert_number := 'VE-' || 
                     TO_CHAR(now(), 'YYYYMMDD') || '-' || 
                     UPPER(SUBSTRING(p_investment_id::text FROM 1 FOR 8));

    -- Create the certificate using correct schema columns
    INSERT INTO public.investment_certificates (
        investment_id, user_id, property_id, 
        certificate_id, total_investment_amount, units_owned, 
        currency, issued_by, status, issued_at
    ) VALUES (
        p_investment_id, v_user_id, v_property_id,
        v_cert_number, v_amount, v_units,
        v_currency, v_admin_id, 'issued', now()
    ) RETURNING id INTO v_cert_id;

    -- Update investment status to 'active' (verified)
    UPDATE public.user_investments
    SET status = 'active',
        updated_at = now()
    WHERE id = p_investment_id;

    -- Send notification to user
    INSERT INTO public.notifications (user_id, type, title, body, link, category, priority)
    VALUES (
        v_user_id,
        'investment',
        'Investment Certificate Issued',
        'Your investment in "' || COALESCE(v_prop_title, 'a property') || '" has been verified and a certificate has been issued. Certificate #' || v_cert_number,
        '/certificate/' || v_cert_id,
        'financial',
        'high'
    );

    RETURN v_cert_id;
END;
$function$;
