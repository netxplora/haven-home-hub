-- Migration: Investment Certificates & Verification System
-- Created: 2026-05-14
-- Purpose: Create the investment_certificates table and the verify_investment RPC
--          that issues a certificate when an admin verifies an investment.

-- ============================================================
-- 1. INVESTMENT CERTIFICATES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.investment_certificates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    investment_id uuid NOT NULL REFERENCES public.user_investments(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id),
    property_id uuid NOT NULL REFERENCES public.investment_properties(id),
    certificate_number text NOT NULL UNIQUE,
    amount_invested numeric NOT NULL,
    units_owned integer NOT NULL DEFAULT 1,
    currency text NOT NULL DEFAULT 'USD',
    issued_at timestamptz DEFAULT now(),
    status text NOT NULL DEFAULT 'active',
    verified_by uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.investment_certificates ENABLE ROW LEVEL SECURITY;

-- Users can view their own certificates
DROP POLICY IF EXISTS "Users can view own certificates" ON public.investment_certificates;
CREATE POLICY "Users can view own certificates" ON public.investment_certificates
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can manage all certificates
DROP POLICY IF EXISTS "Admins can manage certificates" ON public.investment_certificates;
CREATE POLICY "Admins can manage certificates" ON public.investment_certificates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_certificates_investment ON public.investment_certificates(investment_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON public.investment_certificates(user_id);


-- ============================================================
-- 2. VERIFY INVESTMENT RPC — Issues a Certificate
-- ============================================================

DROP FUNCTION IF EXISTS public.verify_investment(uuid);
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

    -- Generate a unique certificate number
    v_cert_number := 'HHH-' || 
                     TO_CHAR(now(), 'YYYYMMDD') || '-' || 
                     UPPER(SUBSTRING(p_investment_id::text FROM 1 FOR 8));

    -- Create the certificate
    INSERT INTO public.investment_certificates (
        investment_id, user_id, property_id, 
        certificate_number, amount_invested, units_owned, 
        currency, verified_by
    ) VALUES (
        p_investment_id, v_user_id, v_property_id,
        v_cert_number, v_amount, v_units,
        v_currency, v_admin_id
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
