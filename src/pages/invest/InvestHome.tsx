import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Building2, LineChart, Search, ShieldCheck, Sparkles, TrendingUp, Wallet, ArrowUpRight, DollarSign, Activity, Clock, Award, CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { InvestmentCard } from "@/components/invest/InvestmentCard";
import investHero from "@/assets/invest-hero.jpg";
import type { InvestmentProperty } from "@/lib/invest";
import { SEO } from "@/components/site/SEO";
import { PromoBanner } from "@/components/site/PromoBanner";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney } from "@/lib/invest";
import { Badge } from "@/components/ui/badge";
import { lazy, Suspense } from "react";

const HomeTestimonials = lazy(() => import("@/components/site/HomeTestimonials").then(m => ({ default: m.HomeTestimonials })));

export default function InvestHome() {
  const { user } = useAuth();

  // Live portfolio summary query from DB RPC
  const { data: portfolioSummary } = useQuery({
    queryKey: ["invest-portfolio-summary", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_investor_portfolio_summary", { p_user_id: user!.id });
      if (error) {
        console.error("Portfolio summary RPC error:", error);
        return null;
      }
      return data;
    }
  });

  // Query user investments to count specific status occurrences
  const { data: userInvestments = [] } = useQuery({
    queryKey: ["invest-home-investments-detail", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_investments")
        .select("status")
        .eq("user_id", user!.id);
      if (error) {
        console.error("Error fetching user investments:", error);
        return [];
      }
      return data || [];
    }
  });

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

  const nav = Number(portfolioSummary?.nav || 0);
  const totalInvested = Number(portfolioSummary?.total_invested || 0);
  const totalEarnings = Number(portfolioSummary?.total_earnings || 0);
  const averageYield = Number(portfolioSummary?.projected_return_min || 0);
  
  const expectedRoi = totalInvested * (averageYield / 100);
  const currentRoiEarned = totalEarnings;
  const remainingRoi = Math.max(0, expectedRoi - currentRoiEarned);

  // Status counts
  const activeCount = userInvestments.filter((i: any) => i.status === 'roi_active' || i.status === 'active').length;
  const fundingCompletedCount = userInvestments.filter((i: any) => i.status === 'preparing_for_roi' || i.status === 'funding_completed').length;
  const maturedCount = userInvestments.filter((i: any) => i.status === 'matured' || i.status === 'completed').length;

  return (
    <SiteLayout>
      <SEO 
        title="Invest in Real Estate" 
        description="Co-invest in professionally managed, income-generating properties. Start with fractional ownership and earn scheduled distributions from rental income." 
        canonicalUrl={`${window.location.origin}/invest`}
      />
      {/* Premium Hero Section */}
      <section className="relative isolate min-h-[540px] sm:min-h-[640px] lg:min-h-[740px] flex items-center">
        <div className="absolute inset-0 -z-10 bg-black">
          <img
            src={investHero}
            alt=""
            width={1600}
            height={1024}
            className="h-full w-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30" />
        </div>
        <div className="container-wide relative flex flex-col justify-center py-24 z-10 text-white">
          <div className="max-w-4xl animate-fade-in-up">
            <p className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest backdrop-blur-md shadow-sm">
              <ShieldCheck className="h-4 w-4 text-primary" /> Premium Real Estate Investment
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.15] text-white tracking-tight drop-shadow-md">
              Build wealth through <span className="text-secondary">premium real estate</span>.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-white/90 font-medium leading-relaxed drop-shadow-sm">
              Co-invest in professionally managed commercial and residential properties. Earn scheduled rental income and benefit from long-term property appreciation.
            </p>
            
            {/* High CTA Area - Glassmorphism Container */}
            <div className="mt-12 bg-white/10 backdrop-blur-2xl border border-white/20 p-6 sm:p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] w-full max-w-3xl focus-guidance">
               <div className="flex flex-col sm:flex-row gap-6 justify-between items-center">
                 <div className="text-center sm:text-left">
                    <h3 className="font-serif text-2xl font-bold text-white">Start your investment portfolio</h3>
                    <p className="text-sm text-white/80 mt-2 font-medium">Review verified properties currently open for funding.</p>
                 </div>
                 <Button asChild size="lg" className="w-full sm:w-auto h-14 px-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm tracking-wide shadow-xl shrink-0">
                   <Link to="/invest/opportunities">
                     View Opportunities <ArrowRight className="ml-2 h-4 w-4" />
                   </Link>
                 </Button>
               </div>
            </div>
            
            <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-8 text-sm font-semibold text-white/90">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Bank-grade security</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Transparent legal structures</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Professional management</span>
            </div>
          </div>
        </div>
      </section>

      {/* Investment Performance Center */}
      <section className="container-wide pb-12 relative z-20 sm:-mt-16">
        <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Investment Performance Center</p>
              <h2 className="font-serif text-3xl font-bold text-foreground">
                {user ? "Your Portfolio Performance" : "Platform Performance Overview"}
              </h2>
            </div>
            {!user ? (
              <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 px-3 py-1 font-bold text-xs uppercase rounded-lg">
                Demo Portfolio Preview
              </Badge>
            ) : (
              <Badge variant="secondary" className="font-mono text-xs font-bold uppercase rounded-lg">
                Live Data Synchronized
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-secondary/20 rounded-xl p-4 border border-border/40 relative overflow-hidden">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Portfolio Value</p>
              <p className="font-serif text-2xl font-bold text-foreground">
                {user ? formatMoney(nav) : "$124,500.00"}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3 text-green-600" /> Valuation
              </p>
            </div>

            <div className="bg-secondary/20 rounded-xl p-4 border border-border/40 relative overflow-hidden">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Amount Invested</p>
              <p className="font-serif text-2xl font-bold text-foreground">
                {user ? formatMoney(totalInvested) : "$100,000.00"}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                <Activity className="h-3 w-3 text-primary" /> Capital deployed
              </p>
            </div>

            <div className="bg-secondary/20 rounded-xl p-4 border border-border/40 relative overflow-hidden">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Expected ROI / Yield</p>
              <p className="font-serif text-2xl font-bold text-green-600">
                {user ? formatMoney(expectedRoi) : "$18,500.00"}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">
                Target: {user ? `${averageYield}%` : "18.5%"} average p.a.
              </p>
            </div>

            <div className="bg-secondary/20 rounded-xl p-4 border border-border/40 relative overflow-hidden">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Current ROI Earned</p>
              <p className="font-serif text-2xl font-bold text-primary">
                {user ? formatMoney(currentRoiEarned) : "$6,000.00"}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">
                Remaining to accrue: {user ? formatMoney(remainingRoi) : "$12,500.00"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-border/40">
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Active Investments</p>
              <p className="font-serif text-lg font-bold text-foreground">
                {user ? activeCount : "3"}
              </p>
            </div>
            <div className="text-center border-x border-border/40">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Funding Completed</p>
              <p className="font-serif text-lg font-bold text-amber-600">
                {user ? fundingCompletedCount : "1"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Matured Assets</p>
              <p className="font-serif text-lg font-bold text-green-600">
                {user ? maturedCount : "0"}
              </p>
            </div>
          </div>

          {user && userInvestments.length === 0 && (
            <div className="mt-6 p-4 bg-muted/40 rounded-xl text-center border border-dashed border-border/60">
              <p className="text-sm text-muted-foreground">You have no active investments. Click browse below to explore opportunities.</p>
            </div>
          )}
        </div>
      </section>

      <PromoBanner placement="invest_page" className="my-10" />

      {/* How it works */}
      <section className="bg-secondary/10 border-y border-border/50 py-24">
        <div className="container-wide">
          <div className="mb-16 text-center max-w-2xl mx-auto">
            <span className="text-xs font-semibold tracking-widest text-primary uppercase block mb-3">Process Overview</span>
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl lg:text-5xl text-foreground tracking-tight">A simple way to invest in rental properties</h2>
            <p className="mt-6 text-muted-foreground text-lg leading-relaxed">We handle the legal structures, tenant management, and property maintenance. You simply track your returns.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {steps.map((s, i) => (
              <div key={s.title} className="relative rounded-3xl border border-border/60 bg-card p-8 shadow-sm hover-lift group transition-all">
                <span className="absolute right-6 top-6 font-serif text-5xl font-black text-secondary/10 group-hover:text-primary/10 transition-colors">0{i + 1}</span>
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-bold text-foreground mb-3">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 bg-background">
        <div className="container-wide">
          <div className="mb-16 text-center max-w-2xl mx-auto">
            <span className="text-xs font-semibold tracking-widest text-primary uppercase block mb-3">Why investors choose us</span>
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl lg:text-5xl text-foreground tracking-tight">Structured, transparent, patient.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-3xl border border-border/40 bg-card p-8 hover-lift transition-all">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-secondary-foreground mb-6 shadow-md">
                  <b.icon className="h-6 w-6" />
                </span>
                <h3 className="font-serif text-xl font-bold text-foreground mb-3">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Asset Classes */}
      <section className="container-wide py-24 border-t border-border/30">
        <div className="mb-16 text-center max-w-3xl mx-auto">
          <span className="text-xs font-semibold tracking-widest text-primary uppercase block mb-3">Portfolio Diversification</span>
          <h2 className="font-serif text-3xl font-semibold sm:text-4xl lg:text-5xl text-foreground tracking-tight">Institutional-grade asset classes</h2>
          <p className="mt-6 text-muted-foreground text-lg leading-relaxed">Diversify your portfolio across multiple high-performing real estate sectors, each carefully vetted by our acquisition team.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="group rounded-3xl overflow-hidden border border-border/40 relative h-[420px] shadow-sm">
            <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80" alt="Commercial" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 p-8 text-left w-full">
               <h3 className="font-serif text-2xl font-bold text-white mb-2">Commercial Real Estate</h3>
               <p className="text-sm text-white/80 leading-relaxed mb-5">Stable, long-term leases with established corporate tenants providing consistent yield.</p>
               <span className="inline-block bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">8-12% Target Yield</span>
            </div>
          </div>
          <div className="group rounded-3xl overflow-hidden border border-border/40 relative h-[420px] shadow-sm">
            <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80" alt="Residential" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 p-8 text-left w-full">
               <h3 className="font-serif text-2xl font-bold text-white mb-2">Premium Residential</h3>
               <p className="text-sm text-white/80 leading-relaxed mb-5">High-demand multi-family and luxury single-family homes in growing metropolitan areas.</p>
               <span className="inline-block bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">6-9% Target Yield</span>
            </div>
          </div>
          <div className="group rounded-3xl overflow-hidden border border-border/40 relative h-[420px] shadow-sm">
            <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80" alt="Industrial" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 p-8 text-left w-full">
               <h3 className="font-serif text-2xl font-bold text-white mb-2">Industrial & Logistics</h3>
               <p className="text-sm text-white/80 leading-relaxed mb-5">E-commerce fulfillment centers and logistics hubs with inflation-linked escalation clauses.</p>
               <span className="inline-block bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">7-10% Target Yield</span>
            </div>
          </div>
        </div>
      </section>

      {/* Track Record */}
      <section className="bg-primary/5 py-24 border-y border-primary/10">
        <div className="container-wide text-center">
          <span className="text-xs font-semibold tracking-widest text-primary uppercase block mb-3">By The Numbers</span>
          <h2 className="font-serif text-3xl font-semibold sm:text-4xl lg:text-5xl text-foreground mb-16 tracking-tight">Our Historical Performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="p-6 bg-card border border-border/50 rounded-3xl shadow-sm">
               <p className="font-serif text-4xl sm:text-5xl font-bold text-primary mb-3">$142M</p>
               <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Assets Funded</p>
            </div>
            <div className="p-6 bg-card border border-border/50 rounded-3xl shadow-sm">
               <p className="font-serif text-4xl sm:text-5xl font-bold text-primary mb-3">12.4%</p>
               <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Avg Net Yield</p>
            </div>
            <div className="p-6 bg-card border border-border/50 rounded-3xl shadow-sm">
               <p className="font-serif text-4xl sm:text-5xl font-bold text-primary mb-3">4,200+</p>
               <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Active Investors</p>
            </div>
            <div className="p-6 bg-card border border-border/50 rounded-3xl shadow-sm">
               <p className="font-serif text-4xl sm:text-5xl font-bold text-primary mb-3">100%</p>
               <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Distributions Paid</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-10 font-medium">* Past performance is not indicative of future results.</p>
        </div>
      </section>

      {/* Security & Legal */}
      <section className="container-wide py-32">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div>
            <span className="text-xs font-semibold tracking-widest text-primary uppercase block mb-3">Investor Protection</span>
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl lg:text-5xl text-foreground tracking-tight mb-6">Institutional-grade security & compliance</h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-10">
              We employ the same rigorous legal frameworks used by institutional funds to ensure your capital is protected. Every property is held in a distinct Special Purpose Vehicle (SPV), entirely separate from our operational assets.
            </p>
            <div className="space-y-8">
              <div className="flex gap-5">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-serif text-xl font-bold text-foreground mb-2">Bankruptcy-Remote SPVs</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">Each asset is ring-fenced in its own LLC, protecting investors from cross-liability and platform risk.</p>
                </div>
              </div>
              <div className="flex gap-5">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <BadgeCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-serif text-xl font-bold text-foreground mb-2">Third-Party Title Insurance</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">Comprehensive title policies are secured prior to acquisition, ensuring clean and unencumbered ownership.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
             <div className="absolute inset-0 bg-primary/10 translate-x-4 translate-y-4 rounded-[2rem] border border-primary/20" />
             <img src="https://images.unsplash.com/photo-1556155092-490a1ba16284?auto=format&fit=crop&w=800&q=80" alt="Legal Compliance" className="relative rounded-[2rem] z-10 border border-border shadow-2xl object-cover aspect-[4/3]" />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-secondary/5 py-24 border-y border-border/50">
        <div className="container-wide">
          <div className="mb-12 text-center max-w-2xl mx-auto">
            <span className="text-xs font-semibold tracking-widest text-primary uppercase block mb-3">Client Outcomes</span>
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl lg:text-5xl text-foreground tracking-tight">Investor Success Stories</h2>
          </div>
          <Suspense fallback={<div className="h-48 bg-card border border-border/50 rounded-2xl animate-pulse" />}>
            <HomeTestimonials />
          </Suspense>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="bg-secondary/5 py-24 border-t border-border/50">
          <div className="container-wide">
            <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <span className="text-xs font-semibold tracking-widest text-primary uppercase block mb-3">Available Properties</span>
                <h2 className="font-serif text-3xl font-semibold sm:text-4xl tracking-tight text-foreground">Open for investment</h2>
              </div>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 rounded-full border-border/80 hover:bg-accent font-bold text-xs uppercase tracking-wider">
                <Link to="/invest/opportunities">View all opportunities <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {featured.map((p) => (
                <InvestmentCard key={p.id} p={p} />
              ))}
            </div>
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
      <section className="container-tight pb-32">
        <div className="relative overflow-hidden rounded-3xl border border-border/40 p-10 md:p-16 text-primary-foreground shadow-2xl">
          <img 
            src="https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1600&q=80" 
            alt="Architecture Blueprint" 
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover mix-blend-luminosity opacity-40"
            crossOrigin="anonymous"
          />
          <div className="absolute inset-0 bg-secondary/95 backdrop-blur-[2px]" />
          <div className="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 bg-primary/20 rounded-full blur-3xl" />
          
          <div className="relative z-10 grid gap-8 md:grid-cols-[1fr_auto] md:items-center text-center md:text-left">
            <div>
              <h2 className="font-serif text-3xl font-bold sm:text-4xl tracking-tight text-white">
                Ready to build your portfolio?
              </h2>
              <p className="mt-4 max-w-2xl text-primary-foreground/90 leading-relaxed text-lg font-medium">
                Review available properties, choose your allocation, and monitor your distributions securely.
              </p>
              <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-primary-foreground/50">
                Returns are based on estimated performance and involve inherent market risks.
              </p>
            </div>
            <div className="flex justify-center md:justify-end">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-10 rounded-full font-bold text-sm tracking-wide shadow-xl">
                <Link to="/invest/opportunities">Start Investing Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
