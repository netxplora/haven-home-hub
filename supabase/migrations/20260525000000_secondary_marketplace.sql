-- Migration: Secondary Marketplace Schema & Trade Logic
-- Created: 2026-05-25

-- ============================================================
-- 1. CREATE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.secondary_market_listings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id uuid NOT NULL REFERENCES auth.users(id),
    property_id uuid NOT NULL REFERENCES public.investment_properties(id),
    investment_id uuid NOT NULL REFERENCES public.user_investments(id) ON DELETE CASCADE,
    units_to_sell integer NOT NULL CHECK (units_to_sell > 0),
    price_per_unit numeric(14,2) NOT NULL CHECK (price_per_unit > 0),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.secondary_market_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES public.secondary_market_listings(id),
    buyer_id uuid NOT NULL REFERENCES auth.users(id),
    seller_id uuid NOT NULL REFERENCES auth.users(id),
    units_traded integer NOT NULL CHECK (units_traded > 0),
    price_per_unit numeric(14,2) NOT NULL CHECK (price_per_unit > 0),
    payment_method text NOT NULL DEFAULT 'wallet_balance',
    payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Indices for faster querying
CREATE INDEX IF NOT EXISTS idx_listings_property ON public.secondary_market_listings(property_id);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON public.secondary_market_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.secondary_market_listings(status);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON public.secondary_market_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON public.secondary_market_transactions(seller_id);

-- Enable RLS
ALTER TABLE public.secondary_market_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secondary_market_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Listings: public read" ON public.secondary_market_listings;
CREATE POLICY "Listings: public read" ON public.secondary_market_listings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Listings: own write" ON public.secondary_market_listings;
CREATE POLICY "Listings: own write" ON public.secondary_market_listings
    FOR ALL TO authenticated
    USING (seller_id = auth.uid())
    WITH CHECK (seller_id = auth.uid());

DROP POLICY IF EXISTS "Transactions: own read" ON public.secondary_market_transactions;
CREATE POLICY "Transactions: own read" ON public.secondary_market_transactions
    FOR SELECT TO authenticated
    USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- ============================================================
-- 2. UPDATE AVAILABLE BALANCE FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.user_available_balance()
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT SUM(amount_received) FROM public.returns WHERE user_id = auth.uid()), 0
  ) + COALESCE(
    (SELECT SUM(units_traded * price_per_unit) FROM public.secondary_market_transactions WHERE seller_id = auth.uid()), 0
  ) - COALESCE(
    (SELECT SUM(amount) FROM public.withdrawal_requests
     WHERE user_id = auth.uid() AND status IN ('pending','approved','processing','completed')), 0
  ) - COALESCE(
    (SELECT SUM(units_traded * price_per_unit) FROM public.secondary_market_transactions WHERE buyer_id = auth.uid() AND payment_method = 'wallet_balance'), 0
  );
$$;

-- Make sure execution permissions are granted to authenticated users
REVOKE EXECUTE ON FUNCTION public.user_available_balance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_available_balance() TO authenticated;

-- ============================================================
-- 3. CREATE RPC FUNCTIONS
-- ============================================================

-- A. CREATE LISTING RPC
CREATE OR REPLACE FUNCTION public.create_secondary_market_listing(
    p_investment_id uuid,
    p_units_to_sell integer,
    p_price_per_unit numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_property_id uuid;
    v_units_owned integer;
    v_active_listed_units integer;
    v_listing_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get investment details
    SELECT user_id, property_id, units_owned
    INTO v_user_id, v_property_id, v_units_owned
    FROM public.user_investments
    WHERE id = p_investment_id AND status = 'active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active investment not found';
    END IF;

    -- Verify that the caller is the owner
    IF v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'You do not own this investment';
    END IF;

    -- Calculate already listed units
    SELECT COALESCE(SUM(units_to_sell), 0)
    INTO v_active_listed_units
    FROM public.secondary_market_listings
    WHERE investment_id = p_investment_id AND status = 'active';

    IF v_active_listed_units + p_units_to_sell > v_units_owned THEN
        RAISE EXCEPTION 'Cannot list more units than you own (% units owned, % already listed)', v_units_owned, v_active_listed_units;
    END IF;

    -- Create listing
    INSERT INTO public.secondary_market_listings (
        seller_id, property_id, investment_id, units_to_sell, price_per_unit, status
    ) VALUES (
        v_user_id, v_property_id, p_investment_id, p_units_to_sell, p_price_per_unit, 'active'
    ) RETURNING id INTO v_listing_id;

    RETURN v_listing_id;
END;
$$;

-- B. CANCEL LISTING RPC
CREATE OR REPLACE FUNCTION public.cancel_secondary_market_listing(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.secondary_market_listings
    SET status = 'cancelled',
        updated_at = now()
    WHERE id = p_listing_id AND seller_id = auth.uid() AND status = 'active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found or not active';
    END IF;
END;
$$;

-- C. PURCHASE LISTING WITH WALLET RPC
CREATE OR REPLACE FUNCTION public.purchase_listing_with_wallet(p_listing_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_buyer_id uuid;
    v_seller_id uuid;
    v_property_id uuid;
    v_seller_inv_id uuid;
    v_units_to_sell integer;
    v_price_per_unit numeric;
    v_total_price numeric;
    v_buyer_balance numeric;
    v_unit_price numeric;
    v_currency text;
    v_prop_title text;
    v_seller_units_owned integer;
    v_status text;
    
    v_buyer_inv_id uuid;
    v_buyer_units_owned integer;
    v_cert_number text;
    v_transaction_id uuid;
BEGIN
    v_buyer_id := auth.uid();
    IF v_buyer_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Fetch listing details with lock
    SELECT seller_id, property_id, investment_id, units_to_sell, price_per_unit, status
    INTO v_seller_id, v_property_id, v_seller_inv_id, v_units_to_sell, v_price_per_unit, v_status
    FROM public.secondary_market_listings
    WHERE id = p_listing_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    IF v_status != 'active' THEN
        RAISE EXCEPTION 'Listing is no longer active';
    END IF;

    IF v_seller_id = v_buyer_id THEN
        RAISE EXCEPTION 'You cannot buy your own listing';
    END IF;

    -- 2. Verify buyer balance
    v_total_price := v_units_to_sell * v_price_per_unit;
    v_buyer_balance := public.user_available_balance();

    IF v_buyer_balance < v_total_price THEN
        RAISE EXCEPTION 'Insufficient wallet balance. Required: %, Available: %', v_total_price, v_buyer_balance;
    END IF;

    -- 3. Fetch property currency and price details
    SELECT unit_price, currency, title
    INTO v_unit_price, v_currency, v_prop_title
    FROM public.investment_properties
    WHERE id = v_property_id;

    -- 4. Verify and deduct units from Seller
    SELECT units_owned INTO v_seller_units_owned
    FROM public.user_investments
    WHERE id = v_seller_inv_id AND user_id = v_seller_id AND status = 'active' FOR UPDATE;

    IF NOT FOUND OR v_seller_units_owned < v_units_to_sell THEN
        RAISE EXCEPTION 'Seller does not have enough active units';
    END IF;

    IF v_seller_units_owned = v_units_to_sell THEN
        -- Delete seller investment (cascades to delete old certificate)
        DELETE FROM public.user_investments WHERE id = v_seller_inv_id;
    ELSE
        -- Update seller investment
        UPDATE public.user_investments
        SET units_owned = units_owned - v_units_to_sell,
            amount_invested = amount_invested - (v_units_to_sell * v_unit_price),
            updated_at = now()
        WHERE id = v_seller_inv_id;

        -- Update seller certificate
        UPDATE public.investment_certificates
        SET units_owned = units_owned - v_units_to_sell,
            amount_invested = amount_invested - (v_units_to_sell * v_unit_price),
            updated_at = now()
        WHERE investment_id = v_seller_inv_id;
    END IF;

    -- 5. Add units to Buyer
    SELECT id, units_owned INTO v_buyer_inv_id, v_buyer_units_owned
    FROM public.user_investments
    WHERE user_id = v_buyer_id AND property_id = v_property_id AND status = 'active' FOR UPDATE;

    IF FOUND THEN
        -- Add to existing buyer investment
        UPDATE public.user_investments
        SET units_owned = units_owned + v_units_to_sell,
            amount_invested = amount_invested + (v_units_to_sell * v_unit_price),
            updated_at = now()
        WHERE id = v_buyer_inv_id;

        -- Update buyer certificate
        UPDATE public.investment_certificates
        SET units_owned = units_owned + v_units_to_sell,
            amount_invested = amount_invested + (v_units_to_sell * v_unit_price),
            updated_at = now()
        WHERE investment_id = v_buyer_inv_id;
    ELSE
        -- Insert new buyer investment
        INSERT INTO public.user_investments (
            user_id, property_id, units_owned, amount_invested, status
        ) VALUES (
            v_buyer_id, v_property_id, v_units_to_sell, v_units_to_sell * v_unit_price, 'active'
        ) RETURNING id INTO v_buyer_inv_id;

        -- Create buyer certificate
        v_cert_number := 'HHH-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(v_buyer_inv_id::text FROM 1 FOR 8));
        
        INSERT INTO public.investment_certificates (
            investment_id, user_id, property_id,
            certificate_number, amount_invested, units_owned,
            currency
        ) VALUES (
            v_buyer_inv_id, v_buyer_id, v_property_id,
            v_cert_number, v_units_to_sell * v_unit_price, v_units_to_sell,
            v_currency
        );
    END IF;

    -- 6. Update listing status
    UPDATE public.secondary_market_listings
    SET status = 'sold',
        updated_at = now()
    WHERE id = p_listing_id;

    -- 7. Log Transaction
    INSERT INTO public.secondary_market_transactions (
        listing_id, buyer_id, seller_id, units_traded, price_per_unit, payment_method
    ) VALUES (
        p_listing_id, v_buyer_id, v_seller_id, v_units_to_sell, v_price_per_unit, 'wallet_balance'
    ) RETURNING id INTO v_transaction_id;

    -- 8. Send notifications
    -- Buyer notification
    INSERT INTO public.notifications (user_id, type, title, body, link, category, priority)
    VALUES (
        v_buyer_id,
        'investment',
        'Secondary Market Purchase Success',
        'You purchased ' || v_units_to_sell || ' units of "' || COALESCE(v_prop_title, 'Property') || '" for a total of ' || v_total_price || ' ' || v_currency || ' using your wallet balance.',
        '/dashboard?tab=investments',
        'financial',
        'high'
    );

    -- Seller notification
    INSERT INTO public.notifications (user_id, type, title, body, link, category, priority)
    VALUES (
        v_seller_id,
        'investment',
        'Secondary Market Units Sold',
        'Your listing for ' || v_units_to_sell || ' units of "' || COALESCE(v_prop_title, 'Property') || '" was purchased. ' || v_total_price || ' ' || v_currency || ' has been added to your wallet.',
        '/dashboard?tab=withdrawals',
        'financial',
        'high'
    );

    RETURN v_transaction_id;
END;
$$;
