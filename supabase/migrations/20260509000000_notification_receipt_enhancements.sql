-- ======================================================
-- Notification & Receipt System Enhancements
-- ======================================================

-- 1. Add notification preferences to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "push": true, "payment": true, "investment": true, "kyc": true, "withdrawal": true, "reservation": true, "booking": true, "system": true}'::jsonb;

-- 2. Add action_url to notifications for deep-linking
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS action_url TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

-- 3. Add receipt download tracking
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_downloaded_at TIMESTAMP WITH TIME ZONE;

-- 4. Admin insert policy for receipts (for manual generation)
DROP POLICY IF EXISTS "Admins can insert receipts" ON public.receipts;
CREATE POLICY "Admins can insert receipts" ON public.receipts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- 5. Admin insert policy for notifications
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- 6. Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Admins can view all notifications
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
CREATE POLICY "Admins can view all notifications" ON public.notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- ======================================================
-- Notification Triggers for All Platform Events
-- ======================================================

-- 8. KYC Status Change Notification
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
        'Your identity verification was not approved. Reason: ' || COALESCE(NEW.rejection_reason, 'Documents unclear. Please re-submit.'),
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

DROP TRIGGER IF EXISTS on_kyc_status_change ON public.profiles;
CREATE TRIGGER on_kyc_status_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.kyc_status IS DISTINCT FROM NEW.kyc_status)
  EXECUTE FUNCTION notify_kyc_status_change();

-- 9. Withdrawal Status Notification
CREATE OR REPLACE FUNCTION notify_withdrawal_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'completed' THEN
      INSERT INTO public.notifications (user_id, title, body, type, category, link, priority)
      VALUES (
        NEW.user_id,
        'Withdrawal Processed',
        'Your withdrawal of $' || ROUND(NEW.amount, 2) || ' has been processed and sent to your ' || REPLACE(NEW.method, '_', ' ') || ' account.',
        'withdrawal',
        'financial',
        '/dashboard?tab=withdrawals',
        'high'
      );
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, title, body, type, category, link, priority)
      VALUES (
        NEW.user_id,
        'Withdrawal Declined',
        'Your withdrawal request for $' || ROUND(NEW.amount, 2) || ' was declined. ' || COALESCE('Reason: ' || NEW.rejection_reason, 'Contact support for details.'),
        'withdrawal',
        'financial',
        '/dashboard?tab=withdrawals',
        'high'
      );
    ELSIF NEW.status = 'processing' THEN
      INSERT INTO public.notifications (user_id, title, body, type, category, link, priority)
      VALUES (
        NEW.user_id,
        'Withdrawal In Progress',
        'Your withdrawal of $' || ROUND(NEW.amount, 2) || ' is being processed. This may take 1–3 business days.',
        'withdrawal',
        'financial',
        '/dashboard?tab=withdrawals',
        'normal'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_withdrawal_status_change ON public.withdrawal_requests;
CREATE TRIGGER on_withdrawal_status_change
  AFTER UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_withdrawal_status();

-- 10. Investment Confirmed Notification
CREATE OR REPLACE FUNCTION notify_investment_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  v_prop_title TEXT;
BEGIN
  IF NEW.status IN ('confirmed', 'active') AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT title INTO v_prop_title FROM public.investment_properties WHERE id = NEW.property_id;
    
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_investment_confirmed ON public.user_investments;
CREATE TRIGGER on_investment_confirmed
  AFTER INSERT OR UPDATE ON public.user_investments
  FOR EACH ROW
  EXECUTE FUNCTION notify_investment_confirmed();

-- 11. Returns Distributed Notification
CREATE OR REPLACE FUNCTION notify_return_distributed()
RETURNS TRIGGER AS $$
DECLARE
  v_prop_title TEXT;
BEGIN
  SELECT title INTO v_prop_title FROM public.investment_properties WHERE id = NEW.property_id;
  
  INSERT INTO public.notifications (user_id, title, body, type, category, link, priority)
  VALUES (
    NEW.user_id,
    'Return Distributed',
    'You have received a return of $' || ROUND(NEW.amount_received, 2) || ' from "' || COALESCE(v_prop_title, 'your investment') || '".',
    'investment',
    'financial',
    '/dashboard?tab=investments',
    'high'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_return_distributed ON public.returns;
CREATE TRIGGER on_return_distributed
  AFTER INSERT ON public.returns
  FOR EACH ROW
  EXECUTE FUNCTION notify_return_distributed();

-- 12. Installment Overdue Notification (add to mark_overdue function)
CREATE OR REPLACE FUNCTION notify_installment_overdue()
RETURNS TRIGGER AS $$
DECLARE
  v_prop_title TEXT;
BEGIN
  IF NEW.status = 'overdue' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'overdue') THEN
    SELECT ip.title INTO v_prop_title 
    FROM public.investment_properties ip 
    JOIN public.user_investments ui ON ui.property_id = ip.id 
    WHERE ui.id = NEW.investment_id;
    
    INSERT INTO public.notifications (user_id, title, body, type, category, link, priority)
    VALUES (
      (SELECT user_id FROM public.user_investments WHERE id = NEW.investment_id),
      'Installment Overdue',
      'Your installment payment for "' || COALESCE(v_prop_title, 'your property') || '" is overdue. Please make payment to avoid penalties.',
      'payment',
      'financial',
      '/dashboard?tab=investments',
      'high'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_installment_overdue ON public.investment_schedules;
CREATE TRIGGER on_installment_overdue
  AFTER UPDATE ON public.investment_schedules
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'overdue')
  EXECUTE FUNCTION notify_installment_overdue();

-- 13. Reservation Confirmation Notification
CREATE OR REPLACE FUNCTION notify_reservation_status()
RETURNS TRIGGER AS $$
DECLARE
  v_prop_title TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT title INTO v_prop_title FROM public.properties WHERE id = NEW.property_id;
    
    IF NEW.status = 'confirmed' THEN
      INSERT INTO public.notifications (user_id, title, body, type, category, link, priority)
      VALUES (
        NEW.user_id,
        'Reservation Confirmed',
        'Your reservation for "' || COALESCE(v_prop_title, 'a property') || '" has been confirmed. The property is now held for you.',
        'reservation',
        'property',
        '/dashboard?tab=reservations',
        'high'
      );
    ELSIF NEW.status = 'expired' THEN
      INSERT INTO public.notifications (user_id, title, body, type, category, link, priority)
      VALUES (
        NEW.user_id,
        'Reservation Expired',
        'Your reservation for "' || COALESCE(v_prop_title, 'a property') || '" has expired. You may place a new reservation if the property is still available.',
        'reservation',
        'property',
        '/dashboard?tab=reservations',
        'normal'
      );
    ELSIF NEW.status = 'cancelled' THEN
      INSERT INTO public.notifications (user_id, title, body, type, category, link, priority)
      VALUES (
        NEW.user_id,
        'Reservation Cancelled',
        'Your reservation for "' || COALESCE(v_prop_title, 'a property') || '" has been cancelled.',
        'reservation',
        'property',
        '/dashboard?tab=reservations',
        'normal'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_reservation_status_change ON public.reservations;
CREATE TRIGGER on_reservation_status_change
  AFTER UPDATE ON public.reservations
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_reservation_status();
