import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Building2, CalendarClock, ChartLine, Coins, MapPin, ShieldAlert, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { resolveImage } from "@/lib/format";
import { availableUnits, formatMoney, fundingPercent, unitsForAmount, type InvestmentProperty } from "@/lib/invest";
import { useAuth } from "@/hooks/useAuth";
import { InvestDialog } from "@/components/invest/InvestDialog";

export default function InvestDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["invest-detail", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("investment_properties")
        .select("*, investment_property_images(url, sort_order, is_cover)")
        .eq("slug", slug!)
        .maybeSingle();
      return data as (InvestmentProperty & { investment_property_images: { url: string; sort_order: number; is_cover: boolean }[] }) | null;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return <SiteLayout><div className="container-wide py-10"><Skeleton className="h-[500px]" /></div></SiteLayout>;
  }
  if (!data) return <Navigate to="/invest/opportunities" replace />;

  const pct = fundingPercent(data);
  const avail = availableUnits(data);
  const units = unitsForAmount(Number(amount || 0), Number(data.unit_price));
  const minOk = Number(amount || 0) >= Number(data.min_investment);
  const unitsOk = units > 0 && units <= avail;
  const canInvest = minOk && unitsOk;

  const gallery = [
    { url: data.cover_image_url },
    ...(data.investment_property_images ?? []).sort((a, b) => a.sort_order - b.sort_order),
  ].filter((g) => g.url).slice(0, 5);

  return (
    <SiteLayout>
      <div className="container-wide py-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/invest/opportunities"><ArrowLeft className="mr-1 h-4 w-4" />All opportunities</Link>
        </Button>
      </div>

      <div className="container-wide grid gap-10 pb-16 lg:grid-cols-[1fr_400px]">
        {/* LEFT */}
        <div>
          {/* Gallery */}
          <div className="overflow-hidden rounded-2xl">
            <img
              src={resolveImage(gallery[0]?.url)}
              alt={data.title}
              width={1280}
              height={720}
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {gallery.slice(1).map((g, i) => (
                <img key={i} src={resolveImage(g.url)} alt="" loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
              ))}
            </div>
          )}

          <div className="mt-8">
            <p className="inline-flex items-center gap-1 text-xs font-medium tracking-wider text-[hsl(var(--gold))] uppercase">
              <MapPin className="h-3 w-3" /> {data.location}
            </p>
            <h1 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">{data.title}</h1>
            <p className="mt-5 whitespace-pre-line text-foreground/85">{data.description}</p>
          </div>

          {/* Returns */}
          <div className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <ChartLine className="h-4 w-4 text-[hsl(var(--gold))]" />
              <h2 className="font-serif text-xl font-semibold">Projected returns</h2>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Stat label="Projected annual return" value={`${data.projected_return_min}–${data.projected_return_max}%`} />
              <Stat label="Est. rental yield" value={data.estimated_rental_yield ? `${data.estimated_rental_yield}%` : "—"} />
              <Stat label="Distribution" value={data.distribution_frequency.replace("_"," ")} />
            </div>
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Returns are projections based on underlying property performance and are not guaranteed.
            </p>
          </div>

          {/* Income model */}
          <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-[hsl(var(--gold))]" />
              <h2 className="font-serif text-xl font-semibold">Income model</h2>
            </div>
            <p className="mt-3 text-sm text-foreground/85">{data.income_model}</p>
            <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" /> Distributions: {data.distribution_frequency.replace("_"," ")} · Expected holding period: {data.holding_period_months} months
            </p>
          </div>

          {/* Risk */}
          <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[hsl(var(--gold))]" />
              <h2 className="font-serif text-xl font-semibold">Risk disclosure</h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-foreground/85">
              <li><strong className="font-semibold">Market risk:</strong> Property values and rental income can fluctuate with local market conditions.</li>
              <li><strong className="font-semibold">Liquidity:</strong> Investments are illiquid. Units cannot be redeemed on demand and may be held for the full period.</li>
              <li><strong className="font-semibold">Holding period:</strong> Expected {data.holding_period_months} months. Early exit is not guaranteed.</li>
              {data.risk_notes && <li className="whitespace-pre-line text-muted-foreground">{data.risk_notes}</li>}
            </ul>
          </div>
        </div>

        {/* RIGHT — Investment panel */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-lux">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--gold-soft))] px-3 py-1 text-xs font-medium text-[hsl(var(--gold-foreground))]">
                <Building2 className="h-3 w-3" /> {data.status === "funded" ? "Fully funded" : "Open"}
              </span>
              <span className="text-xs text-muted-foreground">{data.currency}</span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <Stat small label="Total value" value={formatMoney(Number(data.total_value), data.currency)} />
              <Stat small label="Unit price" value={formatMoney(Number(data.unit_price), data.currency)} />
              <Stat small label="Total units" value={data.total_units.toLocaleString()} />
              <Stat small label="Units sold" value={data.units_sold.toLocaleString()} />
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Funded</span>
                <span className="font-medium">{pct}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-gradient-gold" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Minimum</span>
                <span className="font-semibold">{formatMoney(Number(data.min_investment), data.currency)}</span>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amt" className="text-xs">Your investment</Label>
                <Input
                  id="amt"
                  type="number"
                  min={Number(data.min_investment)}
                  step={Number(data.unit_price)}
                  placeholder={String(Number(data.min_investment))}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={avail === 0 || data.status !== "open"}
                />
                <p className="text-xs text-muted-foreground">
                  {units > 0
                    ? `= ${units} unit${units === 1 ? "" : "s"}${units > avail ? ` (only ${avail} available)` : ""}`
                    : `Enter at least ${formatMoney(Number(data.min_investment), data.currency)}`}
                </p>
              </div>
            </div>

            <Button
              className="mt-5 w-full bg-gradient-gold text-[hsl(var(--gold-foreground))] hover:opacity-95"
              size="lg"
              disabled={!canInvest || !user}
              onClick={() => setOpen(true)}
            >
              <Wallet className="mr-2 h-4 w-4" /> Invest now
            </Button>
            {!user && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                <Link to="/auth" className="font-medium text-primary hover:underline">Sign in</Link> to invest
              </p>
            )}
            <Button asChild variant="outline" className="mt-3 w-full">
              <Link to="/agents">Speak to an advisor</Link>
            </Button>
            <p className="mt-4 text-center text-[10px] leading-relaxed text-muted-foreground">
              Returns are projections and not guaranteed. Investments are illiquid. Please review the full risk disclosure before investing.
            </p>
          </div>
        </aside>
      </div>

      {user && (
        <InvestDialog
          open={open}
          onClose={() => setOpen(false)}
          property={data}
          initialAmount={Number(amount || data.min_investment)}
        />
      )}
    </SiteLayout>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-serif font-semibold ${small ? "text-base" : "text-xl"}`}>{value}</p>
    </div>
  );
}