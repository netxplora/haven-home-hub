-- Migration: Payout Distribution Logic
-- Purpose: Safely distributes a declared payout across all active investors for a property.

CREATE OR REPLACE FUNCTION public.distribute_property_payout(p_payout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_property_id uuid;
    v_total_payout numeric;
    v_dist_date date;
    v_prop_title text;
    v_total_units numeric;
    v_yield_per_unit numeric;
    v_inv record;
    v_user_payout numeric;
BEGIN
    -- 1. Load Payout details
    SELECT p.property_id, p.amount, p.distribution_date, ip.title 
    INTO v_property_id, v_total_payout, v_dist_date, v_prop_title
    FROM public.payouts p
    JOIN public.investment_properties ip ON ip.id = p.property_id
    WHERE p.id = p_payout_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payout not found';
    END IF;

    -- 2. Check if already distributed
    IF EXISTS (SELECT 1 FROM public.returns WHERE payout_id = p_payout_id) THEN
        RAISE EXCEPTION 'Payout has already been distributed';
    END IF;

    -- 3. Get total active units for this property
    SELECT SUM(units_owned) INTO v_total_units
    FROM public.user_investments
    WHERE property_id = v_property_id AND status = 'active';

    IF v_total_units IS NULL OR v_total_units = 0 THEN
        RAISE EXCEPTION 'No active investments found for this property';
    END IF;

    -- 4. Calculate yield per unit
    v_yield_per_unit := v_total_payout / v_total_units;

    -- 5. Distribute to each active investor
    FOR v_inv IN 
        SELECT user_id, SUM(units_owned) as units
        FROM public.user_investments
        WHERE property_id = v_property_id AND status = 'active'
        GROUP BY user_id
    LOOP
        v_user_payout := ROUND(v_yield_per_unit * v_inv.units, 2);

        -- Insert return record
        INSERT INTO public.returns (
            user_id, property_id, payout_id, amount_received, distribution_date
        ) VALUES (
            v_inv.user_id, v_property_id, p_payout_id, v_user_payout, v_dist_date
        );

        -- Notify user
        INSERT INTO public.notifications (
            user_id, type, title, body, link, category, priority
        ) VALUES (
            v_inv.user_id,
            'investment',
            'Dividend Received!',
            'You received a dividend payout of ' || v_user_payout || ' for your investment in "' || COALESCE(v_prop_title, 'Property') || '".',
            '/dashboard?tab=withdrawals',
            'financial',
            'high'
        );
    END LOOP;

END;
$$;
