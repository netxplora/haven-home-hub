import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { History, FileText, Download, Filter, Search, TrendingUp, TrendingDown, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReceiptDialog } from "@/components/dashboard/ReceiptDialog";
import { formatMoney } from "@/lib/invest";
import { cn } from "@/lib/utils";

export function TransactionsPanel({ userId }: { userId: string }) {
  const [selectedReceiptPaymentId, setSelectedReceiptPaymentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  
  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["transactions", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select(`
          *,
          properties(title),
          investment_properties(title)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: receiptData } = useQuery({
    queryKey: ["receipt", selectedReceiptPaymentId],
    queryFn: async () => {
      if (!selectedReceiptPaymentId) return null;
      const { data } = await (supabase as any).from("receipts").select("*").eq("payment_id", selectedReceiptPaymentId).single();
      return data;
    },
    enabled: !!selectedReceiptPaymentId,
  });

  const filteredItems = items.filter(t => 
    (t.payment_type || "").toLowerCase().includes(search.toLowerCase()) ||
    (t.reference || "").toLowerCase().includes(search.toLowerCase()) ||
    (t.investment_properties?.title || t.properties?.title || "").toLowerCase().includes(search.toLowerCase())
  );
  
  if (isLoading) return (
    <div className="space-y-4">
       {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
  );
  
  return (
    <div className="space-y-6 ">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between p-8 rounded-xl border border-border/40 bg-card shadow-soft">
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
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()} className="rounded-xl border-border/40 hover:bg-accent">
             <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-16 text-center bg-secondary/5">
           <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/50 mb-4">
              <History className="h-8 w-8 text-muted-foreground/40" />
           </div>
           <p className="font-serif text-xl font-medium text-foreground">No records found</p>
           <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">Try adjusting your search or filters to find what you're looking for.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/40 bg-card shadow-soft">
          <div className="overflow-x-auto">
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
                {filteredItems.map((t: any) => {
                  const isIncome = ["deposit", "referral_bonus", "investment_return"].includes(t.payment_type);
                  return (
                    <tr key={t.id} className="transition-colors hover:bg-secondary/10 group">
                      <td className="px-6 py-5 text-muted-foreground font-medium">
                        {new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                           <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isIncome ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                              {isIncome ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                           </div>
                           <div>
                              <p className="font-semibold text-foreground capitalize">{t.payment_type ? t.payment_type.replace("_"," ") : "N/A"}</p>
                              <p className="text-[10px] font-bold text-primary truncate max-w-[150px]">
                                {t.investment_properties?.title || t.properties?.title || (t.payment_type === 'referral_bonus' ? "Network Reward" : t.payment_type === 'investment_return' ? "Dividend Distribution" : "Account Deposit")}
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
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={() => setSelectedReceiptPaymentId(t.id)}
                          title="View Receipt"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <ReceiptDialog 
        open={!!selectedReceiptPaymentId} 
        onClose={() => setSelectedReceiptPaymentId(null)} 
        receipt={receiptData}
      />
    </div>
  );
}
