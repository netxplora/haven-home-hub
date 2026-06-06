-- Trigger support-notifications edge function when a ticket or message changes
-- Created: 2026-06-06

CREATE OR REPLACE FUNCTION trigger_support_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- We use pg_net to call the Supabase Edge Function asynchronously
  PERFORM net.http_post(
    url := current_setting('app.settings.edge_function_base_url') || '/support-notifications',
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
  RAISE WARNING 'Failed to trigger support notifications: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for tickets
DROP TRIGGER IF EXISTS on_support_ticket_change_notify ON public.support_tickets;
CREATE TRIGGER on_support_ticket_change_notify
  AFTER INSERT OR UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_support_notifications();

-- Trigger for messages
DROP TRIGGER IF EXISTS on_support_message_created_notify ON public.support_messages;
CREATE TRIGGER on_support_message_created_notify
  AFTER INSERT ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_support_notifications();
