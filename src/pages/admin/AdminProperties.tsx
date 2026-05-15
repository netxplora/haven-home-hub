import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Building2, Hash, Calendar, Car, Bed, Bath } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUploader } from "@/components/site/ImageUploader";
import { Separator } from "@/components/ui/separator";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function AdminProperties() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: properties = [] } = useQuery({
    queryKey: ["admin-properties"],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("*, locations(name), agents(full_name)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["admin-locations-list"],
    queryFn: async () => (await supabase.from("locations").select("id, name").order("name")).data ?? [],
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["admin-agents-list"],
    queryFn: async () => (await supabase.from("agents").select("id, full_name").order("full_name")).data ?? [],
  });

  async function remove(id: string) {
    if (!confirm("Delete this property?")) return;
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Property removed" });
      qc.invalidateQueries({ queryKey: ["admin-properties"] });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold">Properties</h2>
          <p className="text-sm text-muted-foreground">Manage your real estate listings and availability.</p>
        </div>
        <Button 
          onClick={() => { setEditing(null); setOpen(true); }} 
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-[0.98] rounded-xl font-bold"
        >
          <Plus className="mr-2 h-4 w-4" /> New Property
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-accent text-left">
            <tr>
              <th className="p-4 font-serif font-semibold text-muted-foreground uppercase tracking-tighter text-[10px]">System ID / Title</th>
              <th className="p-4 font-serif font-semibold text-muted-foreground uppercase tracking-tighter text-[10px]">Type</th>
              <th className="p-4 font-serif font-semibold text-muted-foreground uppercase tracking-tighter text-[10px]">Status</th>
              <th className="p-4 font-serif font-semibold text-muted-foreground uppercase tracking-tighter text-[10px]">Price</th>
              <th className="p-4 font-serif font-semibold text-muted-foreground uppercase tracking-tighter text-[10px]">Features</th>
              <th className="p-4 font-serif font-semibold text-right text-muted-foreground uppercase tracking-tighter text-[10px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {properties.map((p: any) => (
              <tr key={p.id} className="transition-colors hover:bg-secondary/40 group">
                <td className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-mono font-bold bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">{p.internal_id || "NEW"}</span>
                    <Link to={`/properties/${p.slug}`} className="font-serif font-semibold hover:text-primary transition-colors block max-w-[200px] truncate">{p.title}</Link>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{p.locations?.name ?? "No location"}</p>
                </td>
                <td className="p-4 capitalize text-muted-foreground">{p.property_type}</td>
                <td className="p-4">
                  <Badge variant={
                    p.status === "available" ? "default" : 
                    p.status === "reserved" ? "secondary" : 
                    p.status === "sold" ? "outline" : 
                    p.status === "pending" ? "secondary" : "destructive"
                  } className={`rounded-md uppercase text-[9px] tracking-widest px-2 py-0.5 font-bold ${
                    p.status === 'available' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                    p.status === 'reserved' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                    p.status === 'sold' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                    p.status === 'pending' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                    p.status === 'archived' ? 'bg-gray-500/10 text-gray-500 border-gray-500/20' : ''
                  }`}>
                    {p.status}
                  </Badge>
                </td>
                <td className="p-4 font-semibold text-primary">{Number(p.price).toLocaleString()} {p.currency}</td>
                <td className="p-4">
                  <div className="flex gap-3 text-muted-foreground">
                    <span className="flex items-center gap-1 text-[10px]"><Bed className="h-3 w-3" /> {p.bedrooms || 0}</span>
                    <span className="flex items-center gap-1 text-[10px]"><Bath className="h-3 w-3" /> {p.bathrooms || 0}</span>
                    <span className="flex items-center gap-1 text-[10px]"><Car className="h-3 w-3" /> {p.parking_spaces || 0}</span>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }} className="h-8 w-8 rounded-lg">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(p.id)} className="h-8 w-8 rounded-lg hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {properties.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground italic">No properties listed yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="bg-primary pb-6">
            <DialogTitle className="font-serif text-2xl text-white">{editing ? "Edit Property" : "New Property Listing"}</DialogTitle>
          </DialogHeader>
          <PropertyForm 
            initial={editing} 
            locations={locations} 
            agents={agents} 
            onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["admin-properties"] }); }} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PropertyForm({ initial, locations, agents, onClose }: any) {
  const [form, setForm] = useState(() => ({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    price: initial?.price ?? 0,
    currency: initial?.currency ?? "USD",
    property_type: initial?.property_type ?? "buy",
    status: initial?.status ?? "available",
    location_id: initial?.location_id ?? "",
    address: initial?.address ?? "",
    latitude: initial?.latitude ?? "",
    longitude: initial?.longitude ?? "",
    bedrooms: initial?.bedrooms ?? "",
    bathrooms: initial?.bathrooms ?? "",
    parking_spaces: initial?.parking_spaces ?? 0,
    size_sqm: initial?.size_sqm ?? "",
    year_built: initial?.year_built ?? new Date().getFullYear(),
    internal_id: initial?.internal_id ?? "",
    inspection_availability: initial?.inspection_availability ?? "Available for viewing Monday to Saturday, 9AM - 5PM.",
    features: Array.isArray(initial?.features) ? initial.features.join(", ") : "",
    nearby_pois: initial?.nearby_pois ? JSON.stringify(initial.nearby_pois, null, 2) : "[]",
    cover_image_url: initial?.cover_image_url ?? "",
    video_url: initial?.video_url ?? "",
    agent_id: initial?.agent_id ?? "",
    featured: initial?.featured ?? false,
  }));
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    let pois = [];
    try {
      pois = JSON.parse(form.nearby_pois);
    } catch (err) {
      toast({ title: "POI Format Error", description: "Nearby POIs must be valid JSON.", variant: "destructive" });
      setSaving(false);
      return;
    }

    const payload: any = {
      title: form.title,
      slug: initial?.slug ?? slugify(form.title) + "-" + Math.random().toString(36).slice(2, 6),
      description: form.description,
      price: Number(form.price),
      currency: form.currency,
      property_type: form.property_type,
      status: form.status,
      location_id: form.location_id || null,
      address: form.address || null,
      latitude: form.latitude === "" ? null : Number(form.latitude),
      longitude: form.longitude === "" ? null : Number(form.longitude),
      bedrooms: form.bedrooms === "" ? null : Number(form.bedrooms),
      bathrooms: form.bathrooms === "" ? null : Number(form.bathrooms),
      parking_spaces: Number(form.parking_spaces),
      size_sqm: form.size_sqm === "" ? null : Number(form.size_sqm),
      year_built: Number(form.year_built),
      internal_id: form.internal_id || null,
      inspection_availability: form.inspection_availability,
      nearby_pois: pois,
      features: form.features ? form.features.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      cover_image_url: form.cover_image_url || null,
      video_url: form.video_url || null,
      agent_id: form.agent_id || null,
      featured: !!form.featured,
    };
    const { error } = initial
      ? await supabase.from("properties").update(payload).eq("id", initial.id)
      : await supabase.from("properties").insert(payload);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Property saved successfully" }); onClose(); }
  }

  return (
    <form onSubmit={save} className="flex flex-col h-full overflow-hidden">
      <DialogBody className="space-y-6 py-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Property Title</Label>
            <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">System ID</Label>
            <Input disabled={!initial} value={form.internal_id} onChange={(e) => setForm({ ...form, internal_id: e.target.value })} placeholder="System generated identifier" className="h-12 rounded-xl font-mono bg-accent/50 focus:bg-background transition-all" />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Property Description</Label>
          <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl resize-none bg-accent/50 focus:bg-background transition-all" />
        </div>
        
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Base Price</Label>
            <Input type="number" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Currency</Label>
            <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Listing Type</Label>
            <Select value={form.property_type} onValueChange={(v) => setForm({ ...form, property_type: v })}>
              <SelectTrigger className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all border-none"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl border-none"><SelectItem value="buy">For Sale</SelectItem><SelectItem value="rent">For Rent</SelectItem><SelectItem value="land">Land/Plot</SelectItem></SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Listing Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all border-none"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl border-none">
                <SelectItem value="pending">Pending Approval</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Assigned Location</Label>
            <Select value={form.location_id || "none"} onValueChange={(v) => setForm({ ...form, location_id: v === "none" ? "" : v })}>
              <SelectTrigger className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all border-none"><SelectValue placeholder="Pick location" /></SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl border-none"><SelectItem value="none">Unset</SelectItem>{locations.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Full Street Address</Label>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Latitude</Label>
            <Input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="e.g. 6.4447" className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Longitude</Label>
            <Input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="e.g. 3.3941" className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
          </div>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-5">
          <div className="space-y-2"><Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Beds</Label><Input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" /></div>
          <div className="space-y-2"><Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Baths</Label><Input type="number" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" /></div>
          <div className="space-y-2"><Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Parking</Label><Input type="number" value={form.parking_spaces} onChange={(e) => setForm({ ...form, parking_spaces: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" /></div>
          <div className="space-y-2"><Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">SQM</Label><Input type="number" value={form.size_sqm} onChange={(e) => setForm({ ...form, size_sqm: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" /></div>
          <div className="space-y-2"><Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Year</Label><Input type="number" value={form.year_built} onChange={(e) => setForm({ ...form, year_built: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" /></div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Key Features (comma-separated)</Label>
          <Input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="Swimming Pool, Smart Home, Gated, Ocean View" className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Nearby Points of Interest (JSON)</Label>
          <Textarea rows={4} value={form.nearby_pois} onChange={(e) => setForm({ ...form, nearby_pois: e.target.value })} className="rounded-xl font-mono text-[10px] resize-none bg-accent/50 focus:bg-background transition-all" placeholder='[{"name": "Ikoyi School", "type": "School", "distance": "1.2km"}]' />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Viewing Times</Label>
          <Input value={form.inspection_availability} onChange={(e) => setForm({ ...form, inspection_availability: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Primary Cover Image URL</Label>
            <Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Assigned Listing Agent</Label>
            <Select value={form.agent_id || "none"} onValueChange={(v) => setForm({ ...form, agent_id: v === "none" ? "" : v })}>
              <SelectTrigger className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all border-none"><SelectValue placeholder="Assign agent" /></SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl border-none"><SelectItem value="none">Unassigned</SelectItem>{agents.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3 py-2 px-1">
          <input type="checkbox" id="featured-prop" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="h-5 w-5 rounded-md border-border text-primary focus:ring-primary/20 transition-all cursor-pointer" />
          <Label htmlFor="featured-prop" className="text-sm font-bold text-foreground/80 cursor-pointer">Feature this property on public homepage</Label>
        </div>

        {initial?.id && (
          <div className="mt-6 pt-8 border-t border-border/50">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 block ml-1">Property Media Gallery</Label>
            <ImageUploader propertyId={initial.id} />
          </div>
        )}
      </DialogBody>
      <DialogFooter className="bg-secondary/5 pt-6 pb-6">
        <Button type="submit" disabled={saving} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold shadow-sm transition-all">
          {saving ? "Saving Changes..." : "Save Property Listing"}
        </Button>
      </DialogFooter>
    </form>
  );
}
