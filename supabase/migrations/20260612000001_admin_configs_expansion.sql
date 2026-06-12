INSERT INTO system_configs (key, value, category, description)
VALUES 
  -- General
  ('logo_url', '"/logo.png"', 'General', 'Primary platform logo URL.'),
  ('favicon_url', '"/favicon.ico"', 'General', 'Platform favicon URL.'),
  ('company_details', '{"name": "Haven Home Hub LLC", "address": "123 Real Estate Blvd, NY"}', 'General', 'Official company entity details.'),
  ('contact_information', '{"phone": "+1-800-555-0199", "email": "contact@havenhomehub.com"}', 'General', 'Public contact details for the platform.'),

  -- Branding
  ('primary_color', '"#D4A373"', 'Branding', 'Brand primary sand color HEX.'),
  ('secondary_color', '"#0891B2"', 'Branding', 'Brand secondary ocean color HEX.'),
  ('theme_controls', '{"default_mode": "light", "enable_user_toggle": true}', 'Branding', 'Global theme behavior settings.'),
  ('email_branding', '{"header_image": "/email-header.png", "footer_text": "Haven Home Hub"}', 'Branding', 'Branding parameters for outbound emails.'),
  ('document_branding', '{"watermark": "Haven Home Hub Confidential"}', 'Branding', 'Watermark and branding for PDF exports.'),

  -- Payments
  ('payment_methods', '{"stripe": true, "crypto": false, "wire": true}', 'Payments', 'Supported payment gateways.'),
  ('wallet_settings', '{"minimum_withdrawal": 50, "auto_approve_under": 1000}', 'Payments', 'Rules for internal wallet transactions.'),
  ('investment_payments', '{"allow_installments": true, "max_installments": 12}', 'Payments', 'Payment rules specific to investments.'),
  ('reservation_settings', '{"fee": 500, "refundable_days": 14}', 'Payments', 'Reservation hold parameters.'),

  -- Documents
  ('document_templates', '{"lease": "tpl_123", "sale": "tpl_456"}', 'Documents', 'Default DocuSign or internal templates.'),
  ('signature_settings', '{"provider": "internal", "require_kyc": true}', 'Documents', 'Rules for executing e-signatures.'),
  ('legal_settings', '{"terms_version": "v2.1", "privacy_version": "v1.4"}', 'Documents', 'Tracking active legal document versions.'),
  ('document_defaults', '{"auto_archive_days": 365}', 'Documents', 'Default lifecycle rules for documents.'),

  -- Notifications
  ('email_notifications', '{"marketing": true, "transactional": true}', 'Notifications', 'Global email capability toggles.'),
  ('in_app_notifications', '{"retention_days": 30}', 'Notifications', 'In-app notification retention.'),
  ('broadcast_settings', '{"max_per_day": 3}', 'Notifications', 'Rate limits for admin broadcasts.'),
  ('auto_messages', '{"welcome_message": "Welcome to Haven Home Hub!"}', 'Notifications', 'Automated system greetings.'),

  -- Security
  ('roles_permissions', '{"allow_agent_signup": false}', 'Security', 'Global permission restrictions.'),
  ('admin_access', '{"ip_whitelist": []}', 'Security', 'Network restrictions for admin panel.'),
  ('session_controls', '{"timeout_minutes": 120}', 'Security', 'User session expiry duration.'),
  ('mfa_settings', '{"require_for_admin": true, "require_for_withdrawals": true}', 'Security', 'Multi-factor authentication rules.'),

  -- Integrations
  ('email_provider', '{"provider": "sendgrid", "api_key": "hidden"}', 'Integrations', 'SMTP / Email API configuration.'),
  ('sms_provider', '{"provider": "twilio", "api_key": "hidden"}', 'Integrations', 'SMS gateway configuration.'),
  ('maps_integration', '{"provider": "google", "api_key": "hidden"}', 'Integrations', 'Mapping service parameters.'),
  ('storage_integration', '{"provider": "supabase_s3", "bucket": "public"}', 'Integrations', 'File storage backend details.'),

  -- Investment Settings
  ('default_roi_settings', '{"min_roi": 8, "max_roi": 15}', 'Investment Settings', 'Global bounds for ROI calculations.'),
  ('default_lockup_period', '12', 'Investment Settings', 'Default lockup period in months.'),
  ('maturity_rules', '{"auto_liquidate": false}', 'Investment Settings', 'Rules for mature investments.'),
  ('secondary_market_controls', '{"enabled": true, "fee_percentage": 2.5}', 'Investment Settings', 'Secondary marketplace configuration.'),

  -- Referral Settings
  ('referral_reward_percentage', '5.0', 'Referral Settings', 'Default percentage reward for referrals.'),
  ('reward_rules', '{"payout_after_days": 30, "min_investment": 1000}', 'Referral Settings', 'Conditions for referral payouts.'),
  ('bonus_structures', '{"tier1": 5, "tier2": 7, "tier3": 10}', 'Referral Settings', 'Multi-tiered referral bonuses.')

ON CONFLICT (key) DO UPDATE 
SET 
  category = EXCLUDED.category,
  description = EXCLUDED.description;
