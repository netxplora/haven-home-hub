-- ============================================================
-- 1. UPDATE ENUM TYPES
-- ============================================================
ALTER TYPE payment_type ADD VALUE IF NOT EXISTS 'deposit';

-- ============================================================
-- 2. UPDATE USER AVAILABLE BALANCE TO INCLUDE DEPOSITS & WALLET DEBITS
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_available_balance()
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT COALESCE(
    (SELECT SUM(amount_received) FROM public.returns WHERE user_id = auth.uid()), 0
  ) 
  + COALESCE(
    (SELECT SUM(amount) FROM public.payments WHERE user_id = auth.uid() AND payment_type = 'deposit' AND status = 'success'), 0
  )
  + COALESCE(
    (SELECT SUM(units_traded * price_per_unit) FROM public.secondary_market_transactions WHERE seller_id = auth.uid()), 0
  ) 
  - COALESCE(
    (SELECT SUM(amount) FROM public.withdrawal_requests
     WHERE user_id = auth.uid() AND status IN ('pending','approved','processing','completed')), 0
  ) 
  - COALESCE(
    (SELECT SUM(amount) FROM public.payments WHERE user_id = auth.uid() AND payment_type IN ('investment', 'property', 'reservation') AND provider = 'wallet' AND status = 'success'), 0
  )
  - COALESCE(
    (SELECT SUM(units_traded * price_per_unit) FROM public.secondary_market_transactions WHERE buyer_id = auth.uid() AND payment_method = 'wallet_balance'), 0
  );
$function$;

-- ============================================================
-- 3. CREATE RPC FOR ATOMIC WALLET PURCHASE (PRIMARY MARKET)
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_wallet_primary_investment(
    p_property_id uuid,
    p_units integer,
    p_investment_type text,
    p_total_amount numeric,
    p_down_payment numeric,
    p_duration_months integer,
    p_monthly_installment numeric
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_wallet_balance numeric;
    v_property record;
    v_expected_amount numeric;
    v_investment_id uuid;
    v_cert_number text;
    v_alloc_ok boolean;
    v_payment_amount numeric;
    v_payment_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Fetch Property and Lock
    SELECT * INTO v_property
    FROM public.investment_properties
    WHERE id = p_property_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Property not found';
    END IF;

    IF v_property.status != 'open' THEN
        RAISE EXCEPTION 'Property is not open for investment';
    END IF;

    IF p_units < 1 THEN
        RAISE EXCEPTION 'Must purchase at least 1 unit';
    END IF;

    IF p_units > (v_property.total_units - v_property.units_sold) THEN
        RAISE EXCEPTION 'Not enough units available';
    END IF;

    -- 2. Verify pricing and wallet balance
    v_expected_amount := p_units * v_property.unit_price;
    v_payment_amount := v_expected_amount;
    
    IF p_investment_type = 'installment' THEN
        v_payment_amount := p_down_payment;
        IF p_down_payment < (v_expected_amount * COALESCE(v_property.min_down_payment_pct, 20) / 100.0) THEN
            RAISE EXCEPTION 'Down payment is below the minimum required percentage';
        END IF;
    END IF;

    v_wallet_balance := public.user_available_balance();

    IF v_wallet_balance < v_payment_amount THEN
        RAISE EXCEPTION 'Insufficient wallet balance. Required: %, Available: %', v_payment_amount, v_wallet_balance;
    END IF;

    -- 3. Atomically allocate units (this uses the existing RPC or direct update)
    SELECT * INTO v_alloc_ok FROM public.allocate_investment_units(p_property_id, p_units);
    IF NOT v_alloc_ok THEN
        RAISE EXCEPTION 'Failed to allocate units. They may have just been sold.';
    END IF;

    -- 4. Create User Investment
    INSERT INTO public.user_investments (
        user_id,
        property_id,
        units_owned,
        amount_invested,
        status,
        investment_type,
        total_amount,
        amount_paid,
        remaining_balance,
        down_payment_amount,
        duration_months,
        monthly_installment_amount,
        start_date,
        completion_percentage
    ) VALUES (
        v_user_id,
        p_property_id,
        p_units,
        v_expected_amount,
        'active',
        p_investment_type,
        v_expected_amount,
        v_payment_amount,
        v_expected_amount - v_payment_amount,
        CASE WHEN p_investment_type = 'installment' THEN p_down_payment ELSE NULL END,
        CASE WHEN p_investment_type = 'installment' THEN p_duration_months ELSE NULL END,
        CASE WHEN p_investment_type = 'installment' THEN p_monthly_installment ELSE NULL END,
        CASE WHEN p_investment_type = 'installment' THEN current_date ELSE NULL END,
        (v_payment_amount / v_expected_amount) * 100
    ) RETURNING id INTO v_investment_id;

    -- 5. Create Payment Record (this deducts from wallet balance via the view definition)
    INSERT INTO public.payments (
        user_id,
        amount,
        currency,
        payment_type,
        provider,
        status,
        investment_id,
        investment_property_id,
        reference
    ) VALUES (
        v_user_id,
        v_payment_amount,
        v_property.currency,
        'investment',
        'wallet',
        'success',
        v_investment_id,
        p_property_id,
        'WLTI-' || UPPER(SUBSTRING(v_investment_id::text FROM 1 FOR 8))
    ) RETURNING id INTO v_payment_id;

    -- 6. Create Certificate
    v_cert_number := 'HHH-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(v_investment_id::text FROM 1 FOR 8));
    INSERT INTO public.investment_certificates (
        investment_id,
        user_id,
        property_id,
        certificate_number,
        amount_invested,
        units_owned,
        currency
    ) VALUES (
        v_investment_id,
        v_user_id,
        p_property_id,
        v_cert_number,
        v_payment_amount,
        p_units,
        v_property.currency
    );

    -- 7. Add Schedules if installment
    IF p_investment_type = 'installment' THEN
        INSERT INTO public.investment_schedules (
            investment_id,
            due_date,
            amount_due,
            status
        ) VALUES (
            v_investment_id,
            current_date,
            p_down_payment,
            'paid'
        );
        
        UPDATE public.user_investments
        SET next_payment_due = current_date + interval '1 month'
        WHERE id = v_investment_id;
        
        -- Additional monthly schedules would typically be generated here or lazily
    END IF;

    -- 8. Notifications
    INSERT INTO public.notifications (user_id, type, title, body, link, category, priority)
    VALUES (
        v_user_id,
        'investment',
        'Investment Confirmed',
        'Your purchase of ' || p_units || ' units in "' || v_property.title || '" using your wallet balance was successful.',
        '/dashboard?tab=investments',
        'financial',
        'high'
    );

    RETURN v_investment_id;
END;
$$;
