import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, TrendingUp, Layers } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUploader } from "@/components/site/ImageUploader";
import { Separator } from "@/components/ui/separator";
import { formatMoney } from "@/lib/invest";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function AdminInvest() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const { data = [] } = useQuery({
    queryKey: ["admin-invest"],
    queryFn: async () => (await (supabase as any).from("investment_properties").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  async function remove(id: string) {
    if (!confirm("Delete this investment property?")) return;
    const { error } = await (supabase as any).from("investment_properties").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else qc.invalidateQueries({ queryKey: ["admin-invest"] });
  }
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button 
          onClick={() => { setEditing(null); setOpen(true); }} 
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-[0.98] rounded-xl"
        >
          <Plus className="mr-2 h-4 w-4" /> New investment property
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-accent text-left">
            <tr>
              <th className="p-4 font-serif font-semibold text-muted-foreground uppercase tracking-tighter text-[10px]">Title</th>
              <th className="p-4 font-serif font-semibold text-muted-foreground uppercase tracking-tighter text-[10px]">Location</th>
              <th className="p-4 font-serif font-semibold text-muted-foreground uppercase tracking-tighter text-[10px]">Status</th>
              <th className="p-4 font-serif font-semibold text-muted-foreground uppercase tracking-tighter text-[10px]">Units</th>
              <th className="p-4 font-serif font-semibold text-muted-foreground uppercase tracking-tighter text-[10px]">Min.</th>
              <th className="p-4 font-serif font-semibold text-muted-foreground uppercase tracking-tighter text-[10px]">Plan</th>
              <th className="p-4 font-serif font-semibold text-right text-muted-foreground uppercase tracking-tighter text-[10px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((p: any) => (
              <tr key={p.id} className="transition-colors hover:bg-secondary/40">
                <td className="p-4">
                  <Link to={`/invest/${p.slug}`} className="font-serif font-semibold hover:text-primary transition-colors">{p.title}</Link>
                </td>
                <td className="p-4 text-muted-foreground">{p.location}</td>
                <td className="p-4">
                  <Badge variant={p.status === "open" ? "default" : "secondary"} className="rounded-md uppercase text-[9px] tracking-widest px-2 py-0.5 font-bold">
                    {p.status}
                  </Badge>
                </td>
                <td className="p-4 font-medium text-muted-foreground">{p.units_sold} <span className="text-xs text-muted-foreground/50">/</span> {p.total_units}</td>
                <td className="p-4 font-semibold text-primary">{formatMoney(Number(p.min_investment), p.currency)}</td>
                <td className="p-4">
                  {p.installment_available && (
                    <Badge variant="outline" className="rounded-md text-[9px] tracking-wider px-2 py-0.5 font-bold border-primary/30 text-primary">
                      <Layers className="h-3 w-3 mr-1" /> Installments
                    </Badge>
                  )}
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-1">
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
            {data.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground italic">No investment properties found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="bg-primary pb-6">
            <DialogTitle className="font-serif text-2xl text-white">{editing ? "Edit investment property" : "New investment property"}</DialogTitle>
          </DialogHeader>
          <InvestPropForm initial={editing} onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["admin-invest"] }); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InvestPropForm({ initial, onClose }: any) {
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
      ? await (supabase as any).from("investment_properties").update(payload).eq("id", initial.id)
      : await (supabase as any).from("investment_properties").insert(payload);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Saved successfully" }); onClose(); }
  }
  return (
    <form onSubmit={save} className="flex flex-col h-full overflow-hidden">
      <DialogBody className="space-y-6 py-6">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Property Title</Label>
          <Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" placeholder="Enter investment name" />
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Investment Overview</Label>
          <Textarea rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="rounded-xl resize-none bg-accent/50 focus:bg-background transition-all" placeholder="Describe the opportunity..." />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Location</Label>
            <Input required value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Property type</Label>
            <Input value={f.property_type} onChange={(e) => setF({ ...f, property_type: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Cover image URL</Label>
          <Input value={f.cover_image_url} onChange={(e) => setF({ ...f, cover_image_url: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" placeholder="https://..." />
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Total value</Label>
            <Input type="number" required value={f.total_value} onChange={(e) => setF({ ...f, total_value: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Unit price</Label>
            <Input type="number" required value={f.unit_price} onChange={(e) => setF({ ...f, unit_price: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Total units</Label>
            <Input type="number" required value={f.total_units} onChange={(e) => setF({ ...f, total_units: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Min. investment</Label>
            <Input type="number" required value={f.min_investment} onChange={(e) => setF({ ...f, min_investment: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Currency</Label>
            <Input value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Holding (mo)</Label>
            <Input type="number" value={f.holding_period_months} onChange={(e) => setF({ ...f, holding_period_months: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Return Min %</Label>
            <Input type="number" step="0.1" value={f.projected_return_min} onChange={(e) => setF({ ...f, projected_return_min: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Return Max %</Label>
            <Input type="number" step="0.1" value={f.projected_return_max} onChange={(e) => setF({ ...f, projected_return_max: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Rental Yield %</Label>
            <Input type="number" step="0.1" value={f.estimated_rental_yield} onChange={(e) => setF({ ...f, estimated_rental_yield: e.target.value })} className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Frequency</Label>
            <Select value={f.distribution_frequency} onValueChange={(v) => setF({ ...f, distribution_frequency: v })}>
              <SelectTrigger className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all border-none"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="semi_annual">Semi-annual</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Status</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all border-none"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="funded">Funded</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3 py-2 px-1">
          <input type="checkbox" id="featured" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} className="h-5 w-5 rounded-md border-border text-primary focus:ring-primary/20 transition-all cursor-pointer" />
          <Label htmlFor="featured" className="text-sm font-bold text-foreground/80 cursor-pointer">Mark as Featured Offering</Label>
        </div>

        {/* Installment Configuration */}
        <Separator />
        <div className="space-y-4 rounded-xl bg-secondary/20 border border-border/50 p-5">
          <div className="flex items-center gap-3">
            <input type="checkbox" id="installment_available" checked={f.installment_available} onChange={(e) => setF({ ...f, installment_available: e.target.checked })} className="h-5 w-5 rounded-md border-border text-primary focus:ring-primary/20 transition-all cursor-pointer" />
            <Label htmlFor="installment_available" className="text-sm font-bold text-foreground/80 cursor-pointer">Enable Installment Payments</Label>
          </div>
          {f.installment_available && (
            <div className="grid gap-4 sm:grid-cols-2 mt-4 animate-in fade-in slide-in-from-top-1">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Min. Initial Payment (%)</Label>
                <Input type="number" min={5} max={90} value={f.min_down_payment_pct} onChange={(e) => setF({ ...f, min_down_payment_pct: e.target.value })} className="h-12 rounded-xl bg-background transition-all" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Max Duration (months)</Label>
                <Input type="number" min={3} max={60} value={f.max_installment_months} onChange={(e) => setF({ ...f, max_installment_months: e.target.value })} className="h-12 rounded-xl bg-background transition-all" />
              </div>
            </div>
          )}
        </div>
      </DialogBody>
      <DialogFooter className="bg-secondary/5 pt-6 pb-6">
        <Button type="submit" disabled={saving} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold shadow-sm transition-all">
          {saving ? "Saving Changes..." : "Save Investment Property"}
        </Button>
      </DialogFooter>
    </form>
  );
}
