import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Pencil, Trash2, Building2, Wallet, Globe,
  GripVertical, Star, Copy, Check, AlertCircle
} from "lucide-react";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────
type PaymentCategory = "bank_transfer" | "digital_currency" | "third_party_provider";

interface PaymentMethod {
  id: string;
  payment_category: PaymentCategory;
  method_name: string;
  description: string | null;
  instructions: string | null;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
  configuration: Record<string, any>;
  icon_url: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORY_LABELS: Record<PaymentCategory, string> = {
  bank_transfer: "Bank Transfer",
  digital_currency: "Digital Currency",
  third_party_provider: "Third-Party Provider",
};

const CATEGORY_ICONS: Record<PaymentCategory, any> = {
  bank_transfer: Building2,
  digital_currency: Wallet,
  third_party_provider: Globe,
};

const EMPTY_FORM: Omit<PaymentMethod, "id" | "created_at" | "updated_at"> = {
  payment_category: "bank_transfer",
  method_name: "",
  description: "",
  instructions: "",
  is_active: true,
  is_default: false,
  display_order: 0,
  configuration: {},
  icon_url: null,
};

// ────────────────────────────────────────────
// Config field definitions per category
// ────────────────────────────────────────────
const CONFIG_FIELDS: Record<PaymentCategory, { key: string; label: string; placeholder: string; type?: string }[]> = {
  bank_transfer: [
    { key: "bank_name", label: "Bank Name", placeholder: "e.g. First Bank" },
    { key: "account_name", label: "Account Name", placeholder: "e.g. Haven Home Hub Ltd" },
    { key: "account_number", label: "Account Number", placeholder: "e.g. 0123456789" },
    { key: "swift_code", label: "SWIFT / BIC Code", placeholder: "e.g. FBNINGLA" },
    { key: "routing_number", label: "Routing / Sort Code", placeholder: "Optional" },
    { key: "country", label: "Country", placeholder: "e.g. United States" },
  ],
  digital_currency: [
    { key: "wallet_address", label: "Wallet Address", placeholder: "e.g. 0x1234...abcd" },
    { key: "wallet_network", label: "Network", placeholder: "e.g. ERC-20, BEP-20, TRC-20" },
    { key: "wallet_label", label: "Currency Symbol", placeholder: "e.g. USDT, BTC, ETH" },
    { key: "supported_currency", label: "Supported Currency", placeholder: "e.g. USDT" },
    { key: "qr_code_url", label: "QR Code Image URL", placeholder: "Optional image URL" },
  ],
  third_party_provider: [
    { key: "provider_url", label: "Provider URL", placeholder: "e.g. https://moonpay.com" },
    { key: "supported_methods", label: "Supported Methods", placeholder: "e.g. Card, Apple Pay" },
    { key: "country_support", label: "Supported Countries", placeholder: "e.g. Global, US, UK, NG" },
  ],
};

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────
export function AdminPaymentMethods() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<PaymentCategory | "all">("all");

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ["admin-payment-methods"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payment_methods")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []) as PaymentMethod[];
    },
  });

  const filtered = filterCategory === "all"
    ? methods
    : methods.filter((m) => m.payment_category === filterCategory);

  // ── Open create dialog ──
  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, display_order: (methods.length + 1) * 10 });
    setDialogOpen(true);
  }

  // ── Open edit dialog ──
  function openEdit(m: PaymentMethod) {
    setEditingId(m.id);
    setForm({
      payment_category: m.payment_category,
      method_name: m.method_name,
      description: m.description || "",
      instructions: m.instructions || "",
      is_active: m.is_active,
      is_default: m.is_default,
      display_order: m.display_order,
      configuration: m.configuration || {},
      icon_url: m.icon_url,
    });
    setDialogOpen(true);
  }

  // ── Save (create or update) ──
  async function handleSave() {
    if (!form.method_name.trim()) {
      toast({ title: "Missing name", description: "Payment method name is required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        payment_category: form.payment_category,
        method_name: form.method_name.trim(),
        description: form.description?.trim() || null,
        instructions: form.instructions?.trim() || null,
        is_active: form.is_active,
        is_default: form.is_default,
        display_order: form.display_order,
        configuration: form.configuration,
        icon_url: form.icon_url?.trim() || null,
      };

      if (editingId) {
        const { error } = await (supabase as any).from("payment_methods").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Payment method updated" });
      } else {
        const { error } = await (supabase as any).from("payment_methods").insert(payload);
        if (error) throw error;
        toast({ title: "Payment method created" });
      }
      qc.invalidateQueries({ queryKey: ["admin-payment-methods"] });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle active ──
  async function toggleActive(m: PaymentMethod) {
    const { error } = await (supabase as any)
      .from("payment_methods")
      .update({ is_active: !m.is_active })
      .eq("id", m.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: m.is_active ? "Payment method disabled" : "Payment method enabled" });
      qc.invalidateQueries({ queryKey: ["admin-payment-methods"] });
    }
  }

  // ── Set default ──
  async function setDefault(m: PaymentMethod) {
    const { error } = await (supabase as any)
      .from("payment_methods")
      .update({ is_default: true })
      .eq("id", m.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `"${m.method_name}" set as default` });
      qc.invalidateQueries({ queryKey: ["admin-payment-methods"] });
    }
  }

  // ── Delete ──
  async function handleDelete(id: string) {
    const { error } = await (supabase as any).from("payment_methods").delete().eq("id", id);
    if (error) {
      toast({ title: "Cannot delete", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Payment method deleted" });
      qc.invalidateQueries({ queryKey: ["admin-payment-methods"] });
    }
    setDeleteConfirm(null);
  }

  // ── Config field updater ──
  function updateConfig(key: string, value: string) {
    setForm((prev) => ({
      ...prev,
      configuration: { ...prev.configuration, [key]: value },
    }));
  }

  // ── Category counts ──
  const counts = {
    all: methods.length,
    bank_transfer: methods.filter((m) => m.payment_category === "bank_transfer").length,
    digital_currency: methods.filter((m) => m.payment_category === "digital_currency").length,
    third_party_provider: methods.filter((m) => m.payment_category === "third_party_provider").length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-foreground">Payment Methods</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all payment options available to users across the platform.
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-xl font-medium shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Add Payment Method
        </Button>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(["all", "bank_transfer", "digital_currency", "third_party_provider"] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterCategory === cat
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-accent/50 text-muted-foreground hover:bg-accent"
            }`}
          >
            {cat === "all" ? "All Methods" : CATEGORY_LABELS[cat]}
            <span className="ml-2 text-xs opacity-70">({counts[cat]})</span>
          </button>
        ))}
      </div>

      {/* Methods List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-accent/30 rounded-xl border border-border/50">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-serif text-lg font-semibold text-foreground">No payment methods found</h3>
          <p className="text-sm text-muted-foreground mt-1">Add your first payment method to get started.</p>
          <Button onClick={openCreate} variant="outline" className="mt-6 rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Add Payment Method
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const Icon = CATEGORY_ICONS[m.payment_category];
            return (
              <div
                key={m.id}
                className={`rounded-xl border bg-card p-5 transition-all hover:shadow-sm ${
                  !m.is_active ? "opacity-60 border-border/50" : "border-border"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                    m.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground truncate">{m.method_name}</h3>
                      <Badge variant="secondary" className="text-[10px] font-medium">
                        {CATEGORY_LABELS[m.payment_category]}
                      </Badge>
                      {m.is_default && (
                        <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          <Star className="h-2.5 w-2.5 mr-1 fill-current" /> Default
                        </Badge>
                      )}
                      {!m.is_active && (
                        <Badge variant="destructive" className="text-[10px]">Disabled</Badge>
                      )}
                    </div>
                    {m.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{m.description}</p>
                    )}
                    {/* Show key config details */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      {m.payment_category === "bank_transfer" && m.configuration?.bank_name && (
                        <span className="text-[10px] text-muted-foreground">
                          Bank: <strong className="text-foreground">{m.configuration.bank_name}</strong>
                        </span>
                      )}
                      {m.payment_category === "digital_currency" && m.configuration?.wallet_label && (
                        <span className="text-[10px] text-muted-foreground">
                          Currency: <strong className="text-foreground">{m.configuration.wallet_label}</strong>
                        </span>
                      )}
                      {m.payment_category === "digital_currency" && m.configuration?.wallet_network && (
                        <span className="text-[10px] text-muted-foreground">
                          Network: <strong className="text-foreground">{m.configuration.wallet_network}</strong>
                        </span>
                      )}
                      {m.payment_category === "third_party_provider" && m.configuration?.provider_url && (
                        <span className="text-[10px] text-muted-foreground">
                          URL: <strong className="text-foreground">{m.configuration.provider_url}</strong>
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        Order: <strong className="text-foreground">{m.display_order}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={m.is_active}
                      onCheckedChange={() => toggleActive(m)}
                      className="data-[state=checked]:bg-primary"
                    />
                    {!m.is_default && m.is_active && (
                      <Button variant="ghost" size="sm" onClick={() => setDefault(m)} title="Set as default">
                        <Star className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => openEdit(m)} title="Edit">
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(m.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Delete Payment Method?</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-muted-foreground mb-6">
              This will permanently remove this payment method. Existing transaction records will not be affected.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="rounded-lg">Cancel</Button>
              <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="rounded-lg">
                Delete
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl p-0 border border-border">
          <DialogHeader className="p-6 border-b border-border/40 shrink-0">
            <DialogTitle className="font-serif text-xl">
              {editingId ? "Edit Payment Method" : "Add Payment Method"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-6 py-4">
            {/* Category */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Category</Label>
              <Select
                value={form.payment_category}
                onValueChange={(val) =>
                  setForm((prev) => ({ ...prev, payment_category: val as PaymentCategory, configuration: {} }))
                }
                disabled={!!editingId}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="digital_currency">Digital Currency</SelectItem>
                  <SelectItem value="third_party_provider">Third-Party Provider</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Method Name *</Label>
                <Input
                  value={form.method_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, method_name: e.target.value }))}
                  placeholder="e.g. USDT (TRC-20)"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Display Order</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm((prev) => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Description</Label>
              <Input
                value={form.description || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Short description shown to users"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Payment Instructions</Label>
              <Textarea
                value={form.instructions || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, instructions: e.target.value }))}
                placeholder="Step-by-step instructions for the user..."
                rows={3}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Icon / Logo URL</Label>
              <Input
                value={form.icon_url || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, icon_url: e.target.value }))}
                placeholder="Optional URL to an icon or logo image"
                className="h-11 rounded-xl"
              />
            </div>

            <Separator />

            {/* Dynamic Config Fields */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                {CATEGORY_LABELS[form.payment_category]} Configuration
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {CONFIG_FIELDS[form.payment_category].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">{field.label}</Label>
                    <Input
                      type={field.type || "text"}
                      value={form.configuration?.[field.key] || ""}
                      onChange={(e) => updateConfig(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="h-10 rounded-lg text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Toggles */}
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(val) => setForm((prev) => ({ ...prev, is_active: val }))}
                />
                <Label className="text-sm font-medium">Active</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.is_default}
                  onCheckedChange={(val) => setForm((prev) => ({ ...prev, is_default: val }))}
                />
                <Label className="text-sm font-medium">Default for this category</Label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl" disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="rounded-xl min-w-[140px] font-medium" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update Method" : "Create Method"}
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
