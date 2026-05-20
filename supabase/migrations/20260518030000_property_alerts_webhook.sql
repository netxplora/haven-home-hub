-- Trigger property-alerts edge function when a new property is created
CREATE OR REPLACE FUNCTION trigger_property_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- We use pg_net to call the Supabase Edge Function asynchronously
  -- Requires the pg_net extension to be enabled
  PERFORM net.http_post(
    url := current_setting('app.settings.edge_function_base_url') || '/property-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', row_to_json(NEW)
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Catch errors so the property insertion doesn't fail if the network request fails
  RAISE WARNING 'Failed to trigger property alerts: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_property_created_alert ON properties;
CREATE TRIGGER on_property_created_alert
  AFTER INSERT ON properties
  FOR EACH ROW
  EXECUTE FUNCTION trigger_property_alerts();
