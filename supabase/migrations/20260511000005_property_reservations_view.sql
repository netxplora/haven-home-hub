-- Migration: Create property_reservations view for dashboard support
-- Description: Unifies property and investment reservations from the payments table for the user dashboard.

CREATE OR REPLACE VIEW public.property_reservations AS
SELECT 
    id,
    user_id,
    status::text,
    amount as fee_paid,
    created_at,
    expires_at,
    property_id,
    investment_property_id,
    reservation_id,
    payment_type
FROM public.payments
WHERE payment_type = 'reservation';

-- Grant access to authenticated users
GRANT SELECT ON public.property_reservations TO authenticated;

-- Comment on view for clarity
COMMENT ON VIEW public.property_reservations IS 'View for tracking property and investment reservations, used by the user dashboard ReservationsPanel.';
