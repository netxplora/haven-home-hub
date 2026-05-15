import { Link } from "react-router-dom";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Building2, Handshake, MapPin, ShieldCheck, Users } from "lucide-react";
import { SEO } from "@/components/site/SEO";

const stats = [
  { label: "Properties listed", value: "500+" },
  { label: "Cities covered", value: "12" },
  { label: "Agents on staff", value: "30+" },
  { label: "Successful deals", value: "1,200+" },
];

const values = [
  {
    icon: ShieldCheck,
    title: "Trust first",
    body: "Every property is inspected and verified before it goes live. Buyers and tenants always see accurate, up-to-date information.",
  },
  {
    icon: Handshake,
    title: "Client-centered service",
    body: "Our agents work for you — not a quota. We prioritize honest advice and long-term relationships over fast transactions.",
  },
  {
    icon: MapPin,
    title: "Local expertise",
    body: "Each agent specializes in a defined region, offering deep knowledge of pricing, neighborhoods, and opportunities.",
  },
  {
    icon: Users,
    title: "Accessible investing",
    body: "Through fractional ownership, we make income-generating real estate available to more people at lower entry points.",
  },
];

export default function About() {
  return (
    <SiteLayout>
      <SEO title="About Us" description="Learn about Verdant Estate — a trusted, agency-led real estate platform offering verified properties, dedicated agents, and structured investment opportunities across Nigeria." />
      {/* Hero Header */}
      <div className="relative overflow-hidden min-h-[400px] sm:min-h-[500px] lg:min-h-[550px] flex items-center bg-black">
        <img 
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80" 
          alt="Verdant Estate Corporate Office" 
          className="absolute inset-0 h-full w-full object-cover"
          crossOrigin="anonymous"
        />
        <div className="absolute inset-0 bg-gradient-hero-emerald mix-blend-multiply opacity-70 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-[2]" />
        
        <div className="container-wide relative z-10 text-primary-foreground">
          <p className="mb-3 text-sm font-medium tracking-wider uppercase text-primary">About Us</p>
          <h1 className="max-w-3xl font-serif text-4xl font-semibold sm:text-5xl md:text-6xl text-white leading-tight">
            A real estate agency built on honesty and local expertise.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/80 leading-relaxed">
            We are an agency-led platform that curates homes for sale, rentals, and land — supported by a team of full-time agents who know the market firsthand.
          </p>
        </div>
      </div>

      {/* Stats */}
      <section className="container-wide -mt-10 relative z-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 pb-16">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-8 text-center shadow-soft transition-all duration-300 hover:shadow-card hover:border-primary/40">
            <p className="font-serif text-4xl font-semibold text-primary">{s.value}</p>
            <p className="mt-2 text-sm uppercase tracking-wider text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      {/* Story */}
      <section className="container-tight py-20">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-3 text-sm font-medium tracking-wider uppercase text-primary">Our story</p>
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl text-foreground">
              Started from a single office. Now serving thousands of families.
            </h2>
            <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Verdant Estate was founded with a straightforward idea: people deserve a better way to find their next home. Instead of flooding a marketplace with unverified listings, we built an agency model where every property is visited, photographed, and validated by our team before it becomes available.
              </p>
              <p>
                Today, we operate across multiple cities with a growing team of specialized agents. Whether you are buying your first apartment, leasing commercial space, or investing in fractional property ownership, our process stays the same — honest, hands-on, and results-focused.
              </p>
              <p>
                Our agents are full-time employees, not freelance contractors. They are embedded in the communities they serve, giving them first-hand knowledge of local pricing trends, zoning regulations, and neighborhood dynamics. This ground-level expertise allows us to offer reliable guidance that generic listing platforms simply cannot match.
              </p>
              <p>
                Over the years, we have expanded beyond traditional sales and rentals to include a structured fractional investment program. This allows individuals to participate in high-value real estate assets with lower capital requirements and professionally managed returns — all tracked through a single dashboard.
              </p>
            </div>
          </div>
          <div className="relative aspect-square md:aspect-[4/5] overflow-hidden rounded-xl shadow-card border border-border">
            <img 
              src="/about_office.png" 
              alt="Our professional real estate office" 
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105"
            />
            <div className="absolute inset-0 ring-1 ring-inset ring-primary/20 rounded-xl pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Our Approach */}
      <section className="bg-card border-y border-border py-20">
        <div className="container-wide">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="mb-3 text-sm font-medium tracking-wider uppercase text-primary">How we work</p>
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Our approach to real estate</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              We operate differently from typical property listing platforms. Every step of our process is designed to protect clients, ensure accuracy, and deliver measurable results.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-background p-8 shadow-soft">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary mb-6">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-semibold">Physical verification</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Before any property is listed on our platform, our team conducts a physical inspection. We verify legal documentation, check structural integrity, confirm ownership status, and take professional photography. This ensures that what you see on screen matches what exists on the ground — no surprises, no misrepresentation.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-8 shadow-soft">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary mb-6">
                <Handshake className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-semibold">Dedicated agent support</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Every listing is assigned to a specific agent who manages the entire transaction from initial inquiry through closing. Our agents provide market comparables, negotiate on your behalf, coordinate inspections, and handle all paperwork — keeping the process efficient and transparent at every stage.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-8 shadow-soft">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 mb-6">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-semibold">Structured investments</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Our fractional investment program allows you to co-own income-generating real estate. Each investment property has a clearly defined unit structure, projected yields based on actual rental performance, and a defined holding period. All distributions are tracked and paid through your personal dashboard wallet.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-accent/50 py-24 border-b border-border">
        <div className="container-wide">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="mb-3 text-sm font-medium tracking-wider uppercase text-primary">What drives us</p>
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Our core values</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              These principles guide every decision we make — from which properties to list, to how we structure investment offerings, to how we train and compensate our agents.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v.title} className="group rounded-xl border border-border bg-card p-8 shadow-soft transition-all duration-300 hover:shadow-card hover:border-primary/40">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/5 text-primary transition-colors group-hover:bg-primary/10">
                  <v.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-6 font-serif text-xl font-semibold">{v.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-tight py-24 text-center">
        <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Ready to find your place?</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground leading-relaxed">
          Browse our curated collection of verified properties, explore fractional investment opportunities, or connect with one of our specialized agents to begin your search. Every interaction is backed by our commitment to transparency and professional service.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg" className="bg-primary text-primary-foreground  hover:bg-primary/90">
            <Link to="/properties">View properties</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-border hover:bg-accent">
            <Link to="/agents">Meet our agents</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
