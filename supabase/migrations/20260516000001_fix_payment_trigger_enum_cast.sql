-- Migration: Fix notify_admin_payment_submitted enum casting issue
-- Created: 2026-05-16

CREATE OR REPLACE FUNCTION public.notify_admin_payment_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status IN ('submitted', 'pending') AND TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, title, body, type, category, link, priority)
    SELECT 
      ur.user_id,
      'Payment Pending Review',
      -- Add ::text cast to NEW.payment_type to prevent Postgres from casting 'general' to the enum
      'A ' || REPLACE(COALESCE(NEW.payment_type::text, 'general'), '_', ' ') || ' payment of $' || ROUND(NEW.amount, 2) || ' has been submitted and requires review.',
      'system',
      'admin',
      '/admin',
      'normal'
    FROM public.user_roles ur
    WHERE ur.role = 'admin';
  END IF;

  RETURN NEW;
END;
$$;
