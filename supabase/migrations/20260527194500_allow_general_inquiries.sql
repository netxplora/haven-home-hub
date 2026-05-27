-- Migration: Allow General Inquiries
-- Purpose: Drops the NOT NULL constraint on property_id for the inquiries table
-- so that users can submit general inquiries (like missing document requests)
-- without having to attach them to a specific property.

ALTER TABLE public.inquiries ALTER COLUMN property_id DROP NOT NULL;
