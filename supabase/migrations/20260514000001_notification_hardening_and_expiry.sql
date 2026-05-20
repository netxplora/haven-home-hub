-- Migration: Notification Hardening & Reservation Expiry Automation
-- Created: 2026-05-14
-- Purpose: 
--   (a) Expand investment notification trigger to cover rejection and info-request statuses
--   (b) Create automated reservation expiry function
--   (c) Add admin notification for new investment applications

-- ============================================================
-- 1. EXPAND INVESTMENT STATUS NOTIFICATION TRIGGER
-- ============================================================
-- The existing trigger only fires for 'confirmed'/'active'. 
-- Replace it to also notify on 'rejected' and 'information_requested'.

CREATE OR REPLACE FUNCTION notify_investment_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  v_prop_title TEXT;
BEGIN
  SELECT title INTO v_prop_title FROM public.investment_properties WHERE id = NEW.property_id;

  -- Investment confirmed or activated
  IF NEW.status IN ('confirmed', 'active') AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.notifications (user_id, title, body, type, category, link, priority)
    VALUES (
      NEW.user_id,
      'Investment Confirmed',
      'Your investment in "' || COALESCE(v_prop_title, 'a property') || '" has been confirmed. Amount: $' || ROUND(COALESCE(NEW.total_amount, NEW.amount_invested), 2),
      'investment',
      'financial',
      '/dashboard?tab=investments',
      'high'
    );
  END IF;

  -- Investment rejected
  IF NEW.status = 'rejected' AND (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.notifications (user_id, title, body, type, category, link, priority)
    VALUES (
      NEW.user_id,
      'Investment Not Approved',
      'Your investment application for "' || COALESCE(v_prop_title, 'a property') || '" was not approved. Please check your dashboard for details.',
      'investment',
      'financial',
      '/dashboard?tab=investments',
      'high'
    );
  END IF;

  -- More information requested
  IF NEW.status = 'information_requested' AND (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.notifications (user_id, title, body, type, category, link, priority)
    VALUES (
      NEW.user_id,
      'Action Required: Investment Application',
      'We need additional information regarding your investment in "' || COALESCE(v_prop_title, 'a property') || '". Please check your dashboard.',
      'investment',
      'financial',
      '/dashboard?tab=investments',
      'high'
    );
  END IF;

  -- New pending application — notify admins
  IF NEW.status IN ('pending_verification', 'pending_review') AND TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, title, body, type, category, link, priority)
    SELECT 
      ur.user_id,
      'New Investment Application',
      'A new investment application for "' || COALESCE(v_prop_title, 'a property') || '" has been submitted and requires review.',
      'system',
      'admin',
      '/admin',
      'high'
    FROM public.user_roles ur
    WHERE ur.role = 'admin';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger itself already exists from migration 20260509, no need to recreate it.
-- It will use this updated function automatically.


-- ============================================================
-- 2. RESERVATION EXPIRY AUTOMATION
-- ============================================================
-- Function that can be called by pg_cron or an Edge Function
-- to expire reservations that have been in 'awaiting_reservation_fee' 
-- for longer than the configured expiry window.

DROP FUNCTION IF EXISTS public.expire_stale_reservations();

CREATE OR REPLACE FUNCTION public.expire_stale_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_expiry_hours integer := 48;
  v_expired_count integer := 0;
  v_config_value jsonb;
BEGIN
  -- Try to read expiry hours from system_configs
  SELECT value INTO v_config_value
  FROM public.system_configs
  WHERE key = 'reservation_expiry_hours';
  
  IF v_config_value IS NOT NULL THEN
    v_expiry_hours := (v_config_value #>> '{}')::integer;
  END IF;

  -- Expire reservations that have been awaiting payment too long
  WITH expired AS (
    UPDATE public.reservations
    SET status = 'expired',
        updated_at = now()
    WHERE status = 'awaiting_reservation_fee'
      AND created_at < now() - (v_expiry_hours || ' hours')::interval
    RETURNING id, user_id
  )
  SELECT count(*) INTO v_expired_count FROM expired;

  -- Send notifications for each expired reservation
  INSERT INTO public.notifications (user_id, title, body, type, category, link, priority)
  SELECT 
    r.user_id,
    'Reservation Expired',
    'Your reservation has expired because the reservation fee was not paid within ' || v_expiry_hours || ' hours. You may place a new reservation if the property is still available.',
    'reservation',
    'property',
    '/dashboard?tab=reservations',
    'normal'
  FROM public.reservations r
  WHERE r.status = 'expired'
    AND r.updated_at >= now() - interval '1 minute';

  RETURN v_expired_count;
END;
$function$;


-- ============================================================
-- 3. ADMIN NOTIFICATION ON NEW RESERVATION
-- ============================================================
-- When a user creates a reservation, notify all admins.

CREATE OR REPLACE FUNCTION notify_admin_new_reservation()
RETURNS TRIGGER AS $$
DECLARE
  v_prop_title TEXT;
  v_user_name TEXT;
BEGIN
  -- Get property title
  IF NEW.property_id IS NOT NULL THEN
    SELECT title INTO v_prop_title FROM public.properties WHERE id = NEW.property_id;
  ELSIF NEW.investment_property_id IS NOT NULL THEN
    SELECT title INTO v_prop_title FROM public.investment_properties WHERE id = NEW.investment_property_id;
  END IF;

  -- Get user name
  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;

  -- Notify all admins
  INSERT INTO public.notifications (user_id, title, body, type, category, link, priority)
  SELECT 
    ur.user_id,
    'New Reservation Request',
    COALESCE(v_user_name, 'A user') || ' has placed a reservation for "' || COALESCE(v_prop_title, 'a property') || '". Review required.',
    'system',
    'admin',
    '/admin',
    'high'
  FROM public.user_roles ur
  WHERE ur.role = 'admin';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_reservation_admin ON public.reservations;

CREATE TRIGGER on_new_reservation_admin
  AFTER INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_reservation();


-- ============================================================
-- 4. ADMIN NOTIFICATION ON NEW PAYMENT (PROOF OF PAYMENT)
-- ============================================================
-- When a payment enters 'submitted' or 'pending' with proof attached, 
-- notify admins that a review is needed.

CREATE OR REPLACE FUNCTION notify_admin_payment_submitted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('submitted', 'pending') AND TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, title, body, type, category, link, priority)
    SELECT 
      ur.user_id,
      'Payment Pending Review',
      'A ' || REPLACE(COALESCE(NEW.payment_type, 'general'), '_', ' ') || ' payment of $' || ROUND(NEW.amount, 2) || ' has been submitted and requires review.',
      'system',
      'admin',
      '/admin',
      'normal'
    FROM public.user_roles ur
    WHERE ur.role = 'admin';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_payment_submitted_admin ON public.payments;

CREATE TRIGGER on_payment_submitted_admin
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_payment_submitted();
