
-- Lock down create_notification: only service role / postgres should call it
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, notification_type, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

-- Replace user_available_balance with a no-arg version that uses auth.uid()
DROP FUNCTION IF EXISTS public.user_available_balance(uuid);

CREATE OR REPLACE FUNCTION public.user_available_balance()
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT SUM(amount_received) FROM public.returns WHERE user_id = auth.uid()), 0
  ) - COALESCE(
    (SELECT SUM(amount) FROM public.withdrawal_requests
     WHERE user_id = auth.uid() AND status IN ('pending','approved','processing','completed')), 0
  );
$$;

REVOKE EXECUTE ON FUNCTION public.user_available_balance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_available_balance() TO authenticated;
