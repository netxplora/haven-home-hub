import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  status: string;
  bonus_earned: number;
  trigger_event: string | null;
  trigger_reference_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  referrer?: { full_name: string; email: string; avatar_url: string | null };
  referred?: { full_name: string; email: string; avatar_url: string | null };
  profiles?: { full_name: string; created_at: string };
}

export interface ReferralReward {
  id: string;
  user_id: string;
  referral_id: string | null;
  type: "credit" | "debit" | "withdrawal" | "adjustment";
  amount: number;
  balance_after: number;
  description: string | null;
  reference_id: string | null;
  status: string;
  created_at: string;
}

export interface ReferralStats {
  totalReferrals: number;
  activeInvestors: number;
  totalEarned: number;
  walletBalance: number;
  pendingRewards: number;
  conversionRate: number;
}

export function useReferrals(userId?: string) {
  const { user } = useAuth();
  const effectiveUserId = userId || user?.id;
  const queryClient = useQueryClient();

  // Fetch user's referral code
  const { data: profile } = useQuery({
    queryKey: ["referral-profile", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return null;
      const { data } = await supabase
        .from("profiles")
        .select("referral_code, referred_by")
        .eq("id", effectiveUserId)
        .single();
      return data;
    },
    enabled: !!effectiveUserId,
  });

  // Fetch referrals (people this user referred)
  const { data: referrals = [], isLoading: isLoadingReferrals } = useQuery({
    queryKey: ["user-referrals", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data } = await supabase
        .from("referrals" as any)
        .select(`
          *,
          profiles:referred_id(full_name, created_at)
        `)
        .eq("referrer_id", effectiveUserId)
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
    enabled: !!effectiveUserId,
  });

  // Fetch reward ledger
  const { data: rewards = [], isLoading: isLoadingRewards } = useQuery({
    queryKey: ["referral-rewards", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data } = await supabase
        .from("referral_rewards" as any)
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
    enabled: !!effectiveUserId,
  });

  // Compute stats
  const stats: ReferralStats = {
    totalReferrals: referrals.length,
    activeInvestors: referrals.filter(
      (r: any) => r.status === "paid" || r.status === "approved"
    ).length,
    totalEarned: rewards
      .filter((r: any) => r.type === "credit" && r.status === "completed")
      .reduce((sum: number, r: any) => sum + (r.amount || 0), 0),
    walletBalance: rewards
      .filter((r: any) => r.status === "completed")
      .reduce((sum: number, r: any) => {
        if (r.type === "credit" || r.type === "adjustment") return sum + (r.amount || 0);
        if (r.type === "debit" || r.type === "withdrawal") return sum - (r.amount || 0);
        return sum;
      }, 0),
    pendingRewards: referrals.filter(
      (r: any) => r.status === "pending_reward"
    ).length,
    conversionRate:
      referrals.length > 0
        ? Math.round(
            (referrals.filter(
              (r: any) =>
                r.status === "paid" ||
                r.status === "approved" ||
                r.status === "qualified"
            ).length /
              referrals.length) *
              100
          )
        : 0,
  };

  const referralCode = profile?.referral_code ?? "";
  const referralLink = referralCode
    ? `${window.location.origin}/auth?tab=signup&ref=${referralCode}`
    : "";

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  }

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["user-referrals"] });
    queryClient.invalidateQueries({ queryKey: ["referral-rewards"] });
    queryClient.invalidateQueries({ queryKey: ["referral-profile"] });
    queryClient.invalidateQueries({ queryKey: ["admin-referrals"] });
    queryClient.invalidateQueries({ queryKey: ["admin-referral-rewards"] });
  }

  return {
    referralCode,
    referralLink,
    referrals: referrals as Referral[],
    rewards: rewards as ReferralReward[],
    stats,
    profile,
    isLoading: isLoadingReferrals || isLoadingRewards,
    copyToClipboard,
    invalidateAll,
  };
}

// Admin-specific hook for the management center
export function useAdminReferrals() {
  const queryClient = useQueryClient();

  const { data: allReferrals = [], isLoading } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals" as any)
        .select(`
          *,
          referrer:referrer_id(full_name, email, avatar_url),
          referred:referred_id(full_name, email, avatar_url)
        `)
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const { data: allRewards = [] } = useQuery({
    queryKey: ["admin-referral-rewards"],
    queryFn: async () => {
      const { data } = await supabase
        .from("referral_rewards" as any)
        .select("*")
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const { data: auditLog = [] } = useQuery({
    queryKey: ["admin-referral-audit"],
    queryFn: async () => {
      const { data } = await supabase
        .from("referral_audit_log" as any)
        .select(`
          *,
          actor:actor_id(full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(100);
      return (data ?? []) as any[];
    },
  });

  // Compute admin stats
  const totalRewards = allReferrals.reduce(
    (acc: number, r: any) => acc + (r.bonus_earned || 0),
    0
  );
  const pendingCount = allReferrals.filter(
    (r: any) => r.status === "pending_reward"
  ).length;
  const flaggedCount = allReferrals.filter(
    (r: any) => r.status === "flagged"
  ).length;
  const paidCount = allReferrals.filter(
    (r: any) => r.status === "paid"
  ).length;
  const conversionRate =
    allReferrals.length > 0
      ? Math.round((paidCount / allReferrals.length) * 100)
      : 0;

  async function updateStatus(
    referralId: string,
    newStatus: string,
    notes?: string
  ) {
    const { error } = await supabase.rpc("admin_update_referral_status" as any, {
      p_referral_id: referralId,
      p_new_status: newStatus,
      p_notes: notes || null,
    });
    if (error) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
    toast({ title: "Status updated", description: `Referral marked as ${newStatus}.` });
    queryClient.invalidateQueries({ queryKey: ["admin-referrals"] });
    queryClient.invalidateQueries({ queryKey: ["admin-referral-audit"] });
    return true;
  }

  async function flagReferral(referralId: string, reason: string) {
    const { error } = await supabase.rpc("admin_flag_referral" as any, {
      p_referral_id: referralId,
      p_reason: reason,
    });
    if (error) {
      toast({
        title: "Flag failed",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
    toast({ title: "Referral flagged", description: "Marked for fraud review." });
    queryClient.invalidateQueries({ queryKey: ["admin-referrals"] });
    queryClient.invalidateQueries({ queryKey: ["admin-referral-audit"] });
    return true;
  }

  return {
    referrals: allReferrals,
    rewards: allRewards,
    auditLog,
    isLoading,
    stats: {
      total: allReferrals.length,
      totalRewards,
      pendingCount,
      flaggedCount,
      paidCount,
      conversionRate,
    },
    updateStatus,
    flagReferral,
  };
}
