import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Bell, BellOff, Bookmark, Trash2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface SaveSearchButtonProps {
  currentFilters: Record<string, string>;
}

export function SaveSearchButton({ currentFilters }: SaveSearchButtonProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [alertFreq, setAlertFreq] = useState("daily");
  const [alertsOn, setAlertsOn] = useState(true);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from("saved_searches" as any).insert({
        user_id: user!.id,
        name: name || "My Search",
        filters: currentFilters,
        alerts_enabled: alertsOn,
        alert_frequency: alertFreq,
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Search saved", description: alertsOn ? `You'll receive ${alertFreq} alerts for new matches.` : "Search saved without alerts." });
      qc.invalidateQueries({ queryKey: ["saved-searches"] });
      setOpen(false);
      setName("");
    },
    onError: () => toast({ title: "Error", description: "Could not save search.", variant: "destructive" }),
  });

  if (!user) return null;

  // Count active filters
  const filterCount = Object.values(currentFilters).filter(v => v && v !== "all" && v !== "any").length;
  if (filterCount === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:border-primary/40 bg-primary/5">
          <Bookmark className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">Save Search</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Save This Search</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Search Name</label>
            <Input
              placeholder="e.g. Lagos 3-bed apartments"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-accent/30">
            <div>
              <p className="text-sm font-bold">Email Alerts</p>
              <p className="text-xs text-muted-foreground">Get notified when new properties match</p>
            </div>
            <Button
              variant={alertsOn ? "default" : "outline"}
              size="sm"
              onClick={() => setAlertsOn(!alertsOn)}
              className="gap-1.5"
            >
              {alertsOn ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
              {alertsOn ? "On" : "Off"}
            </Button>
          </div>

          {alertsOn && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Alert Frequency</label>
              <Select value={alertFreq} onValueChange={setAlertFreq}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Instant</SelectItem>
                  <SelectItem value="daily">Daily Digest</SelectItem>
                  <SelectItem value="weekly">Weekly Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="rounded-lg bg-secondary/30 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Active Filters ({filterCount})</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(currentFilters)
                .filter(([_, v]) => v && v !== "all" && v !== "any")
                .map(([k, v]) => (
                  <Badge key={k} variant="outline" className="text-[10px] font-medium">
                    {k}: {v}
                  </Badge>
                ))}
            </div>
          </div>

          <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full h-12 font-bold">
            {save.isPending ? "Saving..." : "Save Search"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Panel to display and manage saved searches (for dashboard) */
export function SavedSearchesList() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: searches = [], isLoading } = useQuery({
    queryKey: ["saved-searches", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("saved_searches" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("saved_searches" as any).delete().eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-searches"] });
      toast({ title: "Search removed" });
    },
  });

  const toggleAlerts = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await (supabase
        .from("saved_searches" as any)
        .update({ alerts_enabled: enabled })
        .eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-searches"] }),
  });

  if (isLoading) return <div className="animate-pulse h-20 rounded-xl bg-muted" />;
  if (searches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <Bookmark className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No saved searches yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Save a search from the properties page to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {searches.map((s: any) => {
        const filters = s.filters as Record<string, string>;
        const filterParams = new URLSearchParams(filters).toString();

        return (
          <div key={s.id} className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4 transition-all hover:border-border">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{s.name}</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {Object.entries(filters)
                  .filter(([_, v]) => v && v !== "all" && v !== "any")
                  .slice(0, 4)
                  .map(([k, v]) => (
                    <Badge key={k} variant="outline" className="text-[10px]">
                      {k}: {v}
                    </Badge>
                  ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Saved {new Date(s.created_at).toLocaleDateString()}
                {s.alerts_enabled && ` · ${s.alert_frequency} alerts`}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Link to={`/properties?${filterParams}`}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => toggleAlerts.mutate({ id: s.id, enabled: !s.alerts_enabled })}
              >
                {s.alerts_enabled ? <Bell className="h-3.5 w-3.5 text-primary" /> : <BellOff className="h-3.5 w-3.5 text-muted-foreground" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => deleteMut.mutate(s.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
