import React from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, User, Mail, Phone, Briefcase, Trash2, CheckCircle2, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AdminBookings() {
  const qc = useQueryClient();
  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => (await supabase.from("bookings").select("*, properties(title, slug), agents(full_name)").order("preferred_date", { ascending: false })).data ?? [],
  });

  const { data: agents = [] } = useQuery({ 
    queryKey: ["admin-agents-list"], 
    queryFn: async () => (await supabase.from("agents").select("id, full_name").order("full_name")).data ?? [] 
  });

  async function updateBooking(id: string, payload: any) {
    const { error } = await supabase.from("bookings").update(payload).eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Booking updated" });
      refetch();
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this booking record?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (!error) {
      toast({ title: "Booking removed" });
      refetch();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold">Property Bookings</h2>
        <p className="text-sm text-muted-foreground">Manage tour requests and appointment schedules.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      ) : (
      <div className="space-y-4">
        {bookings.map((b: any) => (
          <div key={b.id} className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-6 transition-all hover:shadow-lg hover:border-primary/20">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex-1 min-w-[280px] space-y-4">
                <div>
                  <Link to={`/properties/${b.properties?.slug}`} className="font-serif text-lg font-bold hover:text-primary transition-colors">
                    {b.properties?.title || "Unknown Property"}
                  </Link>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Requested: {new Date(b.preferred_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center text-muted-foreground">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider leading-none mb-1">Lead Name</p>
                      <p className="text-sm font-medium">{b.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider leading-none mb-1">Contact</p>
                      <p className="text-sm font-medium truncate">{b.email}</p>
                    </div>
                  </div>
                </div>

                {b.notes && (
                  <div className="rounded-xl bg-accent/50 p-3 text-xs text-muted-foreground italic border border-border/30">
                    "{b.notes}"
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 w-full sm:w-auto sm:items-end">
                <Badge variant={
                  b.status === "completed" ? "default" : 
                  b.status === "confirmed" ? "secondary" : 
                  b.status === "cancelled" ? "destructive" : "outline"
                } className="h-6 rounded-md uppercase text-[9px] tracking-widest font-bold px-3">
                  {b.status}
                </Badge>

                <div className="space-y-2 w-full sm:w-[200px]">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Assign Agent</Label>
                    <Select defaultValue={b.agent_id ?? "none"} onValueChange={(v) => updateBooking(b.id, { agent_id: v === "none" ? null : v })}>
                      <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue placeholder="Assign" /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="none">Unassigned</SelectItem>
                        {agents.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Set Status</Label>
                    <Select defaultValue={b.status} onValueChange={(v) => updateBooking(b.id, { status: v as any })}>
                      <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => remove(b.id)} 
                  className="h-8 text-xs text-muted-foreground hover:text-destructive self-end group-hover:opacity-100 opacity-0 transition-opacity"
                >
                  <Trash2 className="mr-2 h-3 w-3" /> Archive Booking
                </Button>
              </div>
            </div>
          </div>
        ))}
        {bookings.length === 0 && !isLoading && (
          <div className="p-16 text-center rounded-xl border border-dashed border-border/50 bg-secondary/10">
            <Calendar className="h-14 w-14 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="font-serif text-xl text-muted-foreground italic">No tour bookings yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Pending requests from properties will appear here.</p>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
