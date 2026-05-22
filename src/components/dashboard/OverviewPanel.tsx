import React from "react";
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
  RefreshCw
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
      const [investmentsResponse, returnsResponse, balanceResponse, reservationsResponse, purchasesResponse] = await Promise.all([
        supabase.from("user_investments").select("amount_invested, total_amount, amount_paid").eq("user_id", userId),
        supabase.from("returns").select("amount_received, distribution_date").eq("user_id", userId).order("distribution_date", { ascending: true }),
        supabase.rpc("user_available_balance"),
        supabase.from("reservations").select("id").eq("user_id", userId).in("status", ["pending", "pending_review", "approved", "awaiting_reservation_fee", "under_admin_review", "information_requested"]),
        supabase.from("reservations").select("id").eq("user_id", userId).in("status", ["confirmed", "completed"])
      ]);
      
      const totalInvested = (investmentsResponse.data ?? []).reduce((acc, curr: any) => acc + Number(curr.total_amount ?? curr.amount_invested ?? 0), 0);
      const totalReturns = (returnsResponse.data ?? []).reduce((acc, curr) => acc + curr.amount_received, 0);
      const availableBalance = Number(balanceResponse.data ?? 0);
      
      const returnsByMonth = (returnsResponse.data ?? []).reduce((acc: any, curr) => {
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

      const activeReservationsCount = (reservationsResponse.data ?? []).length;
      const propertiesOwnedCount = (purchasesResponse.data ?? []).length;

      return { totalInvested, totalReturns, availableBalance, chartData, activeReservationsCount, propertiesOwnedCount };
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
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Properties Owned</p>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Heart className="h-4 w-4" />
            </span>
          </div>
          <p className="font-serif text-2xl font-semibold text-foreground">{stats?.propertiesOwnedCount ?? 0}</p>
          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
            <Heart className="h-3 w-3 text-emerald-600" /> Successfully acquired
          </p>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Invested</p>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/8 text-primary">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <p className="font-serif text-2xl font-semibold text-foreground">{formatMoney(stats?.totalInvested ?? 0)}</p>
          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-primary" /> Assets performing well
          </p>
        </div>
        
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Available Balance</p>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary/8 text-secondary">
              <RefreshCw className="h-4 w-4" />
            </span>
          </div>
          <p className="font-serif text-2xl font-semibold text-foreground">{formatMoney(stats?.availableBalance ?? 0)}</p>
          <Button size="sm" variant="ghost" className="mt-2 h-7 text-xs font-medium text-primary hover:bg-primary/5 px-2 -ml-2" onClick={() => onNavigate("withdrawals")}>
            Manage Funds <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Returns</p>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/8 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="font-serif text-2xl font-semibold text-foreground">{formatMoney(stats?.totalReturns ?? 0)}</p>
          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-primary" /> Payments processed securely
          </p>
        </div>
      </div>

      {/* Chart + Sidebar */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Chart */}
        <div className="lg:col-span-3 rounded-xl border border-border/50 bg-card p-6 shadow-soft">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-3">
             <div>
                <h3 className="font-serif text-lg font-semibold text-foreground">Portfolio Performance</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Monthly returns overview.</p>
             </div>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{fill: 'hsl(var(--muted-foreground))'}} dy={8} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} tick={{fill: 'hsl(var(--muted-foreground))'}} />
                <Tooltip 
                  cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                  contentStyle={{ borderRadius: '10px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', boxShadow: 'var(--shadow-card)', fontSize: '12px' }}
                  itemStyle={{ fontWeight: '600', color: 'hsl(var(--primary))' }}
                />
                <Area type="monotone" dataKey="Earnings" stroke="hsl(var(--primary))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEarnings)" animationDuration={1000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
           <div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft">
              <h3 className="font-serif text-base font-semibold text-foreground mb-5">Quick Actions</h3>
              <div className="space-y-2">
                 <button onClick={() => onNavigate("investments")} className="flex items-center gap-3.5 w-full p-3.5 rounded-lg hover:bg-accent transition-colors text-left group">
                    <div className="h-9 w-9 rounded-lg bg-primary/8 text-primary flex items-center justify-center shrink-0">
                       <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="text-sm font-medium text-foreground">Investments</h4>
                       <p className="text-xs text-muted-foreground">Manage your portfolio</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                 </button>
                 <button onClick={() => onNavigate("reservations")} className="flex items-center gap-3.5 w-full p-3.5 rounded-lg hover:bg-accent transition-colors text-left group">
                    <div className="h-9 w-9 rounded-lg bg-secondary/8 text-secondary flex items-center justify-center shrink-0">
                       <ClipboardList className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="text-sm font-medium text-foreground">Reservations</h4>
                       <p className="text-xs text-muted-foreground">{stats?.activeReservationsCount} active</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                 </button>
                 <button onClick={() => onNavigate("saved")} className="flex items-center gap-3.5 w-full p-3.5 rounded-lg hover:bg-accent transition-colors text-left group">
                    <div className="h-9 w-9 rounded-lg bg-primary/8 text-primary flex items-center justify-center shrink-0">
                       <Heart className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="text-sm font-medium text-foreground">Saved Properties</h4>
                       <p className="text-xs text-muted-foreground">Quick access</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                 </button>
              </div>
           </div>

           {/* Notifications */}
           <div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft">
              <h3 className="font-serif text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                 Recent Updates
                 {unread > 0 && <span className="h-2 w-2 rounded-full bg-primary" />}
              </h3>
              <div className="space-y-2.5">
                 {recentNotifications.length > 0 ? recentNotifications.map(n => (
                    <div key={n.id} className="p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors cursor-pointer" onClick={() => onNavigate("notifications")}>
                       <p className="text-xs font-medium text-foreground line-clamp-1">{n.title}</p>
                       <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{n.body}</p>
                    </div>
                 )) : (
                    <p className="text-xs text-muted-foreground py-3 text-center">Your dashboard is up to date.</p>
                 )}
              </div>
              <Button asChild variant="ghost" size="sm" className="w-full mt-4 h-8 text-xs font-medium text-primary hover:bg-primary/5">
                 <Link to="?tab=notifications">View all updates</Link>
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
}
