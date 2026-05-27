import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Image as ImageIcon,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  MousePointerClick,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { CmsMediaUploader } from "@/components/admin/CmsMediaUploader";

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */
const AD_TYPES = [
  { value: "image_banner", label: "Image Banner" },
  { value: "clickable_promo", label: "Clickable Promotion" },
  { value: "featured_property", label: "Featured Property" },
  { value: "text_image_card", label: "Text + Image Card" },
  { value: "promo_slider", label: "Promotional Slider" },
] as const;

const PLACEMENTS = [
  { value: "homepage_hero", label: "Homepage Hero" },
  { value: "homepage_mid", label: "Homepage Mid-Page" },
  { value: "sidebar", label: "Sidebar" },
  { value: "property_detail", label: "Property Detail Page" },
  { value: "dashboard_promo", label: "Dashboard Promotion" },
  { value: "invest_page", label: "Investment Page" },
] as const;

const PAGE_SIZE = 10;

type AdRow = {
  id: string;
  title: string;
  description: string | null;
  ad_type: string;
  placement: string;
  image_url: string | null;
  click_url: string | null;
  cta_label: string | null;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  priority: number;
  impressions: number;
  clicks: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */
function getStatusBadge(ad: AdRow) {
  const now = new Date();
  if (ad.expires_at && new Date(ad.expires_at) < now) {
    return <Badge variant="secondary" className="bg-muted text-muted-foreground">Expired</Badge>;
  }
  if (ad.is_active) {
    if (ad.starts_at && new Date(ad.starts_at) > now) {
      return <Badge className="bg-amber-500/15 text-amber-700 border-amber-200 hover:bg-amber-500/20">Scheduled</Badge>;
    }
    return <Badge className="bg-orange-500/15 text-orange-700 border-orange-200 hover:bg-orange-500/20">Active</Badge>;
  }
  return <Badge variant="secondary">Draft</Badge>;
}

function adTypeLabel(type: string) {
  return AD_TYPES.find((t) => t.value === type)?.label ?? type;
}

function placementLabel(placement: string) {
  return PLACEMENTS.find((p) => p.value === placement)?.label ?? placement;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatNumber(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

/* ─────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────── */
export function AdminAdvertisements() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdRow | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterPlacement, setFilterPlacement] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(0);

  const { data: ads = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-advertisements"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("advertisements")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdRow[];
    },
  });

  // Filtered + paginated
  const filtered = useMemo(() => {
    const now = new Date();
    return ads.filter((ad) => {
      if (searchQuery && !ad.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterType !== "all" && ad.ad_type !== filterType) return false;
      if (filterPlacement !== "all" && ad.placement !== filterPlacement) return false;
      if (filterStatus === "active" && (!ad.is_active || (ad.expires_at && new Date(ad.expires_at) < now))) return false;
      if (filterStatus === "inactive" && ad.is_active) return false;
      if (filterStatus === "expired" && !(ad.expires_at && new Date(ad.expires_at) < now)) return false;
      return true;
    });
  }, [ads, searchQuery, filterType, filterPlacement, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // ── Actions ──
  async function deleteAd(id: string) {
    if (!confirm("Delete this advertisement? This action cannot be undone.")) return;
    const { error } = await (supabase as any).from("advertisements").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Advertisement deleted" }); qc.invalidateQueries({ queryKey: ["admin-advertisements"] }); }
  }

  async function toggleActive(id: string, current: boolean) {
    const { error } = await (supabase as any).from("advertisements").update({ is_active: !current }).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else { qc.invalidateQueries({ queryKey: ["admin-advertisements"] }); }
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(ad: AdRow) {
    setEditing(ad);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif text-lg font-semibold text-foreground">Advertisements</h3>
          <p className="text-sm text-muted-foreground">Manage banners, promotions, and sponsored content.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            className="h-9 w-9 rounded-lg"
            aria-label="Refresh advertisements"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> New Ad
          </Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search advertisements..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            className="pl-9 h-10 rounded-lg bg-accent/30 border-border/40"
          />
        </div>
        <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-[180px] h-10 rounded-lg">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {AD_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPlacement} onValueChange={(v) => { setFilterPlacement(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-[180px] h-10 rounded-lg">
            <SelectValue placeholder="All placements" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Placements</SelectItem>
            {PLACEMENTS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-[140px] h-10 rounded-lg">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Draft</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Mobile Card Layout ── */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {paginated.map((ad) => (
          <div key={ad.id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            {ad.image_url && (
              <div className="h-32 overflow-hidden bg-muted">
                <img
                  src={ad.image_url}
                  alt={ad.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground text-sm truncate">{ad.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{adTypeLabel(ad.ad_type)} · {placementLabel(ad.placement)}</p>
                </div>
                {getStatusBadge(ad)}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {formatNumber(ad.impressions)}</span>
                <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> {formatNumber(ad.clicks)}</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/30">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={ad.is_active}
                    onCheckedChange={() => toggleActive(ad.id, ad.is_active)}
                    aria-label="Toggle active"
                  />
                  <span className="text-xs text-muted-foreground">{ad.is_active ? "Active" : "Draft"}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg hover:bg-accent" onClick={() => openEdit(ad)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg hover:bg-destructive/10" onClick={() => deleteAd(ad.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {paginated.length === 0 && !isLoading && (
          <div className="rounded-xl border border-dashed border-border/60 p-12 text-center bg-secondary/5">
            <ImageIcon className="h-8 w-8 mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground">No advertisements found.</p>
          </div>
        )}
      </div>

      {/* ── Desktop Table Layout ── */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-accent text-left">
            <tr>
              <th className="p-3 whitespace-nowrap font-medium w-10"></th>
              <th className="p-3 whitespace-nowrap font-medium">Title</th>
              <th className="p-3 whitespace-nowrap font-medium">Type</th>
              <th className="p-3 whitespace-nowrap font-medium">Placement</th>
              <th className="p-3 whitespace-nowrap font-medium">Status</th>
              <th className="p-3 whitespace-nowrap font-medium text-center">Views</th>
              <th className="p-3 whitespace-nowrap font-medium text-center">Clicks</th>
              <th className="p-3 whitespace-nowrap font-medium">Expires</th>
              <th className="p-3 text-right whitespace-nowrap font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((ad) => (
              <tr key={ad.id} className="border-t border-border transition-colors hover:bg-secondary/40">
                <td className="p-3">
                  {ad.image_url ? (
                    <div className="h-8 w-12 rounded overflow-hidden bg-muted">
                      <img
                        src={ad.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                      />
                    </div>
                  ) : (
                    <div className="h-8 w-12 rounded bg-muted flex items-center justify-center">
                      <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/40" />
                    </div>
                  )}
                </td>
                <td className="p-3 font-medium max-w-[180px] truncate">{ad.title}</td>
                <td className="p-3 text-muted-foreground text-xs">{adTypeLabel(ad.ad_type)}</td>
                <td className="p-3 text-muted-foreground text-xs">{placementLabel(ad.placement)}</td>
                <td className="p-3">{getStatusBadge(ad)}</td>
                <td className="p-3 text-muted-foreground text-center">{formatNumber(ad.impressions)}</td>
                <td className="p-3 text-muted-foreground text-center">{formatNumber(ad.clicks)}</td>
                <td className="p-3 text-muted-foreground text-xs">{formatDate(ad.expires_at)}</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Switch
                      checked={ad.is_active}
                      onCheckedChange={() => toggleActive(ad.id, ad.is_active)}
                      aria-label="Toggle active"
                    />
                    <Button size="icon" variant="ghost" onClick={() => openEdit(ad)} className="h-8 w-8">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteAd(ad.id)} className="h-8 w-8">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-muted-foreground">
                  {isLoading ? "Loading advertisements..." : "No advertisements found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl p-0 border border-border">
          <DialogHeader className="p-6 border-b border-border/40 shrink-0">
            <DialogTitle>{editing ? "Edit Advertisement" : "New Advertisement"}</DialogTitle>
          </DialogHeader>
          <AdForm
            initial={editing}
            userId={user?.id}
            onClose={() => {
              setDialogOpen(false);
              qc.invalidateQueries({ queryKey: ["admin-advertisements"] });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Advertisement Form
   ───────────────────────────────────────────── */
interface AdFormProps {
  initial: AdRow | null;
  userId?: string;
  onClose: () => void;
}

function AdForm({ initial, userId, onClose }: AdFormProps) {
  const [f, setF] = useState(() => ({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    ad_type: initial?.ad_type ?? "image_banner",
    placement: initial?.placement ?? "homepage_mid",
    image_url: initial?.image_url ?? "",
    click_url: initial?.click_url ?? "",
    cta_label: initial?.cta_label ?? "",
    is_active: initial?.is_active ?? false,
    starts_at: initial?.starts_at ? initial.starts_at.slice(0, 16) : "",
    expires_at: initial?.expires_at ? initial.expires_at.slice(0, 16) : "",
    priority: initial?.priority ?? 0,
  }));
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload: any = {
      title: f.title.trim(),
      description: f.description || null,
      ad_type: f.ad_type,
      placement: f.placement,
      image_url: f.image_url || null,
      click_url: f.click_url || null,
      cta_label: f.cta_label || null,
      is_active: f.is_active,
      starts_at: f.starts_at ? new Date(f.starts_at).toISOString() : null,
      expires_at: f.expires_at ? new Date(f.expires_at).toISOString() : null,
      priority: f.priority,
    };

    if (!initial) {
      payload.created_by = userId ?? null;
    }

    const { error } = initial
      ? await (supabase as any).from("advertisements").update(payload).eq("id", initial.id)
      : await (supabase as any).from("advertisements").insert(payload);

    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: initial ? "Advertisement updated" : "Advertisement created" }); onClose(); }
  }

  return (
    <form onSubmit={save} className="flex flex-col h-full overflow-hidden">
      <DialogBody className="space-y-6 py-6">
        {/* Title */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Title</Label>
          <Input
            required
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
            className="h-12 rounded-xl"
            placeholder="Enter advertisement title..."
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
            Description (Optional)
          </Label>
          <Textarea
            rows={2}
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            className="rounded-xl resize-none"
            placeholder="Short description of the ad..."
          />
        </div>

        {/* Type + Placement */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Ad Type</Label>
            <Select value={f.ad_type} onValueChange={(v) => setF({ ...f, ad_type: v })}>
              <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                {AD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Placement</Label>
            <Select value={f.placement} onValueChange={(v) => setF({ ...f, placement: v })}>
              <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                {PLACEMENTS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Image */}
        <CmsMediaUploader
          value={f.image_url}
          onChange={(url) => setF({ ...f, image_url: url })}
          folder="ads"
          label="Ad Image"
        />

        {/* Link */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Click URL</Label>
            <Input
              value={f.click_url}
              onChange={(e) => setF({ ...f, click_url: e.target.value })}
              className="h-10 rounded-xl"
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">CTA Label</Label>
            <Input
              value={f.cta_label}
              onChange={(e) => setF({ ...f, cta_label: e.target.value })}
              className="h-10 rounded-xl"
              placeholder="Shop Now"
            />
          </div>
        </div>

        {/* Scheduling + Priority */}
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Starts At</Label>
            <Input
              type="datetime-local"
              value={f.starts_at}
              onChange={(e) => setF({ ...f, starts_at: e.target.value })}
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Expires At</Label>
            <Input
              type="datetime-local"
              value={f.expires_at}
              onChange={(e) => setF({ ...f, expires_at: e.target.value })}
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Priority</Label>
            <Input
              type="number"
              value={f.priority}
              onChange={(e) => setF({ ...f, priority: parseInt(e.target.value) || 0 })}
              className="h-10 rounded-xl"
              min={0}
            />
          </div>
        </div>

        {/* Stats (read-only, edit mode only) */}
        {initial && (
          <div className="flex items-center gap-6 rounded-xl border border-border p-4 bg-accent/10">
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">{initial.impressions.toLocaleString()}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Impressions</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">{initial.clicks.toLocaleString()}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Clicks</p>
            </div>
            {initial.impressions > 0 && (
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">
                  {((initial.clicks / initial.impressions) * 100).toFixed(1)}%
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">CTR</p>
              </div>
            )}
          </div>
        )}

        {/* Active Toggle */}
        <div className="flex items-center gap-3 rounded-xl border border-border p-4 bg-accent/20">
          <Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} />
          <div>
            <p className="text-sm font-medium">Active</p>
            <p className="text-xs text-muted-foreground">When active, this ad will display in the selected placement.</p>
          </div>
        </div>
      </DialogBody>

      <DialogFooter className="bg-secondary/5 pt-6 pb-6">
        <Button
          type="submit"
          disabled={saving}
          className="w-full h-12 rounded-xl font-bold shadow-sm bg-primary hover:bg-primary/90 transition-all"
        >
          {saving ? "Saving..." : initial ? "Update Advertisement" : "Create Advertisement"}
        </Button>
      </DialogFooter>
    </form>
  );
}
