import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, ShieldCheck, TrendingUp, Wallet, ArrowUpRight, Activity, CheckCircle2, ArrowRightLeft, HelpCircle } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { InvestmentCard } from "@/components/invest/InvestmentCard";
import type { InvestmentProperty } from "@/lib/invest";
import { SEO } from "@/components/site/SEO";
import { PromoBanner } from "@/components/site/PromoBanner";
import { useBrand } from "@/hooks/useBrand";
import { LazyImage } from "@/components/ui/LazyImage";

const investHero = "/images/hero/invest-hero.jpg";

export default function InvestHome() {
  const { brand } = useBrand();

  const { data: featured = [], isLoading: isFeaturedLoading } = useQuery({
    queryKey: ["invest-featured"],
    queryFn: async () => {
      const { data } = await supabase
        .from("investment_properties")
        .select("*")
        .in("status", ["open", "funded", "roi_active"])
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3);
      return (data ?? []) as InvestmentProperty[];
    },
  });

  const steps = [
    {
      step: "01",
      icon: Building2,
      title: "Select a Property",
      description: "Browse audited residential and commercial properties with verified financial and legal documents."
    },
    {
      step: "02",
      icon: Wallet,
      title: "Secure Your Allocation",
      description: "Choose your share allocation and complete payment via card, bank transfer, or balance with digital contracts."
    },
    {
      step: "03",
      icon: TrendingUp,
      title: "Earn Distributions & Trade",
      description: "Receive scheduled rental dividends directly to your account, and buy or sell shares on the Trade Center anytime."
    }
  ];

  const safeguards = [
    {
      title: "Independent Asset SPVs",
      description: "Each property is ring-fenced within an individual legal entity, protecting assets from platform liability."
    },
    {
      title: "Verified Title & Escrow",
      description: "All acquisitions undergo third-party title verification and formal escrow settlement prior to listing."
    },
    {
      title: "Automated Distributions",
      description: "Rental distributions are recorded on-ledger and credited directly to your investor wallet on schedule."
    },
    {
      title: "Secondary Market Liquidity",
      description: "Holders can list approved shares for sale or purchase seasoned allocations from existing investors."
    }
  ];

  const faqs = [
    {
      q: "What is fractional real estate co-ownership?",
      a: "Fractional co-ownership allows you to purchase a defined number of shares in an institutional-grade property asset. You earn proportional rental income distributions and capital appreciation without the overhead of direct management."
    },
    {
      q: "How do I sell my shares if I want liquidity?",
      a: "You can list your units directly on our Secondary Market / Trade Center at your chosen price. Other verified platform investors can purchase your shares, with funds settling directly to your account balance."
    },
    {
      q: "When and how are rental returns paid?",
      a: "Rental distributions are disbursed based on the property schedule (monthly or quarterly) directly to your investor account. You can view past payments and download statements anytime from your dashboard."
    }
  ];

  return (
    <SiteLayout transparentNav="mobile">
      <SEO 
        title={`Fractional Real Estate Investments | ${brand.platform_name}`} 
        description="Co-invest in audited, income-generating real estate assets. Earn regular rental yield and trade existing shares on the secondary exchange." 
        canonicalUrl={`${window.location.origin}/invest`}
      />

      {/* ── 1. Hero Section ── */}
      <section className="relative overflow-hidden bg-card border-b border-border/50 pt-16 md:pt-24 pb-12 sm:pb-16">
        <div className="container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Core Value Proposition */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-primary/10 text-primary border border-primary/20">
                <ShieldCheck className="h-3.5 w-3.5" /> Institutional Real Estate Co-Ownership
              </div>

              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-[1.15]">
                Co-invest in audited, income-generating properties.
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl font-sans">
                Access fractional shares in vetted residential and commercial real estate. Earn scheduled rental distributions, track asset valuation in real time, and trade shares on the secondary market.
              </p>

              {/* Primary Navigation & Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Button asChild size="lg" className="h-12 px-7 rounded-xl font-semibold text-xs uppercase tracking-wider shadow-sm transition-all">
                  <Link to="/invest/opportunities" className="flex items-center justify-center gap-2">
                    Explore Opportunities <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                
                <Button asChild size="lg" variant="outline" className="h-12 px-7 rounded-xl border-border/80 text-foreground hover:bg-muted font-semibold text-xs uppercase tracking-wider transition-all">
                  <Link to="/secondary-market" className="flex items-center justify-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-primary" /> Trade Existing Shares
                  </Link>
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 border-t border-border/50 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Verified Title Deeds
                </span>
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Scheduled Dividends
                </span>
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Secondary Market Liquidity
                </span>
              </div>
            </div>

            {/* Right Column: Visual Showcase */}
            <div className="lg:col-span-6 relative">
              <div className="relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden border border-border/60 shadow-md group">
                <LazyImage
                  src={investHero}
                  alt="Real Estate Investment Asset"
                  wrapperClassName="w-full h-full"
                  className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

                {/* Metrics Highlight Overlay */}
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 text-white flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">Typical Annual Yield</p>
                    <p className="font-heading text-xl sm:text-2xl font-bold text-primary">8.5% – 14.0% p.a.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">Trading Available</p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-primary/80 px-2.5 py-0.5 rounded-md">
                      Open Market
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 2. Trade Center / Secondary Market Highlight Card ── */}
      <section className="container-wide py-10">
        <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-primary/5 p-6 sm:p-8 lg:p-10 shadow-sm">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                <ArrowRightLeft className="h-3.5 w-3.5" /> Peer-to-Peer Liquidity
              </div>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Secondary Market &amp; Trade Center
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-sans">
                Looking to buy into funded, seasoned assets with immediate rental distribution history? Or want to sell existing shares before property maturity? Explore available listings directly on the platform Trade Center.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
              <Button asChild size="lg" className="h-12 px-6 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm">
                <Link to="/secondary-market" className="flex items-center justify-center gap-2">
                  Access Trade Center <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Featured Open Opportunities ── */}
      <section className="container-wide py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-semibold tracking-wider text-primary uppercase block mb-1">Open Allocations</span>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Featured Investment Opportunities</h2>
          </div>
          <Button asChild variant="outline" size="sm" className="h-10 px-5 rounded-xl border-border/80 font-semibold text-xs uppercase tracking-wider">
            <Link to="/invest/opportunities">View All Properties <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>

        {isFeaturedLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-80 rounded-2xl bg-muted/30 border border-border/50 animate-pulse" />
            ))}
          </div>
        ) : featured.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((p) => (
              <InvestmentCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-muted/20">
            <p className="text-muted-foreground text-sm">New investment properties are undergoing audit and will be open shortly.</p>
            <Button asChild variant="outline" className="mt-4" size="sm">
              <Link to="/secondary-market">Check Secondary Market Listings</Link>
            </Button>
          </div>
        )}
      </section>

      {/* ── 4. How It Works (Simple 3 Steps) ── */}
      <section id="how-it-works" className="bg-secondary/10 border-y border-border/50 py-16 lg:py-20">
        <div className="container-wide">
          <div className="mb-12 text-center max-w-2xl mx-auto">
            <span className="text-xs font-semibold tracking-wider text-primary uppercase block mb-2">Clear Process</span>
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">How Fractional Investing Works</h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base leading-relaxed">
              We manage the acquisitions, legal structures, and tenancy operations while you receive distributions and retain trading liquidity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {steps.map((s) => (
              <div key={s.title} className="relative rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
                <span className="absolute right-6 top-6 font-mono text-2xl font-bold text-muted-foreground/20">{s.step}</span>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 text-primary">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-sans">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Investor Protection & Safeguards ── */}
      <section className="container-wide py-16">
        <div className="mb-12 text-center max-w-2xl mx-auto">
          <span className="text-xs font-semibold tracking-wider text-primary uppercase block mb-2">Security &amp; Compliance</span>
          <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">Structured Investor Protection</h2>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base leading-relaxed">
            Every property is structured using standard legal instruments to safeguard your capital and ownership rights.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {safeguards.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border/50 bg-card p-6 hover:border-primary/40 transition-colors">
              <CheckCircle2 className="h-5 w-5 text-primary mb-3" />
              <h4 className="font-heading text-base font-bold text-foreground mb-1.5">{item.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed font-sans">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. Frequently Asked Questions ── */}
      <section className="bg-secondary/5 border-t border-border/50 py-16">
        <div className="container-narrow">
          <div className="mb-10 text-center">
            <span className="text-xs font-semibold tracking-wider text-primary uppercase block mb-2">Help &amp; Answers</span>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
                <h3 className="font-heading text-base font-semibold text-foreground mb-2 flex items-start gap-2">
                  <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-1" />
                  {faq.q}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed pl-6 font-sans">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Clean Final CTA Banner ── */}
      <section className="container-wide py-12 pb-20">
        <div className="rounded-2xl border border-border/60 bg-card p-8 sm:p-12 text-center max-w-4xl mx-auto shadow-sm">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
            Ready to start building your real estate portfolio?
          </h2>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base max-w-xl mx-auto font-sans">
            Explore active primary property allocations or trade existing shares on the secondary marketplace.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm">
              <Link to="/invest/opportunities">Explore Opportunities</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-xl border-border/80 text-foreground hover:bg-muted font-bold text-xs uppercase tracking-wider">
              <Link to="/secondary-market">Go to Trade Center</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
