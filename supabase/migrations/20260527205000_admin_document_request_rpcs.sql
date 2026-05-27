-- Migration: Admin Document Requests RPC (Fixed)
-- Purpose: Provides a SECURITY DEFINER function for admins to fetch all document requests,
--          bypassing RLS to ensure visibility. Also provides an update function.

-- 1. Fetch all document requests (admin only)
CREATE OR REPLACE FUNCTION public.admin_get_document_requests()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  property_id uuid,
  investment_property_id uuid,
  requested_documents jsonb,
  status text,
  admin_notes text,
  created_at timestamptz,
  updated_at timestamptz,
  user_full_name text,
  user_email text,
  property_title text,
  investment_property_title text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  RETURN QUERY
    SELECT
      dr.id,
      dr.user_id,
      dr.property_id,
      dr.investment_property_id,
      dr.requested_documents,
      dr.status::text,
      dr.admin_notes,
      dr.created_at,
      dr.updated_at,
      p.full_name AS user_full_name,
      au.email::text AS user_email,
      prop.title AS property_title,
      ip.title AS investment_property_title
    FROM public.document_requests dr
    LEFT JOIN public.profiles p ON p.id = dr.user_id
    LEFT JOIN auth.users au ON au.id = dr.user_id
    LEFT JOIN public.properties prop ON prop.id = dr.property_id
    LEFT JOIN public.investment_properties ip ON ip.id = dr.investment_property_id
    ORDER BY dr.created_at DESC;
END;
$$;

-- 2. Update a document request status (admin only)
CREATE OR REPLACE FUNCTION public.admin_update_document_request(
  p_request_id uuid,
  p_status text,
  p_admin_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  UPDATE public.document_requests
  SET
    status = p_status::public.document_request_status,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = now()
  WHERE id = p_request_id;
END;
$$;
