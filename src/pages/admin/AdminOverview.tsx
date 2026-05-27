import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Users, TrendingUp, Briefcase, Banknote, MessageSquare, Calendar, MapPin, ClipboardList, Fingerprint, ArrowDownToLine, CreditCard, Layers } from "lucide-react";
import { formatMoney } from "@/lib/invest";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function AdminOverview() {
  const { data: counts } = useQuery({
    queryKey: ["admin-overview-counts"],
    queryFn: async () => {
      const [props, invest, users, agents, inquiries, bookings, locations, reservations, kycPending, pendingWithdrawals, pendingPayments, investVerifications, certificates] = await Promise.all([
        supabase.from("properties").select("id", { count: "exact", head: true }),
        supabase.from("investment_properties").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("agents").select("id", { count: "exact", head: true }),
        supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("bookings").select("id", { count: "exact", head: true }).in("status", ["pending", "confirmed"]),
        supabase.from("locations").select("id", { count: "exact", head: true }),
        supabase.from("reservations").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("kyc_status", "pending"),
        supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("payments").select("id", { count: "exact", head: true }).in("status", ["pending", "processing", "submitted", "under_review"]),
        (supabase as any).from("user_investments").select("id", { count: "exact", head: true }).eq("status", "pending"),
        (supabase as any).from("investment_certificates").select("id", { count: "exact", head: true }),
      ]);
      return {
        properties: props.count || 0,
        investments: invest.count || 0,
        users: users.count || 0,
        agents: agents.count || 0,
        inquiries: inquiries.count || 0,
        bookings: bookings.count || 0,
        locations: locations.count || 0,
        reservations: reservations.count || 0,
        kycPending: kycPending.count || 0,
        pendingWithdrawals: pendingWithdrawals.count || 0,
        pendingPayments: pendingPayments.count || 0,
        pendingVerifications: investVerifications.count || 0,
        issuedCertificates: certificates.count || 0,
      };
    }
  });

  const { data: investStats } = useQuery({
    queryKey: ["admin-invest-stats"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("investment_properties").select("total_value, units_sold, unit_price").in("status", ["open", "funded"]);
      const totalAUM = (data ?? []).reduce((sum, p) => sum + Number(p.total_value || 0), 0);
      const totalRaised = (data ?? []).reduce((sum, p) => sum + (Number(p.units_sold || 0) * Number(p.unit_price || 0)), 0);
      return { totalAUM, totalRaised };
    }
  });

  // Installment analytics
  const { data: installmentStats } = useQuery({
    queryKey: ["admin-installment-overview"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("user_investments")
        .select("status, total_amount, amount_paid, remaining_balance")
        .eq("investment_type", "installment");

      const items = data ?? [];
      const active = items.filter(i => i.status === "active" || i.status === "confirmed").length;
      const overdue = items.filter(i => i.status === "overdue").length;
      const outstanding = items.reduce((s, i) => s + Number(i.remaining_balance ?? 0), 0);
      const collected = items.reduce((s, i) => s + Number(i.amount_paid ?? 0), 0);
      return { total: items.length, active, overdue, outstanding, collected };
    }
  });

  // Revenue analytics
  const { data: revenueStats } = useQuery({
    queryKey: ["admin-revenue-stats"],
    queryFn: async () => {
      const { data: successPayments } = await supabase
        .from("payments")
        .select("amount, currency, payment_type, created_at")
        .eq("status", "success");

      const payments = successPayments ?? [];
      const totalRevenue = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
      const reservationRevenue = payments.filter(p => p.payment_type === "reservation").reduce((s, p) => s + Number(p.amount || 0), 0);
      const investmentRevenue = payments.filter(p => p.payment_type === "investment").reduce((s, p) => s + Number(p.amount || 0), 0);
      
      // Monthly breakdown (last 6 months)
      const now = new Date();
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const monthPayments = payments.filter(p => {
          const d = new Date(p.created_at);
          return d >= month && d < nextMonth;
        });
        monthlyData.push({
          label: month.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
          total: monthPayments.reduce((s, p) => s + Number(p.amount || 0), 0),
          count: monthPayments.length,
        });
      }

      // Property sales count & Partner Commission
      const { data: soldProps } = await (supabase as any)
        .from("properties")
        .select("id, price, ownership_type, commission_rate")
        .eq("status", "sold");

      const soldPropertiesCount = soldProps?.length || 0;
      
      const partnerCommissionRevenue = (soldProps || [])
        .filter(p => p.ownership_type === 'partner')
        .reduce((sum, p) => sum + (Number(p.price || 0) * (Number(p.commission_rate || 0) / 100)), 0);
      
      return { 
        totalRevenue: totalRevenue + partnerCommissionRevenue, 
        reservationRevenue, 
        investmentRevenue, 
        partnerCommissionRevenue,
        monthlyData, 
        soldProperties: soldPropertiesCount 
      };
    }
  });

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

  const maxMonthly = Math.max(...(revenueStats?.monthlyData ?? []).map((m: any) => m.total), 1);

  return (
    <div className="space-y-8">
      {/* Financial headline cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase mb-3">Managed Assets</p>
          <p className="text-3xl font-serif font-semibold text-foreground">{formatMoney(investStats?.totalAUM ?? 0)}</p>
          <p className="mt-2 text-sm text-muted-foreground">Combined value of all investment properties currently open.</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase mb-3">Total Invested</p>
          <p className="text-3xl font-serif font-semibold text-foreground">{formatMoney(investStats?.totalRaised ?? 0)}</p>
          <p className="mt-2 text-sm text-muted-foreground">Total amount invested by verified users.</p>
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

      {/* Status card */}
      <div className="rounded-xl border border-border/50 p-8 text-center bg-card">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-rose-500/10 text-rose-600 mx-auto">
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
