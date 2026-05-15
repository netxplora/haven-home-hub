import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Wallet, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export function AdminWallets() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const { data: wallets = [], isLoading } = useQuery({
    queryKey: ["admin-wallets"],
    queryFn: async () => {
      const { data } = await (supabase.from("crypto_assets" as any) as any).select("*").order("symbol", { ascending: true });
      return data ?? [];
    },
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const payload = {
      symbol: fd.get("symbol"),
      name: fd.get("name"),
      network: fd.get("network"),
      wallet_address: fd.get("address"),
      is_active: true,
    };

    let error;
    if (editing) {
      const { error: err } = await (supabase.from("crypto_assets" as any) as any).update(payload).eq("id", editing.id);
      error = err;
    } else {
      const { error: err } = await (supabase.from("crypto_assets" as any) as any).insert(payload);
      error = err;
    }

    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Wallet saved successfully" });
      qc.invalidateQueries({ queryKey: ["admin-wallets"] });
      setOpen(false);
      setEditing(null);
    }
  }

  async function toggle(id: string, current: boolean) {
    const { error } = await (supabase.from("crypto_assets" as any) as any).update({ is_active: !current }).eq("id", id);
    if (!error) qc.invalidateQueries({ queryKey: ["admin-wallets"] });
  }

  async function remove(id: string) {
    if (!confirm("Are you sure? This will remove the wallet from user selection.")) return;
    const { error } = await (supabase.from("crypto_assets" as any) as any).delete().eq("id", id);
    if (!error) {
      toast({ title: "Wallet removed" });
      qc.invalidateQueries({ queryKey: ["admin-wallets"] });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold">Global Wallets</h2>
          <p className="text-sm text-muted-foreground">Manage addresses where users send crypto payments.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-primary shadow-sm"><Plus className="mr-2 h-4 w-4" /> Add Wallet</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader className="bg-secondary/40 pb-6 border-b border-border/50">
              <DialogTitle className="font-serif text-2xl">{editing ? "Edit Wallet" : "Add New Wallet"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="flex flex-col h-full overflow-hidden">
              <DialogBody className="space-y-6 py-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Symbol (e.g. BTC)</Label>
                    <Input name="symbol" defaultValue={editing?.symbol} required className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Asset Name</Label>
                    <Input name="name" defaultValue={editing?.name} required className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Network (e.g. ERC20, TRC20)</Label>
                  <Input name="network" defaultValue={editing?.network} required className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Admin Wallet Address</Label>
                  <Input name="address" defaultValue={editing?.wallet_address} required className="h-12 rounded-xl font-mono text-xs bg-accent/50 focus:bg-background transition-all" />
                </div>
              </DialogBody>
              <DialogFooter className="bg-secondary/5 pt-6 pb-6">
                <Button type="submit" className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm">
                  Save Wallet Configuration
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {wallets.map((w: any) => (
          <div key={w.id} className={`relative overflow-hidden rounded-xl border p-6 transition-all ${w.is_active ? 'bg-card border-border/50 shadow-sm' : 'bg-secondary/20 border-dashed opacity-60'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-none">{w.symbol}</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">{w.network}</p>
                </div>
              </div>
              <Badge variant={w.is_active ? "default" : "secondary"} className="text-[9px] uppercase">{w.is_active ? "Active" : "Disabled"}</Badge>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-accent border border-border/30">
                <p className="text-[9px] uppercase font-bold text-muted-foreground mb-1">Address</p>
                <p className="font-mono text-[10px] break-all leading-relaxed text-foreground/80">{w.wallet_address}</p>
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary" onClick={() => { setEditing(w); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => remove(w.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-muted-foreground">{w.is_active ? 'Enabled' : 'Disabled'}</span>
                  <Switch checked={w.is_active} onCheckedChange={() => toggle(w.id, w.is_active)} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {wallets.length === 0 && !isLoading && (
        <div className="p-12 text-center rounded-xl border border-dashed border-border/50 bg-secondary/10">
          <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
          <p className="font-serif text-lg text-muted-foreground">No global wallets configured.</p>
          <p className="text-sm text-muted-foreground mt-1">Users will not be able to pay with crypto until you add a wallet.</p>
        </div>
      )}
    </div>
  );
}
