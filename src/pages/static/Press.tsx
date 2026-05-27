import { SiteLayout } from "@/components/site/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Mail, ArrowRight } from "lucide-react";
import { SEO } from "@/components/site/SEO";

const releases = [
  {
    date: "April 2026",
    title: "Haven Home Hub launches fractional property investment platform",
    summary: "Investors can now co-own income-generating properties with transparent unit pricing and scheduled distributions. The platform supports both traditional bank transfers and digital currency deposits.",
  },
  {
    date: "March 2026",
    title: "Haven Home Hub expands operations to three new cities",
    summary: "The agency now covers Austin, Miami, and Ibadan, with dedicated full-time agents embedded in each region to provide localized market expertise.",
  },
  {
    date: "February 2026",
    title: "Haven Home Hub surpasses $50M in total assets under management",
    summary: "The fractional investment arm reaches a major milestone, with over 2,000 active investors participating in commercial and residential property portfolios.",
  },
  {
    date: "January 2026",
    title: "Haven Home Hub closes 2025 with 400+ verified property listings",
    summary: "Year-end results confirm continued growth in curated property inventory and agent network, with a 65% increase in transaction volume over the previous year.",
  },
  {
    date: "October 2025",
    title: "Haven Home Hub introduces digital currency payments for property investments",
    summary: "Buyers and investors can now pay with Bitcoin, Ethereum, and USDT alongside traditional banking methods, broadening access for international investors.",
  },
  {
    date: "July 2025",
    title: "Haven Home Hub partners with leading valuation firm for property verification",
    summary: "All listed properties now include independent valuation data to improve buyer confidence and ensure pricing accuracy across all markets.",
  },
];

const coverage = [
  { outlet: "Business Daily", title: "How agency-led platforms are reshaping property search in North America" },
  { outlet: "Property Insider", title: "Haven Home Hub: The case for curated listings over marketplace volume" },
  { outlet: "TechCrunch", title: "Fractional real estate investing gains traction with Haven Home Hub launch" },
  { outlet: "Financial Times", title: "US property tech sector matures with verified listing standards" },
  { outlet: "Bloomberg", title: "Haven Home Hub raises the bar for real estate transparency in New York" },
  { outlet: "The Wall Street Journal", title: "From renting to owning: How fractional models are changing the market" },
];

export default function Press() {
  return (
    <SiteLayout>
      <SEO title="Press & Media" description="Latest news, announcements, and media resources from Haven Home Hub." />
      {/* Header */}
      <section className="relative overflow-hidden min-h-[350px] sm:min-h-[450px] lg:min-h-[500px] flex items-center bg-black">
        <img 
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80" 
          alt="Press & Media Office" 
          className="absolute inset-0 h-full w-full object-cover"
          crossOrigin="anonymous"
        />
        <div className="absolute inset-0 bg-gradient-hero-orange mix-blend-multiply opacity-60 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-[2]" />
        
        <div className="container-wide relative z-10 text-primary-foreground">
          <p className="mb-4 text-sm font-medium tracking-wider text-primary uppercase">Press & Media</p>
          <h1 className="font-serif text-4xl font-semibold sm:text-5xl md:text-6xl text-white leading-tight">
            News and updates.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/80 leading-relaxed">
            Company announcements, milestones, and external media coverage. Stay informed on the latest developments from the platform.
          </p>
        </div>
      </section>

      {/* Press releases */}
      <section className="container-wide py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
          <div>
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Press releases</h2>
            <p className="mt-2 text-muted-foreground">Official statements from the leadership team.</p>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {releases.map((r) => (
            <div key={r.title} className="group cursor-pointer rounded-xl border border-border bg-card p-8 shadow-soft transition-all duration-300 hover:shadow-card hover:border-primary/30 flex flex-col h-full">
              <div className="mb-4">
                <Badge variant="secondary" className="bg-accent">{r.date}</Badge>
              </div>
              <h3 className="font-serif text-xl font-semibold leading-snug group-hover:text-primary transition-colors">{r.title}</h3>
              <p className="mt-4 text-muted-foreground flex-1">{r.summary}</p>
              
              <div className="mt-6 flex items-center text-sm font-medium text-primary">
                Read release <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Media coverage */}
      <section className="bg-gradient-to-b from-secondary/30 to-background py-20 border-y border-border">
        <div className="container-wide">
          <h2 className="font-serif text-3xl font-semibold sm:text-4xl text-center">Media coverage</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {coverage.map((c) => (
              <div key={c.title} className="group flex flex-col justify-center rounded-xl border border-border bg-card p-8 shadow-soft transition-all duration-300 hover:shadow-card">
                <p className="text-xs font-medium uppercase tracking-wider text-primary">{c.outlet}</p>
                <h3 className="mt-3 font-serif text-lg font-semibold leading-snug group-hover:text-primary transition-colors">{c.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="container-wide py-24">
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-card to-primary/10 p-12 text-center shadow-card">
          <div className="relative z-10">
            <h2 className="font-serif text-3xl font-semibold">Media inquiries</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground leading-relaxed">
              For press inquiries, interview requests, or access to our official media kit and brand assets, please contact our communications team directly.
            </p>
            <div className="mt-8">
              <a href="mailto:press@verdantestate.com" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-warm transition-all hover:bg-primary-glow hover:shadow-lg">
                <Mail className="h-4 w-4" /> press@verdantestate.com
              </a>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
