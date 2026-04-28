REVOKE EXECUTE ON FUNCTION public.allocate_investment_units(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_investment_units(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_investment_units(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_investment_units(uuid, integer) TO service_role;