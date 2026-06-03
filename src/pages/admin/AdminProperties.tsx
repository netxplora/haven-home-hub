import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Building2, Hash, Calendar, Car, Bed, Bath, Search, ArrowUpDown, ChevronLeft, ChevronRight, ShieldAlert, Link as LinkIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChipInput } from "@/components/ui/chip-input";
import { ImageUploader } from "@/components/site/ImageUploader";
import { Separator } from "@/components/ui/separator";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const ITEMS_PER_PAGE = 10;

export function AdminProperties() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  /* Search, filter, sort state */
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

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

  /* Derived: filtered, sorted, paginated */
  const filtered = useMemo(() => {
    let result = [...properties];

    /* Search */
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((p: any) =>
        (p.title ?? "").toLowerCase().includes(term) ||
        (p.address ?? "").toLowerCase().includes(term) ||
        (p.internal_id ?? "").toLowerCase().includes(term) ||
        (p.locations?.name ?? "").toLowerCase().includes(term)
      );
    }

    /* Filters */
    if (filterType !== "all") {
      result = result.filter((p: any) => p.property_type === filterType);
    }
    if (filterStatus !== "all") {
      result = result.filter((p: any) => p.status === filterStatus);
    }
    if (filterLocation !== "all") {
      result = result.filter((p: any) => p.location_id === filterLocation);
    }

    /* Sort */
    switch (sortBy) {
      case "newest":
        result.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "oldest":
        result.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "price_high":
        result.sort((a: any, b: any) => Number(b.price ?? 0) - Number(a.price ?? 0));
        break;
      case "price_low":
        result.sort((a: any, b: any) => Number(a.price ?? 0) - Number(b.price ?? 0));
        break;
    }

    return result;
  }, [properties, searchTerm, filterType, filterStatus, filterLocation, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  /* Reset page when filters change */
  const handleImport = async () => {
    if (!importUrl) return;
    setIsImporting(true);
    try {
      const { error } = await supabase.from("extraction_jobs").insert([{ url: importUrl }]);
      if (error) throw error;
      toast({ title: "Import Job Queued", description: "The property is being extracted in the background. It will appear here once complete." });
      setImportOpen(false);
      setImportUrl("");
    } catch (error: any) {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFilterChange = (setter: Function, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold">Properties</h2>
          <p className="text-sm text-muted-foreground">Manage your real estate listings and availability. {filtered.length} results.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline"
            onClick={() => handleFilterChange(setFilterStatus, "pending")}
            className="border-amber-500/30 text-amber-600 hover:bg-amber-500/10 font-bold shadow-sm rounded-xl"
          >
            <ShieldAlert className="mr-2 h-4 w-4" /> Verification Queue
          </Button>
          <Button 
            variant="secondary"
            onClick={() => setImportOpen(true)} 
            className="shadow-sm rounded-xl font-bold bg-secondary hover:bg-secondary/80 text-secondary-foreground"
          >
            <LinkIcon className="mr-2 h-4 w-4" /> Import URL
          </Button>
          <Button 
            onClick={() => { setEditing(null); setOpen(true); }} 
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-[0.98] rounded-xl font-bold"
          >
            <Plus className="mr-2 h-4 w-4" /> New Property
          </Button>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search title, address, ID..."
            value={searchTerm}
            onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
            className="pl-10 rounded-xl border-border/50 bg-card"
          />
        </div>
        <Select value={filterType} onValueChange={(v) => handleFilterChange(setFilterType, v)}>
          <SelectTrigger className="w-[140px] rounded-xl border-border/50 bg-card"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="buy">For Sale</SelectItem>
            <SelectItem value="rent">For Rent</SelectItem>
            <SelectItem value="land">Land/Plot</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => handleFilterChange(setFilterStatus, v)}>
          <SelectTrigger className="w-[150px] rounded-xl border-border/50 bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterLocation} onValueChange={(v) => handleFilterChange(setFilterLocation, v)}>
          <SelectTrigger className="w-[160px] rounded-xl border-border/50 bg-card"><SelectValue placeholder="Location" /></SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((l: any) => (
              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => handleFilterChange(setSortBy, v)}>
          <SelectTrigger className="w-[150px] rounded-xl border-border/50 bg-card">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="price_high">Price: High → Low</SelectItem>
            <SelectItem value="price_low">Price: Low → High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* ── Mobile Card Layout ── */}
        <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
          {paginated.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground italic">No properties match your filters.</div>
          ) : (
            paginated.map((p: any) => (
              <div key={p.id} className="rounded-xl border border-border/45 bg-card p-4 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-[9px] font-mono font-bold bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">{p.internal_id || "NEW"}</span>
                      <span className="text-[10px] capitalize text-muted-foreground font-semibold">{p.property_type}</span>
                    </div>
                    <Link to={`/properties/${p.slug}`} className="font-serif font-semibold hover:text-primary transition-colors block text-sm line-clamp-1">{p.title}</Link>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{p.locations?.name ?? "No location"}</p>
                  </div>
                  <Badge variant={
                    p.status === "available" ? "default" : 
                    p.status === "reserved" ? "secondary" : 
                    p.status === "sold" ? "outline" : 
                    p.status === "pending" ? "secondary" : "destructive"
                  } className={`rounded-md uppercase text-[9px] tracking-widest px-2 py-0.5 font-bold shrink-0 ${
                    p.status === 'available' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                    p.status === 'reserved' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                    p.status === 'sold' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                    p.status === 'pending' ? 'bg-primary/100/10 text-primary border-primary/20' :
                    p.status === 'archived' ? 'bg-gray-500/10 text-gray-500 border-gray-500/20' : ''
                  }`}>
                    {p.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-3 border-t border-border/30">
                  <div>
                    <span className="block text-muted-foreground font-medium uppercase tracking-wider text-[10px] mb-0.5">Features</span>
                    <div className="flex gap-2.5 text-muted-foreground">
                      <span className="flex items-center gap-1 text-[10px]"><Bed className="h-3 w-3" /> {p.bedrooms || 0}</span>
                      <span className="flex items-center gap-1 text-[10px]"><Bath className="h-3 w-3" /> {p.bathrooms || 0}</span>
                      <span className="flex items-center gap-1 text-[10px]"><Car className="h-3 w-3" /> {p.parking_spaces || 0}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-muted-foreground font-medium uppercase tracking-wider text-[10px] mb-0.5">Price</span>
                    <span className="font-semibold text-primary">{Number(p.price).toLocaleString()} {p.currency}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-border/30 justify-end">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(p); setOpen(true); }} className="h-11 px-4 rounded-lg font-bold gap-1">
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove(p.id)} className="h-11 px-4 rounded-lg font-bold hover:bg-destructive/10 hover:text-destructive text-muted-foreground gap-1 border-destructive/20">
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Desktop Table Layout ── */}
        <div className="overflow-x-auto hidden md:block">
          <div className="w-full overflow-x-auto pb-2">
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
              {paginated.map((p: any) => (
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
                      p.status === 'pending' ? 'bg-primary/100/10 text-primary border-primary/20' :
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
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground italic">No properties match your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
      </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-accent/30">
            <p className="text-xs text-muted-foreground">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button 
                size="icon" 
                variant="outline" 
                className="h-8 w-8 rounded-lg" 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium text-foreground min-w-[60px] text-center">
                Page {currentPage} of {totalPages}
              </span>
              <Button 
                size="icon" 
                variant="outline" 
                className="h-8 w-8 rounded-lg" 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
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
      {/* Import via URL Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import Property via URL</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste a link to a listing on PropertyPro, Zillow, or supported platforms. Our AI extraction engine will automatically parse the images, location, features, and price and draft a new property.
            </p>
            <div className="space-y-2">
              <Label>Listing URL</Label>
              <Input
                placeholder="https://www.propertypro.ng/property/..."
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={!importUrl || isImporting}>
              {isImporting ? "Queueing..." : "Start Import"}
            </Button>
          </DialogFooter>
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
    interior_features: Array.isArray(initial?.interior_features) ? initial.interior_features : [],
    exterior_features: Array.isArray(initial?.exterior_features) ? initial.exterior_features : [],
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
      interior_features: Array.isArray(form.interior_features) ? form.interior_features : [],
      exterior_features: Array.isArray(form.exterior_features) ? form.exterior_features : [],
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

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Interior Features</Label>
            <ChipInput value={form.interior_features} onChange={(val) => setForm({ ...form, interior_features: val })} placeholder="Smart Home, Hardwood Floors..." className="rounded-xl bg-accent/50 focus:bg-background transition-all" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Exterior Features</Label>
            <ChipInput value={form.exterior_features} onChange={(val) => setForm({ ...form, exterior_features: val })} placeholder="Swimming Pool, Balcony..." className="rounded-xl bg-accent/50 focus:bg-background transition-all" />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Nearby Points of Interest (JSON)</Label>
          <Textarea rows={4} value={form.nearby_pois} onChange={(e) => setForm({ ...form, nearby_pois: e.target.value })} className="rounded-xl font-mono text-[10px] resize-none bg-accent/50 focus:bg-background transition-all" placeholder='[{"name": "Austin High School", "type": "School", "distance": "1.2mi"}]' />
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
