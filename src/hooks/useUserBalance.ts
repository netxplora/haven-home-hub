import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useUserBalance() {
  const { user } = useAuth();

  const { data: balance = 0, isLoading, refetch } = useQuery({
    queryKey: ["user-available-balance", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data, error } = await supabase.rpc("user_available_balance");
      if (error) {
        console.error("Error fetching available balance:", error);
        return 0;
      }
      return Number(data || 0);
    },
    enabled: !!user,
    staleTime: 1000 * 30, // 30 seconds
  });

  return {
    balance,
    isLoading,
    refetch,
  };
}
