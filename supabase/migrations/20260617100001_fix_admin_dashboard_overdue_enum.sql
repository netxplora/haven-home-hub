-- Migration: Fix get_admin_dashboard_summary — remove invalid column refs
-- Fixes:
--   1. Removed 'overdue' enum value (does not exist in user_investment_status)
--   2. Removed 'commission_rate' and 'ownership_type' column refs (do not exist on properties table)
-- Partner commission revenue is set to 0 until those columns are added.

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
    'overdue', count(*) FILTER (WHERE remaining_balance > 0 AND status NOT IN ('completed', 'cancelled', 'refunded')),
    'outstanding', COALESCE(SUM(remaining_balance), 0),
    'collected', COALESCE(SUM(amount_paid), 0)
  ) INTO v_installments
  FROM public.user_investments
  WHERE investment_type = 'installment';

  -- 4. Revenue
  -- Note: commission_rate and ownership_type do not exist on properties table.
  -- Partner commission revenue is hardcoded to 0 until those columns are added.
  WITH successful_payments AS (
    SELECT amount, created_at, payment_type
    FROM public.payments
    WHERE status = 'success'
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
    'totalRevenue', COALESCE((SELECT SUM(amount) FROM successful_payments), 0),
    'reservationRevenue', COALESCE((SELECT SUM(amount) FROM successful_payments WHERE payment_type = 'reservation'), 0),
    'investmentRevenue', COALESCE((SELECT SUM(amount) FROM successful_payments WHERE payment_type = 'investment'), 0),
    'partnerCommissionRevenue', 0,
    'soldProperties', (SELECT count(*) FROM public.properties WHERE status = 'sold'),
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
