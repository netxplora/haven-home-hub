INSERT INTO system_configs (key, value, category, description)
VALUES 
  ('site_name', '"Haven Home Hub"', 'general', 'The global name of the application, used in emails and branding.'),
  ('support_email', '"support@havenhomehub.com"', 'general', 'The default contact email for support.'),
  ('maintenance_mode_active', 'false', 'platform', 'Enable maintenance mode to temporarily disable public access to the platform.'),
  ('default_currency_symbol', '"$"', 'finance', 'The default currency symbol to use throughout the application.')
ON CONFLICT (key) DO NOTHING;
