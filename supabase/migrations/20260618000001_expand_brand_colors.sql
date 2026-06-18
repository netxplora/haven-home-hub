-- Migration: Expand brand settings for granular color control
-- Description: Adds multiple color fields to support a fully dynamic theme engine controlled from the Admin Dashboard.

ALTER TABLE public.brand_settings
ADD COLUMN IF NOT EXISTS accent_color varchar,
ADD COLUMN IF NOT EXISTS background_color varchar,
ADD COLUMN IF NOT EXISTS card_color varchar,
ADD COLUMN IF NOT EXISTS button_style varchar,
ADD COLUMN IF NOT EXISTS navigation_color varchar,
ADD COLUMN IF NOT EXISTS dashboard_color varchar,
ADD COLUMN IF NOT EXISTS loading_color varchar,
ADD COLUMN IF NOT EXISTS skeleton_color varchar,
ADD COLUMN IF NOT EXISTS chart_palette jsonb,
ADD COLUMN IF NOT EXISTS notification_color varchar,
ADD COLUMN IF NOT EXISTS progress_bar_color varchar,
ADD COLUMN IF NOT EXISTS document_accent_color varchar;
