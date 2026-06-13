-- Function to increment counters like impressions and clicks safely
CREATE OR REPLACE FUNCTION increment_counter(table_name text, column_name text, row_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow updates to specific tables and columns
  IF table_name = 'advertisements' AND column_name IN ('impressions', 'clicks') THEN
    EXECUTE format('UPDATE public.%I SET %I = COALESCE(%I, 0) + 1 WHERE id = $1', table_name, column_name, column_name)
    USING row_id;
  END IF;
END;
$$;
