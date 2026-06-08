import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { 
  Plus, Pencil, Trash2, Building2, Hash, Calendar, Car, Bed, Bath, 
  Search, ArrowUpDown, ChevronLeft, ChevronRight, ShieldAlert, 
  Link as LinkIcon, Star, Layers, Zap, Pause, Play
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ChipInput } from "@/components/ui/chip-input";
import { ImageUploader } from "@/components/site/ImageUploader";
import { formatMoney } from "@/lib/invest";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const ITEMS_PER_PAGE = 10;

export function AdminProperties() {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  // Dialog management states
  const [open, setOpen] = useState(false);
  const [createType, setCreateType] = useState<"property" | "investment" | null>(null);
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

  // ── Fetch Regular Properties ──
  const { data: properties = [], isLoading: isPropsLoading } = useQuery({
    queryKey: ["admin-properties"],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("*, locations(name), agents(full_name)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // ── Fetch Investment Properties ──
  const { data: investments = [], isLoading: isInvestLoading } = useQuery({
    queryKey: ["admin-investments-consolidated"],
    queryFn: async () => {
      const { data } = await supabase.from("investment_properties").select("*").order("created_at", { ascending: false });
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

  const isLoading = isPropsLoading || isInvestLoading;

  // ── Combine both lists for unified CRUD center ──
  const combinedProperties = useMemo(() => {
    const mappedRegular = properties.map((p: any) => ({
      ...p,
      isInvestment: false,
      unifiedType: p.property_type, // 'buy', 'rent', 'land'
      displayLocation: p.locations?.name || p.address || "No Location",
    }));

    const mappedInvest = investments.map((i: any) => ({
      ...i,
      isInvestment: true,
      property_type: 'investment',
      unifiedType: 'investment',
      displayLocation: i.location || "No Location",
      price: i.unit_price, // fallback price for sort
    }));

    return [...mappedRegular, ...mappedInvest];
  }, [properties, investments]);

  /* Derived: filtered, sorted, paginated */
  const filtered = useMemo(() => {
    let result = [...combinedProperties];

    /* Search */
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((p: any) =>
        (p.title ?? "").toLowerCase().includes(term) ||
        (p.address ?? p.location ?? "").toLowerCase().includes(term) ||
        (p.internal_id ?? "").toLowerCase().includes(term) ||
        (p.displayLocation ?? "").toLowerCase().includes(term)
      );
    }

    /* Filters */
    if (filterType !== "all") {
      result = result.filter((p: any) => p.unifiedType === filterType);
    }
    if (filterStatus !== "all") {
      if (filterStatus === "featured") {
        result = result.filter((p: any) => p.featured === true);
      } else if (filterStatus === "draft") {
        result = result.filter((p: any) => p.status === "draft" || p.approval_status === "draft");
      } else if (filterStatus === "published") {
        result = result.filter((p: any) => p.status !== "draft" && p.approval_status !== "draft");
      } else {
        result = result.filter((p: any) => p.status === filterStatus);
      }
    }
    if (filterLocation !== "all") {
      result = result.filter((p: any) => p.location_id === filterLocation || p.location === filterLocation);
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
        result.sort((a: any, b: any) => Number(b.price ?? b.total_value ?? 0) - Number(a.price ?? a.total_value ?? 0));
        break;
      case "price_low":
        result.sort((a: any, b: any) => Number(a.price ?? a.total_value ?? 0) - Number(b.price ?? b.total_value ?? 0));
        break;
    }

    return result;
  }, [combinedProperties, searchTerm, filterType, filterStatus, filterLocation, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleFilterChange = (setter: Function, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleImport = async () => {
    if (!importUrl) return;
    setIsImporting(true);
    try {
      const { data: duplicate } = await supabase
        .from("properties")
        .select("id, title")
        .eq("external_url", importUrl)
        .maybeSingle();

      if (duplicate) {
        throw new Error(`Property already exists: ${duplicate.title}`);
      }

      const { data: jobData, error: jobError } = await supabase
        .from("extraction_jobs")
        .insert([{ url: importUrl, status: "initializing" }])
        .select()
        .single();

      if (jobError) throw jobError;
      const jobId = jobData.id;

      try {
        await supabase
          .from("extraction_jobs")
          .update({ status: "extracting_structured" })
          .eq("id", jobId);

        const { data: resData, error: funcError } = await supabase.functions.invoke("extract-property", {
          body: { url: importUrl }
        });

        if (funcError) throw funcError;
        if (!resData || !resData.success) {
          throw new Error(resData?.error || "Extraction failed");
        }

        await supabase
          .from("extraction_jobs")
          .update({ status: "mapping" })
          .eq("id", jobId);

        const extracted = resData.data;
        const { gallery_images, beds, baths, sqft, ...propPayload } = extracted;
        propPayload.external_url = importUrl;
        propPayload.owner_user_id = user?.id;
        propPayload.slug = propPayload.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Math.random().toString(36).substring(2, 7);
        propPayload.status = "available";
        propPayload.approval_status = "pending";

        const { data: propData, error: propError } = await supabase
          .from("properties")
          .insert([propPayload])
          .select()
          .single();

        if (propError) throw propError;

        if (gallery_images && gallery_images.length > 0) {
          const imagesToInsert = gallery_images.map((imgUrl: string, idx: number) => ({
            property_id: propData.id,
            url: imgUrl,
            sort_order: idx + 1
          }));
          await supabase.from("property_images").insert(imagesToInsert);
        }

        await supabase
          .from("extraction_jobs")
          .update({ 
            status: "completed", 
            extracted_data: extracted, 
            completed_at: new Date().toISOString() 
          })
          .eq("id", jobId);

        toast({ title: "Property Imported", description: `Successfully imported "${propPayload.title}" as draft.` });
        setImportOpen(false);
        setImportUrl("");
        qc.invalidateQueries({ queryKey: ["admin-properties"] });
      } catch (err: any) {
        await supabase
          .from("extraction_jobs")
          .update({ 
            status: "failed", 
            error_message: err.message || "Unknown error" 
          })
          .eq("id", jobId);
        throw err;
      }
    } catch (error: any) {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  async function remove(item: any) {
    if (!confirm(`Delete this ${item.isInvestment ? "investment" : "regular"} property?`)) return;
    const table = item.isInvestment ? "investment_properties" : "properties";
    const { error } = await supabase.from(table).delete().eq("id", item.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Listing removed successfully" });
      qc.invalidateQueries({ queryKey: ["admin-properties"] });
      qc.invalidateQueries({ queryKey: ["admin-investments-consolidated"] });
    }
  }

  // ── Investment Campaign specific actions ──
  async function toggleCampaign(item: any, pause: boolean) {
    const rpcName = pause ? "pause_investment_campaign" : "resume_investment_campaign";
    const { error } = await supabase.rpc(rpcName, { p_property_id: item.id });
    if (error) {
      toast({ title: "Campaign change failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Campaign ${pause ? "paused" : "resumed"}` });
      qc.invalidateQueries({ queryKey: ["admin-investments-consolidated"] });
    }
  }

  async function toggleRoi(item: any, action: "activate" | "pause" | "resume") {
    if (action === "activate" && !confirm("Activate ROI for all investors in this property?")) return;
    
    let error;
    if (action === "activate") {
      const { data: { user } } = await supabase.auth.getUser();
      error = (await supabase.rpc("activate_property_roi", {
        p_property_id: item.id,
        p_admin_id: user?.id,
        p_notes: "Activated via consolidated properties center."
      })).error;
    } else if (action === "pause") {
      const { data: { user } } = await supabase.auth.getUser();
      error = (await supabase.rpc("pause_property_roi", { p_property_id: item.id, p_admin_id: user?.id })).error;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      error = (await supabase.rpc("resume_property_roi", { p_property_id: item.id, p_admin_id: user?.id })).error;
    }

    if (error) {
      toast({ title: "ROI operation failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `ROI successfully ${action}d` });
      qc.invalidateQueries({ queryKey: ["admin-investments-consolidated"] });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold">Properties Management Center</h2>
          <p className="text-sm text-muted-foreground">Unified CRUD system for regular listings and fractional investment properties. {filtered.length} results.</p>
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
            onClick={() => { setEditing(null); setCreateType(null); setOpen(true); }} 
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-[0.98] rounded-xl font-bold"
          >
            <Plus className="mr-2 h-4 w-4" /> New Listing
          </Button>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search title, location, ID..."
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
            <SelectItem value="investment">Fractional Investment</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => handleFilterChange(setFilterStatus, v)}>
          <SelectTrigger className="w-[150px] rounded-xl border-border/50 bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="featured">Featured Only</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="open">Open (Invest)</SelectItem>
            <SelectItem value="roi_active">ROI Active</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
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
            <SelectItem value="price_high">Valuation: High → Low</SelectItem>
            <SelectItem value="price_low">Valuation: Low → High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-accent text-left">
              <tr>
                <th className="p-4 font-semibold text-muted-foreground uppercase text-[10px]">Title & Location</th>
                <th className="p-4 font-semibold text-muted-foreground uppercase text-[10px]">Type</th>
                <th className="p-4 font-semibold text-muted-foreground uppercase text-[10px]">Status</th>
                <th className="p-4 font-semibold text-muted-foreground uppercase text-[10px] text-right">Price / Value</th>
                <th className="p-4 font-semibold text-muted-foreground uppercase text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">Loading listings data...</td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground italic">No properties match your filters.</td>
                </tr>
              ) : (
                paginated.map((p: any) => (
                  <tr key={p.id} className="transition-colors hover:bg-secondary/40 group">
                    <td className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-mono font-bold bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                          {p.internal_id || (p.isInvestment ? "INVEST" : "PROP")}
                        </span>
                        <Link to={p.isInvestment ? `/invest/${p.slug}` : `/properties/${p.slug}`} className="font-serif font-semibold hover:text-primary transition-colors block max-w-[250px] truncate">
                          {p.title}
                        </Link>
                        {p.featured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{p.displayLocation}</p>
                    </td>
                    <td className="p-4 capitalize">
                      <Badge variant="outline" className={p.isInvestment ? "border-primary/30 text-primary bg-primary/5" : "border-muted text-muted-foreground"}>
                        {p.isInvestment ? "Investment" : p.unifiedType}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={p.status === "available" || p.status === "open" ? "default" : "secondary"} className={`rounded-md uppercase text-[9px] tracking-widest px-2 py-0.5 font-bold ${
                        (p.status === 'available' || p.status === 'open') ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                        p.status === 'reserved' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                        p.status === 'sold' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                        p.status === 'pending' ? 'bg-primary/10 text-primary border-primary/20' :
                        p.status === 'roi_active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        p.status === 'roi_paused' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                        'bg-gray-500/10 text-gray-500 border-gray-500/20'
                      }`}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="p-4 font-semibold text-primary text-right">
                      {p.isInvestment ? formatMoney(p.total_value) : `${Number(p.price).toLocaleString()} ${p.currency}`}
                      {p.isInvestment && <p className="text-[9px] text-muted-foreground font-normal">Unit: {formatMoney(p.unit_price)}</p>}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {p.isInvestment && (
                          <>
                            {p.status === 'open' && (
                              <Button size="icon" variant="ghost" onClick={() => toggleCampaign(p, true)} className="h-8 w-8 rounded-lg text-amber-600" title="Pause Campaign">
                                <Pause className="h-4 w-4" />
                              </Button>
                            )}
                            {p.status === 'paused' && (
                              <Button size="icon" variant="ghost" onClick={() => toggleCampaign(p, false)} className="h-8 w-8 rounded-lg text-green-600" title="Resume Campaign">
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            {(p.status === 'funded' || p.status === 'fully_funded') && (
                              <Button size="icon" variant="ghost" onClick={() => toggleRoi(p, "activate")} className="h-8 w-8 rounded-lg text-emerald-600" title="Activate ROI">
                                <Zap className="h-4 w-4" />
                              </Button>
                            )}
                            {p.status === 'roi_active' && (
                              <Button size="icon" variant="ghost" onClick={() => toggleRoi(p, "pause")} className="h-8 w-8 rounded-lg text-amber-600" title="Pause ROI">
                                <Pause className="h-4 w-4" />
                              </Button>
                            )}
                            {p.status === 'roi_paused' && (
                              <Button size="icon" variant="ghost" onClick={() => toggleRoi(p, "resume")} className="h-8 w-8 rounded-lg text-green-600" title="Resume ROI">
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setCreateType(p.isInvestment ? "investment" : "property"); setOpen(true); }} className="h-8 w-8 rounded-lg">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(p)} className="h-8 w-8 rounded-lg hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

      {/* Import via URL Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import Property via URL</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste a link to a listing on supported platforms. The AI engine will parse the details and add a new draft property.
            </p>
            <div className="space-y-2">
              <Label>Listing URL</Label>
              <Input
                placeholder="https://..."
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

      {/* Main Listing Editor / Creation Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl border border-border p-0">
          <DialogHeader className="bg-primary p-6 shrink-0">
            <DialogTitle className="font-serif text-2xl text-white">
              {editing ? `Edit ${editing.isInvestment ? "Investment" : "Property"}` : "New Listing Creation"}
            </DialogTitle>
          </DialogHeader>
          
          <DialogBody className="p-6">
            {!editing && createType === null ? (
              <div className="py-8 text-center space-y-6">
                <p className="text-sm text-muted-foreground">Please select the type of listing you would like to create:</p>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  <button 
                    onClick={() => setCreateType("property")}
                    className="p-6 border border-border/50 rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center flex flex-col items-center gap-3 group"
                  >
                    <Building2 className="h-8 w-8 text-muted-foreground group-hover:text-primary" />
                    <span className="font-serif font-bold text-base">Standard Listing</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">Buy · Rent · Land</span>
                  </button>
                  <button 
                    onClick={() => setCreateType("investment")}
                    className="p-6 border border-border/50 rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center flex flex-col items-center gap-3 group"
                  >
                    <Layers className="h-8 w-8 text-muted-foreground group-hover:text-primary" />
                    <span className="font-serif font-bold text-base">Fractional Asset</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">Co-invest Campaigns</span>
                  </button>
                </div>
              </div>
            ) : createType === "property" ? (
              <PropertyForm 
                initial={editing} 
                locations={locations} 
                agents={agents} 
                onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["admin-properties"] }); }} 
              />
            ) : (
              <InvestPropForm 
                initial={editing} 
                onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["admin-investments-consolidated"] }); }} 
              />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Form A: Regular Property Listings ──
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
    <form onSubmit={save} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Property Title</Label>
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-10 rounded-lg" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">System ID</Label>
          <Input disabled={!initial} value={form.internal_id} onChange={(e) => setForm({ ...form, internal_id: e.target.value })} placeholder="System generated" className="h-10 rounded-lg font-mono" />
        </div>
      </div>
      
      <div className="space-y-1">
        <Label className="text-xs font-bold uppercase tracking-wider">Property Description</Label>
        <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg resize-none" />
      </div>
      
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Base Price</Label>
          <Input type="number" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="h-10 rounded-lg" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Currency</Label>
          <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="h-10 rounded-lg" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Listing Type</Label>
          <Select value={form.property_type} onValueChange={(v) => setForm({ ...form, property_type: v })}>
            <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="buy">For Sale</SelectItem><SelectItem value="rent">For Rent</SelectItem><SelectItem value="land">Land/Plot</SelectItem></SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Listing Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending Approval</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Location</Label>
          <Select value={form.location_id || "none"} onValueChange={(v) => setForm({ ...form, location_id: v === "none" ? "" : v })}>
            <SelectTrigger className="h-10 rounded-lg"><SelectValue placeholder="Pick location" /></SelectTrigger>
            <SelectContent><SelectItem value="none">Unset</SelectItem>{locations.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-bold uppercase tracking-wider">Full Street Address</Label>
        <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-10 rounded-lg" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Latitude</Label>
          <Input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="e.g. 6.4447" className="h-10 rounded-lg" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Longitude</Label>
          <Input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="e.g. 3.3941" className="h-10 rounded-lg" />
        </div>
      </div>
      
      <div className="grid gap-2 sm:grid-cols-5">
        <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-wider">Beds</Label><Input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} className="h-10 rounded-lg" /></div>
        <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-wider">Baths</Label><Input type="number" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} className="h-10 rounded-lg" /></div>
        <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-wider">Parking</Label><Input type="number" value={form.parking_spaces} onChange={(e) => setForm({ ...form, parking_spaces: e.target.value })} className="h-10 rounded-lg" /></div>
        <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-wider">SQM</Label><Input type="number" value={form.size_sqm} onChange={(e) => setForm({ ...form, size_sqm: e.target.value })} className="h-10 rounded-lg" /></div>
        <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-wider">Year</Label><Input type="number" value={form.year_built} onChange={(e) => setForm({ ...form, year_built: e.target.value })} className="h-10 rounded-lg" /></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Interior Features</Label>
          <ChipInput value={form.interior_features} onChange={(val) => setForm({ ...form, interior_features: val })} placeholder="Smart Home, Hardwood..." className="rounded-lg" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Exterior Features</Label>
          <ChipInput value={form.exterior_features} onChange={(val) => setForm({ ...form, exterior_features: val })} placeholder="Pool, Balcony..." className="rounded-lg" />
        </div>
      </div>
      
      <div className="space-y-1">
        <Label className="text-xs font-bold uppercase tracking-wider">Nearby POIs (JSON)</Label>
        <Textarea rows={3} value={form.nearby_pois} onChange={(e) => setForm({ ...form, nearby_pois: e.target.value })} className="rounded-lg font-mono text-[11px]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Cover Image URL</Label>
          <Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} className="h-10 rounded-lg" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Agent</Label>
          <Select value={form.agent_id || "none"} onValueChange={(v) => setForm({ ...form, agent_id: v === "none" ? "" : v })}>
            <SelectTrigger className="h-10 rounded-lg"><SelectValue placeholder="Assign agent" /></SelectTrigger>
            <SelectContent><SelectItem value="none">Unassigned</SelectItem>{agents.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-3 py-1">
        <input type="checkbox" id="featured-prop" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="h-4 w-4 rounded border-border text-primary cursor-pointer" />
        <Label htmlFor="featured-prop" className="text-xs font-bold cursor-pointer">Feature on homepage</Label>
      </div>

      {initial?.id && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <Label className="text-xs font-bold uppercase tracking-wider mb-2 block">Media Gallery</Label>
          <ImageUploader propertyId={initial.id} />
        </div>
      )}

      <div className="pt-4 flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Property"}</Button>
      </div>
    </form>
  );
}

// ── Form B: Fractional Investment Offerings ──
function InvestPropForm({ initial, onClose }: any) {
  const qc = useQueryClient();
  const [f, setF] = useState(() => ({
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    description: initial?.description ?? "",
    location: initial?.location ?? "",
    property_type: initial?.property_type ?? "residential",
    cover_image_url: initial?.cover_image_url ?? "",
    total_value: initial?.total_value ?? 0,
    unit_price: initial?.unit_price ?? 500,
    total_units: initial?.total_units ?? 0,
    min_investment: initial?.min_investment ?? 500,
    projected_return_min: initial?.projected_return_min ?? 6,
    projected_return_max: initial?.projected_return_max ?? 10,
    estimated_rental_yield: initial?.estimated_rental_yield ?? 7,
    distribution_frequency: initial?.distribution_frequency ?? "quarterly",
    holding_period_months: initial?.holding_period_months ?? 48,
    income_model: initial?.income_model ?? "Rental income distributed to unit holders.",
    risk_notes: initial?.risk_notes ?? "",
    status: initial?.status ?? "draft",
    currency: initial?.currency ?? "USD",
    featured: initial?.featured ?? false,
    installment_available: initial?.installment_available ?? false,
    min_down_payment_pct: initial?.min_down_payment_pct ?? 20,
    max_installment_months: initial?.max_installment_months ?? 24,
  }));
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: any = {
      ...f,
      slug: f.slug || slugify(f.title) + "-" + Math.random().toString(36).slice(2, 6),
      total_value: Number(f.total_value),
      unit_price: Number(f.unit_price),
      total_units: Number(f.total_units),
      min_investment: Number(f.min_investment),
      projected_return_min: Number(f.projected_return_min),
      projected_return_max: Number(f.projected_return_max),
      estimated_rental_yield: f.estimated_rental_yield === "" ? null : Number(f.estimated_rental_yield),
      holding_period_months: Number(f.holding_period_months),
      installment_available: f.installment_available,
      min_down_payment_pct: Number(f.min_down_payment_pct),
      max_installment_months: Number(f.max_installment_months),
    };
    const { error } = initial
      ? await supabase.from("investment_properties").update(payload).eq("id", initial.id)
      : await supabase.from("investment_properties").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved investment listing successfully" });
      qc.invalidateQueries({ queryKey: ["admin-investments-consolidated"] });
      onClose();
    }
  }

  return (
    <form onSubmit={save} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="space-y-1">
        <Label className="text-xs font-bold uppercase tracking-wider">Property Title</Label>
        <Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="h-10 rounded-lg" placeholder="Investment Name" />
      </div>
      
      <div className="space-y-1">
        <Label className="text-xs font-bold uppercase tracking-wider">Investment Description</Label>
        <Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="rounded-lg resize-none" placeholder="Describe the opportunity..." />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Location</Label>
          <Input required value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} className="h-10 rounded-lg" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Property Type</Label>
          <Input value={f.property_type} onChange={(e) => setF({ ...f, property_type: e.target.value })} className="h-10 rounded-lg" />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-bold uppercase tracking-wider">Cover Image URL</Label>
        <Input value={f.cover_image_url} onChange={(e) => setF({ ...f, cover_image_url: e.target.value })} className="h-10 rounded-lg" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Total Value</Label>
          <Input type="number" required value={f.total_value} onChange={(e) => setF({ ...f, total_value: e.target.value })} className="h-10 rounded-lg" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Unit Price</Label>
          <Input type="number" required value={f.unit_price} onChange={(e) => setF({ ...f, unit_price: e.target.value })} className="h-10 rounded-lg" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Total Units</Label>
          <Input type="number" required value={f.total_units} onChange={(e) => setF({ ...f, total_units: e.target.value })} className="h-10 rounded-lg" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Min. Investment</Label>
          <Input type="number" required value={f.min_investment} onChange={(e) => setF({ ...f, min_investment: e.target.value })} className="h-10 rounded-lg" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Currency</Label>
          <Input value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} className="h-10 rounded-lg" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Holding Period (mo)</Label>
          <Input type="number" value={f.holding_period_months} onChange={(e) => setF({ ...f, holding_period_months: e.target.value })} className="h-10 rounded-lg" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Return Min %</Label>
          <Input type="number" step="0.1" value={f.projected_return_min} onChange={(e) => setF({ ...f, projected_return_min: e.target.value })} className="h-10 rounded-lg" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Return Max %</Label>
          <Input type="number" step="0.1" value={f.projected_return_max} onChange={(e) => setF({ ...f, projected_return_max: e.target.value })} className="h-10 rounded-lg" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Rental Yield %</Label>
          <Input type="number" step="0.1" value={f.estimated_rental_yield} onChange={(e) => setF({ ...f, estimated_rental_yield: e.target.value })} className="h-10 rounded-lg" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Frequency</Label>
          <Select value={f.distribution_frequency} onValueChange={(v) => setF({ ...f, distribution_frequency: v })}>
            <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="semi_annual">Semi-annual</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase tracking-wider">Status</Label>
          <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
            <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="funded">Funded</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-3 py-1">
        <input type="checkbox" id="featured" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} className="h-4 w-4 rounded border-border text-primary cursor-pointer" />
        <Label htmlFor="featured" className="text-xs font-bold cursor-pointer">Mark as Featured Offering</Label>
      </div>

      <Separator />
      <div className="space-y-2 rounded-lg bg-secondary/20 p-4 border border-border/50">
        <div className="flex items-center gap-3">
          <input type="checkbox" id="installment_available" checked={f.installment_available} onChange={(e) => setF({ ...f, installment_available: e.target.checked })} className="h-4 w-4 rounded border-border text-primary cursor-pointer" />
          <Label htmlFor="installment_available" className="text-xs font-bold cursor-pointer">Enable Installments</Label>
        </div>
        {f.installment_available && (
          <div className="grid gap-4 sm:grid-cols-2 mt-2 animate-in fade-in">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Min. Initial (%)</Label>
              <Input type="number" value={f.min_down_payment_pct} onChange={(e) => setF({ ...f, min_down_payment_pct: e.target.value })} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Max Duration (mo)</Label>
              <Input type="number" value={f.max_installment_months} onChange={(e) => setF({ ...f, max_installment_months: e.target.value })} className="h-9" />
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Investment"}</Button>
      </div>
    </form>
  );
}
