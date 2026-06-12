-- ============================================================
-- KYC ENHANCEMENT MIGRATION
-- Add tracking timestamps and notes for KYC processes.
-- ============================================================

-- 1. Add tracking columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS kyc_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS kyc_reviewer_notes TEXT;

-- 2. Create trigger function to auto-update timestamps on status change
CREATE OR REPLACE FUNCTION public.handle_kyc_timestamp_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
    IF NEW.kyc_status = 'pending' THEN
      NEW.kyc_submitted_at = now();
      -- Clear previous review notes on a fresh submission
      NEW.kyc_reviewed_at = NULL;
      NEW.kyc_reviewer_notes = NULL;
      NEW.kyc_rejection_reason = NULL;
    ELSIF NEW.kyc_status IN ('approved', 'rejected') THEN
      NEW.kyc_reviewed_at = now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach trigger
DROP TRIGGER IF EXISTS on_kyc_timestamp_update ON public.profiles;
CREATE TRIGGER on_kyc_timestamp_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_kyc_timestamp_updates();
