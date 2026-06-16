import { useState } from "react";
import { Link } from "react-router-dom";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Briefcase, Clock, MapPin, CheckCircle2, Search, ArrowRight, DollarSign, Calendar } from "lucide-react";
import { SEO } from "@/components/site/SEO";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useBrand } from "@/hooks/useBrand";
const openings = [
  {
    title: "Senior Property Agent",
    department: "Sales",
    location: "New York, NY",
    type: "Full-time",
    salary: "$120k - $250k OTE",
    posted: "2 days ago",
    description: "Lead client relationships, manage property viewings, and close residential and commercial deals across the Greater New York area. Must have at least 3 years of experience in premium real estate sales and strong negotiation skills.",
  },
  {
    title: "Investment Analyst",
    department: "Investments",
    location: "Remote",
    type: "Full-time",
    salary: "$90k - $130k",
    posted: "1 week ago",
    description: "Evaluate potential investment properties, build financial models, and support the asset management team with portfolio reporting. Strong proficiency in financial modeling and real estate valuation required.",
  },
  {
    title: "Marketing Coordinator",
    department: "Marketing",
    location: "Austin, TX",
    type: "Full-time",
    salary: "$65k - $85k",
    posted: "3 days ago",
    description: "Plan and execute property marketing campaigns, manage social media channels, and coordinate listing photography and content. Experience with digital marketing in real estate or luxury brands preferred.",
  },
  {
    title: "Customer Support Specialist",
    department: "Operations",
    location: "Remote",
    type: "Part-time",
    salary: "$25 - $35/hr",
    posted: "Just now",
    description: "Handle client inquiries, booking requests, and platform support across email, phone, and chat channels. Strong communication skills and a client-first attitude are essential.",
  },
  {
    title: "Full-Stack Software Engineer",
    department: "Engineering",
    location: "Remote",
    type: "Full-time",
    salary: "$130k - $170k",
    posted: "2 weeks ago",
    description: "Build and maintain our property listing platform, investor dashboard, and internal tools. Experience with React, TypeScript, and PostgreSQL required. Familiarity with Supabase or similar BaaS platforms is a strong advantage.",
  },
  {
    title: "Legal and Compliance Officer",
    department: "Legal",
    location: "San Francisco, CA",
    type: "Full-time",
    salary: "$140k - $180k",
    posted: "1 month ago",
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
  const { brand } = useBrand();
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [locFilter, setLocFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [applyModal, setApplyModal] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setApplyModal(null);
      toast({ title: "Application Submitted", description: "We have received your application and will be in touch soon." });
    }, 1500);
  };

  const departments = ["All", ...Array.from(new Set(openings.map(o => o.department)))];
  const locations = ["All", ...Array.from(new Set(openings.map(o => o.location)))];
  const types = ["All", ...Array.from(new Set(openings.map(o => o.type)))];

  const filteredOpenings = openings.filter(o => {
    const matchesSearch = o.title.toLowerCase().includes(searchQuery.toLowerCase()) || o.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === "All" || o.department === deptFilter;
    const matchesLoc = locFilter === "All" || o.location === locFilter;
    const matchesType = typeFilter === "All" || o.type === typeFilter;
    return matchesSearch && matchesDept && matchesLoc && matchesType;
  });

  return (
    <SiteLayout>
      <SEO title="Careers" description={`Join the ${brand.platform_name} team. We are looking for driven professionals to help us build the most trusted real estate platform in the United States.`} />
      
      {/* Hero Header */}
      <div className="relative overflow-hidden min-h-[500px] sm:min-h-[600px] flex items-center bg-black pt-20">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1920&q=80"
            alt={`${brand.platform_name} team collaboration`}
            className="h-full w-full object-cover scale-105"
            crossOrigin="anonymous"
          />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 z-[1]" />
        </div>
        
        <div className="container-wide relative z-10 py-20 flex flex-col items-start justify-center">
          <Badge className="mb-6 bg-primary/20 text-primary border border-primary/30 backdrop-blur-md px-4 py-1.5 font-bold uppercase tracking-widest text-xs">
            Career Opportunities
          </Badge>
          <h1 className="max-w-4xl font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight">
            Join Our Team
          </h1>
          <p className="mt-6 max-w-2xl text-lg sm:text-xl text-white/80 leading-relaxed font-light">
            We are building the future of transparent real estate and fractional investing. Work alongside industry experts in an environment that rewards innovation, autonomy, and direct impact.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 h-12 px-8 font-semibold text-base" asChild>
              <a href="#openings">View Open Positions</a>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white/5 text-white border-white/20 hover:bg-white/10 hover:text-white backdrop-blur-md h-12 px-8 font-semibold text-base" asChild>
              <a href="#general-application">Submit General Application</a>
            </Button>
          </div>
        </div>
      </div>

      {/* Perks */}
      <section className="container-wide -mt-12 relative z-20 pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {perks.map((p) => (
            <div key={p} className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-soft transition-all duration-300 hover:shadow-md hover:border-primary/30">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold text-foreground">{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Culture */}
      <section className="container-wide py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-3 text-sm font-bold tracking-widest uppercase text-primary">Our culture</p>
            <h2 className="font-serif text-3xl font-bold sm:text-4xl lg:text-5xl text-foreground leading-tight">
              Built on collaboration,<br/>driven by results.
            </h2>
            <div className="mt-8 space-y-6 text-muted-foreground leading-relaxed text-lg">
              <p>
                At {brand.platform_name}, we believe great work happens when people are given autonomy, clear goals, and the resources to succeed. Our team operates with a flat hierarchy where every voice matters.
              </p>
              <p>
                We invest heavily in our people through structured training programs, industry certifications, and regular mentorship sessions. Whether you are an experienced real estate professional or making a career transition, we provide the tools and support you need to grow.
              </p>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-xl border border-border">
            <img
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
              alt="Team collaboration"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 hover:scale-105"
              crossOrigin="anonymous"
            />
          </div>
        </div>
      </section>

      {/* Openings with Filters */}
      <section id="openings" className="bg-accent/30 py-24 border-y border-border">
        <div className="container-wide">
          <div className="max-w-2xl mb-12">
            <h2 className="font-serif text-3xl font-bold sm:text-4xl lg:text-5xl">Open Positions</h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">Filter by department, location, or search for specific roles.</p>
          </div>

          {/* Filters Bar */}
          <div className="bg-card border border-border/50 rounded-2xl p-4 sm:p-6 mb-10 shadow-soft">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search roles..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-11 bg-background"
                />
              </div>
              <select 
                value={deptFilter} 
                onChange={(e) => setDeptFilter(e.target.value)}
                className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {departments.map(d => <option key={d} value={d}>{d === "All" ? "All Departments" : d}</option>)}
              </select>
              <select 
                value={locFilter} 
                onChange={(e) => setLocFilter(e.target.value)}
                className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {locations.map(l => <option key={l} value={l}>{l === "All" ? "All Locations" : l}</option>)}
              </select>
              <select 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {types.map(t => <option key={t} value={t}>{t === "All" ? "All Employment Types" : t}</option>)}
              </select>
            </div>
          </div>

          {/* Job Grid */}
          {filteredOpenings.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredOpenings.map((job) => (
                <div key={job.title} className="group flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/40">
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <h3 className="font-serif text-2xl font-bold group-hover:text-primary transition-colors pr-2">{job.title}</h3>
                      <Badge variant="secondary" className="shrink-0">{job.department}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-6">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <MapPin className="h-4 w-4 text-primary" /> {job.location}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Clock className="h-4 w-4 text-primary" /> {job.type}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <DollarSign className="h-4 w-4 text-primary" /> {job.salary}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Calendar className="h-4 w-4 text-primary" /> {job.posted}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-6">
                      {job.description}
                    </p>
                  </div>
                  
                  <div className="pt-6 border-t border-border/40 mt-auto">
                    <Button 
                      className="w-full sm:w-auto font-semibold bg-primary hover:bg-primary/90 text-white"
                      onClick={() => setApplyModal(job)}
                    >
                      Apply for this role <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-bold text-foreground">No matching positions found</h3>
              <p className="text-muted-foreground mt-2">Try adjusting your filters or search query.</p>
              <Button variant="outline" className="mt-6" onClick={() => { setSearchQuery(""); setDeptFilter("All"); setLocFilter("All"); setTypeFilter("All"); }}>
                Reset Filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* General Application */}
      <section id="general-application" className="container-tight py-24 text-center">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-12 shadow-inner text-center">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-6">
            <Search className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-serif text-3xl font-bold sm:text-4xl">Don't see the right role?</h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            We are always looking for talented people. Send your CV directly to our recruiting team and we will keep you in mind for future openings.
          </p>
          <div className="mt-8">
            <a href={`mailto:${brand.support_email}`} className="inline-flex items-center justify-center rounded-xl bg-background border border-border px-8 py-4 text-lg font-bold text-primary hover:bg-muted transition-colors shadow-sm">
              {brand.support_email}
            </a>
          </div>
        </div>
      </section>

      {/* Application Modal */}
      <Dialog open={!!applyModal} onOpenChange={(open) => !open && setApplyModal(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleApply}>
            <DialogHeader>
              <DialogTitle>Apply for {applyModal?.title}</DialogTitle>
              <DialogDescription>
                Submit your details below to apply for this position in {applyModal?.location}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" required placeholder="Jane Doe" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" required placeholder="jane@example.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input id="linkedin" type="url" placeholder="https://linkedin.com/in/..." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="portfolio">Portfolio / Website (Optional)</Label>
                <Input id="portfolio" type="url" placeholder="https://..." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="coverLetter">Cover Letter</Label>
                <Textarea 
                  id="coverLetter" 
                  placeholder="Tell us why you're a great fit for this role..." 
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setApplyModal(null)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}
