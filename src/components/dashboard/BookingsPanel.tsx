import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, MapPin, CheckCircle2, AlertCircle, XCircle, MoreVertical, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

export function BookingsPanel({ userId }: { userId: string }) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["my-bookings", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select(`
          *,
          properties (title, slug, address, cover_image_url)
        `)
        .eq("user_id", userId)
        .order("preferred_date", { ascending: false });
      return data ?? [];
    },
  });

  if (isLoading) return (
    <div className="space-y-4">
       {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
    </div>
  );

  function getStatusStyle(status: string) {
    switch (status) {
      case "completed": return "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400";
      case "cancelled": return "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400";
      case "confirmed": return "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";
      case "pending": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400";
      default: return "bg-secondary text-secondary-foreground";
    }
  }

  return (
    <div className="space-y-6 ">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between p-8 rounded-xl border border-border/40 bg-card shadow-soft">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight">Viewing Schedule</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage your on-site property inspections and tours.</p>
        </div>
        <div className="flex items-center gap-3">
           <Badge variant="secondary" className="rounded-lg px-4 py-1.5 font-bold">{items.length} Appointments</Badge>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-16 text-center bg-secondary/5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/50 mb-4">
            <Calendar className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="font-serif text-xl font-medium text-foreground">No viewings scheduled</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">Schedule a viewing to experience our premium properties in person.</p>
          <Button asChild className="mt-8 rounded-xl px-8" size="lg">
            <Link to="/properties">Book a Tour</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6">
           {items.map((b: any) => (
              <div key={b.id} className="rounded-xl border border-border/40 bg-card overflow-hidden shadow-soft transition-all duration-300 hover:shadow-md group">
                 <div className="flex flex-col md:flex-row">
                    <div className="h-40 md:h-auto md:w-64 shrink-0 overflow-hidden bg-muted">
                       <img src={b.properties?.cover_image_url || "/placeholder.svg"} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" alt="" />
                    </div>
                    <div className="flex-1 p-6 space-y-6">
                       <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="space-y-1">
                             <h4 className="font-serif text-xl font-bold text-foreground">{b.properties?.title}</h4>
                             <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" /> {b.properties?.address}
                             </p>
                          </div>
                          <Badge className={`capitalize rounded-md flex w-fit items-center gap-1.5 px-3 py-1 text-[10px] font-bold ${getStatusStyle(b.status)}`}>
                             {b.status === 'completed' ? <CheckCircle2 className="h-3 w-3" /> : b.status === 'cancelled' ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                             {b.status}
                          </Badge>
                       </div>

                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t border-border/40">
                          <div className="space-y-1">
                             <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</p>
                             <p className="text-sm font-bold text-foreground">{new Date(b.preferred_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                          </div>
                          <div className="space-y-1">
                             <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Preferred Time</p>
                             <p className="text-sm font-bold text-foreground">{b.preferred_time || "10:00 AM"}</p>
                          </div>
                          <div className="sm:col-span-2 flex justify-end gap-2">
                             <Button asChild variant="outline" size="sm" className="rounded-xl border-border/40 text-[11px] font-bold h-10">
                                <Link to={`/properties/${b.properties?.slug}`}>
                                   Property Profile <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                                </Link>
                             </Button>
                             {(b.status === 'confirmed' || b.status === 'pending') && (
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-secondary/80">
                                   <MoreVertical className="h-4 w-4" />
                                </Button>
                             )}
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           ))}
        </div>
      )}
    </div>
  );
}
