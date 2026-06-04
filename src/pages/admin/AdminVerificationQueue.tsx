import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/invest";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AdminVerificationQueue() {
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ["admin-verification-queue"],
    queryFn: async () => {
      const results: any[] = [];

      // 1. Fetch pending user_investments
      const { data: invs } = await supabase
        .from("user_investments")
        .select("*, investment_properties(title, currency), profiles(full_name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (invs) {
        invs.forEach(i => results.push({
          id: i.id,
          type: "investment",
          label: "Fractional Investment",
          user: i.profiles?.full_name || i.user_id,
          date: i.created_at,
          amount: i.total_amount || i.amount_invested,
          currency: i.investment_properties?.currency || "USD",
          context: i.investment_properties?.title,
          raw: i
        }));
      }

      // 2. Fetch pending generic payments (includes reservations, installments, etc)
      // If we have a generic payments table with pending items
      const { data: pays } = await (supabase as any)
        .from("payments")
        .select("*, profiles(full_name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
        
      if (pays) {
        pays.forEach((p: any) => results.push({
          id: p.id,
          type: p.payment_type || "payment",
          label: (p.payment_type || "payment").replace("_", " ").toUpperCase(),
          user: p.profiles?.full_name || p.user_id,
          date: p.created_at,
          amount: p.amount,
          currency: p.currency || "USD",
          context: p.provider ? `Provider: ${p.provider}` : "",
          raw: p
        }));
      }

      // Sort combined by date
      return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  });

  const handleVerify = async (item: any) => {
    try {
      if (item.type === "investment") {
        const { data: session } = await supabase.auth.getSession();
        const adminId = session.session?.user.id;
        const { error } = await (supabase.rpc as any)("verify_investment", { 
            p_investment_id: item.id,
            p_admin_id: adminId
        });
        if (error) {
          if (error.message.includes("function verify_investment") && error.message.includes("does not exist")) {
             const { error: fallbackError } = await (supabase.rpc as any)("verify_investment", { p_investment_id: item.id });
             if (fallbackError) throw fallbackError;
          } else {
             throw error;
          }
        }
        toast({ title: "Investment Verified", description: "Certificate has been issued successfully." });
      } else {
        // Generic payment verification
        const { error } = await (supabase.from("payments") as any).update({ status: "success" }).eq("id", item.id);
        if (error) throw error;
        
        if (item.type === "reservation") {
          const reservationId = item.raw.reservation_id || item.raw.target_id;
          if (reservationId) {
            await (supabase as any).rpc("approve_reservation", { p_reservation_id: reservationId });
          }
        } else if (item.type === "purchase") {
          await (supabase as any).rpc("complete_property_purchase", { p_payment_id: item.id });
        } else if (item.type === "property") {
          const propertyId = item.raw.property_id;
          if (propertyId) {
            // Update property status to sold (or rented if rental)
            const { data: prop } = await supabase.from("properties").select("property_type").eq("id", propertyId).single();
            const newStatus = prop?.property_type === "rent" ? "rented" : "sold";
            await supabase.from("properties").update({ status: newStatus }).eq("id", propertyId);
            
            // Sync user's reservation to completed
            if (item.raw.user_id) {
              await supabase.from("reservations").update({ status: "completed" as any }).eq("related_id", propertyId).eq("user_id", item.raw.user_id);
            }
          }
        } else if (item.type === "installment") {
          // Assume installment table updates if needed
        }
        
        toast({ title: "Payment Verified", description: "Transaction has been marked as success." });
      }
      
      qc.invalidateQueries({ queryKey: ["admin-verification-queue"] });
      // Also invalidate related queries
      qc.invalidateQueries({ queryKey: ["admin-investments"] });
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
      qc.invalidateQueries({ queryKey: ["admin-reservations"] });
    } catch (e: any) {
      toast({ title: "Verification Failed", description: e.message, variant: "destructive" });
    }
  };

  const handleReject = async (item: any) => {
    try {
      if (item.type === "investment") {
        const { error } = await supabase.rpc("reject_investment", {
          p_investment_id: item.id,
          p_reason: "Rejected by administrator during verification."
        });
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("payments") as any).update({ status: "failed" }).eq("id", item.id);
        if (error) throw error;
        
        if (item.type === "reservation") {
          const reservationId = item.raw.reservation_id || item.raw.target_id;
          if (reservationId) {
            await (supabase.from("reservations") as any).update({ status: "cancelled" }).eq("id", reservationId);
          }
        }
      }
      toast({ title: "Rejected", description: "The transaction has been rejected/cancelled." });
      qc.invalidateQueries({ queryKey: ["admin-verification-queue"] });
    } catch (e: any) {
      toast({ title: "Rejection Failed", description: e.message, variant: "destructive" });
    }
  };

  const filtered = queue.filter(item => {
    if (filterType !== "all" && item.type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return item.user?.toLowerCase().includes(q) || item.context?.toLowerCase().includes(q) || item.label?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by user or context..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl border-border/50 bg-background/50 focus:bg-background"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] rounded-xl border-border/50">
              <SelectValue placeholder="Filter type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="investment">Investments</SelectItem>
              <SelectItem value="reservation">Reservations</SelectItem>
              <SelectItem value="installment">Installments</SelectItem>
              <SelectItem value="payment">General Payments</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
        {/* ── Mobile Card Layout ── */}
        <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-3 opacity-20" />
              No pending verifications. Queue is clear!
            </div>
          ) : (
            filtered.map((item) => (
              <div key={item.id} className="rounded-xl border border-border/40 bg-card p-5 shadow-soft space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{item.user}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(item.date).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize text-[10px] bg-background shrink-0">
                    {item.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-3 border-t border-border/30">
                  <div>
                    <span className="block text-muted-foreground font-medium uppercase tracking-wider text-[10px] mb-0.5">Context</span>
                    <span className="font-semibold text-foreground">{item.context || "N/A"}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-muted-foreground font-medium uppercase tracking-wider text-[10px] mb-0.5">Amount</span>
                    <span className="font-mono font-bold text-primary">{formatMoney(Number(item.amount), item.currency)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-border/30">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-11 rounded-lg text-destructive border-destructive/20 hover:bg-destructive/10 font-bold"
                    onClick={() => handleReject(item)}
                  >
                    <XCircle className="h-4 w-4 mr-1.5" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-11 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold"
                    onClick={() => handleVerify(item)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1.5" /> Verify
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Desktop Table Layout ── */}
        <div className="overflow-x-auto hidden md:block">
          <div className="w-full overflow-x-auto pb-2">
        <table className="w-full text-sm text-left">
            <thead className="bg-secondary/40 border-b border-border/50">
              <tr>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Date</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">User</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Transaction Type</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Context</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground text-right whitespace-nowrap">Amount</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-40" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="p-4"><Skeleton className="h-8 w-32 ml-auto" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-3 opacity-20" />
                    No pending verifications. Queue is clear!
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-secondary/20">
                    <td className="p-4 text-xs whitespace-nowrap">
                      {new Date(item.date).toLocaleString()}
                    </td>
                    <td className="p-4 font-medium">
                      {item.user}
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="capitalize text-[10px] bg-background">
                        {item.label}
                      </Badge>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {item.context || "N/A"}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-primary whitespace-nowrap">
                      {formatMoney(Number(item.amount), item.currency)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg text-destructive border-destructive/20 hover:bg-destructive/10"
                          onClick={() => handleReject(item)}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 rounded-lg bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleVerify(item)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Verify
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
      </div>
        </div>
      </div>
    </div>
  );
}
