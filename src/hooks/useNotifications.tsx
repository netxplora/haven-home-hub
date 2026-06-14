import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  action_url?: string | null;
  category?: string | null;
  priority?: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export function useNotifications(page: number = 0, category: string = "all", pageSize: number = 15) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", user?.id, page, category],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("notifications")
        .select("*", { count: "exact" })
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (category === "finances") {
        q = q.in("type", ["investment", "investment_confirmed", "withdrawal", "payment_confirmed", "reservation", "booking_confirmed"]);
      } else if (category === "security") {
        q = q.in("type", ["kyc"]);
      }

      const { data, count, error } = await q.range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (error) throw error;
      return { items: (data ?? []) as Notification[], totalCount: count || 0 };
    },
  });

  const items = query.data?.items ?? [];
  const totalCount = query.data?.totalCount ?? 0;
  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
           qc.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);


  async function markRead(id: string) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
  }

  async function markAllRead() {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  }

  return { 
    items, 
    unread, 
    isLoading: query.isLoading, 
    markRead, 
    markAllRead,
    totalCount,
    pageSize
  };
}
