import { SiteLayout } from "@/components/site/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Mail, ArrowRight } from "lucide-react";
import { SEO } from "@/components/site/SEO";
import { useBrand } from "@/hooks/useBrand";
import property2 from "@/assets/property-2.jpg";

export default function Press() {
  const { brand } = useBrand();

  const releases = [
    {
      date: "April 2026",
      title: `${brand.platform_name} launches fractional property investment platform`,
      summary: "Investors can now co-own income-generating properties with transparent unit pricing and scheduled distributions. The platform supports both traditional bank transfers and digital currency deposits.",
    },
    {
      date: "March 2026",
      title: `${brand.platform_name} expands operations to three new cities`,
      summary: "The agency now covers Austin, Miami, and Ibadan, with dedicated full-time agents embedded in each region to provide localized market expertise.",
    },
    {
      date: "February 2026",
      title: `${brand.platform_name} surpasses $50M in total assets under management`,
      summary: "The fractional investment arm reaches a major milestone, with over 2,000 active investors participating in commercial and residential property portfolios.",
    },
    {
      date: "January 2026",
      title: `${brand.platform_name} closes 2025 with 400+ verified property listings`,
      summary: "Year-end results confirm continued growth in curated property inventory and agent network, with a 65% increase in transaction volume over the previous year.",
    },
    {
      date: "October 2025",
      title: `${brand.platform_name} introduces digital currency payments for property investments`,
      summary: "Buyers and investors can now pay with Bitcoin, Ethereum, and USDT alongside traditional banking methods, broadening access for international investors.",
    },
    {
      date: "July 2025",
      title: `${brand.platform_name} partners with leading valuation firm for property verification`,
      summary: "All listed properties now include independent valuation data to improve buyer confidence and ensure pricing accuracy across all markets.",
    },
  ];

  const coverage = [
    { outlet: "Business Daily", title: "How agency-led platforms are reshaping property search in North America" },
    { outlet: "Property Insider", title: `${brand.platform_name}: The case for curated listings over marketplace volume` },
    { outlet: "TechCrunch", title: `Fractional real estate investing gains traction with ${brand.platform_name} launch` },
    { outlet: "Financial Times", title: "US property tech sector matures with verified listing standards" },
    { outlet: "Bloomberg", title: `${brand.platform_name} raises the bar for real estate transparency in New York` },
    { outlet: "The Wall Street Journal", title: "From renting to owning: How fractional models are changing the market" },
  ];

  return (
    <SiteLayout>
      <SEO title="Press & Media" description={`Latest news, announcements, and media resources from ${brand.platform_name}.`} />
      
      {/* Hero Type D: Typography-Led Press Header */}
      <section className="relative bg-white dark:bg-background border-b border-border overflow-hidden pt-24 pb-14">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/20" />
        </div>
        <div className="container-wide relative z-10">
          <div className="max-w-3xl">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-emerald-600 dark:text-emerald-400 mb-5">
              Press & Media
            </p>
            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
              Company News &<br className="hidden sm:block" /> Media Coverage
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl font-sans">
              Announcements, milestones, and external coverage. For press inquiries, contact our communications team directly.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <a
                href={`mailto:${brand.support_email}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-4 py-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
              >
                <Mail className="h-4 w-4" /> Press Enquiries
              </a>
            </div>
          </div>
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
              <a href={`mailto:${brand.support_email}`} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-warm transition-all hover:bg-primary-glow hover:shadow-lg">
                <Mail className="h-4 w-4" /> {brand.support_email}
              </a>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
