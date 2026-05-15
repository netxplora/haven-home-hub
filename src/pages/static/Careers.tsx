import { Link } from "react-router-dom";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Clock, MapPin, CheckCircle2 } from "lucide-react";
import { SEO } from "@/components/site/SEO";

const openings = [
  {
    title: "Senior Property Agent",
    department: "Sales",
    location: "Lagos, Nigeria",
    type: "Full-time",
    description: "Lead client relationships, manage property viewings, and close residential and commercial deals across the Greater Lagos area. Must have at least 3 years of experience in premium real estate sales and strong negotiation skills.",
  },
  {
    title: "Investment Analyst",
    department: "Investments",
    location: "Remote",
    type: "Full-time",
    description: "Evaluate potential investment properties, build financial models, and support the asset management team with portfolio reporting. Strong proficiency in financial modeling and real estate valuation required.",
  },
  {
    title: "Marketing Coordinator",
    department: "Marketing",
    location: "Abuja, Nigeria",
    type: "Full-time",
    description: "Plan and execute property marketing campaigns, manage social media channels, and coordinate listing photography and content. Experience with digital marketing in real estate or luxury brands preferred.",
  },
  {
    title: "Customer Support Specialist",
    department: "Operations",
    location: "Remote",
    type: "Part-time",
    description: "Handle client inquiries, booking requests, and platform support across email, phone, and chat channels. Strong communication skills and a client-first attitude are essential.",
  },
  {
    title: "Full-Stack Software Engineer",
    department: "Engineering",
    location: "Remote",
    type: "Full-time",
    description: "Build and maintain our property listing platform, investor dashboard, and internal tools. Experience with React, TypeScript, and PostgreSQL required. Familiarity with Supabase or similar BaaS platforms is a strong advantage.",
  },
  {
    title: "Legal and Compliance Officer",
    department: "Legal",
    location: "Lagos, Nigeria",
    type: "Full-time",
    description: "Oversee property title verification, manage transaction documentation, and ensure regulatory compliance across all listing and investment operations. Must be a qualified legal practitioner with real estate experience.",
  },
];

const perks = [
  "Competitive salary with performance bonuses",
  "Flexible remote and hybrid work options",
  "Professional development budget",
  "Health insurance coverage",
  "Paid time off and public holidays",
  "Team events and annual retreats",
  "Equity participation for senior roles",
  "Mentorship from industry leaders",
  "Modern office spaces in key cities",
];

export default function Careers() {
  return (
    <SiteLayout>
      <SEO title="Careers" description="Join the Verdant Estate team. We are looking for driven professionals to help us build the most trusted real estate platform in Nigeria." />
      {/* Hero Header */}
      <div className="relative overflow-hidden min-h-[400px] sm:min-h-[500px] lg:min-h-[550px] flex items-center bg-black">
        <img
          src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1920&q=80"
          alt="Verdant Estate team collaboration"
          className="absolute inset-0 h-full w-full object-cover"
          crossOrigin="anonymous"
        />
        <div className="absolute inset-0 bg-gradient-hero-emerald mix-blend-multiply opacity-70 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-[2]" />
        
        <div className="container-wide relative z-10 text-primary-foreground">
          <p className="mb-3 text-sm font-medium tracking-wider uppercase text-primary">Careers</p>
          <h1 className="max-w-3xl font-serif text-4xl font-semibold sm:text-5xl md:text-6xl text-white leading-tight">
            Build your career with Verdant Estate.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/80 leading-relaxed">
            We are a team of agents, analysts, and operations specialists working together to create a transparent, efficient, and accessible property market. If you share our goals, we want to hear from you.
          </p>
          <div className="mt-8">
            <Button size="lg" className="bg-primary text-primary-foreground  shadow-card hover:bg-primary/90" asChild>
              <a href="#openings">View open positions</a>
            </Button>
          </div>
        </div>
      </div>

      {/* Perks */}
      <section className="container-wide -mt-10 relative z-20 pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {perks.map((p) => (
            <div key={p} className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-soft transition-all duration-300 hover:shadow-card hover:border-primary/30">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-foreground">{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Culture */}
      <section className="container-wide py-20">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-3 text-sm font-medium tracking-wider uppercase text-primary">Our culture</p>
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl text-foreground">
              Built on collaboration, driven by results.
            </h2>
            <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                At Verdant Estate, we believe great work happens when people are given autonomy, clear goals, and the resources to succeed. Our team operates with a flat hierarchy where every voice matters — from junior agents providing market feedback to engineers proposing new platform features.
              </p>
              <p>
                We invest heavily in our people through structured training programs, industry certifications, and regular mentorship sessions. Whether you are an experienced real estate professional or making a career transition, we provide the tools and support you need to grow.
              </p>
              <p>
                Our work environment balances accountability with flexibility. Remote work is standard for engineering and support roles, while field agents benefit from office access in our Lagos and Abuja locations. All team members participate in quarterly reviews focused on growth, not just targets.
              </p>
            </div>
          </div>
          <div className="relative aspect-video overflow-hidden rounded-xl shadow-card border border-border">
            <img
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
              alt="Verdant Estate team collaboration"
              className="absolute inset-0 h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          </div>
        </div>
      </section>

      {/* Openings */}
      <section id="openings" className="bg-accent/50 py-24 border-y border-border">
        <div className="container-wide">
          <div className="max-w-2xl mb-12">
            <p className="mb-3 text-sm font-medium tracking-wider uppercase text-primary">Open positions</p>
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Current openings</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">Explore our available roles and find the right fit for your skills.</p>
          </div>
          <div className="space-y-5">
            {openings.map((job) => (
              <div key={job.title} className="group rounded-xl border border-border bg-card p-7 shadow-soft transition-all duration-300 hover:shadow-card hover:border-primary/30">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-xl font-semibold group-hover:text-primary transition-colors">{job.title}</h3>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> {job.department}</span>
                      <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {job.location}</span>
                      <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {job.type}</span>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{job.description}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">{job.department}</Badge>
                </div>
                <Button size="sm" className="mt-5 bg-primary text-primary-foreground  hover:bg-primary/90">
                  Apply now
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* General Application */}
      <section className="container-tight py-24 text-center">
        <div className="rounded-xl border border-primary/20 bg-card p-10 shadow-soft">
          <h2 className="font-serif text-2xl font-semibold sm:text-3xl">Don't see the right role?</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            We are always looking for talented people. Send your CV to{" "}
            <a href="mailto:careers@verdantestate.com" className="font-medium text-primary hover:underline">
              careers@verdantestate.com
            </a>{" "}
            and we will keep you in mind for future openings.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
