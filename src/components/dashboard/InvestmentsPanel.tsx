import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, Clock, FileText, LayoutGrid, List, ChevronRight, 
  RefreshCcw, DollarSign, Calendar, ArrowUpRight, ShieldCheck, 
  BarChart3, Activity, Percent, ArrowRight, Table, Download, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/invest";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { DocumentViewerModal } from "@/components/dashboard/DocumentViewerModal";

export function InvestmentsPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  // ── Query 1: User investments list ──
  const { data: investments = [], isLoading: isInvestmentsLoading, refetch: refetchInvestments } = useQuery({
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
            cover_image_url,
            total_units,
            units_sold
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

  // ── Query 2: Portfolio Valuation Summary ──
  const { data: portfolioSummary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["portfolio-summary", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_investor_portfolio_summary", { p_user_id: user!.id });
      if (error) {
        console.error("Portfolio summary RPC error:", error);
        return null;
      }
      return data as any;
    },
  });

  // ── Query 3: Portfolio Growth History (Chart) ──
  const { data: chartData = [], isLoading: isChartLoading } = useQuery({
    queryKey: ["portfolio-growth", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_portfolio_growth_history", { p_user_id: user!.id });
      if (error) {
        console.error("Portfolio growth RPC error:", error);
        return [];
      }
      return (data || []).map((d: any) => ({
        name: d.month,
        value: Number(d.value || 0),
      }));
    },
  });

  // ── Query 4: Recent Portfolio Activity Logs ──
  const { data: recentActivity = [], isLoading: isActivityLoading } = useQuery({
    queryKey: ["portfolio-activity", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_audit_logs")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) return [];
      return data || [];
    },
  });

  // ── Query 5: Distributed Returns (ROI history) ──
  const { data: returns = [], isLoading: isReturnsLoading } = useQuery({
    queryKey: ["user-returns-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("returns")
        .select(`
          *,
          investment_properties:investment_property_id(title, currency)
        `)
        .eq("user_id", user!.id)
        .order("distribution_date", { ascending: false });
      if (error) {
        console.error("Error fetching returns:", error);
        return [];
      }
      return data || [];
    }
  });

  // ── Query 6: Investment-specific legal/verification documents ──
  const { data: documents = [], isLoading: isDocsLoading } = useQuery({
    queryKey: ["user-investment-documents-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_documents")
        .select(`
          *,
          investment_properties(title)
        `)
        .eq("user_id", user!.id)
        .not("investment_property_id", "is", null)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching investment documents:", error);
        return [];
      }
      return data || [];
    }
  });

  const isLoading = isInvestmentsLoading || isSummaryLoading || isChartLoading || isActivityLoading || isReturnsLoading || isDocsLoading;

  const handleRefetch = () => {
    refetchInvestments();
  };

  // Metrics from DB
  const nav = Number(portfolioSummary?.nav || 0);
  const totalInvested = Number(portfolioSummary?.total_invested || 0);
  const totalEarnings = Number(portfolioSummary?.total_earnings || 0);
  const averageYield = portfolioSummary?.roi_percent?.toString() || "0.00";
  const activeCount = Number(portfolioSummary?.active_investments || 0);
  const pendingCount = Number(portfolioSummary?.pending_investments || 0);
  const completedCount = Number(portfolioSummary?.completed_investments || 0);
  const totalUnits = Number(portfolioSummary?.total_units_owned || 0);

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
      {/* ── Center Header ── */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between p-5 sm:p-8 rounded-xl border border-border/40 bg-card shadow-soft">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">Investment Portfolio Center</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage your fractional assets, track returns, monitor upcoming maturities, and access certificates.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-lg px-4 py-1.5 font-bold text-sm bg-primary/10 text-primary">
            NAV: {formatMoney(nav)}
          </Badge>
          <Button variant="outline" size="icon" onClick={handleRefetch} className="rounded-xl border-border/40 hover:bg-accent h-9 w-9">
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-8">
        <TabsList className="bg-muted/50 p-1 border border-border/40 rounded-xl h-auto flex flex-wrap gap-1 w-fit">
          <TabsTrigger value="overview" className="rounded-lg px-4 py-2 text-xs font-bold gap-2">
            <BarChart3 className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="holdings" className="rounded-lg px-4 py-2 text-xs font-bold gap-2">
            <LayoutGrid className="h-3.5 w-3.5" /> Holdings ({investments.length})
          </TabsTrigger>
          <TabsTrigger value="roi" className="rounded-lg px-4 py-2 text-xs font-bold gap-2">
            <Percent className="h-3.5 w-3.5" /> ROI & Returns ({returns.length})
          </TabsTrigger>
          <TabsTrigger value="maturity" className="rounded-lg px-4 py-2 text-xs font-bold gap-2">
            <Clock className="h-3.5 w-3.5" /> Maturity Calendar
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-lg px-4 py-2 text-xs font-bold gap-2">
            <FileText className="h-3.5 w-3.5" /> Documents ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-lg px-4 py-2 text-xs font-bold gap-2">
            <Activity className="h-3.5 w-3.5" /> Activity
          </TabsTrigger>
        </TabsList>

        {/* ── 1. Overview Tab ── */}
        <TabsContent value="overview" className="space-y-8 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6 flex flex-col justify-between">
              <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <DollarSign className="w-32 h-32 text-primary" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Net Asset Value (NAV)</p>
                <p className="font-serif text-4xl font-bold text-foreground mb-4">{formatMoney(nav)}</p>
                
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20">
                    <ArrowUpRight className="w-3 h-3 mr-1" /> +{averageYield}% All-time
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Total Invested Capital: <span className="font-semibold text-foreground">{formatMoney(totalInvested)}</span></p>
                <p className="text-xs text-muted-foreground mt-1">Total Returns Received: <span className="font-semibold text-primary">{formatMoney(totalEarnings)}</span></p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Active Positions</p>
                  <p className="text-xl font-bold font-serif text-foreground">{activeCount}</p>
                </div>
                <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Awaiting Verification</p>
                  <p className="text-xl font-bold font-serif text-amber-600">{pendingCount}</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-card border border-border/50 rounded-2xl p-6 shadow-sm min-h-[300px] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Portfolio growth history (6M)</h3>
                <Badge variant="secondary" className="font-mono text-[10px]">LIVE DATA</Badge>
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
                   Not enough historical data to generate valuation graph.
                 </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── 2. Holdings Tab ── */}
        <TabsContent value="holdings" className="space-y-6 outline-none">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-base font-semibold">Active Holdings</h3>
            <div className="flex items-center gap-2 bg-accent/50 p-1 rounded-xl">
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
            <EmptyState message="No active holdings found" description="Build your institutional-grade portfolio by acquiring verified real estate assets." />
          ) : viewMode === 'grid' ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
               {investments.map((inv: any) => (
                  <InvestmentGridCard 
                    key={inv.id} 
                    investment={inv} 
                    onSelect={() => handleInvestmentClick(inv)} 
                  />
               ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/40 bg-card shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-accent/50 border-b border-border/40">
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Asset</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Acquisition</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Valuation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {investments.map((inv: any) => {
                      const total = Number(inv.total_amount ?? inv.amount_invested ?? 0);
                      const isInstallment = inv.investment_type === "installment";

                      return (
                        <tr key={inv.id} className="transition-all duration-200 hover:bg-secondary/10 group cursor-pointer" onClick={() => handleInvestmentClick(inv)}>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                               <div className="h-10 w-10 rounded-xl overflow-hidden bg-muted group-hover:scale-105 transition-transform shrink-0">
                                  <img src={inv.investment_properties?.cover_image_url || "/placeholder.svg"} loading="lazy" className="h-full w-full object-cover" alt="" />
                               </div>
                               <div>
                                  <p className="font-semibold text-foreground line-clamp-1">{inv.investment_properties?.title ?? "Unknown Asset"}</p>
                                  <p className="text-[10px] text-muted-foreground/60 font-medium">{inv.units_owned ?? 1} Units Owned</p>
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
                                 (inv.status === "active" || inv.status === "confirmed" || inv.status === "roi_active") && "bg-primary text-primary-foreground border-none shadow-sm"
                               )}
                             >
                                {inv.status?.replace('_', ' ')}
                             </Badge>
                          </td>
                          <td className="px-6 py-5 text-right font-medium text-xs">
                            {new Date(inv.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-5 text-right">
                             <p className="font-bold text-foreground">{formatMoney(total)}</p>
                             <p className="text-[10px] text-muted-foreground/60 font-medium">Yield: {inv.investment_properties?.projected_return_min}% p.a.</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── 3. ROI & Returns Tab ── */}
        <TabsContent value="roi" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total ROI Earned</p>
              <p className="text-3xl font-bold font-serif text-foreground">{formatMoney(totalEarnings)}</p>
              <p className="text-xs text-muted-foreground mt-2">Valued in USD equivalents</p>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Weighted Average Yield</p>
              <p className="text-3xl font-bold font-serif text-green-600">{averageYield}%</p>
              <p className="text-xs text-muted-foreground mt-2">Weighted average return per annum</p>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Distributions Processed</p>
              <p className="text-3xl font-bold font-serif text-foreground">{returns.length}</p>
              <p className="text-xs text-muted-foreground mt-2">Secured directly to available balance</p>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
            <h3 className="font-serif text-lg font-bold text-foreground mb-5 flex items-center gap-2">
              <Table className="h-5 w-5 text-primary" /> Return Distribution Ledger
            </h3>
            
            {returns.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground italic text-sm">
                No distributed returns recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-accent/40 border-b border-border/40">
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Property</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Distribution Date</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Reference ID</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground text-right">Amount Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {returns.map((ret: any) => (
                      <tr key={ret.id} className="hover:bg-accent/30 transition-colors">
                        <td className="px-4 py-3.5 font-medium text-foreground">
                          {ret.investment_properties?.title ?? "Investment Asset"}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                          {new Date(ret.distribution_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                          {ret.id.split('-')[0].toUpperCase()}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-green-600">
                          +{formatMoney(ret.amount_received, ret.investment_properties?.currency || "USD")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── 4. Maturity Calendar Tab ── */}
        <TabsContent value="maturity" className="space-y-6 outline-none">
          <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
            <h3 className="font-serif text-lg font-bold text-foreground mb-4">Maturity Dates</h3>
            <p className="text-sm text-muted-foreground mb-6">Overview of holding periods and scheduled capital return dates for your active holdings.</p>
            
            {investments.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground italic text-sm">
                No active holdings with schedules.
              </div>
            ) : (
              <div className="space-y-6">
                {investments.map((inv: any) => {
                  const hasStarted = !!inv.start_date;
                  const start = hasStarted ? new Date(inv.start_date) : null;
                  const end = inv.maturity_date ? new Date(inv.maturity_date) : null;
                  
                  let progress = 0;
                  if (start && end) {
                    const totalMs = end.getTime() - start.getTime();
                    const elapsedMs = new Date().getTime() - start.getTime();
                    progress = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));
                  }

                  const isAssetMatured = inv.status === 'matured' || (end && end.getTime() <= new Date().getTime());

                  return (
                    <div key={inv.id} className="p-5 border border-border/40 rounded-xl bg-card hover:border-primary/20 transition-all">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <div>
                          <h4 className="font-serif font-bold text-foreground text-base">{inv.investment_properties?.title}</h4>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {inv.id.split('-')[0].toUpperCase()}</p>
                        </div>
                        <Badge variant={isAssetMatured ? "default" : "outline"} className={isAssetMatured ? "bg-emerald-500 text-white" : "border-primary/20 text-primary"}>
                          {isAssetMatured ? "Matured" : `${progress}% Complete`}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs mb-4">
                        <div>
                          <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Start Date</span>
                          <span className="font-semibold">{start ? start.toLocaleDateString() : "Pending Activation"}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Maturity Date</span>
                          <span className="font-semibold text-amber-600">{end ? end.toLocaleDateString() : "Pending Activation"}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Holding Period</span>
                          <span className="font-semibold">{inv.investment_properties?.holding_period_months ?? 12} Months</span>
                        </div>
                      </div>

                      {hasStarted && !isAssetMatured && (
                        <div className="space-y-2">
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── 5. Documents Tab ── */}
        <TabsContent value="documents" className="space-y-6 outline-none">
          <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
            <h3 className="font-serif text-lg font-bold text-foreground mb-4">Investment Verification Certificates</h3>
            <p className="text-sm text-muted-foreground mb-6">Official digital deeds of assignment, fractional ownership confirmation, and legal trust certificates.</p>

            {documents.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground italic text-sm">
                No investment certificates generated yet. Documents appear once orders are fully confirmed.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {documents.map((doc: any) => (
                  <div key={doc.id} className="p-4 border border-border/40 rounded-xl bg-card hover:border-primary/20 transition-all flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="p-2 bg-primary/10 rounded-lg w-fit text-primary mb-2">
                        <FileText className="h-5 w-5" />
                      </div>
                      <h4 className="font-serif font-bold text-sm text-foreground">{doc.title || "Ownership Document"}</h4>
                      <p className="text-xs text-muted-foreground">{doc.investment_properties?.title}</p>
                      <p className="text-[10px] text-muted-foreground/60">Issued: {new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5" onClick={() => {
                        setPreviewDoc(doc);
                        setPreviewOpen(true);
                      }}>
                        <ExternalLink className="h-3.5 w-3.5" /> View / Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── 6. Activity Tab ── */}
        <TabsContent value="activity" className="space-y-6 outline-none">
          <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
            <h3 className="font-serif text-lg font-bold text-foreground mb-5 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Portfolio Operations log
            </h3>

            {recentActivity.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground italic text-sm">
                No operations history recorded.
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((log: any) => (
                  <div key={log.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/20 border border-border/30">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                      log.action_type === 'status_change' ? 'bg-blue-500/10 text-blue-600' :
                      log.action_type === 'create' ? 'bg-green-500/10 text-green-600' :
                      log.action_type === 'delete' ? 'bg-red-500/10 text-red-600' :
                      'bg-primary/10 text-primary'
                    )}>
                      {log.action_type === 'status_change' ? <Clock className="h-4 w-4" /> :
                       log.action_type === 'create' ? <TrendingUp className="h-4 w-4" /> :
                       <RefreshCcw className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground capitalize">
                        {log.action_type === 'status_change' ? `Asset status changed to ${log.new_value}` :
                         log.action_type === 'create' ? 'New position opened' :
                         log.action_type === 'update' ? `${(log.field_changed || '').replace(/_/g, ' ')} updated` :
                         log.action_type}
                      </p>
                      {log.old_value && log.new_value && log.action_type === 'update' && (
                        <p className="text-xs text-muted-foreground">{log.old_value} → {log.new_value}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      <DocumentViewerModal open={previewOpen} onOpenChange={setPreviewOpen} document={previewDoc} />
    </div>
  );
}

function InvestmentGridCard({ investment, onSelect }: { investment: any, onSelect: () => void }) {
  const total = Number(investment.total_amount ?? investment.amount_invested ?? 0);
  const paid = Number(investment.amount_paid ?? investment.amount_invested ?? 0);
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100;
  const accrued = Number(investment.accrued_earnings || 0);
  
  return (
    <div className="group rounded-xl border border-border/40 bg-card overflow-hidden shadow-soft transition-all duration-300 hover:shadow-card hover:border-primary/20 cursor-pointer" onClick={onSelect}>
       <div className="relative aspect-[16/9] overflow-hidden bg-accent">
          <img src={investment.investment_properties?.cover_image_url || "/placeholder.svg"} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
          <div className="absolute top-4 right-4 flex gap-2">
             <Badge className="bg-background/90 backdrop-blur-md text-foreground font-bold rounded-lg border-none capitalize">
                {investment.status?.replace("_", " ") || "Processing"}
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

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
             <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Asset Value</p>
                <p className="font-semibold text-sm">{formatMoney(total)}</p>
             </div>
             <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Projected Yield</p>
                <p className="font-semibold text-sm text-green-600 dark:text-green-400">{investment.investment_properties?.projected_return_min}% p.a.</p>
             </div>
          </div>

          {accrued > 0 && (
             <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Earnings Accrued</span>
                <span className="font-bold text-green-600">{formatMoney(accrued, investment.investment_properties?.currency ?? "USD")}</span>
             </div>
          )}

          <Button variant="outline" className="w-full rounded-xl border-border/40 text-xs font-bold group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
             View Asset Details
             <ChevronRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-1" />
          </Button>
       </div>
    </div>
  );
}

function EmptyState({ message, description }: { message: string, description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 p-16 text-center bg-card shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/50 mb-4">
        <TrendingUp className="h-8 w-8 text-muted-foreground/45" />
      </div>
      <p className="font-serif text-xl font-bold text-foreground">{message}</p>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>
      <Button asChild className="mt-8 rounded-xl px-8 shadow-sm font-bold" size="lg">
        <Link to="/invest">Explore Investments</Link>
      </Button>
    </div>
  );
}
