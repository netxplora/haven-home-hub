import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, TrendingUp } from "lucide-react";
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

export function AdminPayouts() {
  const qc = useQueryClient();
  const { data: payouts = [] } = useQuery({ 
    queryKey: ["admin-payouts"], 
    queryFn: async () => (await supabase.from("payouts").select("*, investment_properties(title, currency)").order("distribution_date", { ascending: false })).data ?? [] 
  });
  
  const { data: props = [] } = useQuery({ 
    queryKey: ["admin-invest-list"], 
    queryFn: async () => (await supabase.from("investment_properties").select("id, title").order("title")).data ?? [] 
  });

  const [f, setF] = useState({ property_id: "", amount: "", distribution_date: new Date().toISOString().slice(0, 10), notes: "" });
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!f.property_id) return;
    setSaving(true);
    
    // Create payout record
    const { data: payout, error } = await supabase.from("payouts").insert({
      property_id: f.property_id,
      amount: Number(f.amount),
      distribution_date: f.distribution_date,
      notes: f.notes || null,
    }).select().single();

    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Call the enterprise RPC to distribute funds and notify investors safely
    const { error: rpcError } = await supabase.rpc("distribute_property_payout", {
      p_payout_id: payout.id
    });

    if (rpcError) {
      toast({ title: "Distribution Failed", description: rpcError.message, variant: "destructive" });
      // Depending on requirements, we might want to delete the payout if distribution fails
      // await supabase.from("payouts").delete().eq("id", payout.id);
      setSaving(false);
      return;
    }

    setSaving(false);
    setF({ property_id: "", amount: "", distribution_date: new Date().toISOString().slice(0, 10), notes: "" });
    qc.invalidateQueries({ queryKey: ["admin-payouts"] });
    toast({ title: "Payout recorded and distributed via backend" });
  }

  async function remove(id: string) {
    if (!confirm("Are you sure? This will remove the payout record and its distributed returns.")) return;
    const { error } = await supabase.from("payouts").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Payout deleted" });
      qc.invalidateQueries({ queryKey: ["admin-payouts"] });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* Mobile Card View (md:hidden) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {payouts.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground shadow-sm">
            No payouts recorded yet.
          </div>
        ) : (
          payouts.map((p: any) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-foreground">{p.investment_properties?.title}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(p.distribution_date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{formatMoney(Number(p.amount), p.investment_properties?.currency ?? "USD")}</p>
                </div>
              </div>

              {p.notes && (
                <div className="space-y-1 bg-muted/30 p-2.5 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px] uppercase font-medium">Notes</span>
                  <p className="text-xs text-foreground/80 leading-relaxed">{p.notes}</p>
                </div>
              )}

              <div className="pt-2 border-t border-border/50 flex gap-2">
                <Button size="sm" variant="destructive" className="w-full h-11 text-sm font-medium flex items-center justify-center gap-2" onClick={() => remove(p.id)}>
                  <Trash2 className="h-4 w-4" /> Delete Payout
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View (hidden md:block) */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <div className="w-full overflow-x-auto pb-2">
        <table className="w-full text-sm">
          <thead className="bg-accent text-left">
            <tr>
              <th className="p-4 font-serif font-semibold text-muted-foreground uppercase tracking-tighter text-[10px] whitespace-nowrap">Date</th>
              <th className="p-4 font-serif font-semibold text-muted-foreground uppercase tracking-tighter text-[10px] whitespace-nowrap">Property</th>
              <th className="p-4 font-serif font-semibold text-right text-muted-foreground uppercase tracking-tighter text-[10px] whitespace-nowrap">Amount</th>
              <th className="p-4 font-serif font-semibold text-muted-foreground uppercase tracking-tighter text-[10px] whitespace-nowrap">Notes</th>
              <th className="p-4 font-serif font-semibold text-right text-muted-foreground uppercase tracking-tighter text-[10px] whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payouts.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground italic">No payouts recorded yet.</td></tr>
            ) : payouts.map((p: any) => (
              <tr key={p.id} className="transition-colors hover:bg-secondary/40">
                <td className="p-4">{new Date(p.distribution_date).toLocaleDateString()}</td>
                <td className="p-4 font-medium">{p.investment_properties?.title}</td>
                <td className="p-4 text-right font-semibold text-primary">{formatMoney(Number(p.amount), p.investment_properties?.currency ?? "USD")}</td>
                <td className="p-4 text-[10px] text-muted-foreground max-w-[200px] truncate">{p.notes ?? "—"}</td>
                <td className="p-4 text-right">
                  <Button size="icon" variant="ghost" onClick={() => remove(p.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-lg">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      <form onSubmit={add} className="h-fit space-y-4 rounded-xl border border-border/50 bg-card p-6 shadow-xl shadow-primary/5">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold">Record Payout</h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Returns Distribution</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Target Property</Label>
            <Select value={f.property_id} onValueChange={(v) => setF({ ...f, property_id: v })}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Pick property" /></SelectTrigger>
              <SelectContent className="rounded-xl">
                {props.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Distribution Amount</Label>
            <Input type="number" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className="rounded-xl h-11" placeholder="0.00" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Distribution Date</Label>
            <Input type="date" value={f.distribution_date} onChange={(e) => setF({ ...f, distribution_date: e.target.value })} className="rounded-xl h-11" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Internal Notes</Label>
            <Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="rounded-xl resize-none" placeholder="Details about this payout..." />
          </div>

          <Button type="submit" disabled={saving} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-sm transition-all active:scale-[0.98] font-bold">
            {saving ? "Distributing..." : "Distribute Pro-Rata"}
          </Button>
          
          <div className="rounded-xl bg-accent/50 p-3 flex items-start gap-2 border border-border/30">
            <Plus className="h-3 w-3 mt-0.5 text-primary rotate-45" />
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              This amount will be automatically split between all <strong>approved</strong> investors based on their ownership percentage.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
