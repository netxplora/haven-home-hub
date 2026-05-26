import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowRight, ShieldCheck, Sparkles, TrendingUp, 
  Users, Building2, CheckCircle, LineChart, 
  Lock, PieChart, Star, Mail, MapPin, Search, Clock
} from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { SearchBar } from "@/components/site/SearchBar";
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

const heroImages = [
  heroImg,
  "/hero_modern_villa.png",
  "/hero_luxury_penthouse.png"
];

const EXPLORE_CITIES = [
  { name: "Miami", image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80", count: 142 },
  { name: "Houston", image: "https://images.unsplash.com/photo-1538099130811-745e64318258?auto=format&fit=crop&w=800&q=80", count: 98 },
  { name: "Denver", image: "https://images.unsplash.com/photo-1618083818320-fa065ec4da6d?auto=format&fit=crop&w=800&q=80", count: 75 },
  { name: "Austin", image: "https://images.unsplash.com/photo-1531218150217-5afc8926bc24?auto=format&fit=crop&w=800&q=80", count: 110 },
  { name: "Los Angeles", image: "https://images.unsplash.com/photo-1580659324420-c2bd92b5123d?auto=format&fit=crop&w=800&q=80", count: 215 },
  { name: "New York", image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=80", count: 340 },
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  
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

  const { data: recentlySold = [], isLoading: recentlySoldLoading } = useQuery({
    queryKey: ["recently-sold-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, slug, title, price, currency, property_type, property_category, status, bedrooms, bathrooms, size_sqm, cover_image_url, address, city, state, country, featured, created_at, locations(name)")
        .in("status", ["sold", "rented", "under_offer"])
        .order("updated_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data as PropertyCardData[];
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

  return (
    <SiteLayout>
      <SEO />
      <OrganizationJsonLd />

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden min-h-[520px] sm:min-h-[600px] lg:min-h-[680px] flex items-center">
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
          <div className="absolute inset-0 bg-secondary/30 mix-blend-multiply z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/30 to-gray-900/40 z-[2]" />
        </div>

        <div className="container-wide relative z-10 py-24">
          <div className="animate-fade-in-up">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white/95 backdrop-blur-md border border-white/20 shadow-sm">
              <Sparkles className="h-4 w-4 text-emerald-400" /> {hero.badge}
            </p>
            <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-tight text-white sm:text-5xl md:text-6xl tracking-tight">
              {hero.title}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/80 sm:text-xl font-light leading-relaxed">
              {hero.subtitle}
            </p>
          </div>
          <div className="mt-10 max-w-4xl glass-panel p-4 sm:p-6 rounded-2xl animate-fade-in-up shadow-lux border-white/15 dark:border-white/5" style={{ animationDelay: '150ms' }}>
            <SearchBar />
          </div>
        </div>
      </section>

      <PromoBanner placement="homepage_hero" className="my-6" />

      {/* SUBTLE ACTIVITY FEED */}
      <section className="border-b border-border/30 bg-background py-1">
        <div className="container-wide">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5 px-4 rounded-xl bg-accent/30 border border-border/40">
            <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-primary shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {"Live Activity"}
            </div>
            <div className="flex-1 overflow-hidden relative h-5 sm:ml-4">
               <ActivityTicker items={ACTIVITY_FEED} />
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURED PROPERTIES */}
      <section className="container-wide section-gap">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-2 block">{"Premium Selection"}</span>
            <h2 className="font-serif text-3xl font-semibold text-foreground tracking-tight">{"Featured Properties"}</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              {"Explore our hand-picked selection of high-quality homes and exclusive investment opportunities."}
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0 group rounded-xl border-border/60 hover:bg-accent">
            <Link to="/properties">
              {"View all listings"} <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
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
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : featured.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-border bg-accent/30 py-16 px-8 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-serif text-lg font-medium text-foreground">{"No featured properties"}</h3>
            <p className="text-sm text-muted-foreground mt-2">{"Check back later or browse our full catalog."}</p>
          </div>
        )}
      </section>

      {/* 3. FRACTIONAL INVESTMENT BANNER */}
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-6 border border-emerald-400/30 backdrop-blur-sm">
              <PieChart className="h-4 w-4" /> {"Fractional Ownership"}
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight">
              {"Build Wealth Through Premium Real Estate"}
            </h2>
            <p className="mt-5 text-base sm:text-lg text-gray-300 leading-relaxed max-w-xl font-light">
              {"Co-invest in fully-managed, high-yield properties alongside other verified investors. Earn monthly rental income and long-term appreciation with a single intuitive dashboard."}
            </p>
            
            <div className="mt-8 grid grid-cols-3 gap-4 p-5 rounded-xl glass-panel border-white/10 backdrop-blur-md max-w-lg mb-8">
              <div>
                 <div className="text-2xl font-semibold text-foreground dark:text-white">42+</div>
                 <div className="text-[10px] text-muted-foreground dark:text-gray-300 mt-1 uppercase tracking-wider font-medium">{"Active Units"}</div>
              </div>
              <div>
                 <div className="text-2xl font-semibold text-foreground dark:text-white">12%</div>
                 <div className="text-[10px] text-muted-foreground dark:text-gray-300 mt-1 uppercase tracking-wider font-medium">{"Avg Target ROI"}</div>
              </div>
              <div>
                 <div className="text-2xl font-semibold text-foreground dark:text-white">$4.2M</div>
                 <div className="text-[10px] text-muted-foreground dark:text-gray-300 mt-1 uppercase tracking-wider font-medium">{"Funded"}</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button asChild size="lg" className="w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg font-medium text-base h-12 px-8">
                <Link to="/invest">{"Start Investing"} <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto bg-white/5 text-white border-white/20 hover:bg-white/10 hover:text-white backdrop-blur-md font-medium text-base h-12 px-8">
                <Link to="/invest/opportunities">{"View Opportunities"}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CATEGORIES */}
      <section className="container-wide section-gap">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { type: "buy", title: "Homes for Sale", desc: "Find your forever home in premium neighborhoods.", img: "/src/assets/property-1.jpg" },
            { type: "rent", title: "Premium Rentals", desc: "Flexible living in beautifully managed properties.", img: "/src/assets/property-2.jpg" },
            { type: "land", title: "Land & Plots", desc: "Build your vision on surveyed, prime locations.", img: "/src/assets/property-4.jpg" },
          ].map((c) => (
            <Link
              key={c.type}
              to={`/properties?type=${c.type}`}
              className="group relative overflow-hidden rounded-2xl shadow-card border border-border/40 bg-card hover-lift"
            >
              <div className="h-[320px] w-full overflow-hidden">
                <img src={resolveImage(c.img)} alt={c.title} loading="lazy" width={1280} height={960}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-85 group-hover:opacity-95 transition-opacity" />
              <div className="absolute inset-0 p-8 flex flex-col justify-end text-white">
                <h3 className="font-serif text-2xl font-semibold mb-2">{c.title}</h3>
                <p className="text-sm text-gray-200 leading-relaxed max-w-[250px] mb-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  {c.desc}
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold tracking-wide uppercase text-white/90">
                  {"Explore"} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. RECENTLY ADDED PROPERTIES */}
      <section className="bg-accent/30 border-y border-border/50 section-gap overflow-hidden">
        <div className="container-wide">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10">
            <div>
              <span className="section-label flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {"Fresh Inventory"}</span>
              <h2 className="font-serif text-3xl font-semibold text-foreground tracking-tight">{"Recently Added Properties"}</h2>
            </div>
            <Button asChild variant="ghost" className="shrink-0 text-primary hover:bg-primary/5">
              <Link to="/properties?sort=newest">{"View all new listings"} <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>

        <div className="w-full">
          <FreshInventorySlider />
        </div>
      </section>

      <PromoBanner placement="homepage_mid" className="mt-12 mb-4" />

      {/* 6. WHY INVEST WITH US */}
      <section className="container-wide section-gap">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-2 block">{"Platform Trust"}</span>
          <h2 className="font-serif text-3xl font-semibold text-foreground">{"Why Investors Choose Us"}</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            {"We provide a transparent, legally compliant ecosystem that prioritizes security and operational excellence for every transaction."}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5">
          {WHY_INVEST.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center text-center p-6 rounded-2xl bg-card border border-border/40 shadow-soft hover-lift">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                <item.icon className="h-5.5 w-5.5" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. MARKET STATISTICS */}
      <section className="bg-secondary py-16 my-16 border-y border-secondary-foreground/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(11,122,85,0.12),transparent_50%)]" />
        <div className="container-wide relative z-10 grid grid-cols-2 md:grid-cols-5 gap-8 md:divide-x md:divide-white/10">
          {STATS.map((stat, idx) => (
             <div key={idx} className="flex flex-col items-center text-center px-4">
               <div className="text-3xl md:text-4xl font-semibold text-white font-serif mb-2">{stat.value}</div>
               <div className="text-[10px] uppercase tracking-wider text-white/60 font-medium">{stat.label}</div>
             </div>
          ))}
        </div>
      </section>

      {/* 8. EXPLORE BY CITY */}
      <section className="container-wide section-gap">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-2 block">{"Explore Locations"}</span>
          <h2 className="font-serif text-3xl font-semibold text-foreground">{"Find Properties by City"}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {EXPLORE_CITIES.map((city) => (
            <Link
              key={city.name}
              to={`/properties?location=${city.name.toLowerCase()}`}
              className="group relative overflow-hidden rounded-2xl shadow-card aspect-[4/3] hover-lift"
            >
              <img src={city.image} alt={city.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent z-[1]" />
              <div className="absolute inset-x-0 bottom-0 p-5 flex items-end justify-between z-10">
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-medium text-white">{city.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-300 mt-1">{city.count} {"Properties"}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                   <ArrowRight className="h-4 w-4 text-white" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 9. RECENTLY SOLD / RENTED */}
      <section className="bg-accent/40 border-y border-border/50 section-gap">
        <div className="container-wide">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10">
            <div>
              <span className="section-label flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> {"Market Activity"}</span>
              <h2 className="font-serif text-3xl font-semibold text-foreground tracking-tight">{"Recently Completed Transactions"}</h2>
            </div>
          </div>

          {!recentlySoldLoading && recentlySold.length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
               {recentlySold.map((p) => (
                 <PropertyCard key={p.id} property={p} />
               ))}
             </div>
          ) : recentlySoldLoading ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
               {Array.from({ length: 4 }).map((_, i) => (
                 <div key={i} className="rounded-xl bg-card border border-border/50 h-72 animate-pulse" />
               ))}
             </div>
          ) : null}
        </div>
      </section>

      {/* 10. INVESTMENT EDUCATION */}
      <section className="container-wide section-gap">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-2 block">{"Education"}</span>
          <h2 className="font-serif text-3xl font-semibold text-foreground">{"How Fractional Ownership Works"}</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            {"We simplify real estate investing by dividing premium properties into affordable fractions, allowing you to build a diversified portfolio."}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {EDUCATION_STEPS.map((item, idx) => (
            <div key={idx} className="relative p-6 rounded-2xl bg-card border border-border/40 shadow-soft hover-lift">
              <div className="absolute -top-3 -left-3 h-9 w-9 rounded-full bg-primary text-white font-bold flex items-center justify-center text-sm border-2 border-background shadow-sm">
                {item.step}
              </div>
              <h3 className="font-semibold text-foreground mt-4 mb-2">{item.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 11. TESTIMONIALS */}
      <section className="bg-primary/5 border-y border-border/40 py-20">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl font-semibold text-foreground">{"What Our Clients Say"}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((item, idx) => (
              <div key={idx} className="bg-card p-8 rounded-2xl border border-border/40 shadow-soft hover-lift">
                <div className="flex gap-1 text-primary mb-4">
                  {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="text-muted-foreground italic mb-6 leading-relaxed text-sm">"{item.quote}"</p>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">{item.author}</h4>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{item.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 12. BLOG / MARKET INSIGHTS */}
      <section className="container-wide section-gap">
        <div className="section-header flex items-end justify-between mb-10">
          <div>
            <span className="section-label">{"Market Insights"}</span>
            <h2 className="font-serif text-3xl font-semibold text-foreground">{"Latest News & Guides"}</h2>
          </div>
          <Button asChild variant="outline" className="hidden sm:inline-flex">
            <Link to="/blog">{"View all articles"} <ArrowRight className="ml-2 h-4 w-4" /></Link>
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
            <h2 className="font-serif text-3xl font-semibold text-foreground mb-4">{"Stay Ahead of the Market"}</h2>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              {"Subscribe to our newsletter for exclusive property alerts, investment opportunities, and professional market analysis delivered straight to your inbox."}
            </p>
            <NewsletterForm />
            <p className="text-[11px] text-muted-foreground mt-4">{"We respect your privacy. No spam, ever."}</p>
          </div>
        </div>
      </section>

      {/* 14. PARTNER / TRUST STRIP */}
      <section className="border-t border-border/50 py-10 bg-background">
         <div className="container-wide flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
           {/* Realistic placeholders for partners */}
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