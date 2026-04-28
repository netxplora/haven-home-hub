import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Building2, LineChart, Search, ShieldCheck, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { InvestmentCard } from "@/components/invest/InvestmentCard";
import investHero from "@/assets/invest-hero.jpg";
import type { InvestmentProperty } from "@/lib/invest";

export default function InvestHome() {
  const { data: featured = [] } = useQuery({
    queryKey: ["invest-featured"],
    queryFn: async () => {
      const { data } = await supabase
        .from("investment_properties")
        .select("*")
        .in("status", ["open", "funded"])
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3);
      return (data ?? []) as InvestmentProperty[];
    },
  });

  const steps = [
    { icon: Search, title: "Browse properties", body: "Explore professionally-vetted, income-generating properties." },
    { icon: Wallet, title: "Choose your amount", body: "Start from the defined minimum and select how much to invest." },
    { icon: TrendingUp, title: "Earn income", body: "Receive scheduled distributions from rental income." },
    { icon: LineChart, title: "Track performance", body: "Monitor your portfolio and payouts from your dashboard." },
  ];

  const benefits = [
    { icon: Building2, title: "Managed properties", body: "Operated by experienced partners with transparent reporting." },
    { icon: ShieldCheck, title: "Transparent structure", body: "Clear unit pricing, fees, and distribution mechanics." },
    { icon: BadgeCheck, title: "Passive income potential", body: "Scheduled distributions from underlying rental performance." },
    { icon: Sparkles, title: "Diversification", body: "Spread capital across locations, asset types, and horizons." },
  ];

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative isolate">
        <div className="absolute inset-0 -z-10">
          <img
            src={investHero}
            alt=""
            width={1600}
            height={1024}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-invest" />
        </div>
        <div className="container-wide relative flex min-h-[560px] flex-col justify-center py-24 text-primary-foreground">
          <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-[hsl(var(--gold)/0.5)] bg-background/10 px-3 py-1 text-xs font-medium backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--gold))]" /> Fractional ownership
          </p>
          <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-[1.05] sm:text-6xl">
            Own real estate from <span className="italic text-[hsl(var(--gold-soft))]">anywhere</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-primary-foreground/85">
            Start from a defined minimum and co-invest in professionally managed properties. Earn from rental income and long-term appreciation — all from one private dashboard.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-gradient-gold text-[hsl(var(--gold-foreground))] hover:opacity-95">
              <Link to="/invest/opportunities">
                Browse opportunities <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-background/5 text-primary-foreground hover:bg-background/15">
              <Link to="/invest/portfolio">My portfolio</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-wide py-20">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-medium tracking-wider text-[hsl(var(--gold))] uppercase">How it works</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">A private route into income property</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border border-border bg-card p-6 shadow-soft">
              <span className="absolute right-5 top-5 font-serif text-4xl text-[hsl(var(--gold)/0.25)]">0{i + 1}</span>
              <s.icon className="h-5 w-5 text-[hsl(var(--gold))]" />
              <h3 className="mt-4 font-serif text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-secondary/40 py-20">
        <div className="container-wide">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-medium tracking-wider text-[hsl(var(--gold))] uppercase">Why investors choose us</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">Structured, transparent, patient.</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-2xl bg-card p-6 shadow-soft">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-gold text-[hsl(var(--gold-foreground))]">
                  <b.icon className="h-4 w-4" />
                </span>
                <h3 className="mt-4 font-serif text-lg font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="container-wide py-20">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-sm font-medium tracking-wider text-[hsl(var(--gold))] uppercase">Current offerings</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">Open for investment</h2>
            </div>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/invest/opportunities">See all <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <InvestmentCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="container-wide pb-24">
        <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-foreground to-foreground/90 p-10 text-primary-foreground shadow-lux sm:p-14">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <h2 className="font-serif text-3xl font-semibold sm:text-4xl">
                Ready to put your capital to work?
              </h2>
              <p className="mt-3 max-w-2xl text-primary-foreground/80">
                Review current opportunities, choose your allocation, and track every distribution from one clean dashboard.
              </p>
              <p className="mt-4 text-xs text-primary-foreground/60">
                Returns are projections based on underlying property performance and are not guaranteed. Investments are illiquid and involve risk — see each opportunity's full risk disclosure.
              </p>
            </div>
            <Button asChild size="lg" className="bg-gradient-gold text-[hsl(var(--gold-foreground))] hover:opacity-95">
              <Link to="/invest/opportunities">Browse investment opportunities</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}