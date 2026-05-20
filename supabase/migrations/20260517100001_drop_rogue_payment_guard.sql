-- Drop the rogue check_payment_eligibility trigger and function.
-- These were created directly on the remote database (not via local migrations)
-- and block payment inserts for investments with status 'awaiting_payment'
-- by raising: "payment blocked: investment status is invalid for payment"

DROP TRIGGER IF EXISTS tr_check_payment_eligibility ON public.payments;
DROP FUNCTION IF EXISTS public.check_payment_eligibility() CASCADE;
