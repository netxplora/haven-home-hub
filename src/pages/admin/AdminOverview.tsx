import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Users, TrendingUp, Briefcase, Banknote, MessageSquare, Calendar, MapPin, ClipboardList, Fingerprint, ArrowDownToLine, CreditCard, Layers, ShieldAlert } from "lucide-react";
import { formatMoney } from "@/lib/invest";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";

export function AdminOverview() {
  const { data } = useQuery({
    queryKey: ["admin-dashboard-summary"],
    queryFn: async () => {
      const { data: result, error } = await supabase.rpc("get_admin_dashboard_summary");
      if (error) throw error;
      return result as any;
    }
  });

  const counts = data?.counts;
  const lifecycleStats = data?.lifecycle;
  const installmentStats = data?.installments;
  const revenueStats = data?.revenue;

  const tiles = [
    { icon: Building2, label: "Properties Listed", value: String(counts?.properties ?? "—") },
    { icon: TrendingUp, label: "Investment Properties", value: String(counts?.investments ?? "—") },
    { icon: Users, label: "Total Users", value: String(counts?.users ?? "—") },
    { icon: Briefcase, label: "Active Agents", value: String(counts?.agents ?? "—") },
    { icon: MessageSquare, label: "New Inquiries", value: String(counts?.inquiries ?? "—") },
    { icon: Calendar, label: "Pending Viewings", value: String(counts?.bookings ?? "—") },
    { icon: ClipboardList, label: "Pending Reservations", value: String(counts?.reservations ?? "—") },
    { icon: Fingerprint, label: "Identity Verification", value: String(counts?.kycPending ?? "—") },
    { icon: ClipboardList, label: "Pending Verifications", value: String(counts?.pendingVerifications ?? "—") },
    { icon: Building2, label: "Issued Certificates", value: String(counts?.issuedCertificates ?? "—") },
    { icon: ArrowDownToLine, label: "Pending Withdrawals", value: String(counts?.pendingWithdrawals ?? "—") },
    { icon: CreditCard, label: "Pending Payments", value: String(counts?.pendingPayments ?? "—") },
    { icon: MapPin, label: "Locations", value: String(counts?.locations ?? "—") },
  ];

  // Recent audit logs
  const { data: auditLogs } = useQuery({
    queryKey: ["admin-recent-audit-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("portfolio_audit_logs")
        .select("id, action_type, field_changed, old_value, new_value, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(3);
      return data ?? [];
    }
  });

  const maxMonthly = Math.max(...(revenueStats?.monthlyData ?? []).map((m: any) => m.total), 1);

  return (
    <div className="space-y-8">
      {/* Financial headline cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-soft">
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1">Total Funding Raised</p>
          <p className="text-2xl font-serif font-bold text-foreground">{formatMoney(lifecycleStats?.totalRaised ?? 0)}</p>
          <p className="text-xs text-muted-foreground mt-2">Capital deployed on assets</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-soft">
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1">Average Projected ROI</p>
          <p className="text-2xl font-serif font-bold text-green-600">{lifecycleStats?.averageROI ?? "0.00"}% p.a.</p>
          <p className="text-xs text-muted-foreground mt-2">Target portfolio yield</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-soft">
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1">Total Units Sold</p>
          <p className="text-2xl font-serif font-bold text-foreground">{lifecycleStats?.totalUnitsSold ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-2">Fractional ownership units</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-soft">
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1">Total Investors</p>
          <p className="text-2xl font-serif font-bold text-foreground">{lifecycleStats?.totalInvestors ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-2">Distinct verified users</p>
        </div>
      </div>

      {/* Campaign and Maturity counts subrow */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 bg-secondary/15 p-4 rounded-xl border">
        <div className="text-center">
          <p className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground mb-0.5">Active Campaigns</p>
          <p className="font-serif font-bold text-foreground text-lg">{lifecycleStats?.activeCampaigns ?? 0}</p>
        </div>
        <div className="text-center border-l border-border/40">
          <p className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground mb-0.5">ROI Active Properties</p>
          <p className="font-serif font-bold text-foreground text-lg">{lifecycleStats?.roiActiveProperties ?? 0}</p>
        </div>
        <div className="text-center border-l border-border/40">
          <p className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground mb-0.5">Maturing Investments</p>
          <p className="font-serif font-bold text-primary text-lg">{lifecycleStats?.maturingInvestments ?? 0}</p>
        </div>
        <div className="text-center border-l border-border/40">
          <p className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground mb-0.5">Matured Investments</p>
          <p className="font-serif font-bold text-green-600 text-lg">{lifecycleStats?.maturedInvestments ?? 0}</p>
        </div>
      </div>

      {/* Revenue Analytics */}
      {revenueStats && (
        <div className="space-y-6">
          <h3 className="font-serif text-lg font-semibold">Revenue Overview</h3>
          <div className="grid gap-4 sm:grid-cols-5">
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Total Revenue</p>
              <p className="text-2xl font-serif font-bold text-foreground mt-1">{formatMoney(revenueStats.totalRevenue)}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Reservation Revenue</p>
              <p className="text-2xl font-serif font-bold text-foreground mt-1">{formatMoney(revenueStats.reservationRevenue)}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Investment Revenue</p>
              <p className="text-2xl font-serif font-bold text-foreground mt-1">{formatMoney(revenueStats.investmentRevenue)}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Partner Commission</p>
              <p className="text-2xl font-serif font-bold text-foreground mt-1">{formatMoney(revenueStats.partnerCommissionRevenue)}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Properties Sold</p>
              <p className="text-2xl font-serif font-bold text-foreground mt-1">{revenueStats.soldProperties}</p>
            </div>
          </div>

          {/* Monthly Revenue Bar Chart */}
          <div className="rounded-xl border border-border/50 bg-card p-8 shadow-card">
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-8">Monthly Revenue (Last 6 Months)</p>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueStats.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" fontSize={11} fontWeight="600" tickLine={false} axisLine={false} tick={{fill: 'hsl(var(--muted-foreground))'}} dy={10} />
                  <YAxis fontSize={11} fontWeight="600" tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} tick={{fill: 'hsl(var(--muted-foreground))'}} />
                  <Tooltip 
                    cursor={{ stroke: 'hsl(var(--secondary))', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ borderRadius: '16px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', boxShadow: '0 15px 30px -5px rgba(0,0,0,0.1)' }}
                    itemStyle={{ fontSize: '14px', fontWeight: 'bold', color: 'hsl(var(--primary))' }}
                    formatter={(value: number) => formatMoney(value)}
                  />
                  <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" animationDuration={1000} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Installment Analytics */}
      {installmentStats && installmentStats.total > 0 && (
        <div className="space-y-6">
          <h3 className="font-serif text-lg font-semibold">Active Payment Plans</h3>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Plan Count</p>
              <p className="text-2xl font-serif font-bold text-foreground mt-1">{installmentStats.total}</p>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Active Plans</p>
              <p className="text-2xl font-serif font-bold text-primary mt-1">{installmentStats.active}</p>
            </div>
            <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/10 p-5">
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Overdue</p>
              <p className="text-2xl font-serif font-bold text-amber-600 mt-1">{installmentStats.overdue}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Remaining Balance</p>
              <p className="text-2xl font-serif font-bold text-foreground mt-1">{formatMoney(installmentStats.outstanding)}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-border/50 bg-card p-5 transition-colors hover:border-border">
            <div className="flex items-center gap-3.5">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/8 text-primary shrink-0">
                <t.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{t.label}</p>
                <p className="text-xl font-serif font-semibold text-foreground mt-0.5">{t.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Security & Risk Monitor */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" /> Security & Risk Management
          </h3>
          <Button variant="outline" size="sm" className="rounded-lg h-9">View Full Audit Log</Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {auditLogs && auditLogs.length > 0 ? (
            auditLogs.map((log: any) => (
              <div key={log.id} className="rounded-xl border border-border/50 bg-card p-5">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {log.action_type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="font-serif font-semibold text-foreground text-sm">
                  {log.field_changed ? `Changed ${log.field_changed}` : `System Event`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  User ID: {log.user_id ? log.user_id.slice(0, 8) + '...' : 'System'}
                  {log.field_changed && ` (${log.old_value || 'none'} → ${log.new_value || 'none'})`}
                </p>
              </div>
            ))
          ) : (
            <div className="col-span-3 rounded-xl border border-border/50 bg-card p-8 text-center">
              <ShieldAlert className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No recent security or audit events.</p>
            </div>
          )}
        </div>
      </div>

      {/* Status card */}
      <div className="rounded-xl border border-border/50 p-8 text-center bg-card">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary mx-auto">
          <TrendingUp className="h-7 w-7" />
        </div>
        <h3 className="mt-4 font-serif text-lg font-semibold text-foreground">Platform status: Active</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          The platform is running normally. Select an item from the sidebar to manage specific areas — properties, agents, investments, users, or the website content.
        </p>
      </div>
    </div>
  );
}
