-- Migration: Enterprise Payment Audit & Verification
-- Description: Adds payment_audit_logs table, transaction_hash uniqueness, and verification RPC.

-- 1. Prevent duplicate transaction hashes (Replay Attack Prevention)
-- First, handle any existing duplicates by appending a unique identifier to older duplicates
WITH duplicates AS (
  SELECT id, 
         transaction_hash,
         ROW_NUMBER() OVER (PARTITION BY transaction_hash ORDER BY created_at DESC) as rnum
  FROM public.payments
  WHERE transaction_hash IS NOT NULL AND transaction_hash != ''
)
UPDATE public.payments p
SET transaction_hash = p.transaction_hash || '-dup-' || p.id
FROM duplicates d
WHERE p.id = d.id AND d.rnum > 1;

-- Now we can safely create the unique partial index
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_tx_hash 
ON public.payments (transaction_hash) 
WHERE transaction_hash IS NOT NULL AND transaction_hash != '';

-- 2. Immutable Audit Logs Table
CREATE TABLE public.payment_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    previous_status text,
    new_status text NOT NULL,
    notes text,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookups on the admin panel
CREATE INDEX idx_payment_audit_payment_id ON public.payment_audit_logs(payment_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.payment_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read the audit logs
CREATE POLICY "Admins can view payment audit logs" 
ON public.payment_audit_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Secure Verification RPC
-- This allows an admin to update a payment status and log their note atomically.
CREATE OR REPLACE FUNCTION public.admin_verify_payment(
    p_payment_id UUID,
    p_new_status text,
    p_notes text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_status text;
    v_admin_id UUID;
BEGIN
    -- Verify caller is admin
    IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can verify payments';
    END IF;

    v_admin_id := auth.uid();

    -- Get old status
    SELECT status::text INTO v_old_status
    FROM public.payments
    WHERE id = p_payment_id;

    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;

    -- Update payment
    UPDATE public.payments
    SET 
        status = p_new_status::public.payment_status,
        updated_at = now()
    WHERE id = p_payment_id;

    -- Insert immutable audit log
    INSERT INTO public.payment_audit_logs (
        payment_id,
        admin_id,
        previous_status,
        new_status,
        notes
    ) VALUES (
        p_payment_id,
        v_admin_id,
        v_old_status,
        p_new_status,
        p_notes
    );

    RETURN true;
END;
$$;
