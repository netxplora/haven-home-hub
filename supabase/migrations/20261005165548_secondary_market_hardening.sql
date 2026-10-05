-- ============================================================
-- Migration: Secondary Market Hardening & Full Production Readiness
-- Date: 2026-10-05
-- ============================================================

-- ============================================================
-- 1. EXTEND THE STATUS CONSTRAINT
-- ============================================================
ALTER TABLE public.secondary_market_listings
  DROP CONSTRAINT IF EXISTS secondary_market_listings_status_check;

ALTER TABLE public.secondary_market_listings
  ADD CONSTRAINT secondary_market_listings_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'sold'));

-- ============================================================
-- 1b. ADD FK TO public.profiles SO PostgREST CAN JOIN SELLER DATA
-- ============================================================
ALTER TABLE public.secondary_market_listings
  DROP CONSTRAINT IF EXISTS secondary_market_listings_seller_id_profiles_fkey;

ALTER TABLE public.secondary_market_listings
  ADD CONSTRAINT secondary_market_listings_seller_id_profiles_fkey
  FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ============================================================
-- 2. ADD NEW COLUMNS
-- ============================================================
ALTER TABLE public.secondary_market_listings
  ADD COLUMN IF NOT EXISTS units_sold integer NOT NULL DEFAULT 0;

ALTER TABLE public.secondary_market_listings
  ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT NULL;

ALTER TABLE public.secondary_market_listings
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.secondary_market_listings
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz DEFAULT NULL;

ALTER TABLE public.secondary_market_listings
  ADD COLUMN IF NOT EXISTS rejection_reason text DEFAULT NULL;

-- ============================================================
-- 3. MIGRATE EXISTING DATA
-- Treat all pre-existing 'active' listings as already approved.
-- ============================================================
UPDATE public.secondary_market_listings
SET status = 'approved'
WHERE status = 'active';

-- ============================================================
-- 4. ADD INDEX FOR PARTIAL PURCHASE QUERIES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_listings_available
  ON public.secondary_market_listings (status, units_sold, units_to_sell);

-- ============================================================
-- 5. FIX RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Listings: public read" ON public.secondary_market_listings;
DROP POLICY IF EXISTS "Listings: own write" ON public.secondary_market_listings;
DROP POLICY IF EXISTS "Listings: authenticated read" ON public.secondary_market_listings;
DROP POLICY IF EXISTS "Listings: own insert" ON public.secondary_market_listings;
DROP POLICY IF EXISTS "Listings: own cancel or admin update" ON public.secondary_market_listings;
DROP POLICY IF EXISTS "Listings: own delete or admin" ON public.secondary_market_listings;

CREATE POLICY "Listings: authenticated read"
  ON public.secondary_market_listings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Listings: own insert"
  ON public.secondary_market_listings
  FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Listings: own cancel or admin update"
  ON public.secondary_market_listings
  FOR UPDATE TO authenticated
  USING (
    seller_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    (seller_id = auth.uid() AND status = 'cancelled')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Listings: own delete or admin"
  ON public.secondary_market_listings
  FOR DELETE TO authenticated
  USING (
    seller_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- ============================================================
-- 6. UPDATED create_secondary_market_listing RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_secondary_market_listing(
    p_investment_id uuid,
    p_units_to_sell integer,
    p_price_per_unit numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_property_id uuid;
    v_units_owned integer;
    v_committed_units integer;
    v_available_to_list integer;
    v_listing_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_units_to_sell <= 0 THEN
        RAISE EXCEPTION 'Units to sell must be greater than zero';
    END IF;

    IF p_price_per_unit <= 0 THEN
        RAISE EXCEPTION 'Price per unit must be greater than zero';
    END IF;

    SELECT user_id, property_id, units_owned
    INTO v_user_id, v_property_id, v_units_owned
    FROM public.user_investments
    WHERE id = p_investment_id
      AND status IN ('active', 'confirmed', 'roi_active')
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active investment not found. Only active investments are eligible for secondary market listing.';
    END IF;

    IF v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'You do not own this investment';
    END IF;

    -- Units already committed in pending/approved listings (net of already-sold units)
    SELECT COALESCE(SUM(units_to_sell - units_sold), 0)
    INTO v_committed_units
    FROM public.secondary_market_listings
    WHERE investment_id = p_investment_id
      AND status IN ('pending', 'approved');

    v_available_to_list := v_units_owned - v_committed_units;

    IF p_units_to_sell > v_available_to_list THEN
        RAISE EXCEPTION
            'Cannot list % units. You own % units with % committed to active listings. Available to list: %',
            p_units_to_sell, v_units_owned, v_committed_units, v_available_to_list;
    END IF;

    INSERT INTO public.secondary_market_listings (
        seller_id, property_id, investment_id,
        units_to_sell, units_sold, price_per_unit, status
    ) VALUES (
        auth.uid(), v_property_id, p_investment_id,
        p_units_to_sell, 0, p_price_per_unit, 'pending'
    ) RETURNING id INTO v_listing_id;

    -- Notify all admins
    INSERT INTO public.notifications (user_id, type, title, body, link, category, priority)
    SELECT
        ur.user_id,
        'investment',
        'New Secondary Market Listing: Review Required',
        p_units_to_sell || ' units listed for review. Approve or reject in the admin marketplace.',
        '/admin?tab=marketplace',
        'financial',
        'high'
    FROM public.user_roles ur
    WHERE ur.role = 'admin';

    RETURN v_listing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_secondary_market_listing(uuid, integer, numeric) TO authenticated;

-- ============================================================
-- 7. ADMIN: APPROVE LISTING
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_secondary_market_listing(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_seller_id uuid;
    v_prop_title text;
    v_units integer;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    UPDATE public.secondary_market_listings
    SET status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        rejection_reason = NULL,
        updated_at = now()
    WHERE id = p_listing_id AND status = 'pending'
    RETURNING seller_id, units_to_sell INTO v_seller_id, v_units;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found or is not in pending status';
    END IF;

    SELECT ip.title INTO v_prop_title
    FROM public.secondary_market_listings l
    JOIN public.investment_properties ip ON ip.id = l.property_id
    WHERE l.id = p_listing_id;

    INSERT INTO public.notifications (user_id, type, title, body, link, category, priority)
    VALUES (
        v_seller_id, 'investment', 'Listing Approved',
        'Your listing of ' || v_units || ' units of "' || COALESCE(v_prop_title, 'your property') ||
          '" is now live on the secondary market.',
        '/invest/trade', 'financial', 'high'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_secondary_market_listing(uuid) TO authenticated;

-- ============================================================
-- 8. ADMIN: REJECT LISTING
-- ============================================================
CREATE OR REPLACE FUNCTION public.reject_secondary_market_listing(
    p_listing_id uuid,
    p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_seller_id uuid;
    v_prop_title text;
    v_units integer;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    UPDATE public.secondary_market_listings
    SET status = 'rejected',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        rejection_reason = p_reason,
        updated_at = now()
    WHERE id = p_listing_id AND status = 'pending'
    RETURNING seller_id, units_to_sell INTO v_seller_id, v_units;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found or is not in pending status';
    END IF;

    SELECT ip.title INTO v_prop_title
    FROM public.secondary_market_listings l
    JOIN public.investment_properties ip ON ip.id = l.property_id
    WHERE l.id = p_listing_id;

    INSERT INTO public.notifications (user_id, type, title, body, link, category, priority)
    VALUES (
        v_seller_id, 'investment', 'Listing Not Approved',
        'Your listing of ' || v_units || ' units of "' || COALESCE(v_prop_title, 'your property') ||
          '" was not approved.' ||
          CASE WHEN p_reason IS NOT NULL THEN ' Reason: ' || p_reason ELSE '' END,
        '/dashboard?tab=investments', 'financial', 'high'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_secondary_market_listing(uuid, text) TO authenticated;

-- ============================================================
-- 9. ADMIN: CANCEL ANY LISTING
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_cancel_secondary_market_listing(
    p_listing_id uuid,
    p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_seller_id uuid;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    UPDATE public.secondary_market_listings
    SET status = 'cancelled',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        rejection_reason = p_reason,
        updated_at = now()
    WHERE id = p_listing_id AND status IN ('pending', 'approved')
    RETURNING seller_id INTO v_seller_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found or already closed';
    END IF;

    IF v_seller_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, body, link, category, priority)
        VALUES (
            v_seller_id, 'investment', 'Listing Cancelled by Admin',
            'Your secondary market listing has been cancelled.' ||
            CASE WHEN p_reason IS NOT NULL THEN ' ' || p_reason ELSE '' END,
            '/dashboard?tab=investments', 'financial', 'high'
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_cancel_secondary_market_listing(uuid, text) TO authenticated;

-- ============================================================
-- 10. UPDATED cancel_secondary_market_listing (seller self-cancel)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_secondary_market_listing(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.secondary_market_listings
    SET status = 'cancelled',
        updated_at = now()
    WHERE id = p_listing_id
      AND seller_id = auth.uid()
      AND status IN ('pending', 'approved');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found, not owned by you, or cannot be cancelled in its current status';
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_secondary_market_listing(uuid) TO authenticated;

-- ============================================================
-- 11. UPDATED purchase_listing_with_wallet (partial purchase support)
-- ============================================================
CREATE OR REPLACE FUNCTION public.purchase_listing_with_wallet(
    p_listing_id uuid,
    p_units_to_buy integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_buyer_id uuid;
    v_seller_id uuid;
    v_property_id uuid;
    v_seller_inv_id uuid;
    v_units_to_sell integer;
    v_units_sold_so_far integer;
    v_units_available integer;
    v_actual_buy integer;
    v_price_per_unit numeric;
    v_total_price numeric;
    v_buyer_balance numeric;
    v_prop_title text;
    v_currency text;
    v_seller_units_owned integer;
    v_status text;
    v_buyer_inv_id uuid;
    v_cert_number text;
    v_transaction_id uuid;
    v_expires_at timestamptz;
BEGIN
    v_buyer_id := auth.uid();
    IF v_buyer_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Lock listing row
    SELECT seller_id, property_id, investment_id, units_to_sell, units_sold,
           price_per_unit, status, expires_at
    INTO v_seller_id, v_property_id, v_seller_inv_id, v_units_to_sell, v_units_sold_so_far,
         v_price_per_unit, v_status, v_expires_at
    FROM public.secondary_market_listings
    WHERE id = p_listing_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    IF v_status != 'approved' THEN
        RAISE EXCEPTION 'Listing is not available for purchase (status: %)', v_status;
    END IF;

    IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
        UPDATE public.secondary_market_listings
        SET status = 'cancelled', updated_at = now()
        WHERE id = p_listing_id;
        RAISE EXCEPTION 'This listing has expired and has been cancelled';
    END IF;

    IF v_seller_id = v_buyer_id THEN
        RAISE EXCEPTION 'You cannot purchase your own listing';
    END IF;

    v_units_available := v_units_to_sell - v_units_sold_so_far;
    IF v_units_available <= 0 THEN
        UPDATE public.secondary_market_listings SET status = 'sold', updated_at = now() WHERE id = p_listing_id;
        RAISE EXCEPTION 'No units remaining in this listing';
    END IF;

    v_actual_buy := COALESCE(p_units_to_buy, v_units_available);

    IF v_actual_buy <= 0 THEN
        RAISE EXCEPTION 'Units to buy must be greater than zero';
    END IF;

    IF v_actual_buy > v_units_available THEN
        RAISE EXCEPTION 'Requested % units but only % units are available in this listing', v_actual_buy, v_units_available;
    END IF;

    v_total_price := v_actual_buy * v_price_per_unit;
    v_buyer_balance := public.user_available_balance();

    IF v_buyer_balance < v_total_price THEN
        RAISE EXCEPTION 'Insufficient wallet balance. Required: %, Available: %', v_total_price, v_buyer_balance;
    END IF;

    SELECT title, currency INTO v_prop_title, v_currency
    FROM public.investment_properties
    WHERE id = v_property_id;

    -- Lock & verify seller investment
    SELECT units_owned INTO v_seller_units_owned
    FROM public.user_investments
    WHERE id = v_seller_inv_id
      AND user_id = v_seller_id
      AND status IN ('active', 'confirmed', 'roi_active')
    FOR UPDATE;

    IF NOT FOUND OR v_seller_units_owned < v_actual_buy THEN
        RAISE EXCEPTION 'Seller no longer holds enough units to complete this trade';
    END IF;

    -- Deduct from seller (use sale price for cost basis)
    IF v_seller_units_owned = v_actual_buy THEN
        DELETE FROM public.user_investments WHERE id = v_seller_inv_id;
    ELSE
        UPDATE public.user_investments
        SET units_owned = units_owned - v_actual_buy,
            amount_invested = amount_invested - (v_actual_buy * v_price_per_unit),
            updated_at = now()
        WHERE id = v_seller_inv_id;

        UPDATE public.investment_certificates
        SET units_owned = units_owned - v_actual_buy,
            amount_invested = amount_invested - (v_actual_buy * v_price_per_unit),
            updated_at = now()
        WHERE investment_id = v_seller_inv_id;
    END IF;

    -- Add to buyer (use sale price for buyer's cost basis)
    SELECT id INTO v_buyer_inv_id
    FROM public.user_investments
    WHERE user_id = v_buyer_id
      AND property_id = v_property_id
      AND status IN ('active', 'confirmed', 'roi_active')
    FOR UPDATE;

    IF FOUND THEN
        UPDATE public.user_investments
        SET units_owned = units_owned + v_actual_buy,
            amount_invested = amount_invested + (v_actual_buy * v_price_per_unit),
            updated_at = now()
        WHERE id = v_buyer_inv_id;

        UPDATE public.investment_certificates
        SET units_owned = units_owned + v_actual_buy,
            amount_invested = amount_invested + (v_actual_buy * v_price_per_unit),
            updated_at = now()
        WHERE investment_id = v_buyer_inv_id;
    ELSE
        INSERT INTO public.user_investments (
            user_id, property_id, units_owned, amount_invested, status
        ) VALUES (
            v_buyer_id, v_property_id, v_actual_buy, v_actual_buy * v_price_per_unit, 'active'
        ) RETURNING id INTO v_buyer_inv_id;

        v_cert_number := 'HHH-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(v_buyer_inv_id::text FROM 1 FOR 8));

        INSERT INTO public.investment_certificates (
            investment_id, user_id, property_id,
            certificate_number, amount_invested, units_owned, currency
        ) VALUES (
            v_buyer_inv_id, v_buyer_id, v_property_id,
            v_cert_number, v_actual_buy * v_price_per_unit, v_actual_buy, v_currency
        );
    END IF;

    -- Update listing: mark sold when fully purchased, else keep approved
    IF (v_units_sold_so_far + v_actual_buy) >= v_units_to_sell THEN
        UPDATE public.secondary_market_listings
        SET units_sold = v_units_to_sell, status = 'sold', updated_at = now()
        WHERE id = p_listing_id;
    ELSE
        UPDATE public.secondary_market_listings
        SET units_sold = units_sold + v_actual_buy, updated_at = now()
        WHERE id = p_listing_id;
    END IF;

    -- Record transaction
    INSERT INTO public.secondary_market_transactions (
        listing_id, buyer_id, seller_id, units_traded, price_per_unit, payment_method
    ) VALUES (
        p_listing_id, v_buyer_id, v_seller_id, v_actual_buy, v_price_per_unit, 'wallet_balance'
    ) RETURNING id INTO v_transaction_id;

    -- Notifications
    INSERT INTO public.notifications (user_id, type, title, body, link, category, priority)
    VALUES (
        v_buyer_id, 'investment', 'Purchase Confirmed',
        'You purchased ' || v_actual_buy || ' units of "' || COALESCE(v_prop_title, 'Property') ||
          '" for ' || v_total_price || ' ' || COALESCE(v_currency, '') || '.',
        '/dashboard?tab=investments', 'financial', 'high'
    );

    INSERT INTO public.notifications (user_id, type, title, body, link, category, priority)
    VALUES (
        v_seller_id, 'investment', 'Units Sold',
        v_actual_buy || ' units of "' || COALESCE(v_prop_title, 'Property') ||
          '" sold. ' || v_total_price || ' ' || COALESCE(v_currency, '') || ' added to your wallet.',
        '/dashboard?tab=withdrawals', 'financial', 'high'
    );

    RETURN v_transaction_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_listing_with_wallet(uuid, integer) TO authenticated;

-- ============================================================
-- 12. VIEW: Available listings for Trade page (server-side filter)
-- ============================================================
DROP VIEW IF EXISTS public.available_market_listings;

CREATE VIEW public.available_market_listings AS
SELECT
    l.id,
    l.seller_id,
    l.property_id,
    l.investment_id,
    l.units_to_sell,
    l.units_sold,
    (l.units_to_sell - l.units_sold) AS units_available,
    l.price_per_unit,
    l.status,
    l.expires_at,
    l.created_at,
    l.updated_at,
    ip.title AS property_title,
    ip.location AS property_location,
    ip.currency,
    ip.unit_price AS original_unit_price,
    ip.cover_image_url,
    ip.status AS property_status
FROM public.secondary_market_listings l
JOIN public.investment_properties ip ON ip.id = l.property_id
WHERE
    l.status = 'approved'
    AND (l.units_to_sell - l.units_sold) > 0
    AND (l.expires_at IS NULL OR l.expires_at > now())
    AND ip.status IN ('open', 'funded', 'fully_funded', 'roi_active');

GRANT SELECT ON public.available_market_listings TO authenticated;
