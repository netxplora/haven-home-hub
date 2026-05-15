import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, Sparkles, TrendingUp, Users } from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { SearchBar } from "@/components/site/SearchBar";
import { PropertyCard, PropertyCardData } from "@/components/site/PropertyCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { resolveImage } from "@/lib/format";
import { SEO } from "@/components/site/SEO";

const heroImages = [
  heroImg,
  "/hero_modern_villa.png",
  "/hero_luxury_penthouse.png"
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const { data: featured = [] } = useQuery({
    queryKey: ["featured-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, slug, title, price, currency, property_type, status, bedrooms, bathrooms, size_sqm, cover_image_url, address, locations(name)")
        .eq("featured", true)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data as PropertyCardData[];
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["featured-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations").select("*").eq("featured", true).limit(4);
      if (error) throw error;
      return data;
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["featured-agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents").select("*").eq("featured", true).limit(3);
      if (error) throw error;
      return data;
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

  const trust = contentMap.homepage_trust || {
    items: [
      { title: "Verified listings", description: "Every property is inspected and verified by our agency before going live." },
      { title: "Real human agents", description: "Talk to a trusted agent who knows the property — not a chatbot." },
      { title: "Curated, not crowded", description: "We list fewer homes, but every one of them is worth your visit." },
    ]
  };

  const investCta = contentMap.homepage_invest_cta || {
    badge: "Property Co-Investment",
    title: "Invest in real estate from any amount.",
    description: "Co-invest in professionally managed, income-generating properties and track your returns from one clean portfolio."
  };

  return (
    <SiteLayout>
      <SEO />

      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[480px] sm:min-h-[560px] lg:min-h-[620px] flex items-center">
        <div className="absolute inset-0">
          {heroImages.map((img, index) => (
            <div
              key={img}
              className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${
                index === currentSlide ? "opacity-100" : "opacity-0"
              }`}
            >
              <img
                src={img}
                alt="Real Estate"
                className={`h-full w-full object-cover transition-transform duration-[7000ms] ease-linear ${
                  index === currentSlide ? "scale-[1.04]" : "scale-100"
                }`}
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-secondary/25 mix-blend-multiply z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30 z-[2]" />
        </div>

        <div className="container-wide relative z-10 py-20">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm border border-white/10">
            <Sparkles className="h-3 w-3" /> {hero.badge}
          </p>
          <h1 className="max-w-2xl font-serif text-3xl font-semibold leading-tight text-white sm:text-4xl md:text-5xl">
            {hero.title}
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/75 sm:text-lg">
            {hero.subtitle}
          </p>
          <div className="mt-8 max-w-3xl">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* ── Categories ─────────────────────────────── */}
      <section className="container-wide section-gap">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { type: "buy", title: "Homes for Sale", desc: "Family villas, apartments, and forever homes.", img: "/src/assets/property-1.jpg" },
            { type: "rent", title: "Rentals", desc: "Premium apartments and short-term homes.", img: "/src/assets/property-2.jpg" },
            { type: "land", title: "Buy Land", desc: "Surveyed plots ready for your project.", img: "/src/assets/property-4.jpg" },
          ].map((c) => (
            <Link
              key={c.type}
              to={`/properties?type=${c.type}`}
              className="group relative overflow-hidden rounded-xl shadow-soft"
            >
              <img src={resolveImage(c.img)} alt={c.title} loading="lazy" width={1280} height={960}
                className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 p-5 text-white">
                <h3 className="font-serif text-xl font-semibold">{c.title}</h3>
                <p className="mt-1 text-sm text-white/80">{c.desc}</p>
                <span className="mt-2.5 inline-flex items-center gap-1 text-sm font-medium text-white/90">
                  Browse <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured Properties ────────────────────── */}
      <section className="container-wide pb-16 sm:pb-20">
        <div className="section-header flex items-end justify-between">
          <div>
            <span className="section-label">Featured</span>
            <h2>Hand-picked homes</h2>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex text-primary font-medium hover:bg-primary/5">
            <Link to="/properties">View all <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </section>

      {/* ── Popular Locations ──────────────────────── */}
      <section className="container-wide pb-16 sm:pb-20">
        <div className="section-header">
          <span className="section-label">Popular locations</span>
          <h2>Where people are searching</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {locations.map((loc: any) => (
            <Link
              key={loc.id}
              to={`/properties?location=${loc.slug}`}
              className="group relative overflow-hidden rounded-xl shadow-soft"
            >
              <img src={resolveImage(loc.image_url)} alt={loc.name} loading="lazy" width={1024} height={768}
                className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <p className="absolute bottom-3 left-4 font-serif text-base font-semibold text-white">{loc.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Trust ──────────────────────────────────── */}
      <section className="bg-accent/60 border-y border-border/40 section-gap">
        <div className="container-tight grid gap-10 md:grid-cols-3">
          {trust.items.map((f: any, idx: number) => {
            const icons = [ShieldCheck, Users, Sparkles];
            const Icon = icons[idx % icons.length];
            return (
              <div key={f.title || idx} className="flex flex-col gap-3 text-center md:text-left">
                <span className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary md:mx-0">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="font-serif text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Agents ─────────────────────────────────── */}
      <section className="container-wide section-gap">
        <div className="section-header">
          <span className="section-label">Meet the team</span>
          <h2>Trusted agents at your service</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a: any) => (
            <div key={a.id} className="rounded-xl border border-border/50 bg-card p-6 shadow-soft hover:shadow-card transition-shadow">
              <img src={resolveImage(a.photo_url)} alt={a.full_name}
                className="h-16 w-16 rounded-full object-cover border-2 border-border/30" loading="lazy" width={512} height={512} />
              <h3 className="mt-4 font-serif text-lg font-semibold text-foreground">{a.full_name}</h3>
              <p className="text-xs font-medium text-primary mt-1">{a.role_title}</p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3">{a.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Blog ───────────────────────────────────── */}
      <section className="bg-accent/60 border-y border-border/40 section-gap">
        <div className="container-wide">
          <div className="section-header flex items-end justify-between">
            <div>
              <span className="section-label">From our blog</span>
              <h2>Real Estate Insights</h2>
            </div>
            <Button asChild variant="ghost" className="hidden sm:inline-flex text-primary font-medium hover:bg-primary/5">
              <Link to="/blog">View all articles <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
          <BlogTeaser />
        </div>
      </section>

      {/* ── Invest CTA ─────────────────────────────── */}
      <section className="container-wide section-gap">
        <div className="relative overflow-hidden rounded-xl p-10 text-white sm:p-14">
          <img 
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80" 
            alt="Investment Property" 
            className="absolute inset-0 h-full w-full object-cover"
            crossOrigin="anonymous"
          />
          <div className="absolute inset-0 bg-secondary/90" />
          <div className="absolute inset-0 bg-gradient-to-r from-secondary/60 to-transparent" />
          
          <div className="relative z-10 grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-medium tracking-wider uppercase text-primary bg-primary/15 px-3 py-1.5 rounded-full">
                <TrendingUp className="h-3 w-3" /> {investCta.badge}
              </p>
              <h2 className="mt-4 font-serif text-2xl font-semibold sm:text-3xl leading-snug">
                {investCta.title}
              </h2>
              <p className="mt-3 max-w-xl text-white/70 leading-relaxed">
                {investCta.description}
              </p>
            </div>
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm rounded-lg font-medium">
              <Link to="/invest">View Investments <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
            </Button>
          </div>
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
          className="group flex flex-col rounded-xl border border-border/50 bg-card overflow-hidden transition-all duration-300 hover:shadow-card"
        >
          {post.cover_image_url ? (
            <div className="aspect-[16/10] overflow-hidden bg-muted">
              <img
                src={post.cover_image_url}
                alt={post.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                crossOrigin="anonymous"
              />
            </div>
          ) : (
            <div className="aspect-[16/10] bg-accent flex items-center justify-center">
              <span className="text-muted-foreground font-serif text-base">Verdant Estate</span>
            </div>
          )}
          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-center gap-2.5 mb-3">
              {post.blog_categories?.name && (
                <Badge variant="secondary" className="font-medium text-xs rounded-md">{post.blog_categories.name}</Badge>
              )}
              <time className="text-xs text-muted-foreground">
                {new Date(post.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </time>
            </div>
            <h3 className="font-serif text-base font-semibold leading-snug group-hover:text-primary transition-colors">
              {post.title}
            </h3>
            {post.excerpt && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
            )}
            <div className="mt-auto pt-4 text-sm font-medium text-primary flex items-center gap-1">
              Read More <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}