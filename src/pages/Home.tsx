import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, Sparkles, TrendingUp, Users } from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { SearchBar } from "@/components/site/SearchBar";
import { PropertyCard, PropertyCardData } from "@/components/site/PropertyCard";
import { Button } from "@/components/ui/button";
import { resolveImage } from "@/lib/format";

export default function Home() {
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

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" className="h-full w-full object-cover" width={1920} height={1080} />
          <div className="absolute inset-0 bg-gradient-hero" />
        </div>
        <div className="container-wide relative flex min-h-[600px] flex-col justify-center py-20">
          <p className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-background/20 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur">
            <Sparkles className="h-3 w-3" /> Curated by our agency
          </p>
          <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-tight text-primary-foreground sm:text-5xl md:text-6xl">
            Find a home you&apos;ll love coming back to.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-primary-foreground/85">
            Browse curated homes for sale, premium rentals, and land — all hand-picked and managed by trusted agents.
          </p>
          <div className="mt-8 max-w-4xl">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-wide py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { type: "buy", title: "Homes for Sale", desc: "Family villas, apartments, and forever homes.", img: "/src/assets/property-1.jpg" },
            { type: "rent", title: "Rentals", desc: "Premium apartments and short-term homes.", img: "/src/assets/property-2.jpg" },
            { type: "land", title: "Land Acquisition", desc: "Surveyed plots ready for your project.", img: "/src/assets/property-4.jpg" },
          ].map((c) => (
            <Link
              key={c.type}
              to={`/properties?type=${c.type}`}
              className="group relative overflow-hidden rounded-2xl shadow-card"
            >
              <img src={resolveImage(c.img)} alt={c.title} loading="lazy" width={1280} height={960}
                className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
              <div className="absolute bottom-0 p-6 text-primary-foreground">
                <h3 className="font-serif text-2xl font-semibold">{c.title}</h3>
                <p className="mt-1 text-sm text-primary-foreground/85">{c.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium">
                  Browse <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured properties */}
      <section className="container-wide py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Featured</p>
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Hand-picked homes</h2>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/properties">View all <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </section>

      {/* Popular locations */}
      <section className="container-wide py-16">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">Popular locations</p>
          <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Where people are searching</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {locations.map((loc: any) => (
            <Link
              key={loc.id}
              to={`/properties?location=${loc.slug}`}
              className="group relative overflow-hidden rounded-xl shadow-soft"
            >
              <img src={resolveImage(loc.image_url)} alt={loc.name} loading="lazy" width={1024} height={768}
                className="h-48 w-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent" />
              <p className="absolute bottom-3 left-4 font-serif text-lg font-semibold text-primary-foreground">{loc.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="bg-secondary/40 py-20">
        <div className="container-tight grid gap-10 md:grid-cols-3">
          {[
            { icon: ShieldCheck, t: "Verified listings", d: "Every property is inspected and verified by our agency before going live." },
            { icon: Users, t: "Real human agents", d: "Talk to a trusted agent who knows the property — not a chatbot." },
            { icon: Sparkles, t: "Curated, not crowded", d: "We list fewer homes, but every one of them is worth your visit." },
          ].map((f) => (
            <div key={f.t} className="flex flex-col gap-3 text-center md:text-left">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-warm text-primary-foreground md:mx-0">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="font-serif text-xl font-semibold">{f.t}</h3>
              <p className="text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Agents */}
      <section className="container-wide py-20">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">Meet the team</p>
          <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Trusted agents at your service</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a: any) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <img src={resolveImage(a.photo_url)} alt={a.full_name}
                className="h-20 w-20 rounded-full object-cover" loading="lazy" width={512} height={512} />
              <h3 className="mt-4 font-serif text-xl font-semibold">{a.full_name}</h3>
              <p className="text-sm text-muted-foreground">{a.role_title}</p>
              <p className="mt-3 text-sm text-foreground/80">{a.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Invest CTA */}
      <section className="container-wide pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-foreground to-foreground/90 p-10 text-primary-foreground shadow-lux sm:p-14">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-medium tracking-wider uppercase text-[hsl(var(--gold-soft))]">
                <TrendingUp className="h-3 w-3" /> New · Fractional Ownership
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold sm:text-4xl">
                Invest in real estate from any amount.
              </h2>
              <p className="mt-3 max-w-2xl text-primary-foreground/80">
                Co-invest in professionally managed, income-generating properties and track your returns from one clean portfolio.
              </p>
            </div>
            <Button asChild size="lg" className="bg-gradient-gold text-[hsl(var(--gold-foreground))] hover:opacity-95">
              <Link to="/invest">Explore Invest <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}