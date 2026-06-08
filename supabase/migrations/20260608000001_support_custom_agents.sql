-- Add assigned_agent_name to support_tickets
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS assigned_agent_name TEXT;
