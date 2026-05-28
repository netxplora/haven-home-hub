-- Migration: Document Lifecycle Management & Audit Tracking
-- Purpose: Adds the audit tables and functions necessary for permanent deletion
--          and secure lifecycle tracking of all legal documents.

-- 1. Create the Audit Log Table
CREATE TABLE IF NOT EXISTS public.document_audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id uuid NOT NULL,
    user_id uuid, -- The user who owned the document
    action_by uuid NOT NULL, -- The person who triggered the action
    action text NOT NULL, -- 'GENERATED', 'DELIVERED', 'VIEWED', 'DOWNLOADED', 'DELETED', 'ARCHIVED', 'RECOVERED'
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS for Audit Logs
ALTER TABLE public.document_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.document_audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.document_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
        )
    );

-- Users can view logs for their own documents
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.document_audit_logs;
CREATE POLICY "Users can view own audit logs" ON public.document_audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- 2. Investor Document Deletion RPC
-- Provides a secure way for investors to mark their documents as deleted
-- while ensuring an immutable audit trail is kept for admins.
CREATE OR REPLACE FUNCTION public.investor_delete_document(p_document_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id uuid;
    v_status text;
BEGIN
    -- Verify document ownership and get current status
    SELECT user_id, status INTO v_user_id, v_status
    FROM public.user_documents
    WHERE id = p_document_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Document not found or access denied.';
    END IF;

    IF v_user_id != auth.uid() THEN
        -- Extra safety fallback
        RAISE EXCEPTION 'Unauthorized: You can only delete your own documents.';
    END IF;

    -- Update document status to deleted
    UPDATE public.user_documents
    SET 
        status = 'deleted',
        updated_at = now()
    WHERE id = p_document_id;

    -- Create audit log entry
    INSERT INTO public.document_audit_logs (
        document_id, user_id, action_by, action, details
    ) VALUES (
        p_document_id, v_user_id, auth.uid(), 'DELETED', 
        jsonb_build_object(
            'previous_status', v_status,
            'deleted_at', now()::TEXT
        )
    );
END;
$$;

-- 3. Admin Document Recovery RPC
-- Allows admins to restore a soft-deleted document if requested by an investor
CREATE OR REPLACE FUNCTION public.admin_recover_document(p_document_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Verify admin role
    IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
        RAISE EXCEPTION 'Unauthorized: admin role required';
    END IF;

    SELECT user_id INTO v_user_id
    FROM public.user_documents
    WHERE id = p_document_id;

    -- Restore to available
    UPDATE public.user_documents
    SET 
        status = 'available',
        updated_at = now()
    WHERE id = p_document_id;

    -- Log recovery
    INSERT INTO public.document_audit_logs (
        document_id, user_id, action_by, action, details
    ) VALUES (
        p_document_id, v_user_id, auth.uid(), 'RECOVERED', 
        jsonb_build_object(
            'recovered_at', now()::TEXT
        )
    );
END;
$$;
