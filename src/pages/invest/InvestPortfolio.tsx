import { Navigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/invest";
import { ArrowRight, PiggyBank, TrendingUp, Wallet } from "lucide-react";

export default function InvestPortfolio() {
  const { user, loading } = useAuth();
  if (loading) return <SiteLayout><div className="container-wide py-12"><Skeleton className="h-80" /></div></SiteLayout>;
  if (!user) return <Navigate to="/auth" replace />;

  const { data, isLoading } = useQuery({
    queryKey: ["portfolio", user.id],
    queryFn: async () => {
      const [invs, rets, pays] = await Promise.all([
        supabase.from("user_investments").select("*, investment_properties(title, slug, cover_image_url, currency, projected_return_min, projected_return_max)").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("returns").select("*, investment_properties(title, slug, currency)").eq("user_id", user.id).order("distribution_date", { ascending: false }),
        supabase.from("payments").select("*").eq("user_id", user.id).eq("payment_type", "investment").order("created_at", { ascending: false }),
      ]);
      return {
        investments: invs.data ?? [],
        returns: rets.data ?? [],
        payments: pays.data ?? [],
      };
    },
  });

  const invested = (data?.investments ?? []).filter((i: any) => i.status === "confirmed")
    .reduce((s: number, i: any) => s + Number(i.amount_invested), 0);
  const earned = (data?.returns ?? []).reduce((s: number, r: any) => s + Number(r.amount_received), 0);
  const active = (data?.investments ?? []).filter((i: any) => i.status === "confirmed").length;

  return (
    <SiteLayout>
      <div className="border-b border-border bg-secondary/40">
        <div className="container-wide py-10">
          <p className="text-xs font-medium tracking-wider text-[hsl(var(--gold))] uppercase">Invest</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold sm:text-4xl">My investment portfolio</h1>
          <p className="mt-2 text-muted-foreground">Track your active investments, returns and transaction history.</p>
        </div>
      </div>

      <div className="container-wide py-10 space-y-10">
        <div className="grid gap-4 sm:grid-cols-3">
          <KPI label="Total invested" value={formatMoney(invested)} icon={Wallet} />
          <KPI label="Returns earned" value={formatMoney(earned)} icon={TrendingUp} />
          <KPI label="Active investments" value={String(active)} icon={PiggyBank} />
        </div>

        {/* Investments */}
        <section>
          <h2 className="font-serif text-2xl font-semibold">My investments</h2>
          <div className="mt-4 space-y-3">
            {isLoading ? <Skeleton className="h-40" /> :
              (data?.investments ?? []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                  <p className="font-serif text-xl">You have no investments yet</p>
                  <Link to="/invest/opportunities" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    Explore opportunities <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : data!.investments.map((i: any) => (
                <Link key={i.id} to={`/invest/${i.investment_properties?.slug}`} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition hover:shadow-soft">
                  <div className="h-16 w-20 overflow-hidden rounded-lg bg-secondary">
                    {i.investment_properties?.cover_image_url && <img src={i.investment_properties.cover_image_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-lg font-semibold truncate">{i.investment_properties?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.units_owned} units · Projected {i.investment_properties?.projected_return_min}–{i.investment_properties?.projected_return_max}% p.a.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-lg font-semibold">{formatMoney(Number(i.amount_invested), i.investment_properties?.currency ?? "USD")}</p>
                    <Badge variant={i.status === "confirmed" ? "default" : "secondary"}>{i.status}</Badge>
                  </div>
                </Link>
              ))}
          </div>
        </section>

        {/* Returns */}
        <section>
          <h2 className="font-serif text-2xl font-semibold">Payout history</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left"><tr><th className="p-3">Date</th><th className="p-3">Property</th><th className="p-3 text-right">Amount</th></tr></thead>
              <tbody>
                {(data?.returns ?? []).length === 0 ? (
                  <tr><td colSpan={3} className="p-6 text-center text-sm text-muted-foreground">No payouts yet.</td></tr>
                ) : data!.returns.map((r: any) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3">{new Date(r.distribution_date).toLocaleDateString()}</td>
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
          <h2 className="font-serif text-2xl font-semibold">Transaction history</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left"><tr><th className="p-3">Date</th><th className="p-3">Reference</th><th className="p-3">Method</th><th className="p-3">Status</th><th className="p-3 text-right">Amount</th></tr></thead>
              <tbody>
                {(data?.payments ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">No transactions yet.</td></tr>
                ) : data!.payments.map((p: any) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="p-3 font-mono text-xs">{p.reference.slice(0, 12)}…</td>
                    <td className="p-3 capitalize">{p.provider.replace("_"," ")}</td>
                    <td className="p-3"><Badge variant={p.status === "success" ? "default" : p.status === "failed" ? "destructive" : "secondary"}>{p.status}</Badge></td>
                    <td className="p-3 text-right font-medium">{formatMoney(Number(p.amount), p.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}

function KPI({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-gold text-[hsl(var(--gold-foreground))]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 font-serif text-3xl font-semibold">{value}</p>
    </div>
  );
}