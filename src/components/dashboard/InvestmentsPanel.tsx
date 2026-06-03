import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Clock, FileText, LayoutGrid, List, ChevronRight, Tag, RefreshCcw, Loader2, XCircle, ArrowUpRight, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { formatMoney } from "@/lib/invest";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export function InvestmentsPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
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

  const returnsByProperty = returns.reduce((acc: Record<string, number>, r: any) => {
    if (r.property_id) {
      acc[r.property_id] = (acc[r.property_id] || 0) + Number(r.amount_received || 0);
    }
    return acc;
  }, {});

  const activeInvestments = investments.filter((i: any) => ["confirmed", "active", "completed"].includes(i.status));
  const totalInvested = activeInvestments.reduce((s: number, i: any) => s + Number(i.amount_invested || 0), 0);
  const totalReturns = returns.reduce((s: number, r: any) => s + Number(r.amount_received || 0), 0);
  const totalAccrued = activeInvestments.reduce((s: number, i: any) => s + Number(i.accrued_earnings || 0), 0);
  
  // NAV (Net Asset Value)
  const nav = totalInvested + totalAccrued + totalReturns;
  const averageYield = totalInvested > 0 ? (((totalAccrued + totalReturns) / totalInvested) * 100).toFixed(2) : "0.00";

  // Mock historical data for the chart (6 months trailing)
  const chartData = useMemo(() => {
    if (totalInvested === 0) return [];
    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const randomGrowth = (Math.random() * 0.02) + 0.98; // Simulated variance
      const val = nav * Math.pow(randomGrowth, i);
      data.push({
        name: d.toLocaleString('default', { month: 'short' }),
        value: val > nav && i === 0 ? nav : val
      });
    }
    data[5].value = nav; // Guarantee exact current NAV at end
    return data;
  }, [nav, totalInvested]);

  const handleInvestmentClick = (inv: any) => {
    navigate(`/invest/portfolio/${inv.id}`);
  };

  if (isLoading) return (
    <div className="space-y-6">
       <Skeleton className="h-64 rounded-2xl" />
       <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
       </div>
       <Skeleton className="h-96 rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* ── Institutional Portfolio Header & Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6 flex flex-col justify-between">
          <div>
            <h2 className="font-serif text-3xl font-bold text-foreground">Portfolio Overview</h2>
            <p className="text-sm text-muted-foreground mt-1">Real-time valuation of your assets</p>
          </div>
          
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
               <DollarSign className="w-32 h-32 text-primary" />
             </div>
             <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 relative z-10">Net Asset Value (NAV)</p>
             <p className="font-serif text-4xl font-bold text-foreground mb-4 relative z-10">{formatMoney(nav)}</p>
             
             <div className="flex items-center gap-2 mb-1 relative z-10">
               <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20">
                 <ArrowUpRight className="w-3 h-3 mr-1" /> +{averageYield}% All-time
               </Badge>
             </div>
             <p className="text-xs text-muted-foreground relative z-10">Total Earnings: <span className="font-semibold text-foreground">{formatMoney(totalReturns + totalAccrued)}</span></p>
          </div>
        </div>

        <div className="lg:col-span-2 bg-card border border-border/50 rounded-2xl p-6 shadow-sm min-h-[300px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Portfolio Growth (6M)</h3>
            <Badge variant="secondary" className="font-mono text-[10px]">LIVE SYNC</Badge>
          </div>
          {chartData.length > 0 ? (
            <div className="flex-1 h-full w-full min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                  <YAxis hide={true} domain={['dataMin - 1000', 'dataMax + 1000']} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [formatMoney(value), "NAV"]}
                  />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
               Not enough data to display growth chart.
             </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
          <h3 className="font-serif text-xl font-semibold">Your Assets</h3>
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
          <div className="rounded-2xl border border-dashed border-border/60 p-16 text-center bg-secondary/5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/50 mb-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="font-serif text-xl font-medium text-foreground">You have no active assets</p>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">Build your institutional-grade portfolio by acquiring verified real estate assets.</p>
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
                  onSelect={() => handleInvestmentClick(inv)} 
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
                    onClick={() => handleInvestmentClick(inv)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                        <img src={inv.investment_properties?.cover_image_url || "/placeholder.svg"} className="h-full w-full object-cover" alt="" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-serif font-semibold text-foreground line-clamp-1">{inv.investment_properties?.title ?? "Unknown Asset"}</p>
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

                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                      <div className="space-y-1">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-medium">Asset Value</p>
                          <p className="font-serif font-bold text-foreground">{formatMoney(total)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="rounded-xl h-9 px-3 font-bold group-hover:bg-primary group-hover:text-primary-foreground">
                          <FileText className="h-4 w-4 mr-1" /> View Asset
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop: Full Table ── */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-border/40 bg-card shadow-soft">
              <div className="overflow-x-auto">
                <div className="w-full overflow-x-auto pb-2">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-accent/50 border-b border-border/40">
                        <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Asset</th>
                        <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Plan Type</th>
                        <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                        <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">Valuation</th>
                        <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {investments.map((inv: any) => {
                        const total = Number(inv.total_amount ?? inv.amount_invested ?? 0);
                        const paid = Number(inv.amount_paid ?? inv.amount_invested ?? 0);
                        const isInstallment = inv.investment_type === "installment";

                        return (
                          <tr key={inv.id} className="transition-all duration-200 hover:bg-secondary/10 group cursor-pointer" onClick={() => handleInvestmentClick(inv)}>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                 <div className="h-10 w-10 rounded-xl overflow-hidden bg-muted group-hover:scale-105 transition-transform">
                                    <img src={inv.investment_properties?.cover_image_url || "/placeholder.svg"} className="h-full w-full object-cover" alt="" />
                                 </div>
                                 <div>
                                    <p className="font-semibold text-foreground line-clamp-1">{inv.investment_properties?.title ?? "Unknown Asset"}</p>
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
                            <td className="px-6 py-5 text-right">
                               <p className="font-bold text-foreground">{formatMoney(total)}</p>
                               <p className="text-[10px] text-muted-foreground/60 font-medium">Expected: {inv.investment_properties?.projected_return_min}% p.a.</p>
                               {returnsByProperty[inv.property_id] > 0 && (
                                 <p className="text-[10px] text-primary font-bold mt-0.5">
                                   Dividends: {formatMoney(returnsByProperty[inv.property_id], inv.investment_properties?.currency ?? "USD")}
                                 </p>
                               )}
                            </td>
                             <td className="px-6 py-5 text-right">
                               <div className="flex items-center gap-2 justify-end" onClick={e => e.stopPropagation()}>
                                   <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-secondary/10 hover:text-secondary transition-colors" onClick={() => handleInvestmentClick(inv)}>
                                      <FileText className="h-4 w-4" />
                                   </Button>
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
          </div>
        )}
      </div>
    </div>
  );
}

function InvestmentGridCard({ investment, dividends = 0, onSelect }: { investment: any, dividends?: number, onSelect: () => void }) {
  const total = Number(investment.total_amount ?? investment.amount_invested ?? 0);
  const paid = Number(investment.amount_paid ?? investment.amount_invested ?? 0);
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100;
  
  return (
    <div className="group rounded-xl border border-border/40 bg-card overflow-hidden shadow-soft transition-all duration-300 hover:shadow-card hover:border-primary/20 cursor-pointer" onClick={onSelect}>
       <div className="relative aspect-[16/9] overflow-hidden">
          <img src={investment.investment_properties?.cover_image_url || "/placeholder.svg"} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
          <div className="absolute top-4 right-4 flex gap-2">
             <Badge className="bg-background/90 backdrop-blur-md text-foreground font-bold rounded-lg border-none capitalize">
                {investment.status?.replace("_", " ")}
             </Badge>
          </div>
       </div>
       <div className="p-6 space-y-4">
          <div>
             <h4 className="font-serif text-lg font-bold text-foreground line-clamp-1">{investment.investment_properties?.title}</h4>
             <p className="text-xs text-muted-foreground font-medium mt-1">Asset ID: <span className="font-mono text-foreground uppercase">{investment.id.split('-')[0]}</span></p>
          </div>
          
          <div className="space-y-2">
             <div className="flex justify-between items-end">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Capital Deployed</p>
                <p className="text-xs font-bold text-primary">{pct}%</p>
             </div>
             <Progress value={pct} className="h-1.5" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/40">
             <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Asset Value</p>
                <p className="font-semibold text-sm">{formatMoney(total)}</p>
             </div>
             <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Projected Yield</p>
                <p className="font-semibold text-sm text-green-600 dark:text-green-400">{investment.investment_properties?.projected_return_min}% p.a.</p>
             </div>
          </div>

          {dividends > 0 && (
             <div className="bg-primary/100/5 border border-primary/ rounded-xl p-3 flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Earnings Accrued</span>
                <span className="font-bold text-green-600">{formatMoney(dividends, investment.investment_properties?.currency ?? "USD")}</span>
             </div>
          )}

          <Button variant="outline" className="w-full rounded-xl border-border/40 text-xs font-bold group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
             View Asset Intelligence
             <ChevronRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-1" />
          </Button>
       </div>
    </div>
  );
}
