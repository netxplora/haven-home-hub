-- Migration: Create is_admin helper function
-- Description: Provides a reusable security helper used by admin RPCs
-- This function was missing from the database, causing get_admin_dashboard_summary to fail with 404

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- Grant execute to authenticated users (the function itself checks the role)
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
