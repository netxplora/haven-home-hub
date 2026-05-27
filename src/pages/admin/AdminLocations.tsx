import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, MapPin, Globe, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function AdminLocations() {
  const qc = useQueryClient();
  const { data: locations = [], isLoading } = useQuery({ 
    queryKey: ["admin-locations"], 
    queryFn: async () => (await supabase.from("locations").select("*").order("name")).data ?? [] 
  });
  
  const [f, setF] = useState({ name: "", slug: "", image_url: "", featured: false });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit(loc: any) {
    setEditingId(loc.id);
    setF({ name: loc.name, slug: loc.slug, image_url: loc.image_url || "", featured: loc.featured });
  }

  function cancelEdit() {
    setEditingId(null);
    setF({ name: "", slug: "", image_url: "", featured: false });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    if (editingId) {
      // Update existing location
      const { error } = await supabase
        .from("locations")
        .update({ 
          name: f.name, 
          slug: f.slug || slugify(f.name), 
          image_url: f.image_url || null, 
          featured: f.featured 
        })
        .eq("id", editingId);

      setSaving(false);
      if (error) {
        toast({ title: "Update Failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Location updated" });
        cancelEdit();
        qc.invalidateQueries({ queryKey: ["admin-locations"] });
        qc.invalidateQueries({ queryKey: ["homepage-locations"] });
        qc.invalidateQueries({ queryKey: ["locations"] });
      }
    } else {
      // Create new location
      const { error } = await supabase.from("locations").insert({ 
        ...f, 
        slug: f.slug || slugify(f.name) 
      });

      setSaving(false);
      if (error) {
        toast({ title: "Failed", description: error.message, variant: "destructive" });
      } else { 
        toast({ title: "Location added" });
        setF({ name: "", slug: "", image_url: "", featured: false }); 
        qc.invalidateQueries({ queryKey: ["admin-locations"] });
        qc.invalidateQueries({ queryKey: ["homepage-locations"] });
        qc.invalidateQueries({ queryKey: ["locations"] });
      }
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this location? Properties linked to this location may need update.")) return;
    const { error } = await supabase.from("locations").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Location removed" });
      if (editingId === id) cancelEdit();
      qc.invalidateQueries({ queryKey: ["admin-locations"] });
      qc.invalidateQueries({ queryKey: ["homepage-locations"] });
      qc.invalidateQueries({ queryKey: ["locations"] });
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {locations.map((l: any) => (
            <div key={l.id} className={`group flex items-center justify-between rounded-xl border bg-card p-4 transition-all hover:shadow-md ${editingId === l.id ? 'border-primary/50 shadow-md ring-1 ring-primary/20' : 'border-border/50 hover:border-primary/20'}`}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-serif font-bold text-foreground leading-none">{l.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5 uppercase tracking-widest font-medium">/{l.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {l.featured && <Badge variant="default" className="text-[8px] uppercase tracking-tighter h-5">Featured</Badge>}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => startEdit(l)} 
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => remove(l.id)} 
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        {locations.length === 0 && !isLoading && (
          <div className="p-12 text-center rounded-xl border border-dashed border-border/50 bg-secondary/10">
            <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="font-serif text-lg text-muted-foreground italic">No locations defined.</p>
          </div>
        )}
      </div>

      <div className="relative">
        <form onSubmit={handleSubmit} className="sticky top-6 space-y-4 rounded-xl border border-border/50 bg-card p-6 shadow-xl shadow-primary/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${editingId ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'}`}>
                {editingId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold">{editingId ? "Edit Location" : "Add Location"}</h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{editingId ? "Update Details" : "Regional Mapping"}</p>
              </div>
            </div>
            {editingId && (
              <Button type="button" variant="ghost" size="icon" onClick={cancelEdit} className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Location Name</Label>
              <Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="rounded-xl h-11" placeholder="e.g. Dubai Marina" />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">URL Slug</Label>
              <Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} placeholder="auto-generated" className="rounded-xl h-11 font-mono text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Image URL</Label>
              <Input value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} placeholder="https://..." className="rounded-xl h-11" />
            </div>

            <div className="flex items-center gap-2 py-2">
              <input type="checkbox" id="featured-loc" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} className="rounded border-border" />
              <Label htmlFor="featured-loc" className="text-sm font-medium">Feature this region</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className={`flex-1 h-12 text-primary-foreground rounded-xl font-bold shadow-sm transition-all ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-primary hover:bg-primary/90'}`}>
                {saving ? (editingId ? "Updating..." : "Adding...") : (editingId ? "Update Location" : "Add Region")}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
