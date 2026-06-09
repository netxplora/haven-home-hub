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
import { MarketIntelligence } from "@/components/site/MarketIntelligence";
import { AIPropertyAdvisor } from "@/components/site/AIPropertyAdvisor";

const heroImages = [
  heroImg,
  "/hero_modern_villa.png",
  "/hero_luxury_penthouse.png"
];

export default function Home() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchType, setSearchType] = useState<"buy" | "rent" | "invest">("buy");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchBudget, setSearchBudget] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

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
      <SEO />
      <OrganizationJsonLd />

      {/* 1. HERO SEARCH EXPERIENCE (SAFETY DOMINANT) */}
      <section className="relative overflow-hidden min-h-[580px] sm:min-h-[660px] lg:min-h-[720px] flex items-center">
        <div className="absolute inset-0">
          {heroImages.map((img, index) => (
            <div
              key={img}
              className={`absolute inset-0 transition-opacity [transition-duration:1500ms] ease-in-out ${index === currentSlide ? "opacity-100" : "opacity-0"}`}
            >
              <img
                src={img}
                alt="Real Estate"
                className={`h-full w-full object-cover transition-transform [transition-duration:7000ms] ease-linear ${index === currentSlide ? "scale-[1.04]" : "scale-100"}`}
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-secondary/35 mix-blend-multiply z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/35 to-gray-900/40 z-[2]" />
        </div>

        <div className="container-wide relative z-10 py-20">
          <div className="max-w-4xl animate-fade-in-up">
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1 text-xs font-bold text-white uppercase tracking-wider backdrop-blur-md border border-white/20 shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Vetted Property Marketplace
            </p>
            <h1 className="font-serif text-4xl font-bold leading-[1.1] text-white sm:text-5xl lg:text-6xl tracking-tight">
              Verified homes, trusted agents, smarter property decisions.
            </h1>
            <p className="mt-4 max-w-xl text-base sm:text-lg text-white/80 font-light leading-relaxed">
              Every listing undergoes physical inspection and title validation. Search transparent options across the United States.
            </p>

            {/* Advanced Search Form */}
            <div className="mt-8 bg-card border border-border/40 p-4 rounded-2xl shadow-lg w-full max-w-3xl focus-guidance">


              <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                {/* Location select */}
                <div className="space-y-1 text-left">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Region</label>
                  <select
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="w-full h-10 border border-border rounded-lg bg-background text-xs px-2 focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="">Any Region</option>
                    {exploreLocations.map((loc: any) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>

                {/* Budget selector */}
                <div className="space-y-1 text-left">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Max Budget</label>
                  <select
                    value={searchBudget}
                    onChange={(e) => setSearchBudget(e.target.value)}
                    className="w-full h-10 border border-border rounded-lg bg-background text-xs px-2 focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="">No Limit</option>
                    <option value="under500k">Under $500k</option>
                    <option value="500k-1m">$500k - $1M</option>
                    <option value="1m-2.5m">$1M - $2.5M</option>
                    <option value="above2.5m">Above $2.5M</option>
                  </select>
                </div>

                {/* Verified Only Check */}
                <div className="flex items-center gap-2 h-10 px-2 justify-start">
                  <input
                    type="checkbox"
                    id="verifiedCheck"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="verifiedCheck" className="text-xs font-bold text-foreground cursor-pointer select-none">
                    Verified Only
                  </label>
                </div>

                {/* Search Button */}
                <Button type="submit" size="lg" className="h-10 rounded-lg bg-primary text-white hover:bg-primary/95 font-bold text-xs uppercase tracking-wider">
                  <Search className="mr-1.5 h-3.5 w-3.5" /> Search Checked
                </Button>
              </form>


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

      {/* 4. POPULAR LOCATIONS & LIFESTYLE ZONES (LOCAL TELEMETRY) */}
      <section className="bg-accent/30 border-y border-border/50 py-16">
        <div className="container-wide">
          <div className="max-w-xl mb-10">
            <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-2 block">Region Telemetry</span>
            <h2 className="font-serif text-3xl font-semibold text-foreground tracking-tight">Popular Locations & Infrastructure</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Understand Walk Score, FEMA flood risk levels, and school ratings for America's prime residential hubs.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "Austin, TX", walk: "82 - Very Walkable", flood: "Zone X (Low Risk)", safety: "9.2/10", image: "https://images.unsplash.com/photo-1554629947-334ff61d85dc?auto=format&fit=crop&w=400&q=80" },
              { name: "Miami, FL", walk: "78 - Very Walkable", flood: "Zone AE (Required)", safety: "8.8/10", image: "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?auto=format&fit=crop&w=400&q=80" },
              { name: "Brooklyn, NY", walk: "98 - Walker's Paradise", flood: "Zone X (Low Risk)", safety: "8.5/10", image: "https://images.unsplash.com/photo-1502899576159-f224dc2349fa?auto=format&fit=crop&w=400&q=80" },
              { name: "Seattle, WA", walk: "85 - Very Walkable", flood: "Zone X (Low Risk)", safety: "9.4/10", image: "https://images.unsplash.com/photo-1502175353174-a7a70e73b362?auto=format&fit=crop&w=400&q=80" }
            ].map((loc) => (
              <div key={loc.name} className="group relative overflow-hidden rounded-xl border border-border/50 bg-card hover-lift flex flex-col h-full shadow-sm">
                <div className="h-44 overflow-hidden relative">
                  <img src={loc.image} alt={loc.name} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <h3 className="absolute bottom-4 left-4 font-serif text-lg font-bold text-white">{loc.name}</h3>
                </div>
                <div className="p-4 space-y-2.5 text-xs flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Walk Score:</span>
                      <span className="font-semibold text-foreground flex items-center gap-1"><MapPin className="h-3 w-3 text-amber-500" /> {loc.walk}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">FEMA Zone:</span>
                      <span className="font-semibold text-foreground">{loc.flood}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Safety Index:</span>
                      <span className="font-semibold text-primary">{loc.safety}</span>
                    </div>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="w-full text-xs font-semibold text-primary hover:bg-primary/5 mt-2">
                    <Link to={`/properties?city=${encodeURIComponent(loc.name.split(" ")[0])}`}>Explore Area Listings</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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

      {/* 6. BUYER SUCCESS STORIES (TESTIMONIALS) */}
      <section className="bg-primary/5 border-y border-border/40 py-16">
        <div className="container-wide">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-2 block">Client Outcomes</span>
            <h2 className="font-serif text-3xl font-semibold text-foreground">Buyer & Investor Success Stories</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { quote: "Investing in Austin tech-hub condos fractionally has allowed me to diversify my portfolio out of equities into inflation-hedged assets. The yield reports are transparent and automatic.", author: "James T.", role: "Fractional Investor since 2024" },
              { quote: "We bought our family home through Haven. The team handled physical showings, title insurance, and HOA clearance with zero hassle.", author: "Mrs. Sarah O.", role: "Homebuyer in Miami" },
              { quote: "The escrow payment pathway gave me the confidence to send funds from out of state knowing the seller validation occurred before payout dispatch.", author: "Robert K.", role: "Out-of-State Buyer" }
            ].map((item, idx) => (
              <div key={idx} className="bg-card p-6 rounded-2xl border border-border/40 shadow-soft hover-lift flex flex-col justify-between">
                <div>
                  <div className="flex gap-1 text-primary mb-4">
                    {[1,2,3,4,5].map(i => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                  </div>
                  <p className="text-muted-foreground italic mb-6 leading-relaxed text-xs">"{item.quote}"</p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">{item.author}</h4>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{item.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. SMART MARKET INTELLIGENCE */}
      <section className="container-wide py-16">
        <MarketIntelligence />
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
              Whether you are at your desk or on the move, Haven Home Hub provides a consistent, secure, and responsive experience across all your devices.
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
            <AIPropertyAdvisor />
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
                crossOrigin="anonymous"
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
