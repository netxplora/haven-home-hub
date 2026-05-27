import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, ArrowUpRight, ShieldCheck, Clock, FileText, LayoutGrid, List, ChevronRight, Tag, RefreshCcw, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { InvestmentDetailDialog } from "@/components/dashboard/InvestmentDetailDialog";
import { SellUnitsDialog } from "@/components/dashboard/SellUnitsDialog";
import { formatMoney } from "@/lib/invest";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export function InvestmentsPanel() {
  const { user } = useAuth();
  const [selectedInvestment, setSelectedInvestment] = useState<any | null>(null);
  const [sellInvestment, setSellInvestment] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  
  const { data: investments = [] as any[], isLoading, refetch } = useQuery({
    queryKey: ["my-investments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_investments")
        .select(`
          *,
          investment_properties(
            title, 
            slug, 
            currency, 
            projected_return_min, 
            projected_return_max, 
            cover_image_url
          )
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching user investments:", error);
        return [];
      }
      return (data || []) as any[];
    },
  });

  const { data: returns = [] } = useQuery({
    queryKey: ["my-returns", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("returns")
        .select("amount_received, distribution_date, property_id, investment_properties(title)")
        .eq("user_id", user!.id)
        .order("distribution_date", { ascending: false });
      return data ?? [];
    },
  });

  const handleCancelInvestment = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCancellingId(id);
    try {
      const { error } = await supabase
        .from("user_investments")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      
      // Also cancel associated pending payments
      await supabase
        .from("payments")
        .update({ status: "cancelled", updated_at: new Date().toISOString() } as any)
        .eq("investment_id", id)
        .eq("status", "pending");

      toast({
        title: "Investment Cancelled",
        description: "Your investment commitment has been successfully cancelled."
      });
      refetch();
    } catch (err: any) {
      toast({
        title: "Cancellation Failed",
        description: err.message || "Failed to cancel investment.",
        variant: "destructive"
      });
    } finally {
      setCancellingId(null);
    }
  };

  const returnsByProperty = returns.reduce((acc: Record<string, number>, r: any) => {
    if (r.property_id) {
      acc[r.property_id] = (acc[r.property_id] || 0) + Number(r.amount_received || 0);
    }
    return acc;
  }, {});

  const activeInvestments = investments.filter((i: any) => ["confirmed", "active", "completed"].includes(i.status));
  const totalInvested = activeInvestments.reduce((s: number, i: any) => s + Number(i.amount_invested || 0), 0);
  const totalReturns = returns.reduce((s: number, r: any) => s + Number(r.amount_received || 0), 0);
  const activeCount = activeInvestments.length;

  const installmentInvestments = activeInvestments.filter((i: any) => i.investment_type === "installment");
  const totalOutstanding = installmentInvestments.reduce((s: number, i: any) => s + Number(i.remaining_balance ?? 0), 0);
  const nextDueInvestment = installmentInvestments
    .filter((i: any) => i.next_payment_due && i.status !== "completed")
    .sort((a: any, b: any) => new Date(a.next_payment_due).getTime() - new Date(b.next_payment_due).getTime())[0];

  if (isLoading) return (
    <div className="space-y-6">
       <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
       </div>
       <Skeleton className="h-96 rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-8 ">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-soft">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Total Invested</p>
          <p className="font-serif text-2xl font-semibold">{formatMoney(totalInvested)}</p>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
             <div className="h-1.5 w-1.5 rounded-full bg-primary" />
             {activeCount} Active Investments
          </div>
        </div>
        <div className="rounded-xl border border-primary/15 bg-card p-5 shadow-soft">
          <p className="text-xs font-medium uppercase tracking-wider text-primary mb-1">Total Returns</p>
          <p className="font-serif text-2xl font-semibold text-primary">{formatMoney(totalReturns)}</p>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-primary/60">
             <TrendingUp className="h-3.5 w-3.5" />
             Average Return: {totalInvested > 0 ? `+${((totalReturns / totalInvested) * 100).toFixed(1)}%` : "No data"}
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-soft">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Remaining Balance</p>
          <p className="font-serif text-2xl font-semibold text-amber-600">{formatMoney(totalOutstanding)}</p>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
             <Clock className="h-3.5 w-3.5" />
             {installmentInvestments.length} Installment Plans
          </div>
        </div>
      </div>

      {nextDueInvestment && (
        <div className="rounded-xl border border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/10 p-4 flex flex-wrap items-center justify-between gap-4">
           <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                  <Clock className="h-5 w-5" />
              </div>
              <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-amber-700/70 dark:text-amber-400/70">Next Payment</p>
                  <h4 className="font-serif text-base font-semibold text-foreground">{nextDueInvestment.investment_properties?.title}</h4>
              </div>
           </div>
           <div className="flex items-center gap-4">
              <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-0.5">Due {new Date(nextDueInvestment.next_payment_due).toLocaleDateString()}</p>
                  <p className="font-serif text-lg font-semibold">{formatMoney(Number(nextDueInvestment.monthly_installment_amount))}</p>
              </div>
              <Button size="sm" className="rounded-lg px-5 bg-primary hover:bg-primary/90 font-medium" onClick={() => setSelectedInvestment(nextDueInvestment)}>Pay Now</Button>
           </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
          <h3 className="font-serif text-xl font-semibold">My Investments</h3>
          <div className="flex items-center gap-3 bg-accent/50 p-1 rounded-xl">
             <Button variant="ghost" size="icon" onClick={() => refetch()} className="h-8 w-8 rounded-lg hover:bg-secondary/20">
                <RefreshCcw className="h-4 w-4" />
             </Button>
             <div className="h-4 w-px bg-border/60" />
             <Button 
               variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
               size="icon" 
               className="h-8 w-8 rounded-lg" 
               onClick={() => setViewMode('grid')}
             >
                <LayoutGrid className="h-4 w-4" />
             </Button>
             <Button 
               variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
               size="icon" 
               className="h-8 w-8 rounded-lg" 
               onClick={() => setViewMode('list')}
             >
                <List className="h-4 w-4" />
             </Button>
          </div>
        </div>

        {investments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-16 text-center bg-secondary/5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/50 mb-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="font-serif text-xl font-medium text-foreground">You have no investments yet</p>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">Start your investment journey by exploring our verified properties.</p>
            <Button asChild className="mt-8 rounded-xl px-8" size="lg">
              <Link to="/invest">Explore Properties</Link>
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
             {investments.map((inv: any) => (
                <InvestmentGridCard 
                  key={inv.id} 
                  investment={inv} 
                  dividends={returnsByProperty[inv.property_id]} 
                  onSelect={() => setSelectedInvestment(inv)} 
                />
             ))}
          </div>
        ) : (
          <div>
            {/* ── Mobile: Stackable Cards ── */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {investments.map((inv: any) => {
                const total = Number(inv.total_amount ?? inv.amount_invested ?? 0);
                const paid = Number(inv.amount_paid ?? inv.amount_invested ?? 0);
                const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100;
                const isInstallment = inv.investment_type === "installment";

                return (
                  <div
                    key={inv.id}
                    className="rounded-xl border border-border/40 bg-card p-4 shadow-soft space-y-4 active:bg-accent/30 transition-colors"
                    onClick={() => setSelectedInvestment(inv)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                        <img src={inv.investment_properties?.cover_image_url || "/placeholder.svg"} className="h-full w-full object-cover" alt="" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-serif font-semibold text-foreground line-clamp-1">{inv.investment_properties?.title ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{inv.units ?? 1} Units Owned</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`rounded-md px-2.5 py-1 text-[11px] font-bold capitalize ${isInstallment ? "border-amber-500/30 text-amber-600 bg-amber-500/5" : "border-primary/30 text-primary bg-primary/5"}`}>
                        {inv.investment_type || "Full Payment"}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "rounded-md px-2.5 py-1 text-[11px] font-bold capitalize border",
                          inv.status === "awaiting_payment" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                          inv.status === "payment_under_review" && "bg-blue-500/10 text-blue-600 border-blue-500/20",
                          inv.status === "pending" && "bg-secondary/10 text-secondary border-secondary/20",
                          inv.status === "rejected" && "bg-red-500/10 text-red-600 border-red-500/20",
                          inv.status === "cancelled" && "bg-destructive/10 text-destructive border-destructive/20",
                          (inv.status === "active" || inv.status === "confirmed") && "bg-primary text-primary-foreground border-none shadow-sm"
                        )}
                      >
                        {inv.status?.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium text-muted-foreground">
                        <span>Payment Progress</span>
                        <span className="font-bold text-foreground">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5 bg-accent" />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                      <div className="space-y-1">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-medium">Total Cost</p>
                          <p className="font-serif font-bold text-foreground">{formatMoney(total)}</p>
                        </div>
                        {returnsByProperty[inv.property_id] > 0 && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-medium">Dividends</p>
                            <p className="font-serif font-bold text-rose-600">
                              {formatMoney(returnsByProperty[inv.property_id], inv.investment_properties?.currency ?? "USD")}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {inv.status === "awaiting_payment" && (
                          <>
                            <Button size="sm" className="rounded-xl h-9 px-4 bg-primary text-primary-foreground font-bold shadow-sm" onClick={(e) => { e.stopPropagation(); setSelectedInvestment(inv); }}>
                              Pay Now
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="rounded-xl h-9 border-red-200 text-red-600 hover:bg-red-50 font-bold" 
                              onClick={(e) => handleCancelInvestment(e, inv.id)}
                              disabled={cancellingId === inv.id}
                            >
                              {cancellingId === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Cancel"}
                            </Button>
                          </>
                        )}
                        {(inv.status === "confirmed" || inv.status === "active") && paid < total && (
                          <Button size="sm" className="rounded-xl h-9 px-4 bg-primary text-primary-foreground font-bold shadow-sm" onClick={(e) => { e.stopPropagation(); setSelectedInvestment(inv); }}>
                            Pay Installment
                          </Button>
                        )}
                        {(inv.status === "active" || inv.status === "confirmed") && paid >= total && (
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="rounded-xl h-9 px-3 font-bold border-primary/30 text-primary hover:bg-primary/5" onClick={(e) => { e.stopPropagation(); setSellInvestment(inv); }}>
                              <Tag className="h-3.5 w-3.5 mr-1.5" /> Sell Units
                            </Button>
                          </div>
                        )}
                        {inv.status !== "awaiting_payment" && (
                          <Button variant="outline" size="sm" className="rounded-xl h-9 px-3 font-bold">
                            <FileText className="h-4 w-4 mr-1" /> Details
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop: Full Table ── */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-border/40 bg-card shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-accent/50 border-b border-border/40">
                      <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Property</th>
                      <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Plan Type</th>
                      <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Payment Progress</th>
                      <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">Total Cost</th>
                      <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {investments.map((inv: any) => {
                      const total = Number(inv.total_amount ?? inv.amount_invested ?? 0);
                      const paid = Number(inv.amount_paid ?? inv.amount_invested ?? 0);
                      const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100;
                      const isInstallment = inv.investment_type === "installment";

                      return (
                        <tr key={inv.id} className="transition-all duration-200 hover:bg-secondary/10 group cursor-pointer" onClick={() => setSelectedInvestment(inv)}>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                               <div className="h-10 w-10 rounded-xl overflow-hidden bg-muted group-hover:scale-105 transition-transform">
                                  <img src={inv.investment_properties?.cover_image_url || "/placeholder.svg"} className="h-full w-full object-cover" alt="" />
                               </div>
                               <div>
                                  <p className="font-semibold text-foreground line-clamp-1">{inv.investment_properties?.title ?? "Unknown"}</p>
                                  <p className="text-[10px] text-muted-foreground/60 font-medium">{inv.units ?? 1} Units Owned</p>
                               </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <Badge variant="outline" className={`rounded-md px-2 py-0.5 text-[10px] font-bold capitalize ${isInstallment ? "border-amber-500/30 text-amber-600 bg-amber-500/5" : "border-primary/30 text-primary bg-primary/5"}`}>
                              {inv.investment_type || "Full Payment"}
                            </Badge>
                          </td>
                          <td className="px-6 py-5">
                             <Badge 
                               variant="secondary"
                               className={cn(
                                 "rounded-md px-2 py-0.5 text-[10px] font-bold capitalize border",
                                 inv.status === "awaiting_payment" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                                 inv.status === "payment_under_review" && "bg-blue-500/10 text-blue-600 border-blue-500/20",
                                 inv.status === "pending" && "bg-secondary/10 text-secondary border-secondary/20",
                                 inv.status === "rejected" && "bg-red-500/10 text-red-600 border-red-500/20",
                                 inv.status === "cancelled" && "bg-destructive/10 text-destructive border-destructive/20",
                                 (inv.status === "active" || inv.status === "confirmed" || (inv.status === "confirmed" && paid >= total)) && "bg-primary text-primary-foreground border-none shadow-sm"
                               )}
                             >
                                {inv.status?.replace('_', ' ')}
                             </Badge>
                          </td>
                          <td className="px-6 py-5 min-w-[140px]">
                             <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                                   <span>{pct}% Paid</span>
                                </div>
                                <Progress value={pct} className="h-1 bg-accent" />
                             </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                             <p className="font-bold text-foreground">{formatMoney(total)}</p>
                             <p className="text-[10px] text-muted-foreground/60 font-medium">Expected: {inv.investment_properties?.projected_return_min}% p.a.</p>
                             {returnsByProperty[inv.property_id] > 0 && (
                               <p className="text-[10px] text-rose-600 font-bold mt-0.5">
                                 Dividends: {formatMoney(returnsByProperty[inv.property_id], inv.investment_properties?.currency ?? "USD")}
                               </p>
                             )}
                          </td>
                           <td className="px-6 py-5 text-right">
                             <div className="flex items-center gap-2 justify-end" onClick={e => e.stopPropagation()}>
                               {inv.status === "awaiting_payment" ? (
                                 <>
                                   <Button size="sm" className="rounded-xl h-9 px-4 bg-primary text-primary-foreground font-bold shadow-sm transition-all hover:scale-105 active:scale-95" onClick={() => setSelectedInvestment(inv)}>
                                     Pay Now
                                   </Button>
                                   <Button 
                                     size="sm" 
                                     variant="outline" 
                                     className="rounded-xl h-9 border-red-200 text-red-600 hover:bg-red-50 font-bold gap-1.5 transition-all" 
                                     onClick={(e) => handleCancelInvestment(e, inv.id)}
                                     disabled={cancellingId === inv.id}
                                   >
                                     {cancellingId === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                                     Cancel
                                   </Button>
                                 </>
                               ) : (inv.status === "confirmed" || inv.status === "active") && paid < total ? (
                                 <Button size="sm" className="rounded-xl h-9 px-4 bg-primary text-primary-foreground font-bold shadow-sm transition-all hover:scale-105 active:scale-95" onClick={() => setSelectedInvestment(inv)}>
                                   Pay Installment
                                 </Button>
                               ) : (inv.status === "active" || inv.status === "confirmed") && paid >= total ? (
                                  <>
                                    <Button size="sm" variant="outline" className="rounded-xl h-9 px-3 text-xs font-bold border-primary/30 text-primary hover:bg-primary/5 transition-all hover:scale-105 active:scale-95" onClick={() => setSellInvestment(inv)}>
                                      <Tag className="h-3 w-3 mr-1" /> Sell
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-secondary/10 hover:text-secondary transition-colors" onClick={() => setSelectedInvestment(inv)}>
                                       <FileText className="h-4 w-4" />
                                    </Button>
                                  </>
                               ) : (
                                 <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-secondary/10 hover:text-secondary transition-colors" onClick={() => setSelectedInvestment(inv)}>
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
        )}
      </div>

      <InvestmentDetailDialog 
        open={!!selectedInvestment} 
        onOpenChange={(open) => !open && setSelectedInvestment(null)} 
        investment={selectedInvestment} 
      />

      <SellUnitsDialog
        open={!!sellInvestment}
        onOpenChange={(open) => !open && setSellInvestment(null)}
        investment={sellInvestment}
      />
    </div>
  );
}

function InvestmentGridCard({ investment, dividends = 0, onSelect }: { investment: any, dividends?: number, onSelect: () => void }) {
  const total = Number(investment.total_amount ?? investment.amount_invested ?? 0);
  const paid = Number(investment.amount_paid ?? investment.amount_invested ?? 0);
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100;
  
  return (
    <div className="group rounded-xl border border-border/40 bg-card overflow-hidden shadow-soft transition-all duration-300 hover:shadow-card hover:border-primary/20" onClick={onSelect}>
       <div className="relative aspect-[16/9] overflow-hidden">
          <img src={investment.investment_properties?.cover_image_url || "/placeholder.svg"} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
          <div className="absolute top-4 right-4">
             <Badge className="bg-background/90 backdrop-blur-md text-foreground font-bold rounded-lg border-none">
                {investment.investment_type === 'installment' ? 'Installment' : 'Full Payment'}
             </Badge>
          </div>
       </div>
       <div className="p-6 space-y-4">
          <div>
             <h4 className="font-serif text-lg font-bold text-foreground line-clamp-1">{investment.investment_properties?.title}</h4>
             <p className="text-xs text-muted-foreground font-medium mt-1">Status: <span className="text-foreground capitalize">{investment.status}</span></p>
          </div>
          
          <div className="space-y-2">
             <div className="flex justify-between items-end">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Payment Progress</p>
                <p className="text-xs font-bold text-primary">{pct}%</p>
             </div>
             <Progress value={pct} className="h-1.5" />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
             <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Purchase Price</p>
                <p className="font-semibold text-sm">{formatMoney(total)}</p>
             </div>
             <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Expected Return</p>
                <p className="font-semibold text-sm text-green-600 dark:text-green-400">{investment.investment_properties?.projected_return_min}% p.a.</p>
             </div>
          </div>

          {dividends > 0 && (
             <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Dividends Received</span>
                <span className="font-bold text-yellow-600">{formatMoney(dividends, investment.investment_properties?.currency ?? "USD")}</span>
             </div>
          )}

          <Button variant="outline" className="w-full rounded-xl border-border/40 text-xs font-bold group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
             View Details
             <ChevronRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-1" />
          </Button>
       </div>
    </div>
  );
}
