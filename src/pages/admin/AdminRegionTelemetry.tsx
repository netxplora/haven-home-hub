import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Globe, MapPin, Image as ImageIcon, TrendingUp, CheckCircle2 } from "lucide-react";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function AdminRegionTelemetry() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: regions = [], isLoading } = useQuery({
    queryKey: ["admin-regions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("regions").select("*").order("display_order", { ascending: true }).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  async function remove(id: string) {
    if (!confirm("Are you sure you want to delete this region? This action cannot be undone.")) return;
    const { error } = await supabase.from("regions").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Region deleted" });
      qc.invalidateQueries({ queryKey: ["admin-regions"] });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-serif font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Region Intelligence
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage market telemetry, infrastructure stats, and regional opportunities.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm rounded-xl">
          <Plus className="mr-2 h-4 w-4" /> Add Region
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {regions.map((region: any) => (
          <div key={region.id} className="group overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm hover:shadow-md transition-all">
            <div className="relative h-40 bg-secondary/20 border-b border-border/50 overflow-hidden">
              {region.cover_image_url ? (
                <img src={region.cover_image_url} alt={region.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin className="h-10 w-10 text-muted-foreground/30" />
                </div>
              )}
              <div className="absolute top-3 left-3 flex gap-2">
                <Badge variant={region.status === "published" ? "default" : "secondary"} className="shadow-sm">
                  {region.status}
                </Badge>
                {region.is_featured && <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 shadow-sm"><CheckCircle2 className="h-3 w-3 mr-1" /> Featured</Badge>}
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-bold text-lg text-foreground leading-tight">{region.name}</h3>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-0.5">{region.category || "Uncategorized"}</p>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {region.short_description || "No description provided."}
              </p>
              
              <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" /> {region.investment_score || "N/A"} Score
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-secondary" onClick={() => { setEditing(region); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive" onClick={() => remove(region.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {regions.length === 0 && !isLoading && (
          <div className="col-span-full py-16 text-center border border-dashed border-border/60 rounded-2xl bg-secondary/5">
            <Globe className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="text-lg font-semibold mb-1">No Regions Found</h3>
            <p className="text-sm text-muted-foreground">Add your first region to build your market intelligence database.</p>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl p-0 border border-border/50 bg-background shadow-2xl rounded-2xl overflow-hidden h-[90vh] flex flex-col">
          <DialogHeader className="p-6 border-b border-border/50 shrink-0 bg-card/50">
            <DialogTitle className="font-serif text-2xl">{editing ? "Edit Region" : "Add Region"}</DialogTitle>
          </DialogHeader>
          <RegionForm initial={editing} onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["admin-regions"] }); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RegionForm({ initial, onClose }: { initial: any; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState(() => ({
    name: initial?.name || "",
    slug: initial?.slug || "",
    country: initial?.country || "",
    state_province: initial?.state_province || "",
    city: initial?.city || "",
    status: initial?.status || "draft",
    is_featured: initial?.is_featured || false,
    category: initial?.category || "Emerging Market",
    short_description: initial?.short_description || "",
    long_description: initial?.long_description || "",
    market_outlook: initial?.market_outlook || "",
    growth_commentary: initial?.growth_commentary || "",
    investment_notes: initial?.investment_notes || "",
    population_growth: initial?.population_growth || "",
    infrastructure_score: initial?.infrastructure_score || "",
    rental_demand: initial?.rental_demand || "",
    property_appreciation: initial?.property_appreciation || "",
    employment_growth: initial?.employment_growth || "",
    investment_score: initial?.investment_score || "",
    cover_image_url: initial?.cover_image_url || "",
    secondary_image_url: initial?.secondary_image_url || "",
    display_order: initial?.display_order || 0,
  }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    const slug = f.slug || slugify(f.name);
    
    const payload = {
      ...f,
      slug,
    };

    const { error } = initial
      ? await supabase.from("regions").update(payload).eq("id", initial.id)
      : await supabase.from("regions").insert(payload);
      
    setSaving(false);
    if (error) toast({ title: "Failed to save region", description: error.message, variant: "destructive" });
    else { toast({ title: "Region saved successfully" }); onClose(); }
  }

  return (
    <form onSubmit={save} className="flex flex-col flex-1 overflow-hidden">
      <DialogBody className="flex-1 overflow-y-auto p-0">
        <Tabs defaultValue="basic" className="w-full flex flex-col h-full">
          <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-secondary/10 px-6 h-14 space-x-2 shrink-0 overflow-x-auto no-scrollbar">
            <TabsTrigger value="basic" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Basic Info</TabsTrigger>
            <TabsTrigger value="market" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Market Summary</TabsTrigger>
            <TabsTrigger value="stats" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Statistics</TabsTrigger>
            <TabsTrigger value="media" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Media</TabsTrigger>
          </TabsList>
          
          <div className="p-6">
            <TabsContent value="basic" className="m-0 space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Region Name</Label>
                  <Input required value={f.name} onChange={e => setF({...f, name: e.target.value})} className="h-11 rounded-xl" placeholder="e.g. Miami, Florida" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Slug</Label>
                  <Input value={f.slug} onChange={e => setF({...f, slug: e.target.value})} className="h-11 rounded-xl" placeholder="miami-florida (auto-generated if empty)" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Country</Label>
                  <Input value={f.country} onChange={e => setF({...f, country: e.target.value})} className="h-11 rounded-xl" placeholder="e.g. USA" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">City</Label>
                  <Input value={f.city} onChange={e => setF({...f, city: e.target.value})} className="h-11 rounded-xl" placeholder="e.g. Miami" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Category</Label>
                  <Select value={f.category} onValueChange={v => setF({...f, category: v})}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Residential">Residential</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                      <SelectItem value="Mixed Use">Mixed Use</SelectItem>
                      <SelectItem value="Emerging Market">Emerging Market</SelectItem>
                      <SelectItem value="Luxury Market">Luxury Market</SelectItem>
                      <SelectItem value="Technology Hub">Technology Hub</SelectItem>
                      <SelectItem value="Business District">Business District</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Status</Label>
                  <Select value={f.status} onValueChange={v => setF({...f, status: v})}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-secondary/10">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold text-foreground">Feature this Region</Label>
                  <p className="text-xs text-muted-foreground">Featured regions appear on the homepage carousel.</p>
                </div>
                <Switch checked={f.is_featured} onCheckedChange={v => setF({...f, is_featured: v})} className="data-[state=checked]:bg-primary" />
              </div>
            </TabsContent>

            <TabsContent value="market" className="m-0 space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Short Description (Summary)</Label>
                <Textarea value={f.short_description} onChange={e => setF({...f, short_description: e.target.value})} className="rounded-xl resize-none h-20" placeholder="Fast-growing metropolitan region..." />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Market Outlook</Label>
                <Textarea value={f.market_outlook} onChange={e => setF({...f, market_outlook: e.target.value})} className="rounded-xl resize-y min-h-[100px]" placeholder="Detailed market outlook..." />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Growth Commentary</Label>
                <Textarea value={f.growth_commentary} onChange={e => setF({...f, growth_commentary: e.target.value})} className="rounded-xl resize-y min-h-[100px]" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Investment Notes</Label>
                <Textarea value={f.investment_notes} onChange={e => setF({...f, investment_notes: e.target.value})} className="rounded-xl resize-y min-h-[100px]" />
              </div>
            </TabsContent>

            <TabsContent value="stats" className="m-0 space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Population Growth</Label>
                  <Input value={f.population_growth} onChange={e => setF({...f, population_growth: e.target.value})} className="h-11 rounded-xl" placeholder="+8.2%" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Rental Demand</Label>
                  <Input value={f.rental_demand} onChange={e => setF({...f, rental_demand: e.target.value})} className="h-11 rounded-xl" placeholder="92%" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Property Appreciation</Label>
                  <Input value={f.property_appreciation} onChange={e => setF({...f, property_appreciation: e.target.value})} className="h-11 rounded-xl" placeholder="+12.4% YoY" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Employment Growth</Label>
                  <Input value={f.employment_growth} onChange={e => setF({...f, employment_growth: e.target.value})} className="h-11 rounded-xl" placeholder="+4.1%" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Infrastructure Score</Label>
                  <Input value={f.infrastructure_score} onChange={e => setF({...f, infrastructure_score: e.target.value})} className="h-11 rounded-xl" placeholder="High" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Overall Investment Score</Label>
                  <Input value={f.investment_score} onChange={e => setF({...f, investment_score: e.target.value})} className="h-11 rounded-xl" placeholder="8.9/10" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="media" className="m-0 space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="space-y-4 rounded-xl border border-border/50 bg-secondary/5 p-6">
                <h4 className="font-serif font-semibold flex items-center gap-2"><ImageIcon className="h-5 w-5 text-primary" /> Primary Cover Image</h4>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Image URL</Label>
                  <Input value={f.cover_image_url} onChange={e => setF({...f, cover_image_url: e.target.value})} className="h-11 rounded-xl" placeholder="https://... or /images/..." />
                  <p className="text-xs text-muted-foreground mt-1 ml-1">Provide a high-quality URL. Fallbacks will apply if invalid.</p>
                </div>
                {f.cover_image_url && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-border shadow-sm h-48 bg-background relative">
                     <img src={f.cover_image_url} alt="Cover Preview" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = "/placeholder.svg" }} />
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogBody>
      <DialogFooter className="bg-secondary/10 p-6 border-t border-border/50 shrink-0">
        <Button type="button" variant="outline" onClick={onClose} className="rounded-xl h-12 px-6 font-bold">Cancel</Button>
        <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12 px-8 font-bold shadow-sm">
          {saving ? "Saving Region..." : "Save Region"}
        </Button>
      </DialogFooter>
    </form>
  );
}
