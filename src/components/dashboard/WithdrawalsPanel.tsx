import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowDownToLine, Clock, CheckCircle2, XCircle, AlertCircle, Wallet, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WithdrawalDialog } from "@/components/dashboard/WithdrawalDialog";
import { DepositDialog } from "@/components/dashboard/DepositDialog";
import { formatMoney } from "@/lib/invest";

export function WithdrawalsPanel({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  
  const { data: balance = 0, isLoading: isBalanceLoading, refetch: refetchBalance } = useQuery({
    queryKey: ["available-balance", userId],
    queryFn: async () => {
      const { data } = await supabase.rpc("user_available_balance");
      return Number(data ?? 0);
    },
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["withdrawals", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  function getStatusStyle(status: string) {
    switch (status) {
      case "completed": return "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400";
      case "rejected":
      case "failed": return "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400";
      case "pending": return "bg-secondary/10 text-secondary border-secondary/20";
      default: return "bg-accent text-accent-foreground";
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-3 w-3" />;
      case "rejected":
      case "failed": return <XCircle className="h-3 w-3" />;
      case "pending": return <Clock className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  }

  const completedTotal = items
    .filter(i => i.status === "completed")
    .reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const pendingCount = items.filter(i => i.status === "pending" || i.status === "processing").length;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 2x Grid Metrics on Mobile, 4 columns on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="rounded-2xl border border-border/70 bg-card p-3.5 sm:p-5 shadow-sm flex flex-col justify-between min-h-[120px] sm:min-h-[140px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">Available Balance</span>
            <span className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Wallet className="h-3.5 w-3.5 sm:h-4 w-4" />
            </span>
          </div>
          <div>
            <p className="font-serif text-base sm:text-2xl font-bold text-foreground tracking-tight">{formatMoney(balance)}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">Cleared for payout</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-3.5 sm:p-5 shadow-sm flex flex-col justify-between min-h-[120px] sm:min-h-[140px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">Total Paid Out</span>
            <span className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 w-4" />
            </span>
          </div>
          <div>
            <p className="font-serif text-base sm:text-2xl font-bold text-foreground tracking-tight">{formatMoney(completedTotal)}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">Disbursed funds</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-3.5 sm:p-5 shadow-sm flex flex-col justify-between min-h-[120px] sm:min-h-[140px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">Pending Review</span>
            <span className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="h-3.5 w-3.5 sm:h-4 w-4" />
            </span>
          </div>
          <div>
            <p className="font-serif text-base sm:text-2xl font-bold text-foreground tracking-tight">{pendingCount}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">In progress</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-3.5 sm:p-5 shadow-sm flex flex-col justify-between min-h-[120px] sm:min-h-[140px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">Total Requests</span>
            <span className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-xl bg-secondary/10 text-secondary shrink-0">
              <ArrowDownToLine className="h-3.5 w-3.5 sm:h-4 w-4" />
            </span>
          </div>
          <div>
            <p className="font-serif text-base sm:text-2xl font-bold text-foreground tracking-tight">{items.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">Lifetime payouts</p>
          </div>
        </div>
      </div>

      {/* Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 rounded-2xl border border-border/70 bg-card shadow-sm gap-4">
        <div>
          <h3 className="font-serif text-base sm:text-lg font-semibold text-foreground">Withdrawal Payouts</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-md">Withdrawal requests are processed within 24-48 hours via your preferred payout method.</p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            size="sm"
            className="flex-1 sm:flex-initial rounded-xl bg-primary text-primary-foreground h-10 px-5 font-semibold text-xs shadow-sm hover:bg-primary/90 disabled:opacity-50"
            disabled={balance <= 0 || isBalanceLoading}
            onClick={() => setOpen(true)}
          >
            <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
            Request Payout
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
           <h3 className="font-serif text-xl font-semibold">Payout History</h3>
           <Badge variant="secondary" className="rounded-lg px-3 py-1 font-bold">{items.length} Records</Badge>
        </div>

        {isLoading ? (
          <div className="space-y-3">
             {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-16 text-center bg-secondary/5">
             <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/50 mb-4">
                <Clock className="h-8 w-8 text-muted-foreground/40" />
             </div>
             <p className="font-serif text-xl font-medium text-foreground">No withdrawal history</p>
             <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">Your payout requests will appear here once you initiate your first withdrawal.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/40 bg-card shadow-soft">
            {/* ── Mobile Card Layout ── */}
            <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
              {items.map((w: any) => (
                <div key={w.id} className="rounded-xl border border-border/40 bg-card p-5 shadow-soft space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground capitalize text-sm">
                        {w.method === "crypto" ? "Digital Currency" : (w.method ? w.method.replace("_"," ") : "N/A")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(w.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <Badge className={`capitalize rounded-md flex w-fit items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold shrink-0 ${getStatusStyle(w.status)}`}>
                      {getStatusIcon(w.status)}
                      {w.status}
                    </Badge>
                  </div>

                  {w.rejection_reason && <p className="text-[10px] text-destructive/80 italic font-medium">Reason: {w.rejection_reason}</p>}

                  <div className="flex items-center justify-between pt-3 border-t border-border/30">
                    <span className="font-mono text-[10px] text-muted-foreground/60 bg-accent px-2 py-1 rounded-md">{w.transaction_reference ?? "Pending..."}</span>
                    <span className="text-base font-bold text-foreground">{formatMoney(Number(w.amount), w.currency)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Desktop Table Layout ── */}
            <div className="overflow-x-auto hidden md:block">
              <div className="w-full overflow-x-auto pb-2">
        <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-accent/50 border-b border-border/40">
                    <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Method</th>
                    <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Reference</th>
                    <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {items.map((w: any) => (
                    <tr key={w.id} className="transition-colors hover:bg-secondary/10 group">
                      <td className="px-6 py-5 text-muted-foreground font-medium">
                        {new Date(w.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-5">
                         <p className="font-semibold text-foreground capitalize">
                           {w.method === "crypto" ? "Digital Currency" : (w.method ? w.method.replace("_"," ") : "N/A")}
                         </p>
                      </td>
                      <td className="px-6 py-5">
                        <Badge className={`capitalize rounded-md flex w-fit items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold ${getStatusStyle(w.status)}`}>
                          {getStatusIcon(w.status)}
                          {w.status}
                        </Badge>
                        {w.rejection_reason && <p className="mt-1 text-[10px] text-destructive/80 italic font-medium">Reason: {w.rejection_reason}</p>}
                      </td>
                      <td className="px-6 py-5">
                         <span className="font-mono text-[10px] text-muted-foreground/60 bg-accent px-2 py-1 rounded-md">{w.transaction_reference ?? "Pending..."}</span>
                      </td>
                      <td className="px-6 py-5 text-right font-bold text-foreground">
                        {formatMoney(Number(w.amount), w.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
      </div>
            </div>
          </div>
        )}
      </div>
      <WithdrawalDialog open={open} onClose={() => setOpen(false)} available={balance} />
      <DepositDialog 
        open={depositOpen} 
        onClose={() => setDepositOpen(false)} 
        onSuccess={() => refetchBalance()} 
      />
    </div>
  );
}
