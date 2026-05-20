-- Trigger message-notifications edge function when a new message is inserted
CREATE OR REPLACE FUNCTION trigger_message_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- We use pg_net to call the Supabase Edge Function asynchronously
  PERFORM net.http_post(
    url := current_setting('app.settings.edge_function_base_url') || '/message-notifications',
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
  RAISE WARNING 'Failed to trigger message notifications: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_created_notify ON messages;
CREATE TRIGGER on_message_created_notify
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_message_notifications();
