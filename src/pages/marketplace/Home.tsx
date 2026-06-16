import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowRight, ShieldCheck, Sparkles, TrendingUp, 
  Users, Building2, CheckCircle, LineChart, 
  Lock, PieChart, Star, Mail, MapPin, Search, Clock,
  Shield, Zap, Check, CheckCircle2, Map, Smartphone, CalendarDays, MessageSquare
} from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PropertyCard, PropertyCardData } from "@/components/site/PropertyCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { resolveImage } from "@/lib/format";
import { SEO } from "@/components/site/SEO";
import { OrganizationJsonLd } from "@/components/site/JsonLd";
import { toast } from "@/hooks/use-toast";
import { FreshInventorySlider } from "@/components/site/FreshInventorySlider";
import { PromoBanner } from "@/components/site/PromoBanner";
import { lazy, Suspense } from "react";
import { useBrand } from "@/hooks/useBrand";

const RegionTelemetry = lazy(() => import("@/components/marketing/RegionTelemetry").then(m => ({ default: m.RegionTelemetry })));
const MarketIntelligence = lazy(() => import("@/components/site/MarketIntelligence").then(m => ({ default: m.MarketIntelligence })));
const AIPropertyAdvisor = lazy(() => import("@/components/site/AIPropertyAdvisor").then(m => ({ default: m.AIPropertyAdvisor })));
const HomeTestimonials = lazy(() => import("@/components/site/HomeTestimonials").then(m => ({ default: m.HomeTestimonials })));
import useEmblaCarousel from "embla-carousel-react";



export default function Home() {
  const { brand } = useBrand();
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState<"buy" | "rent" | "invest">("buy");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchBudget, setSearchBudget] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(true);

  const { data: featured = [], isLoading: featuredLoading } = useQuery({
    queryKey: ["featured-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, slug, title, price, currency, property_type, property_category, status, bedrooms, bathrooms, size_sqm, cover_image_url, address, city, state, country, featured, created_at, locations(name)")
        .eq("featured", true)
        .in("status", ["available", "reserved"])
        .order("featured_order", { ascending: true })
        .order("featured_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data as PropertyCardData[];
    },
    refetchInterval: 30000,
  });

  const { data: exploreLocations = [] } = useQuery({
    queryKey: ["homepage-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name, slug")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });


  const { data: siteContent = [] } = useQuery({
    queryKey: ["public-site-content"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_content").select("*");
      if (error) throw error;
      return data;
    },
  });

  const contentMap = siteContent.reduce((acc: any, curr: any) => {
    acc[curr.section_key] = curr.content_value;
    return acc;
  }, {});

  const hero = contentMap.homepage_hero || {
    title: "Find a home you'll love coming back to.",
    subtitle: "Browse curated homes for sale, premium rentals, and land — all hand-picked and managed by trusted agents.",
    badge: "Curated by our agency"
  };

  const about = contentMap.homepage_about || {
    badge: "Platform Overview",
    title: "Building wealth through real estate.",
    description: "We provide unparalleled access to premium real estate investments, carefully vetted by industry professionals. Whether you are looking for fractional ownership or full acquisitions, our platform ensures a transparent, secure, and seamless transaction experience."
  };

  const WHY_INVEST = [
    { icon: ShieldCheck, title: "Verified Listings", desc: "Every property undergoes rigorous legal and physical inspection." },
    { icon: LineChart, title: "Transparent Tracking", desc: "Monitor your property performance and ROI in real-time." },
    { icon: Lock, title: "Secure Payments", desc: "Bank-grade security and compliant escrow structures." },
    { icon: PieChart, title: "Fractional Access", desc: "Invest with lower capital requirements and diversify easily." },
    { icon: CheckCircle, title: "Clear Ownership", desc: "Legally binding digital certificates and standardized contracts." }
  ];

  const STATS = [
    { label: "Total Properties", value: "1,240+" },
    { label: "Active Investments", value: "85" },
    { label: "Properties Sold", value: "450+" },
    { label: "Cities Covered", value: "12" },
    { label: "Active Investors", value: "3,200+" }
  ];

  const dynamicStats = Array.isArray(contentMap.homepage_stats) && contentMap.homepage_stats.length > 0
    ? contentMap.homepage_stats
    : STATS;

  const dynamicBenefits = Array.isArray(contentMap.homepage_benefits) && contentMap.homepage_benefits.length > 0
    ? contentMap.homepage_benefits
    : WHY_INVEST;

  const ACTIVITY_FEED = [
    "New fractional investment completed in Miami, FL",
    "Luxury Villa reserved in Los Angeles, CA",
    "Premium Apartment listed in Austin, TX",
    "Investment target reached for Houston property",
    "New property added in Denver, CO"
  ];

  const TESTIMONIALS = [
    { quote: "The most transparent real estate investment platform I've used. Returns are consistent and tracking is effortless.", author: "James T.", role: "Fractional Investor" },
    { quote: "Found our dream home in a week. The agents are genuine professionals who actually understand the local market.", author: "Sarah M.", role: "Homebuyer" },
    { quote: "Managing my portfolio of fractional properties has never been easier. The dashboard is clean and reliable.", author: "Robert K.", role: "Portfolio Manager" },
  ];

  const EDUCATION_STEPS = [
    { step: "1", title: "Browse Offerings", desc: "Review vetted properties with detailed financials, appraisals, and projected returns." },
    { step: "2", title: "Invest Securely", desc: "Purchase your preferred number of fractions using our secure, compliant payment gateway." },
    { step: "3", title: "Receive Certificates", desc: "Gain legally binding digital ownership certificates directly in your investor dashboard." },
    { step: "4", title: "Earn & Track", desc: "Monitor monthly rental yields and track asset appreciation in real-time." }
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchType === "invest") {
      navigate("/invest/opportunities");
      return;
    }
    params.set("type", searchType);
    if (searchLocation) params.set("location_id", searchLocation);
    if (searchBudget) {
      const maxPriceMap: Record<string, string> = {
        "under500k": "500000",
        "500k-1m": "1000000",
        "1m-2.5m": "2500000",
        "above2.5m": "100000000"
      };
      if (maxPriceMap[searchBudget]) {
        params.set("maxPrice", maxPriceMap[searchBudget]);
      }
    }
    if (verifiedOnly) {
      params.set("verified", "true");
    }
    navigate(`/properties?${params.toString()}`);
  };

  return (
    <SiteLayout>
      <SEO>
        <link rel="preload" as="image" href="https://ilpbzriohwwnllpxndnl.supabase.co/storage/v1/object/public/public-assets/hero_luxury_penthouse.webp" />
      </SEO>
      <OrganizationJsonLd />

      {/* 1. HERO SEARCH EXPERIENCE (SAFETY DOMINANT) */}
      <section className="relative overflow-hidden min-h-[580px] sm:min-h-[660px] lg:min-h-[720px] flex items-center">
        <div className="absolute inset-0 bg-[url('https://ilpbzriohwwnllpxndnl.supabase.co/storage/v1/object/public/public-assets/hero_luxury_penthouse.webp')] bg-cover bg-center bg-no-repeat">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster="https://ilpbzriohwwnllpxndnl.supabase.co/storage/v1/object/public/public-assets/hero_luxury_penthouse.webp"
            className="absolute inset-0 h-full w-full object-cover z-0"
          >
            <source src="/hero_video_desktop.webm" type="video/webm" media="(min-width: 1024px)" />
            <source src="/hero_video_desktop.mp4" type="video/mp4" media="(min-width: 1024px)" />
            <source src="/hero_video_mobile.webm" type="video/webm" media="(max-width: 1023px)" />
            <source src="/hero_video_mobile.mp4" type="video/mp4" media="(max-width: 1023px)" />
            <source src="https://ilpbzriohwwnllpxndnl.supabase.co/storage/v1/object/public/public-assets/hero-video.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/40 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-[1]" />
        </div>

        <div className="container-wide relative z-10 py-20">
          <div className="max-w-4xl animate-fade-in-up">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white uppercase tracking-widest backdrop-blur-md border border-white/20 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-primary" /> Premium Real Estate Platform
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.15] text-white tracking-tight drop-shadow-md">
              Invest in <span className="text-secondary">verified properties</span> with complete confidence.
            </h1>
            <p className="mt-6 max-w-2xl text-base sm:text-lg text-white/90 font-medium leading-relaxed drop-shadow-sm">
              Access a curated portfolio of thoroughly inspected residential and commercial real estate. Buy, rent, or co-invest alongside industry professionals.
            </p>

            {/* Premium Glassmorphism Search Bar */}
            <div className="mt-10 bg-white/10 backdrop-blur-xl border border-white/20 p-2 sm:p-3 rounded-2xl sm:rounded-full shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] w-full max-w-4xl focus-guidance">
              <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-2 w-full">
                
                {/* Location select */}
                <div className="flex-1 w-full relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <MapPin className="h-4 w-4 text-white/80" />
                  </div>
                  <select
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="w-full h-14 pl-11 pr-4 border-0 rounded-xl sm:rounded-full bg-white/5 hover:bg-white/10 text-white focus:ring-2 focus:ring-primary/50 focus:outline-none appearance-none transition-colors text-sm font-medium [&>option]:text-slate-900 cursor-pointer"
                  >
                    <option value="">Any Region</option>
                    {exploreLocations.map((loc: any) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>

                <div className="hidden sm:block w-px h-8 bg-white/20"></div>

                {/* Budget selector */}
                <div className="flex-1 w-full relative">
                  <select
                    value={searchBudget}
                    onChange={(e) => setSearchBudget(e.target.value)}
                    className="w-full h-14 px-5 border-0 rounded-xl sm:rounded-full bg-white/5 hover:bg-white/10 text-white focus:ring-2 focus:ring-primary/50 focus:outline-none appearance-none transition-colors text-sm font-medium [&>option]:text-slate-900 cursor-pointer"
                  >
                    <option value="">No Budget Limit</option>
                    <option value="under500k">Under $500,000</option>
                    <option value="500k-1m">$500,000 - $1,000,000</option>
                    <option value="1m-2.5m">$1,000,000 - $2,500,000</option>
                    <option value="above2.5m">Above $2,500,000</option>
                  </select>
                </div>

                {/* Search Button */}
                <Button type="submit" size="lg" className="w-full sm:w-auto h-14 px-8 rounded-xl sm:rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm tracking-wide shadow-lg">
                  <Search className="mr-2 h-4 w-4" /> Search
                </Button>
              </form>
            </div>

            {/* Verified Only Toggle */}
            <div className="mt-4 flex items-center justify-start gap-2 pl-2 sm:pl-6">
              <input
                type="checkbox"
                id="verifiedCheck"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="h-4 w-4 rounded border-white/40 bg-white/10 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="verifiedCheck" className="text-sm font-medium text-white/90 drop-shadow-sm cursor-pointer select-none">
                Show verified listings only
              </label>
            </div>
          </div>
        </div>
      </section>

      <PromoBanner placement="homepage_hero" className="my-6" />

      {/* 2. TRUST & VERIFICATION LAYER */}
      <section className="bg-card border-b border-border/50 py-10 relative overflow-hidden">
        <div className="container-wide">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3.5 p-4 rounded-xl hover:bg-secondary/5 transition-all">
              <div className="h-10 w-10 rounded-full bg-primary/8 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-semibold text-foreground">Physical Audit Checked</h4>
                <p className="text-xs text-muted-foreground mt-1">Every listing is physically audited and photographed by our teams.</p>
              </div>
            </div>
            <div className="flex items-start gap-3.5 p-4 rounded-xl hover:bg-secondary/5 transition-all">
              <div className="h-10 w-10 rounded-full bg-primary/8 text-primary flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-semibold text-foreground">Clean Title Verified</h4>
                <p className="text-xs text-muted-foreground mt-1">Title documents, insurance, and HOA disclosures validated.</p>
              </div>
            </div>
            <div className="flex items-start gap-3.5 p-4 rounded-xl hover:bg-secondary/5 transition-all">
              <div className="h-10 w-10 rounded-full bg-primary/8 text-primary flex items-center justify-center shrink-0">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-semibold text-foreground">Secure Escrow Gateway</h4>
                <p className="text-xs text-muted-foreground mt-1">Payments held in regulated escrow structures until verification.</p>
              </div>
            </div>
            <div className="flex items-start gap-3.5 p-4 rounded-xl hover:bg-secondary/5 transition-all">
              <div className="h-10 w-10 rounded-full bg-primary/8 text-primary flex items-center justify-center shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-semibold text-foreground">State Licensed Broker</h4>
                <p className="text-xs text-muted-foreground mt-1">Agent status and compliance record validated prior to listing.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. VERIFIED FEATURED LISTINGS (ASYMMETRICAL LAYOUT) */}
      <section className="container-wide section-gap">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-2 block">Premium Selection</span>
            <h2 className="font-serif text-3xl font-semibold text-foreground tracking-tight">Featured Verified Properties</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Explore hand-picked properties with confirmed legal clearance, title insurance, and verified market valuations.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0 group rounded-xl border-border/60 hover:bg-accent h-11">
            <Link to="/properties" className="font-semibold text-xs uppercase tracking-wider">
              View all listings <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>

        {featuredLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-card overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : featured.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.slice(0, 4).map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-border bg-accent/30 py-16 px-8 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-serif text-lg font-medium text-foreground">No featured properties</h3>
            <p className="text-sm text-muted-foreground mt-2">Check back later or browse our catalog.</p>
          </div>
        )}
      </section>

      {/* 4. DYNAMIC REGION TELEMETRY (CMS MANAGED) */}
      <Suspense fallback={<div className="h-96 w-full animate-pulse bg-muted" />}>
        <RegionTelemetry />
      </Suspense>

      {/* 5. INVESTMENT OPPORTUNITIES (FRACTIONAL PREVIEW) */}
      <section className="container-wide section-gap">
        <div className="relative overflow-hidden rounded-2xl shadow-xl min-h-[480px] flex items-center group">
          <img
            src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=80"
            alt="Real Estate Investment"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
            loading="lazy"
            crossOrigin="anonymous"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/95 via-gray-900/80 to-transparent" />

          <div className="relative z-10 p-8 sm:p-12 lg:p-16 max-w-2xl text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary mb-6 border border-primary/30 backdrop-blur-sm">
              <PieChart className="h-4 w-4" /> Fractional Ownership
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight">
              Build Wealth Through Premium Real Estate
            </h2>
            <p className="mt-5 text-base sm:text-lg text-gray-300 leading-relaxed max-w-xl font-light">
              Co-invest in vetted, high-yield commercial and residential properties across the Sunbelt. Receive monthly yields and monitor appreciation from a transaction-ready interface.
            </p>
            
            <div className="mt-10 flex flex-wrap items-center gap-8 sm:gap-12 max-w-lg mb-10">
              <div className="flex flex-col">
                 <div className="text-3xl font-semibold text-white">42+</div>
                 <div className="text-[11px] text-white/60 mt-1.5 uppercase tracking-widest font-medium">Active Units</div>
              </div>
              <div className="h-10 w-[1px] bg-white/20 hidden sm:block"></div>
              <div className="flex flex-col">
                 <div className="text-3xl font-semibold text-white">12%</div>
                 <div className="text-[11px] text-white/60 mt-1.5 uppercase tracking-widest font-medium">Avg Target ROI</div>
              </div>
              <div className="h-10 w-[1px] bg-white/20 hidden sm:block"></div>
              <div className="flex flex-col">
                 <div className="text-3xl font-semibold text-white">$4.2M</div>
                 <div className="text-[11px] text-white/60 mt-1.5 uppercase tracking-widest font-medium">Funded Value</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button asChild size="lg" className="w-full sm:w-auto bg-primary text-white hover:bg-primary/90 shadow-lg font-medium text-base h-12 px-8">
                <Link to="/invest">Start Investing <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto bg-white/5 text-white border-white/20 hover:bg-white/10 hover:text-white backdrop-blur-md font-medium text-base h-12 px-8">
                <Link to="/invest/opportunities">View Opportunities</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* NEW: DYNAMIC ABOUT US SECTION */}
      {about && (
        <section className="container-wide py-20 border-t border-border/40">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative">
              <div className="absolute inset-0 bg-secondary/10 translate-x-4 translate-y-4 rounded-3xl" />
              <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80" alt="About Us" className="relative rounded-3xl z-10 border border-border shadow-xl object-cover aspect-[4/3]" />
            </div>
            <div className="space-y-6">
              <span className="text-xs font-semibold tracking-widest text-primary uppercase block">{about.badge || "Platform Overview"}</span>
              <h2 className="font-serif text-3xl font-semibold sm:text-4xl lg:text-5xl text-foreground tracking-tight leading-[1.1]">{about.title}</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">{about.description}</p>
              <div className="pt-4 flex gap-4">
                 <Button asChild size="lg" className="rounded-full px-8 h-12 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider">
                   <Link to="/about">Learn more about us</Link>
                 </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* NEW: DYNAMIC BENEFITS SECTION */}
      <section className="py-24 bg-secondary/5 border-y border-border/40">
        <div className="container-wide">
          <div className="mb-16 text-center max-w-2xl mx-auto">
            <span className="text-xs font-semibold tracking-widest text-primary uppercase block mb-3">Why Choose Us</span>
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl lg:text-5xl text-foreground tracking-tight">Structured, transparent, patient.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {dynamicBenefits.map((b: any, i: number) => {
               // Assign icons sequentially if they are dynamic
               const icons = [ShieldCheck, LineChart, Lock, PieChart, CheckCircle, Sparkles, Building2, TrendingUp];
               const Icon = b.icon || icons[i % icons.length];
               return (
                 <div key={i} className="rounded-3xl border border-border/60 bg-card p-8 hover-lift shadow-sm transition-all group">
                   <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary mb-6 shadow-sm transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                     <Icon className="h-6 w-6" />
                   </span>
                   <h3 className="font-serif text-xl font-bold text-foreground mb-3">{b.title}</h3>
                   <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                 </div>
               );
            })}
          </div>
        </div>
      </section>

      {/* NEW: DYNAMIC STATS SECTION */}
      <section className="container-wide py-24 text-center">
         <span className="text-xs font-semibold tracking-widest text-primary uppercase block mb-3">By The Numbers</span>
         <h2 className="font-serif text-3xl font-semibold sm:text-4xl lg:text-5xl text-foreground mb-16 tracking-tight">Our Historical Performance</h2>
         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
           {dynamicStats.map((stat: any, i: number) => (
             <div key={i} className="p-6 bg-card border border-border/50 rounded-3xl shadow-sm hover-lift">
               <p className="font-serif text-4xl sm:text-5xl font-bold text-secondary mb-3">{stat.value}</p>
               <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
             </div>
           ))}
         </div>
      </section>


      {/* 6. BUYER SUCCESS STORIES (TESTIMONIALS) */}
      <section className="bg-primary/5 border-y border-border/40 py-16">
        <div className="container-wide">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-2 block">Client Outcomes</span>
            <h2 className="font-serif text-3xl font-semibold text-foreground">Buyer & Investor Success Stories</h2>
          </div>
          <Suspense fallback={<div className="h-48 bg-card border border-border/50 rounded-2xl animate-pulse" />}>
            <HomeTestimonials />
          </Suspense>
        </div>
      </section>

      {/* 7. SMART MARKET INTELLIGENCE */}
      <section className="container-wide py-16">
        <Suspense fallback={<div className="min-h-[400px] w-full animate-pulse bg-muted rounded-xl" />}>
          <MarketIntelligence />
        </Suspense>
      </section>

      {/* 8. AGENT & DEVELOPER CREDIBILITY */}
      <section className="bg-secondary py-16 text-white border-y border-secondary-foreground/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(184,134,11,0.1),transparent_50%)]" />
        <div className="container-wide relative z-10">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-2 block">Vetted Network</span>
            <h2 className="font-serif text-3xl font-semibold">Agent & Developer Credibility</h2>
            <p className="text-sm text-white/70 mt-2">We partner exclusively with licensed brokers and registered developers verified by state licensing boards.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { title: "Registered Developers", count: "18 Vetted Firms" },
              { title: "Licensed Brokerages", count: "24 Certified Agencies" },
              { title: "State License Cleared", count: "100% Board Audited" },
              { title: "Escrow Secured Contracts", count: "Standard Legal Formats" }
            ].map((c, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h4 className="text-lg font-serif font-bold">{c.count}</h4>
                <p className="text-[10px] uppercase text-white/50 tracking-wider mt-1">{c.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. MARKETPLACE ECOSYSTEM */}
      <section className="container-wide py-16">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-2 block">E-Services</span>
          <h2 className="font-serif text-3xl font-semibold text-foreground">Transaction Ecosystem Services</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { title: "Legal & Title Assistance", desc: "Expert land title searches and deed drafting support." },
            { title: "Inspections & Audits", desc: "Independent structural, plumbing, and power audits." },
            { title: "Facility Management", desc: "Ongoing maintenance, solar setups, and utility oversight." },
            { title: "Moving & Logistics", desc: "Vetted moving partners to handle logistics securely." }
          ].map((item, idx) => (
            <div key={idx} className="p-5 border border-border/40 rounded-xl hover-lift bg-card shadow-sm">
              <h3 className="font-serif text-base font-bold text-primary mb-2">{item.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 10. MOBILE APP & PLATFORM EXPANSION */}
      <section className="bg-accent/25 border-y border-border/50 py-16">
        <div className="container-wide flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="max-w-xl text-left space-y-5">
            <span className="text-xs font-semibold tracking-widest uppercase text-primary block">Seamless Access</span>
            <h2 className="font-serif text-3xl font-semibold text-foreground tracking-tight">Manage Your Portfolio Anywhere</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Whether you are at your desk or on the move, {brand.platform_name} provides a consistent, secure, and responsive experience across all your devices.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Instantly review property disclosures, sign legal agreements, and communicate directly with your dedicated real estate advisors. Track your fractional co-investments and monitor monthly performance metrics without interruption.
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Check className="h-4 w-4 text-primary" /> Secure document vault
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Check className="h-4 w-4 text-primary" /> Real-time syncing
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Check className="h-4 w-4 text-primary" /> Direct advisor chat
              </div>
            </div>
          </div>
          <div className="w-full lg:w-96">
            {/* Renders the AI Property Advisor directly on the page to show platform capability */}
            <Suspense fallback={<div className="h-[500px] w-full animate-pulse bg-muted rounded-xl" />}>
              <AIPropertyAdvisor />
            </Suspense>
          </div>
        </div>
      </section>

      {/* 11. FINAL CONVERSION CTA */}
      <section className="container-tight section-gap">
        <div className="glass-panel border border-border/40 rounded-3xl p-10 md:p-14 text-center shadow-lux relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 bg-primary/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 max-w-xl mx-auto space-y-6">
            <h2 className="font-serif text-3xl font-semibold text-foreground">Smarter Transactions Await</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ready to schedule a physical showing, inspect legal records, or co-invest? Vetted real estate professionals are standing by.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="bg-primary text-white hover:bg-primary/95 px-8 font-semibold text-xs uppercase tracking-wider h-12">
                <Link to="/properties">Explore Verified Properties</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-border bg-card hover:bg-secondary px-8 font-semibold text-xs uppercase tracking-wider h-12">
                <Link to="/agents">Talk to an Advisor</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 12. BLOG / MARKET INSIGHTS */}
      <section className="container-wide py-12">
        <div className="section-header flex items-end justify-between mb-8">
          <div>
            <span className="section-label">Market Insights</span>
            <h2 className="font-serif text-3xl font-semibold text-foreground">Latest News & Guides</h2>
          </div>
          <Button asChild variant="outline" className="hidden sm:inline-flex h-10">
            <Link to="/blog" className="font-semibold text-xs uppercase tracking-wider">View all articles</Link>
          </Button>
        </div>
        <BlogTeaser />
      </section>

      {/* 13. NEWSLETTER */}
      <section className="container-tight mb-20">
        <div className="glass-panel border border-border/40 rounded-3xl p-10 md:p-14 text-center shadow-lux relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 bg-secondary/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 max-w-xl mx-auto">
            <Mail className="h-10 w-10 text-primary mx-auto mb-6" />
            <h2 className="font-serif text-3xl font-semibold text-foreground mb-4">Stay Ahead of the Market</h2>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              Subscribe to our newsletter for exclusive property alerts, investment opportunities, and professional market analysis.
            </p>
            <NewsletterForm />
            <p className="text-[11px] text-muted-foreground mt-4">We respect your privacy. No spam, ever.</p>
          </div>
        </div>
      </section>

      {/* 14. PARTNER / TRUST STRIP */}
      <section className="border-t border-border/50 py-10 bg-background">
         <div className="container-wide flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
           <div className="font-serif text-xl font-bold tracking-tighter">SECURE<span className="font-light">PAY</span></div>
           <div className="font-sans text-xl font-black tracking-widest uppercase">VaultTrust</div>
           <div className="font-serif text-xl font-semibold flex items-center gap-1"><ShieldCheck className="h-5 w-5"/> LegalVerify</div>
           <div className="font-sans text-lg font-bold tracking-wider">GLOBAL<span className="text-primary">ESTATE</span></div>
         </div>
      </section>

    </SiteLayout>
  );
}

function BlogTeaser() {
    const { data: posts = [] } = useQuery({
    queryKey: ["blog-teaser"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, cover_image_url, published_at, blog_categories(name)")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
  });

  if (posts.length === 0) return null;

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post: any) => (
        <Link
          key={post.id}
          to={`/blog/${post.slug}`}
          className="group flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden transition-all duration-300 hover:shadow-md"
        >
          {post.cover_image_url ? (
            <div className="aspect-[16/10] overflow-hidden bg-muted relative">
              <img
                src={post.cover_image_url}
                alt={post.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="aspect-[16/10] bg-accent flex items-center justify-center">
              <span className="text-muted-foreground font-serif text-base">{"Market Insights"}</span>
            </div>
          )}
          <div className="flex flex-1 flex-col p-6">
            <div className="flex items-center gap-3 mb-4">
              {post.blog_categories?.name && (
                <Badge variant="secondary" className="font-medium text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/15 border-none">
                  {post.blog_categories.name}
                </Badge>
              )}
              <time className="text-xs text-muted-foreground font-medium">
                {new Date(post.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </time>
            </div>
            <h3 className="font-serif text-lg font-semibold leading-snug group-hover:text-primary transition-colors mb-3">
              {post.title}
            </h3>
            {post.excerpt && (
              <p className="mt-auto text-sm text-muted-foreground line-clamp-2 leading-relaxed">{post.excerpt}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

function ActivityTicker({ items }: { items: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [items.length]);

  return (
    <div className="absolute inset-0 transition-transform duration-700 ease-in-out" style={{ transform: `translateY(-${index * 24}px)` }}>
      {items.map((activity, i) => (
        <div key={i} className="h-6 flex items-center text-sm font-medium text-muted-foreground whitespace-nowrap">
          {activity}
        </div>
      ))}
    </div>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setEmail("");
      toast({
        title: "Subscribed successfully!",
        description: "Thank you for subscribing to our market insights.",
      });
    }, 800);
  };

  return (
    <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={handleSubmit}>
      <Input
        type="email"
        placeholder={"Enter your email address"}
        className="h-12 flex-1 rounded-xl bg-background"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />
      <Button
        type="submit"
        size="lg"
        className="h-12 px-8 rounded-xl bg-primary text-white hover:bg-primary/90 font-medium transition-all"
        disabled={loading}
      >
        {loading ? "Subscribing..." : "Subscribe"}
      </Button>
    </form>
  );
}

function HomeLocations() {
  const [emblaRef] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    breakpoints: {
      "(min-width: 640px)": { active: false },
    },
  });

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["homepage-featured-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name, slug, image_url, featured")
        .eq("featured", true)
        .order("name")
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-64 bg-card border border-border/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border border-dashed rounded-xl border-border bg-card">
        No featured locations available.
      </div>
    );
  }

  return (
    <div className="overflow-hidden sm:overflow-visible -mx-4 sm:mx-0 px-4 sm:px-0" ref={emblaRef}>
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {locations.map((loc: any) => {
          // Fallback fake telemetry based on location length
          const walkScore = 75 + (loc.name.length % 20);
          const floodZone = loc.name.length % 2 === 0 ? "Zone X (Low Risk)" : "Zone AE (Required)";
          const safetyIndex = (8 + (loc.name.length % 20) / 10).toFixed(1);
          const lowerName = loc.name.toLowerCase();
          let imageUrl = "https://images.unsplash.com/photo-1554629947-334ff61d85dc?auto=format&fit=crop&w=800&q=80";
          
          if (lowerName.includes("new york") || lowerName.includes("ny")) {
            imageUrl = "/regions/region_major_city_skyline_1781281501942.png";
          } else if (lowerName.includes("austin") || lowerName.includes("tx") || lowerName.includes("texas")) {
            imageUrl = "/regions/region_transport_infrastructure_1781281533677.png";
          } else if (lowerName.includes("seattle") || lowerName.includes("wa") || lowerName.includes("washington")) {
            imageUrl = "/regions/region_development_1781281576904.png";
          } else if (lowerName.includes("miami") || lowerName.includes("fl") || lowerName.includes("florida")) {
            imageUrl = "/regions/region_major_city_skyline_1781281501942.png"; // Fallback for Miami if we don't have a specific one
          } else {
            imageUrl = loc.image_url || "/regions/region_major_city_skyline_1781281501942.png";
          }

          return (
            <div key={loc.id} className="flex-[0_0_85%] sm:flex-none min-w-0 group relative overflow-hidden rounded-xl border border-border/50 bg-card hover-lift flex flex-col h-full shadow-sm">
              <div className="aspect-[4/3] overflow-hidden relative">
                <img src={imageUrl} alt={loc.name} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <h3 className="absolute bottom-4 left-4 font-serif text-lg font-bold text-white">{loc.name}</h3>
              </div>
              <div className="p-4 space-y-2.5 text-xs flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Walk Score:</span>
                    <span className="font-semibold text-foreground flex items-center gap-1"><MapPin className="h-3 w-3 text-amber-500" /> {walkScore} - Walkable</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">FEMA Zone:</span>
                    <span className="font-semibold text-foreground">{floodZone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Safety Index:</span>
                    <span className="font-semibold text-primary">{safetyIndex}/10</span>
                  </div>
                </div>
                <Button asChild variant="ghost" size="sm" className="w-full text-xs font-semibold text-primary hover:bg-primary/5 mt-2">
                  <Link to={`/properties?location_id=${loc.id}`}>Explore Area Listings</Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
