import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Building2, LineChart, Search, ShieldCheck, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { InvestmentCard } from "@/components/invest/InvestmentCard";
import investHero from "@/assets/invest-hero.jpg";
import type { InvestmentProperty } from "@/lib/invest";
import { SEO } from "@/components/site/SEO";

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
      <SEO title="Invest in Real Estate" description="Co-invest in professionally managed, income-generating properties. Start with fractional ownership and earn scheduled distributions from rental income." />
      {/* Hero */}
      <section className="relative isolate min-h-[480px] sm:min-h-[560px] lg:min-h-[600px] flex items-center">
        <div className="absolute inset-0 -z-10">
          <img
            src={investHero}
            alt=""
            width={1600}
            height={1024}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-invest mix-blend-multiply opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
        </div>
        <div className="container-wide relative flex flex-col justify-center py-24 text-primary-foreground">
          <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Property Investment
          </p>
          <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-[1.05] sm:text-6xl">
            Own real estate from <span className="italic text-primary">anywhere</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-primary-foreground/85">
            Start from a defined minimum and invest in professionally managed properties. Earn from rental income and long-term growth — all from one simple dashboard.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
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
          <p className="text-sm font-medium tracking-wider text-primary uppercase">How it works</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">A simple way to invest in rental properties</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {steps.map((s, i) => (
            <div key={s.title} className="relative rounded-xl border border-border bg-card p-6 shadow-soft">
              <span className="absolute right-5 top-5 font-serif text-4xl text-primary/25">0{i + 1}</span>
              <s.icon className="h-5 w-5 text-primary" />
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
            <p className="text-sm font-medium tracking-wider text-primary uppercase">Why investors choose us</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">Structured, transparent, patient.</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-xl bg-card p-6 shadow-soft">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground ">
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
              <p className="text-sm font-medium tracking-wider text-primary uppercase">Available Properties</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">Open for investment</h2>
            </div>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/invest/opportunities">See all <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {featured.map((p) => (
              <InvestmentCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {/* FAQs */}
      <section className="bg-background py-20 border-t border-border">
        <div className="container-narrow">
          <div className="mb-10 text-center">
            <p className="text-sm font-medium tracking-wider text-primary uppercase">Knowledge Base</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">Frequently Asked Questions</h2>
            <p className="mt-4 text-muted-foreground text-lg">Everything you need to know about property investments.</p>
          </div>
          <div className="grid gap-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-serif text-lg font-semibold mb-2">What is fractional real estate ownership?</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Fractional ownership allows multiple investors to co-own a high-value real estate asset. Your investment purchases a specific number of units in the property trust, entitling you to a proportional share of the rental income and eventual capital appreciation upon the property's sale.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-serif text-lg font-semibold mb-2">How do I earn returns?</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Returns are generated primarily through rental yield (paid out according to the distribution frequency—monthly, quarterly, or annually) and secondary through capital appreciation when the property is sold at the end of the holding period. All payouts are automatically credited to your dashboard.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-serif text-lg font-semibold mb-2">Are my investments secure?</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Every property on our platform undergoes rigorous due diligence, including structural audits, legal title verification, and financial feasibility modeling. Ownership structures are legally bound in trust structures designed to protect investors. However, all real estate investments carry inherent market risks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-wide pb-24">
        <div className="relative overflow-hidden rounded-xl border border-border p-10 text-primary-foreground shadow-card sm:p-14">
          <img 
            src="https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1600&q=80" 
            alt="Architecture Blueprint" 
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover mix-blend-luminosity opacity-40"
            crossOrigin="anonymous"
          />
          <div className="absolute inset-0 bg-secondary/90 backdrop-blur-[2px]" />
          
          <div className="relative z-10 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <h2 className="font-serif text-3xl font-semibold sm:text-4xl">
                Ready to start your investment?
              </h2>
              <p className="mt-3 max-w-2xl text-primary-foreground/80 leading-relaxed">
                View available properties, choose your amount, and monitor your payouts from one clean dashboard.
              </p>
              <p className="mt-4 text-xs text-primary-foreground/60">
                Returns are based on estimated property performance and are not guaranteed. Real estate investments involve risk — see each property's full risk disclosure.
              </p>
            </div>
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/invest/opportunities">Browse investment opportunities</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}