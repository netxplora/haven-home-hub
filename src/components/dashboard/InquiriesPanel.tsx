import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Clock, CheckCircle2, AlertCircle, ArrowUpRight, Reply, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

export function InquiriesPanel({ userId }: { userId: string }) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["my-inquiries", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("inquiries")
        .select(`
          *,
          properties (title, slug)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (isLoading) return (
    <div className="space-y-4">
       {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-6 ">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between p-8 rounded-xl border border-border/40 bg-card shadow-soft">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight">Support & Inquiries</h2>
          <p className="mt-1 text-sm text-muted-foreground">Direct communication regarding properties and investments.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input placeholder="Search messages..." className="pl-10 rounded-xl bg-accent/50 border-border/40" />
           </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-16 text-center bg-secondary/5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/50 mb-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="font-serif text-xl font-medium text-foreground">No active inquiries</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">Have a question about a specific property? Reach out via the listing page to start a conversation.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {items.map((iq: any) => (
            <div key={iq.id} className="rounded-xl border border-border/40 bg-card p-6 shadow-soft transition-all duration-300 hover:shadow-md">
               <div className="flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                     <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <h4 className="font-serif text-lg font-bold text-foreground">
                             {iq.properties?.title || "General Inquiry"}
                           </h4>
                           <Badge variant={iq.status === 'resolved' ? 'default' : 'secondary'} className="rounded-md px-2 py-0.5 text-[9px] uppercase tracking-widest font-bold">
                              {iq.status}
                           </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                           <Clock className="h-3 w-3" /> Submitted on {new Date(iq.created_at).toLocaleDateString()}
                        </p>
                     </div>
                     <span className="font-mono text-[10px] text-muted-foreground/60 bg-accent px-2 py-1 rounded-md h-fit">ID: {iq.id.split('-')[0]}</span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                     <div className="p-4 rounded-xl bg-secondary/20 border border-border/30">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                           <MessageSquare className="h-3 w-3" /> Your Message
                        </p>
                        <p className="text-sm text-foreground leading-relaxed italic">"{iq.message}"</p>
                     </div>

                     {iq.status === 'resolved' ? (
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                           <p className="text-xs font-medium uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
                              <Reply className="h-3 w-3" /> Agent Response
                           </p>
                           <p className="text-sm text-foreground leading-relaxed">{iq.admin_response || "Our team has reviewed your request and will contact you shortly."}</p>
                           <p className="text-[10px] text-primary/60 font-medium mt-3 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Verified Support Team
                           </p>
                        </div>
                     ) : (
                        <div className="p-4 rounded-xl border border-dashed border-border/60 flex items-center justify-center text-center">
                           <div>
                              <Clock className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" />
                              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">Awaiting Feedback</p>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
