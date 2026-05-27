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
  Megaphone,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Info,
  Wrench,
  Tag,
  Home,
  Star,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { CmsMediaUploader } from "@/components/admin/CmsMediaUploader";
import { Checkbox } from "@/components/ui/checkbox";

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */
const BROADCAST_TYPES = [
  { value: "general", label: "General Announcement", icon: Info },
  { value: "investor_update", label: "Investor Update", icon: Megaphone },
  { value: "maintenance", label: "Maintenance Notice", icon: Wrench },
  { value: "promotion", label: "Promotional Campaign", icon: Tag },
  { value: "featured_property", label: "Featured Property Alert", icon: Star },
  { value: "emergency", label: "Emergency Notice", icon: AlertTriangle },
] as const;

const AUDIENCES = [
  { value: "all", label: "Everyone" },
  { value: "investors", label: "Investors" },
  { value: "admins", label: "Admins" },
  { value: "agents", label: "Agents" },
  { value: "buyers", label: "Buyers" },
] as const;

const VISIBILITY_OPTIONS = [
  { value: "homepage", label: "Homepage" },
  { value: "investor_dashboard", label: "Investor Dashboard" },
  { value: "admin_dashboard", label: "Admin Dashboard" },
  { value: "property_pages", label: "Property Pages" },
  { value: "platform_wide", label: "Entire Platform" },
] as const;

const PAGE_SIZE = 10;

type BroadcastRow = {
  id: string;
  title: string;
  body: string | null;
  broadcast_type: string;
  target_audience: string;
  visibility: string[];
  image_url: string | null;
  link_url: string | null;
  link_label: string | null;
  is_active: boolean;
  published_at: string | null;
  expires_at: string | null;
  priority: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */
function getStatusBadge(b: BroadcastRow) {
  const now = new Date();
  if (b.expires_at && new Date(b.expires_at) < now) {
    return <Badge variant="secondary" className="bg-muted text-muted-foreground">Expired</Badge>;
  }
  if (b.is_active) {
    if (b.published_at && new Date(b.published_at) > now) {
      return <Badge className="bg-amber-500/15 text-amber-700 border-amber-200 hover:bg-amber-500/20">Scheduled</Badge>;
    }
    return <Badge className="bg-rose-500/15 text-rose-700 border-rose-200 hover:bg-rose-500/20">Active</Badge>;
  }
  return <Badge variant="secondary">Draft</Badge>;
}

function typeLabel(type: string) {
  return BROADCAST_TYPES.find((t) => t.value === type)?.label ?? type;
}

function audienceLabel(audience: string) {
  return AUDIENCES.find((a) => a.value === audience)?.label ?? audience;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/* ─────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────── */
export function AdminBroadcasts() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BroadcastRow | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(0);

  const { data: broadcasts = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-broadcasts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("broadcasts")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BroadcastRow[];
    },
  });

  // Filtered + paginated
  const filtered = useMemo(() => {
    const now = new Date();
    return broadcasts.filter((b) => {
      // Search
      if (searchQuery && !b.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      // Type filter
      if (filterType !== "all" && b.broadcast_type !== filterType) return false;
      // Status filter
      if (filterStatus === "active" && (!b.is_active || (b.expires_at && new Date(b.expires_at) < now))) return false;
      if (filterStatus === "inactive" && b.is_active) return false;
      if (filterStatus === "expired" && !(b.expires_at && new Date(b.expires_at) < now)) return false;
      return true;
    });
  }, [broadcasts, searchQuery, filterType, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // ── Actions ──
  async function deleteBroadcast(id: string) {
    if (!confirm("Delete this broadcast? This action cannot be undone.")) return;
    const { error } = await (supabase as any).from("broadcasts").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Broadcast deleted" }); qc.invalidateQueries({ queryKey: ["admin-broadcasts"] }); }
  }

  async function toggleActive(id: string, current: boolean) {
    const { error } = await (supabase as any).from("broadcasts").update({ is_active: !current }).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else { qc.invalidateQueries({ queryKey: ["admin-broadcasts"] }); }
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(b: BroadcastRow) {
    setEditing(b);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif text-lg font-semibold text-foreground">Broadcasts</h3>
          <p className="text-sm text-muted-foreground">Manage announcements, updates, and platform notices.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            className="h-9 w-9 rounded-lg"
            aria-label="Refresh broadcasts"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> New Broadcast
          </Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search broadcasts..."
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
            {BROADCAST_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-[150px] h-10 rounded-lg">
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
        {paginated.map((b) => (
          <div key={b.id} className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground text-sm truncate">{b.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{typeLabel(b.broadcast_type)}</p>
              </div>
              {getStatusBadge(b)}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>Audience: {audienceLabel(b.target_audience)}</span>
              <span>Priority: {b.priority}</span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/30">
              <div className="flex items-center gap-2">
                <Switch
                  checked={b.is_active}
                  onCheckedChange={() => toggleActive(b.id, b.is_active)}
                  aria-label="Toggle active"
                />
                <span className="text-xs text-muted-foreground">{b.is_active ? "Active" : "Draft"}</span>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg hover:bg-accent" onClick={() => openEdit(b)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg hover:bg-destructive/10" onClick={() => deleteBroadcast(b.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {paginated.length === 0 && !isLoading && (
          <div className="rounded-xl border border-dashed border-border/60 p-12 text-center bg-secondary/5">
            <Megaphone className="h-8 w-8 mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground">No broadcasts found.</p>
          </div>
        )}
      </div>

      {/* ── Desktop Table Layout ── */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-accent text-left">
            <tr>
              <th className="p-3 whitespace-nowrap font-medium">Title</th>
              <th className="p-3 whitespace-nowrap font-medium">Type</th>
              <th className="p-3 whitespace-nowrap font-medium">Audience</th>
              <th className="p-3 whitespace-nowrap font-medium">Status</th>
              <th className="p-3 whitespace-nowrap font-medium">Expires</th>
              <th className="p-3 whitespace-nowrap font-medium">Priority</th>
              <th className="p-3 text-right whitespace-nowrap font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((b) => (
              <tr key={b.id} className="border-t border-border transition-colors hover:bg-secondary/40">
                <td className="p-3 font-medium max-w-[200px] truncate">{b.title}</td>
                <td className="p-3 text-muted-foreground">{typeLabel(b.broadcast_type)}</td>
                <td className="p-3 text-muted-foreground">{audienceLabel(b.target_audience)}</td>
                <td className="p-3">{getStatusBadge(b)}</td>
                <td className="p-3 text-muted-foreground">{formatDate(b.expires_at)}</td>
                <td className="p-3 text-muted-foreground text-center">{b.priority}</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Switch
                      checked={b.is_active}
                      onCheckedChange={() => toggleActive(b.id, b.is_active)}
                      aria-label="Toggle active"
                    />
                    <Button size="icon" variant="ghost" onClick={() => openEdit(b)} className="h-8 w-8">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteBroadcast(b.id)} className="h-8 w-8">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  {isLoading ? "Loading broadcasts..." : "No broadcasts found."}
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
            <DialogTitle>{editing ? "Edit Broadcast" : "New Broadcast"}</DialogTitle>
          </DialogHeader>
          <BroadcastForm
            initial={editing}
            userId={user?.id}
            onClose={() => {
              setDialogOpen(false);
              qc.invalidateQueries({ queryKey: ["admin-broadcasts"] });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Broadcast Form
   ───────────────────────────────────────────── */
interface BroadcastFormProps {
  initial: BroadcastRow | null;
  userId?: string;
  onClose: () => void;
}

function BroadcastForm({ initial, userId, onClose }: BroadcastFormProps) {
  const [f, setF] = useState(() => ({
    title: initial?.title ?? "",
    body: initial?.body ?? "",
    broadcast_type: initial?.broadcast_type ?? "general",
    target_audience: initial?.target_audience ?? "all",
    visibility: initial?.visibility ?? ["homepage"],
    image_url: initial?.image_url ?? "",
    link_url: initial?.link_url ?? "",
    link_label: initial?.link_label ?? "",
    is_active: initial?.is_active ?? false,
    published_at: initial?.published_at ? initial.published_at.slice(0, 16) : "",
    expires_at: initial?.expires_at ? initial.expires_at.slice(0, 16) : "",
    priority: initial?.priority ?? 0,
  }));
  const [saving, setSaving] = useState(false);

  function toggleVisibility(val: string) {
    setF((prev) => ({
      ...prev,
      visibility: prev.visibility.includes(val)
        ? prev.visibility.filter((v) => v !== val)
        : [...prev.visibility, val],
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload: any = {
      title: f.title.trim(),
      body: f.body || null,
      broadcast_type: f.broadcast_type,
      target_audience: f.target_audience,
      visibility: f.visibility,
      image_url: f.image_url || null,
      link_url: f.link_url || null,
      link_label: f.link_label || null,
      is_active: f.is_active,
      published_at: f.published_at ? new Date(f.published_at).toISOString() : null,
      expires_at: f.expires_at ? new Date(f.expires_at).toISOString() : null,
      priority: f.priority,
    };

    if (!initial) {
      payload.created_by = userId ?? null;
    }

    const { error } = initial
      ? await (supabase as any).from("broadcasts").update(payload).eq("id", initial.id)
      : await (supabase as any).from("broadcasts").insert(payload);

    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: initial ? "Broadcast updated" : "Broadcast created" }); onClose(); }
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
            placeholder="Enter broadcast title..."
          />
        </div>

        {/* Body */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
            Message Body
          </Label>
          <Textarea
            rows={3}
            value={f.body}
            onChange={(e) => setF({ ...f, body: e.target.value })}
            className="rounded-xl resize-none"
            placeholder="Write the broadcast message..."
          />
        </div>

        {/* Type + Audience */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Broadcast Type</Label>
            <Select value={f.broadcast_type} onValueChange={(v) => setF({ ...f, broadcast_type: v })}>
              <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                {BROADCAST_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Target Audience</Label>
            <Select value={f.target_audience} onValueChange={(v) => setF({ ...f, target_audience: v })}>
              <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                {AUDIENCES.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Visibility */}
        <div className="space-y-3">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
            Visibility (where it appears)
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {VISIBILITY_OPTIONS.map((v) => (
              <label
                key={v.value}
                className="flex items-center gap-2.5 rounded-lg border border-border/60 p-3 cursor-pointer hover:bg-accent/30 transition-colors"
              >
                <Checkbox
                  checked={f.visibility.includes(v.value)}
                  onCheckedChange={() => toggleVisibility(v.value)}
                />
                <span className="text-sm">{v.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Image */}
        <CmsMediaUploader
          value={f.image_url}
          onChange={(url) => setF({ ...f, image_url: url })}
          folder="broadcasts"
          label="Banner Image (Optional)"
        />

        {/* Link */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Link URL (Optional)</Label>
            <Input
              value={f.link_url}
              onChange={(e) => setF({ ...f, link_url: e.target.value })}
              className="h-10 rounded-xl"
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Link Label</Label>
            <Input
              value={f.link_label}
              onChange={(e) => setF({ ...f, link_label: e.target.value })}
              className="h-10 rounded-xl"
              placeholder="Learn More"
            />
          </div>
        </div>

        {/* Scheduling + Priority */}
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Publish At</Label>
            <Input
              type="datetime-local"
              value={f.published_at}
              onChange={(e) => setF({ ...f, published_at: e.target.value })}
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

        {/* Active Toggle */}
        <div className="flex items-center gap-3 rounded-xl border border-border p-4 bg-accent/20">
          <Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} />
          <div>
            <p className="text-sm font-medium">Active</p>
            <p className="text-xs text-muted-foreground">When active, this broadcast will appear to the selected audience.</p>
          </div>
        </div>
      </DialogBody>

      <DialogFooter className="bg-secondary/5 pt-6 pb-6">
        <Button
          type="submit"
          disabled={saving}
          className="w-full h-12 rounded-xl font-bold shadow-sm bg-primary hover:bg-primary/90 transition-all"
        >
          {saving ? "Saving..." : initial ? "Update Broadcast" : "Create Broadcast"}
        </Button>
      </DialogFooter>
    </form>
  );
}
