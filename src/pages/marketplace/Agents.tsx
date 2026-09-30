import { useQuery } from "@tanstack/react-query";
import { Phone, MessageSquare, Mail, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { resolveImage } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogBody } from "@/components/ui/dialog";
import { Reviews } from "@/components/site/Reviews";
import { AgentReviews, AgentRatingBadge } from "@/components/site/AgentReviews";
import { SEO } from "@/components/site/SEO";
import { useBrand } from "@/hooks/useBrand";
import { LazyImage } from "@/components/ui/LazyImage";
import locationDowntown from "@/assets/location-downtown.jpg";

export default function Agents() {
  const { brand } = useBrand();
  const { data: agents = [] } = useQuery({
    queryKey: ["all-agents"],
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("*").order("featured", { ascending: false });
      return data ?? [];
    },
  });
  const { data: ratings = {} } = useQuery({
    queryKey: ["agent-ratings"],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("agent_id, rating").not("agent_id", "is", null);
      const map: Record<string, { avg: number; count: number }> = {};
      (data ?? []).forEach((r: any) => {
        if (!r.agent_id) return;
        const m = map[r.agent_id] ?? { avg: 0, count: 0 };
        m.avg = (m.avg * m.count + r.rating) / (m.count + 1);
        m.count += 1;
        map[r.agent_id] = m;
      });
      return map;
    },
  });
  return (
    <SiteLayout transparentNav="mobile">
      <SEO title="Our Agents" description={`Connect with verified ${brand.platform_name} agents. Real people, ready to help you find the right home.`} />
      
      {/* ── 1. People & Advisory Hero (Type E) ──────────────────── */}
      <section className="relative overflow-hidden bg-card border-b border-border/50 pt-16 md:pt-24 pb-8 md:pb-12">
        <div className="container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Advisory Intro */}
            <div className="lg:col-span-7 space-y-5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                  Licensed Advisors
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  State Real Estate Board Certified
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground tracking-tight leading-[1.15]">
                Meet our dedicated <span className="text-primary font-normal">property specialists</span>.
              </h1>

              <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
                Our full-time agents are embedded in regional markets. From physical property inspections to title verification and price negotiation, connect with professionals focused on your interests.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-6 text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5 text-foreground font-semibold">
                  {agents.length} Verified Agents
                </span>
                <span>•</span>
                <span>100% Identity Checked</span>
                <span>•</span>
                <span>Direct Chat &amp; Booking Available</span>
              </div>
            </div>

            {/* Right Column: Editorial Visual */}
            <div className="lg:col-span-5 relative">
              <div className="relative aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden border border-border/60 shadow-md group">
                <img
                  src={locationDowntown}
                  alt={`${brand.platform_name} Regional Advisory`}
                  className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-xs font-semibold">Ground-Level Market Coverage</p>
                  <p className="text-[11px] text-white/80 mt-0.5">Physical viewings scheduled directly with assigned listing agents</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
      <div className="container-wide grid gap-6 py-10 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a: any) => {
          const r = (ratings as any)[a.id];
          return (
            <div key={a.id} className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-soft">
              <LazyImage src={resolveImage(a.photo_url)} alt={a.full_name} aspectClass="" wrapperClassName="h-24 w-24 rounded-full overflow-hidden" className="h-full w-full object-cover" />
              <h3 className="mt-4 font-serif text-xl font-semibold">{a.full_name}</h3>
              <p className="text-sm text-muted-foreground">{a.role_title}</p>
              {r ? (
                <p className="mt-2 flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <strong>{r.avg.toFixed(1)}</strong>
                  <span className="text-muted-foreground">({r.count})</span>
                </p>
              ) : a.avg_rating > 0 ? (
                <div className="mt-2">
                  <AgentRatingBadge avgRating={a.avg_rating} reviewCount={a.review_count} />
                </div>
              ) : null}
              <p className="mt-3 text-sm text-foreground/85">{a.bio}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {a.phone && <Button asChild size="sm" variant="outline"><a href={`tel:${a.phone}`}><Phone className="mr-1 h-4 w-4" />Call</a></Button>}
                {a.whatsapp && <Button asChild size="sm" variant="outline"><a href={`https://wa.me/${a.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageSquare className="mr-1 h-4 w-4" />WhatsApp</a></Button>}
                {a.email && <Button asChild size="sm" variant="outline"><a href={`mailto:${a.email}`}><Mail className="mr-1 h-4 w-4" />Email</a></Button>}
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="mt-3 self-start text-primary">View reviews</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-serif">{a.full_name} — Reviews</DialogTitle></DialogHeader>
                  <DialogBody>
                    <AgentReviews agentId={a.id} agentName={a.full_name} />
                    <div className="mt-8 pt-6 border-t border-border">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Property Reviews</p>
                      <Reviews target={{ agentId: a.id }} />
                    </div>
                  </DialogBody>
                </DialogContent>
              </Dialog>
            </div>
          );
        })}
      </div>
    </SiteLayout>
  );
}
