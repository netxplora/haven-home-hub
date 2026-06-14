-- Migration: Dashboard Summary RPCs
-- Description: Creates consolidated endpoints for fetching dashboard metrics in a single query

-- 1. Investor Dashboard Summary
CREATE OR REPLACE FUNCTION get_investor_dashboard_summary(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available_balance numeric;
  v_investments json;
  v_returns json;
  v_reservations json;
  v_result json;
BEGIN
  -- Security check: Ensure the user is querying their own data or is an admin
  IF auth.uid() != p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Calculate available balance properly for p_user_id
  v_available_balance := COALESCE(
    (SELECT SUM(amount_received) FROM public.returns WHERE user_id = p_user_id), 0
  ) + COALESCE(
    (SELECT SUM(units_traded * price_per_unit) FROM public.secondary_market_transactions WHERE seller_id = p_user_id), 0
  ) - COALESCE(
    (SELECT SUM(amount) FROM public.withdrawal_requests
     WHERE user_id = p_user_id AND status IN ('pending','approved','processing','completed')), 0
  ) - COALESCE(
    (SELECT SUM(units_traded * price_per_unit) FROM public.secondary_market_transactions WHERE buyer_id = p_user_id AND payment_method = 'wallet_balance'), 0
  );
  
  -- Aggregate investments
  SELECT json_build_object(
    'total_invested', COALESCE(SUM(COALESCE(total_amount, amount_invested, 0)), 0),
    'investment_count', COUNT(*),
    'completed_count', COUNT(*) FILTER (WHERE status = 'completed')
  ) INTO v_investments
  FROM public.user_investments
  WHERE user_id = p_user_id AND status IN ('confirmed', 'active', 'completed');
  
  -- Aggregate returns
  SELECT json_agg(
    json_build_object(
      'amount_received', amount_received,
      'distribution_date', distribution_date
    )
  ) INTO v_returns
  FROM (
    SELECT amount_received, distribution_date 
    FROM public.returns 
    WHERE user_id = p_user_id 
    ORDER BY distribution_date ASC
  ) AS r;

  -- Aggregate reservations
  SELECT json_build_object(
    'active_count', COUNT(*) FILTER (WHERE status IN ('pending', 'pending_review', 'approved', 'awaiting_reservation_fee', 'under_admin_review', 'information_requested')),
    'owned_count', COUNT(*) FILTER (WHERE status IN ('confirmed', 'completed'))
  ) INTO v_reservations
  FROM public.reservations
  WHERE user_id = p_user_id;
  
  v_result := json_build_object(
    'investments', COALESCE(v_investments, '{"total_invested":0, "investment_count":0, "completed_count":0}'::json),
    'returnsList', COALESCE(v_returns, '[]'::json),
    'reservations', COALESCE(v_reservations, '{"active_count":0, "owned_count":0}'::json),
    'availableBalance', COALESCE(v_available_balance, 0)
  );

  RETURN v_result;
END;
$$;

-- 2. Admin Dashboard Summary
CREATE OR REPLACE FUNCTION get_admin_dashboard_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_counts json;
  v_lifecycle json;
  v_installments json;
  v_revenue json;
  v_result json;
BEGIN
  -- Security check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 1. Counts
  SELECT json_build_object(
    'properties', (SELECT count(*) FROM public.properties),
    'investments', (SELECT count(*) FROM public.investment_properties),
    'users', (SELECT count(*) FROM public.profiles),
    'agents', (SELECT count(*) FROM public.agents),
    'inquiries', (SELECT count(*) FROM public.inquiries WHERE status = 'new'),
    'bookings', (SELECT count(*) FROM public.bookings WHERE status IN ('pending', 'confirmed')),
    'locations', (SELECT count(*) FROM public.locations),
    'reservations', (SELECT count(*) FROM public.reservations),
    'kycPending', (SELECT count(*) FROM public.profiles WHERE kyc_status = 'pending'),
    'pendingWithdrawals', (SELECT count(*) FROM public.withdrawal_requests WHERE status = 'pending'),
    'pendingPayments', (SELECT count(*) FROM public.payments WHERE status IN ('pending', 'processing', 'submitted', 'under_review')),
    'pendingVerifications', (SELECT count(*) FROM public.user_investments WHERE status = 'pending'),
    'issuedCertificates', (SELECT count(*) FROM public.investment_certificates)
  ) INTO v_counts;

  -- 2. Lifecycle
  WITH props AS (
    SELECT status, total_value, units_sold, unit_price, projected_return_min 
    FROM public.investment_properties
  ), invs AS (
    SELECT status, total_amount, amount_invested, units_owned, user_id 
    FROM public.user_investments
  )
  SELECT json_build_object(
    'totalAUM', COALESCE((SELECT SUM(total_value) FROM props), 0),
    'totalRaised', COALESCE((SELECT SUM(COALESCE(total_amount, amount_invested, 0)) FROM invs WHERE status IN ('active', 'confirmed', 'roi_active', 'roi_paused', 'matured', 'completed')), 0),
    'activeCampaigns', (SELECT count(*) FROM props WHERE status = 'open'),
    'roiActiveProperties', (SELECT count(*) FROM props WHERE status = 'roi_active'),
    'totalInvestors', (SELECT count(DISTINCT user_id) FROM invs WHERE status IN ('active', 'confirmed', 'roi_active', 'roi_paused', 'matured', 'completed')),
    'totalUnitsSold', COALESCE((SELECT SUM(units_sold) FROM props), 0),
    'averageROI', COALESCE((SELECT AVG(projected_return_min) FROM props WHERE projected_return_min > 0), 0),
    'maturingInvestments', (SELECT count(*) FROM invs WHERE status IN ('roi_active', 'roi_paused', 'active')),
    'maturedInvestments', (SELECT count(*) FROM invs WHERE status IN ('matured', 'completed'))
  ) INTO v_lifecycle;

  -- 3. Installments
  SELECT json_build_object(
    'total', count(*),
    'active', count(*) FILTER (WHERE status IN ('active', 'confirmed')),
    'overdue', count(*) FILTER (WHERE status = 'overdue'),
    'outstanding', COALESCE(SUM(remaining_balance), 0),
    'collected', COALESCE(SUM(amount_paid), 0)
  ) INTO v_installments
  FROM public.user_investments
  WHERE investment_type = 'installment';

  -- 4. Revenue
  WITH successful_payments AS (
    SELECT amount, created_at, payment_type
    FROM public.payments
    WHERE status = 'success'
  ), sold_props AS (
    SELECT price, commission_rate
    FROM public.properties
    WHERE status = 'sold'
  ), partner_commissions AS (
    SELECT COALESCE(SUM(price * (commission_rate / 100)), 0) as partner_commission_revenue
    FROM public.properties
    WHERE status = 'sold' AND ownership_type = 'partner'
  ), monthly_agg AS (
    SELECT 
      to_char(date_trunc('month', created_at), 'Mon YY') as label,
      COALESCE(SUM(amount), 0) as total,
      COUNT(*) as count
    FROM successful_payments
    WHERE created_at >= date_trunc('month', now() - interval '5 months')
    GROUP BY date_trunc('month', created_at)
    ORDER BY date_trunc('month', created_at)
  )
  SELECT json_build_object(
    'totalRevenue', COALESCE((SELECT SUM(amount) FROM successful_payments), 0) + (SELECT partner_commission_revenue FROM partner_commissions),
    'reservationRevenue', COALESCE((SELECT SUM(amount) FROM successful_payments WHERE payment_type = 'reservation'), 0),
    'investmentRevenue', COALESCE((SELECT SUM(amount) FROM successful_payments WHERE payment_type = 'investment'), 0),
    'partnerCommissionRevenue', (SELECT partner_commission_revenue FROM partner_commissions),
    'soldProperties', (SELECT count(*) FROM sold_props),
    'monthlyData', COALESCE((SELECT json_agg(json_build_object('label', label, 'total', total, 'count', count)) FROM monthly_agg), '[]'::json)
  ) INTO v_revenue;

  v_result := json_build_object(
    'counts', v_counts,
    'lifecycle', v_lifecycle,
    'installments', v_installments,
    'revenue', v_revenue
  );

  RETURN v_result;
END;
$$;
