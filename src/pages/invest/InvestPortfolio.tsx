import { Navigate, Link } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/invest";
import { ArrowRight, PiggyBank, TrendingUp, Wallet } from "lucide-react";
import { PortfolioCharts } from "@/components/invest/PortfolioCharts";
import { UserInvestmentDetailDialog } from "@/components/invest/UserInvestmentDetailDialog";

export default function InvestPortfolio() {
  const { user, loading } = useAuth();
  const [selectedInv, setSelectedInv] = useState<any>(null);


  const { data, isLoading } = useQuery({
    queryKey: ["portfolio", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const [invs, rets, pays, stats] = await Promise.all([
        supabase.from("user_investments").select("*, investment_properties(title, slug, cover_image_url, currency, projected_return_min, projected_return_max)").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("returns").select("*, investment_properties(title, slug, currency)").eq("user_id", user.id).order("distribution_date", { ascending: false }),
        supabase.from("payments").select("*").eq("user_id", user.id).eq("payment_type", "investment").order("created_at", { ascending: false }),
        supabase.from("user_portfolio_stats").select("*").eq("user_id", user.id).maybeSingle()
      ]);
      return {
        investments: invs.data ?? [],
        returns: rets.data ?? [],
        payments: pays.data ?? [],
        stats: stats.data ?? null,
      };
    },
    enabled: !!user
  });

  if (loading) return <SiteLayout><div className="container-wide py-12"><Skeleton className="h-80" /></div></SiteLayout>;
  if (!user) return <Navigate to="/auth" replace />;

  const invested = data?.stats?.total_invested ?? 0;
  const portfolioValue = data?.stats?.current_portfolio_value ?? 0;
  const earned = data?.stats?.total_roi_earned ?? 0;
  const pendingRoi = data?.stats?.pending_roi ?? 0;
  const withdrawable = data?.stats?.total_withdrawable_balance ?? 0;
  
  const active = data?.stats?.active_investments ?? 0;
  const matured = data?.stats?.matured_investments ?? 0;
  const completed = data?.stats?.completed_investments ?? 0;

  return (
    <SiteLayout>
      {/* Hero Header */}
      <div className="relative overflow-hidden min-h-[280px] sm:min-h-[320px] flex items-center bg-secondary">
        <img 
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=80" 
          alt="Financial Architecture" 
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          crossOrigin="anonymous"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-secondary/90 to-secondary/40 z-[1]" />
        
        <div className="container-wide relative z-10 text-white py-14">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <p className="mb-2 text-xs font-medium tracking-wider uppercase text-primary">My Portfolio</p>
              <h1 className="font-serif text-3xl font-semibold sm:text-4xl text-white">
                Investment Portfolio
              </h1>
              <p className="mt-2 max-w-lg text-base text-white/70">
                Track your active investments, portfolio value, and accumulated ROI.
              </p>
            </div>
            <Link to="/invest/withdrawals" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-200">
              <Wallet className="h-4 w-4" /> Withdraw Funds
            </Link>
          </div>
        </div>
      </div>

      <div className="container-wide py-10 space-y-8">
        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPI label="Total Invested" value={formatMoney(invested)} icon={PiggyBank} />
          <KPI label="Portfolio Value" value={formatMoney(portfolioValue)} icon={TrendingUp} />
          <KPI label="Total ROI Earned" value={formatMoney(earned)} icon={Wallet} />
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-6 shadow-soft relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-20"><ArrowRight className="h-20 w-20 text-primary" /></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-primary uppercase tracking-wider">Withdrawable Balance</p>
              </div>
              <p className="font-serif text-3xl font-bold text-foreground">{formatMoney(withdrawable)}</p>
              <p className="text-xs font-medium text-muted-foreground mt-2">Pending ROI: {formatMoney(pendingRoi)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/50 bg-card p-4 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase">Active Investments</span>
            <span className="font-serif text-xl font-bold">{active}</span>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-4 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase">Matured Investments</span>
            <span className="font-serif text-xl font-bold text-amber-600">{matured}</span>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-4 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase">Completed</span>
            <span className="font-serif text-xl font-bold text-green-600">{completed}</span>
          </div>
        </div>

        {/* Portfolio Analytics Charts */}
        {!isLoading && (
          <PortfolioCharts
            investments={data?.investments ?? []}
            returns={data?.returns ?? []}
            payments={data?.payments ?? []}
          />
        )}

        {/* Investments */}
        <section>
          <h2 className="font-serif text-xl font-semibold">My Investments</h2>
          <div className="mt-4 space-y-3">
            {isLoading ? <Skeleton className="h-40" /> :
              (data?.investments ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-10 text-center">
                  <p className="font-serif text-lg">You have no investments yet</p>
                  <Link to="/invest/opportunities" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    Explore opportunities <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : data!.investments.map((i: any) => {
                const isInstallment = i.investment_type === "installment";
                const total = Number(i.total_amount ?? i.amount_invested ?? 0);
                const paid = Number(i.amount_paid ?? (isInstallment ? 0 : total));
                const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100;

                return (
                  <button key={i.id} onClick={() => setSelectedInv(i)} className="w-full text-left flex items-center gap-4 rounded-xl border border-border/50 bg-card p-5 transition-all duration-200 hover:shadow-card hover:border-border">
                    <div className="h-16 w-24 overflow-hidden rounded-lg bg-muted shrink-0">
                      {i.investment_properties?.cover_image_url && <img src={i.investment_properties.cover_image_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-base font-semibold text-foreground truncate">{i.investment_properties?.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className={`text-[10px] font-medium px-2 py-0.5 ${isInstallment ? "text-secondary border-secondary/20" : "text-primary border-primary/20"}`}>
                          {isInstallment ? "Installment" : "Full Payment"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {i.units_owned} Units · {i.investment_properties?.projected_return_min}–{i.investment_properties?.projected_return_max}% p.a.
                        </span>
                      </div>
                      {isInstallment && (
                        <div className="mt-2.5 flex items-center gap-3">
                          <div className="flex-1 max-w-[180px]">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          <span className="text-[11px] font-medium text-muted-foreground">{pct}% Paid</span>
                          {i.next_payment_due && i.status !== "completed" && (
                            <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                              Due: {new Date(i.next_payment_due).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-serif text-lg font-semibold text-foreground">{formatMoney(total, i.investment_properties?.currency ?? "USD")}</p>
                      {isInstallment && (
                        <p className="text-[11px] text-amber-600 mt-0.5">
                          {formatMoney(Number(i.remaining_balance ?? 0), i.investment_properties?.currency ?? "USD")} left
                        </p>
                      )}
                      <Badge variant={i.status === "confirmed" || i.status === "active" ? "default" : i.status === "completed" ? "secondary" : "destructive"} className="mt-1 text-[10px] capitalize">{i.status.replace(/_/g, " ")}</Badge>
                    </div>
                  </button>
                );
              })}
          </div>
        </section>

        {/* Returns */}
        <section>
          <h2 className="font-serif text-xl font-semibold">Payout History</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border/50 bg-card">
            <table className="w-full text-sm">
              <thead className="bg-accent text-left"><tr><th className="p-3 text-xs font-medium text-muted-foreground">Date</th><th className="p-3 text-xs font-medium text-muted-foreground">Property</th><th className="p-3 text-right text-xs font-medium text-muted-foreground">Amount</th></tr></thead>
              <tbody>
                {(data?.returns ?? []).length === 0 ? (
                  <tr><td colSpan={3} className="p-6 text-center text-sm text-muted-foreground">No payouts yet.</td></tr>
                ) : data!.returns.map((r: any) => (
                  <tr key={r.id} className="border-t border-border/40">
                    <td className="p-3 text-muted-foreground">{new Date(r.distribution_date).toLocaleDateString()}</td>
                    <td className="p-3">{r.investment_properties?.title}</td>
                    <td className="p-3 text-right font-medium">{formatMoney(Number(r.amount_received), r.investment_properties?.currency ?? "USD")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Transactions */}
        <section>
          <h2 className="font-serif text-xl font-semibold">Payment History</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border/50 bg-card">
            <table className="w-full text-sm">
              <thead className="bg-accent text-left"><tr><th className="p-3 text-xs font-medium text-muted-foreground">Date</th><th className="p-3 text-xs font-medium text-muted-foreground">Reference</th><th className="p-3 text-xs font-medium text-muted-foreground">Method</th><th className="p-3 text-xs font-medium text-muted-foreground">Status</th><th className="p-3 text-right text-xs font-medium text-muted-foreground">Amount</th></tr></thead>
              <tbody>
                {(data?.payments ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">No transactions yet.</td></tr>
                ) : data!.payments.map((p: any) => (
                  <tr key={p.id} className="border-t border-border/40">
                    <td className="p-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="p-3 font-mono text-xs">{p.reference ? `${p.reference.slice(0, 12)}…` : 'N/A'}</td>
                    <td className="p-3 capitalize text-muted-foreground">{p.provider ? p.provider.replace("_"," ") : 'N/A'}</td>
                    <td className="p-3"><Badge variant={p.status === "success" ? "default" : p.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">{p.status}</Badge></td>
                    <td className="p-3 text-right font-medium">{formatMoney(Number(p.amount), p.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <UserInvestmentDetailDialog 
        open={!!selectedInv} 
        onClose={() => setSelectedInv(null)} 
        investment={selectedInv} 
      />
    </SiteLayout>
  );
}

function KPI({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/8 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="font-serif text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
