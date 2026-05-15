import { useQuery } from "@tanstack/react-query";
import { Phone, MessageSquare, Mail, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { resolveImage } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogBody } from "@/components/ui/dialog";
import { Reviews } from "@/components/site/Reviews";
import { SEO } from "@/components/site/SEO";

export default function Agents() {
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
    <SiteLayout>
      <SEO title="Our Agents" description="Connect with verified Verdant Estate agents. Real people, ready to help you find the right home." />
      {/* Hero Header */}
      <div className="relative overflow-hidden min-h-[350px] sm:min-h-[400px] lg:min-h-[450px] flex items-center bg-black">
        <img 
          src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1920&q=80" 
          alt="Verdant Estate Agents" 
          className="absolute inset-0 h-full w-full object-cover"
          crossOrigin="anonymous"
        />
        <div className="absolute inset-0 bg-gradient-hero-emerald mix-blend-multiply opacity-60 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-[2]" />
        
        <div className="container-wide relative z-10 text-primary-foreground">
          <p className="mb-3 text-sm font-medium tracking-wider uppercase text-primary">Our Team</p>
          <h1 className="max-w-3xl font-serif text-4xl font-semibold sm:text-5xl md:text-6xl text-white leading-tight">
            Meet our verified agents.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/80 leading-relaxed">
            Real people, ready to help you find the right home. Connect with experts who know the market firsthand.
          </p>
        </div>
      </div>
      <div className="container-wide grid gap-6 py-10 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a: any) => {
          const r = (ratings as any)[a.id];
          return (
            <div key={a.id} className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-soft">
              <img src={resolveImage(a.photo_url)} alt={a.full_name} className="h-24 w-24 rounded-full object-cover" />
              <h3 className="mt-4 font-serif text-xl font-semibold">{a.full_name}</h3>
              <p className="text-sm text-muted-foreground">{a.role_title}</p>
              {r && (
                <p className="mt-2 flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  <strong>{r.avg.toFixed(1)}</strong>
                  <span className="text-muted-foreground">({r.count})</span>
                </p>
              )}
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
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>{a.full_name}</DialogTitle></DialogHeader>
                  <DialogBody>
                    <Reviews target={{ agentId: a.id }} />
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