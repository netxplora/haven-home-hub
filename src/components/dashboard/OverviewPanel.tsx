import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, 
  ArrowUpRight, 
  Heart, 
  ClipboardList, 
  Bell, 
  Plus, 
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  RefreshCw,
  CalendarCheck,
  Handshake,
  PiggyBank,
  BarChart3,
  CircleDollarSign,
  Home,
  Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/invest";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  AreaChart,
  Area
} from "recharts";
import { useNotifications } from "@/hooks/useNotifications";

export function OverviewPanel({ userId, onNavigate }: { userId: string, onNavigate: (tab: string) => void }) {
  const { items, unread } = useNotifications();
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-overview-stats", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_investor_dashboard_summary", { p_user_id: userId });
      if (error) throw error;
      
      const summary = data as any;
      const investments = summary.investments;
      const reservations = summary.reservations;
      const returnsList = summary.returnsList || [];
      
      const returnsByMonth = returnsList.reduce((acc: any, curr: any) => {
        if (!curr.distribution_date) return acc;
        const date = new Date(curr.distribution_date);
        if (isNaN(date.getTime())) return acc;
        const month = date.toLocaleString('default', { month: 'short' });
        if (!acc[month]) acc[month] = 0;
        acc[month] += Number(curr.amount_received || 0);
        return acc;
      }, {});
      
      const chartData = Object.keys(returnsByMonth).map(month => ({
        name: month,
        Earnings: returnsByMonth[month]
      }));
      
      if (chartData.length === 0) {
        chartData.push({ name: "Start", Earnings: 0 });
      }

      return { 
        totalInvested: Number(investments.total_invested), 
        totalReturns: returnsList.reduce((acc: number, curr: any) => acc + curr.amount_received, 0), 
        availableBalance: Number(summary.availableBalance), 
        chartData, 
        activeReservationsCount: Number(reservations.active_count), 
        propertiesOwnedCount: Number(reservations.owned_count), 
        investmentCount: Number(investments.investment_count), 
        completedCount: Number(investments.completed_count) 
      };
    }
  });

  if (isLoading) return (
    <div className="space-y-8 animate-pulse">
      {/* KPI Cards Skeletons */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl border border-border/50 bg-card p-6 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3.5 w-40" />
          </div>
        ))}
      </div>

      {/* Chart + Sidebar Skeletons */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Chart Skeleton */}
        <div className="lg:col-span-3 rounded-xl border border-border/50 bg-card p-6 shadow-soft space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </div>

        {/* Sidebar Skeletons */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions Skeleton */}
          <div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft space-y-4">
            <Skeleton className="h-5 w-32 mb-2" />
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3.5 p-3.5">
                <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-4 shrink-0" />
              </div>
            ))}
          </div>

          {/* Recent Updates Skeleton */}
          <div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft space-y-4">
            <Skeleton className="h-5 w-36 mb-2" />
            {[1, 2, 3].map(i => (
              <div key={i} className="p-3 rounded-lg space-y-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const recentNotifications = items.filter(n => !n.read_at).slice(0, 3);

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Available Balance - Primary Focus */}
        <div className="sm:col-span-2 lg:col-span-1 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card p-5 sm:p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Available Balance</span>
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            <p className="font-serif text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{formatMoney(stats?.availableBalance ?? 0)}</p>
          </div>
          <Button size="sm" variant="outline" className="mt-4 h-8 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10 rounded-lg w-fit" onClick={() => onNavigate("withdrawals")}>
            Manage Funds <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>

        {/* Total Returns - Secondary Focus */}
        <div className="sm:col-span-2 lg:col-span-1 rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Returns</span>
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>
            <p className="font-serif text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{formatMoney(stats?.totalReturns ?? 0)}</p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 w-fit px-2.5 py-0.5 rounded-full">
            <ShieldCheck className="h-3.5 w-3.5" /> Verified distributions
          </div>
        </div>

        {/* Total Invested */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Portfolio Capital</span>
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <PiggyBank className="h-4 w-4" />
              </span>
            </div>
            <p className="font-serif text-2xl font-bold text-foreground tracking-tight">{formatMoney(stats?.totalInvested ?? 0)}</p>
          </div>
          <p className="mt-4 text-xs font-medium text-muted-foreground">
            {stats?.investmentCount ?? 0} Active · {stats?.completedCount ?? 0} Completed
          </p>
        </div>
        
        {/* Properties Owned */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Properties</span>
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Home className="h-4 w-4" />
              </span>
            </div>
            <p className="font-serif text-2xl font-bold text-foreground tracking-tight">{stats?.propertiesOwnedCount ?? 0}</p>
          </div>
          <p className="mt-4 text-xs font-medium text-muted-foreground flex items-center gap-1">
            {stats?.activeReservationsCount ?? 0} Pending reservations
          </p>
        </div>
      </div>

      {/* Chart + Sidebar */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Chart */}
        <div className="lg:col-span-3 rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
             <div>
                <h3 className="font-serif text-lg font-semibold text-foreground">Portfolio Earnings</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Historical monthly distributions overview</p>
             </div>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{fill: 'hsl(var(--muted-foreground))'}} dy={8} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} tick={{fill: 'hsl(var(--muted-foreground))'}} />
                <Tooltip 
                  cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}
                  itemStyle={{ fontWeight: '600', color: 'hsl(var(--primary))' }}
                />
                <Area type="monotone" dataKey="Earnings" stroke="hsl(var(--primary))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEarnings)" animationDuration={800} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions & Notifications */}
        <div className="lg:col-span-2 space-y-6">
           {/* Quick Actions */}
           <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm">
              <h3 className="font-serif text-base font-semibold text-foreground mb-4">Quick Actions</h3>
              <div className="space-y-2">
                 <button onClick={() => onNavigate("investments")} className="flex items-center gap-3.5 w-full p-3 rounded-xl hover:bg-muted/60 transition-colors text-left group">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                       <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="text-xs font-semibold text-foreground">Investments</h4>
                       <p className="text-[11px] text-muted-foreground truncate">Manage active portfolio</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                 </button>
                 <button onClick={() => onNavigate("my-properties")} className="flex items-center gap-3.5 w-full p-3 rounded-xl hover:bg-muted/60 transition-colors text-left group">
                    <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                       <ClipboardList className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="text-xs font-semibold text-foreground">Reservations</h4>
                       <p className="text-[11px] text-muted-foreground truncate">{stats?.activeReservationsCount ?? 0} active</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                 </button>
                 <button onClick={() => onNavigate("saved")} className="flex items-center gap-3.5 w-full p-3 rounded-xl hover:bg-muted/60 transition-colors text-left group">
                    <div className="h-9 w-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                       <Heart className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="text-xs font-semibold text-foreground">Saved Properties</h4>
                       <p className="text-[11px] text-muted-foreground truncate">Favorites & bookmarks</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                 </button>
              </div>
           </div>

           {/* Notifications */}
           <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm">
              <h3 className="font-serif text-base font-semibold text-foreground mb-4 flex items-center justify-between">
                 <span>Recent Updates</span>
                 {unread > 0 && <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-none">{unread} new</Badge>}
              </h3>
              <div className="space-y-2">
                 {recentNotifications.length > 0 ? recentNotifications.map(n => (
                    <div key={n.id} className="p-3 rounded-xl bg-muted/40 hover:bg-muted transition-colors cursor-pointer" onClick={() => onNavigate("notifications")}>
                       <p className="text-xs font-semibold text-foreground truncate">{n.title}</p>
                       <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{n.body}</p>
                    </div>
                 )) : (
                    <p className="text-xs text-muted-foreground py-3 text-center">Your dashboard is up to date.</p>
                 )}
              </div>
              <Button asChild variant="ghost" size="sm" className="w-full mt-3 h-8 text-xs font-semibold text-primary hover:bg-primary/10">
                 <Link to="?tab=notifications">View all updates</Link>
              </Button>
           </div>
         </div>
      </div>

      {/* Activity & Performance Panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Buyer Status Panel */}
        {(stats?.propertiesOwnedCount ?? 0) > 0 || (stats?.activeReservationsCount ?? 0) > 0 ? (
          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Home className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold text-foreground">Buyer Summary</h3>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Acquisition Status</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center gap-3">
                  <CalendarCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Completed Acquisitions</p>
                    <p className="text-[11px] text-muted-foreground">Properties owned and registered</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{stats?.propertiesOwnedCount ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center gap-3">
                  <Handshake className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Active Reservations</p>
                    <p className="text-[11px] text-muted-foreground">In progress with agents</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{stats?.activeReservationsCount ?? 0}</span>
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-2 h-8 text-xs font-semibold text-primary hover:bg-primary/10" onClick={() => onNavigate("my-properties")}>
                View all reservations <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        ) : null}

        {/* Investor Portfolio Panel */}
        {(stats?.investmentCount ?? 0) > 0 ? (
          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold text-foreground">Investment Metrics</h3>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Yield & Capital Return</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center gap-3">
                  <PiggyBank className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Total Invested Capital</p>
                    <p className="text-[11px] text-muted-foreground">Principal in active projects</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-foreground">{formatMoney(stats?.totalInvested ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center gap-3">
                  <CircleDollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Cumulative Earnings</p>
                    <p className="text-[11px] text-muted-foreground">Total returns received</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(stats?.totalReturns ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Realized Return</p>
                    <p className="text-[11px] text-muted-foreground">Returns relative to principal</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-primary">
                  {(stats?.totalInvested ?? 0) > 0 
                    ? `${(((stats?.totalReturns ?? 0) / (stats?.totalInvested ?? 1)) * 100).toFixed(1)}%`
                    : '0.0%'
                  }
                </span>
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-2 h-8 text-xs font-semibold text-primary hover:bg-primary/10" onClick={() => onNavigate("investments")}>
                View portfolio details <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
