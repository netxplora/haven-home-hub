-- Migration: Admin Document Template RPC
-- Purpose: Provides a SECURITY DEFINER function for admins to save document templates,
--          bypassing RLS to ensure visibility and ability to update.

CREATE OR REPLACE FUNCTION public.admin_save_document_template(
  p_template_id uuid,
  p_name text,
  p_type text,
  p_html text,
  p_placement jsonb,
  p_version integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  IF p_template_id IS NOT NULL THEN
    -- Update existing template
    -- First, save history
    INSERT INTO public.document_template_history (
      template_id, name, content_html, document_type, version, signature_placement, updated_by
    )
    SELECT id, name, content_html, document_type, version, signature_placement, auth.uid()
    FROM public.document_templates
    WHERE id = p_template_id;

    -- Then update the active template
    UPDATE public.document_templates
    SET
      name = p_name,
      content_html = p_html,
      signature_placement = p_placement,
      version = p_version,
      updated_at = now()
    WHERE id = p_template_id;
  ELSE
    -- Insert new template
    INSERT INTO public.document_templates (
      name, document_type, content_html, signature_placement, version, is_active
    ) VALUES (
      p_name, p_type, p_html, p_placement, 1, true
    );
  END IF;
END;
$$;
