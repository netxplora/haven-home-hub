import { useQuery } from "@tanstack/react-query";
import { Phone, MessageSquare, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { resolveImage } from "@/lib/format";

export default function Agents() {
  const { data: agents = [] } = useQuery({
    queryKey: ["all-agents"],
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("*").order("featured", { ascending: false });
      return data ?? [];
    },
  });
  return (
    <SiteLayout>
      <div className="bg-secondary/40">
        <div className="container-wide py-10">
          <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Our agents</h1>
          <p className="mt-1 text-muted-foreground">Real people, ready to help you find the right home.</p>
        </div>
      </div>
      <div className="container-wide grid gap-6 py-10 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a: any) => (
          <div key={a.id} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <img src={resolveImage(a.photo_url)} alt={a.full_name} className="h-24 w-24 rounded-full object-cover" />
            <h3 className="mt-4 font-serif text-xl font-semibold">{a.full_name}</h3>
            <p className="text-sm text-muted-foreground">{a.role_title}</p>
            <p className="mt-3 text-sm text-foreground/85">{a.bio}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {a.phone && <Button asChild size="sm" variant="outline"><a href={`tel:${a.phone}`}><Phone className="mr-1 h-4 w-4" />Call</a></Button>}
              {a.whatsapp && <Button asChild size="sm" variant="outline"><a href={`https://wa.me/${a.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageSquare className="mr-1 h-4 w-4" />WhatsApp</a></Button>}
              {a.email && <Button asChild size="sm" variant="outline"><a href={`mailto:${a.email}`}><Mail className="mr-1 h-4 w-4" />Email</a></Button>}
            </div>
          </div>
        ))}
      </div>
    </SiteLayout>
  );
}