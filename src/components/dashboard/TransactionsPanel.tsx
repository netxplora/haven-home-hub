import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { History, FileText, Filter, Search, TrendingUp, TrendingDown, RefreshCcw, XCircle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReceiptDialog } from "@/components/dashboard/ReceiptDialog";
import { formatMoney } from "@/lib/invest";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export function TransactionsPanel({ userId }: { userId: string }) {
  const [selectedReceiptPaymentId, setSelectedReceiptPaymentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 15;
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["transactions", userId, page, search],
    queryFn: async () => {
      let q = supabase
        .from("unified_user_transactions")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
        
      if (search) {
        q = q.or(`reference.ilike.%${search}%,payment_type.ilike.%${search}%,property_title.ilike.%${search}%,investment_property_title.ilike.%${search}%`);
      }
      
      const { data, count, error } = await q.range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (error) throw error;
      return { items: data || [], totalCount: count || 0 };
    },
  });

  const items = data?.items || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const { data: receiptData } = useQuery({
    queryKey: ["receipt", selectedReceiptPaymentId],
    queryFn: async () => {
      if (!selectedReceiptPaymentId) return null;
      const { data } = await (supabase as any).from("receipts").select("*").eq("payment_id", selectedReceiptPaymentId).single();
      return data;
    },
    enabled: !!selectedReceiptPaymentId,
  });

  const handleCancelPayment = async (paymentId: string) => {
    setCancellingId(paymentId);
    try {
      const { error } = await supabase.rpc("cancel_payment", {
        p_payment_id: paymentId
      });
      if (error) throw error;
      toast({
        title: "Transaction Cancelled",
        description: "Your pending transaction has been successfully cancelled and asset holds released."
      });
      refetch();
    } catch (err: any) {
      toast({
        title: "Cancellation Failed",
        description: err.message || "Failed to cancel transaction.",
        variant: "destructive"
      });
    } finally {
      setCancellingId(null);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(0); // Reset to first page on search
  };
  
  if (isLoading) return (
    <div className="space-y-4">
       {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
  );
  
  return (
    <div className="space-y-6 ">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between p-5 sm:p-8 rounded-xl border border-border/40 bg-card shadow-soft">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight">Financial Ledger</h2>
          <p className="mt-1 text-sm text-muted-foreground">Comprehensive record of all deposits, investments, and payouts.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search reference or description..." 
              className="pl-10 rounded-xl bg-accent/50 border-border/40 focus-visible:ring-primary/20"
              value={search}
              onChange={handleSearch}
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()} className="rounded-xl border-border/40 hover:bg-accent">
             <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-16 text-center bg-secondary/5">
           <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/50 mb-4">
              <History className="h-8 w-8 text-muted-foreground/40" />
           </div>
           <p className="font-serif text-xl font-medium text-foreground">No records found</p>
           <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">Try adjusting your search or filters to find what you're looking for.</p>
        </div>
      ) : (
        <>
          {/* ── Mobile Card Layout ── */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {items.map((t: any) => {
              const isIncome = ["deposit", "referral_bonus", "investment_return", "marketplace_sell"].includes(t.payment_type);
              const isPending = t.status === "pending";
              return (
                <div key={t.id} className="rounded-xl border border-border/40 bg-card p-5 shadow-soft space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isIncome ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                        {isIncome ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground capitalize text-sm">
                          {t.payment_type === "marketplace_buy" ? "Marketplace Purchase" :
                           t.payment_type === "marketplace_sell" ? "Marketplace Sale" :
                           t.payment_type ? t.payment_type.replace("_"," ") : "N/A"}
                        </p>
                        <p className="text-xs font-medium text-primary truncate max-w-[180px]">
                          {t.investment_property_title || t.property_title || 
                           (t.payment_type === 'referral_bonus' ? "Network Reward" : 
                            t.payment_type === 'investment_return' ? "Dividend Distribution" : 
                            t.payment_type === 'marketplace_buy' ? "Marketplace Purchase" :
                            t.payment_type === 'marketplace_sell' ? "Marketplace Sale" :
                            "Account Deposit")}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[10px] font-bold capitalize border shrink-0",
                        (t.status === "success" || t.status === "confirmed") ? "bg-primary text-primary-foreground border-none shadow-sm" : 
                        t.status === "failed" ? "bg-destructive/10 text-destructive border-destructive/20" : 
                        t.status === "cancelled" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                        "bg-secondary/10 text-secondary border-secondary/20"
                      )}
                    >
                      {t.status}
                    </Badge>

                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-3 border-t border-border/30">
                    <div>
                      <span className="block text-muted-foreground font-medium uppercase tracking-wider text-[10px] mb-0.5">Date</span>
                      <span className="font-semibold text-foreground">{new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div>
                      <span className="block text-muted-foreground font-medium uppercase tracking-wider text-[10px] mb-0.5">Method</span>
                      <span className="font-semibold text-foreground capitalize">{t.payment_method?.replace("_", " ") || "System"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/30">
                    <div>
                      <span className="text-[10px] text-muted-foreground/50 font-mono">Ref: {t.reference}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("text-base font-bold", isIncome ? "text-green-600 dark:text-green-400" : "text-foreground")}>
                        {isIncome ? "+" : "-"}{formatMoney(Number(t.amount), t.currency)}
                      </span>
                      {isPending && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-bold border-red-200 text-red-600 hover:bg-red-50/50"
                          onClick={() => handleCancelPayment(t.transaction_id)}
                          disabled={cancellingId === t.transaction_id}
                        >
                          {cancellingId === t.transaction_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Cancel"}
                        </Button>
                      )}
                      {!t.is_marketplace && !isPending && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={() => setSelectedReceiptPaymentId(t.transaction_id)}
                          title="View Receipt"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Desktop Table Layout ── */}
          <div className="overflow-hidden rounded-xl border border-border/40 bg-card shadow-soft hidden md:block">
            <div className="overflow-x-auto">
              <div className="w-full overflow-x-auto pb-2">
        <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-accent/50 border-b border-border/40">
                    <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Type & Description</th>
                    <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Method</th>
                    <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">Amount</th>
                    <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {items.map((t: any) => {
                    const isIncome = ["deposit", "referral_bonus", "investment_return", "marketplace_sell"].includes(t.payment_type);
                    const isPending = t.status === "pending";
                    return (
                      <tr key={t.transaction_id} className="transition-colors hover:bg-secondary/10 group">
                        <td className="px-6 py-5 text-muted-foreground font-medium">
                          {new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                             <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isIncome ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                                {isIncome ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                             </div>
                             <div>
                                <p className="font-semibold text-foreground capitalize">
                                  {t.payment_type === "marketplace_buy" ? "Marketplace Purchase" :
                                   t.payment_type === "marketplace_sell" ? "Marketplace Sale" :
                                   t.payment_type ? t.payment_type.replace("_"," ") : "N/A"}
                                </p>
                                <p className="text-[10px] font-bold text-primary truncate max-w-[150px]">
                                  {t.investment_property_title || t.property_title || 
                                   (t.payment_type === 'referral_bonus' ? "Network Reward" : 
                                    t.payment_type === 'investment_return' ? "Dividend Distribution" : 
                                    t.payment_type === 'marketplace_buy' ? "Marketplace Purchase" :
                                    t.payment_type === 'marketplace_sell' ? "Marketplace Sale" :
                                    "Account Deposit")}
                                </p>
                             </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                           <p className="font-medium text-muted-foreground capitalize">{t.payment_method?.replace("_", " ") || "System"}</p>
                           <p className="text-[10px] text-muted-foreground/50 font-mono">Ref: {t.reference}</p>
                        </td>
                        <td className="px-6 py-5">
                          <Badge 
                            className={cn(
                              "rounded-md px-2 py-0.5 text-[10px] font-bold capitalize border",
                              (t.status === "success" || t.status === "confirmed") ? "bg-primary text-primary-foreground border-none shadow-sm" : 
                              t.status === "failed" ? "bg-destructive/10 text-destructive border-destructive/20" : 
                              t.status === "cancelled" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                              "bg-secondary/10 text-secondary border-secondary/20"
                            )}
                          >
                            {t.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-5 text-right font-bold text-foreground">
                          <span className={isIncome ? "text-green-600 dark:text-green-400" : ""}>
                            {isIncome ? "+" : "-"}{formatMoney(Number(t.amount), t.currency)}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-2">
                            {isPending && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-bold border-red-200 text-red-600 hover:bg-red-50/50 gap-1.5"
                                onClick={() => handleCancelPayment(t.transaction_id)}
                                disabled={cancellingId === t.transaction_id}
                              >
                                {cancellingId === t.transaction_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                                Cancel Transaction
                              </Button>
                            )}
                            {!t.is_marketplace && !isPending && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                                onClick={() => setSelectedReceiptPaymentId(t.transaction_id)}
                                title="View Receipt"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-muted-foreground">
                Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} records
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-xs font-medium px-2">
                  Page {page + 1} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      
      <ReceiptDialog 
        open={!!selectedReceiptPaymentId} 
        onClose={() => setSelectedReceiptPaymentId(null)} 
        receipt={receiptData}
      />
    </div>
  );
}
