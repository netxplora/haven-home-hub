-- ============================================================
-- FIX KYC NOTIFICATION TRIGGER
-- ============================================================

-- The previous version of this function attempted to use NEW.rejection_reason
-- instead of the correct column NEW.kyc_rejection_reason on the profiles table.

CREATE OR REPLACE FUNCTION notify_kyc_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status AND NEW.kyc_status IS NOT NULL THEN
    IF NEW.kyc_status = 'approved' THEN
      INSERT INTO public.notifications (user_id, title, body, type, category, link, priority)
      VALUES (
        NEW.id,
        'Identity Verified',
        'Your identity verification has been approved. You now have full access to all platform features.',
        'kyc',
        'account',
        '/dashboard?tab=profile',
        'high'
      );
    ELSIF NEW.kyc_status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, title, body, type, category, link, priority)
      VALUES (
        NEW.id,
        'Verification Unsuccessful',
        'Your identity verification was not approved. Reason: ' || COALESCE(NEW.kyc_rejection_reason, 'Documents unclear. Please re-submit.'),
        'kyc',
        'account',
        '/dashboard?tab=profile',
        'high'
      );
    ELSIF NEW.kyc_status = 'pending' THEN
      INSERT INTO public.notifications (user_id, title, body, type, category, link, priority)
      VALUES (
        NEW.id,
        'Verification Under Review',
        'Your identity documents have been submitted and are now being reviewed. We will notify you once the review is complete.',
        'kyc',
        'account',
        '/dashboard?tab=profile',
        'normal'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
