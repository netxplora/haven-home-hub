import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ExternalLink, Settings, LayoutGrid, Globe, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AdminProviders() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["admin-providers"],
    queryFn: async () => {
      const { data } = await (supabase.from("crypto_providers" as any) as any).select("*").order("display_order", { ascending: true });
      return data ?? [];
    },
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const payload: any = {
      name: fd.get("name"),
      description: fd.get("description"),
      integration_type: fd.get("integration_type"),
      url_template: fd.get("url_template"),
      display_order: parseInt(fd.get("display_order") as string || "0"),
      is_default: fd.get("is_default") === "true",
      supported_assets: JSON.parse(fd.get("supported_assets") as string || '["USDT", "BTC", "ETH"]'),
      supported_networks: JSON.parse(fd.get("supported_networks") as string || '["ERC20", "TRC20"]'),
    };

    let error;
    if (editing) {
      const { error: err } = await (supabase.from("crypto_providers" as any) as any).update(payload).eq("id", editing.id);
      error = err;
    } else {
      const { error: err } = await (supabase.from("crypto_providers" as any) as any).insert(payload);
      error = err;
    }

    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Provider saved successfully" });
      qc.invalidateQueries({ queryKey: ["admin-providers"] });
      setOpen(false);
      setEditing(null);
    }
  }

  async function toggle(id: string, current: boolean) {
    const { error } = await (supabase.from("crypto_providers" as any) as any).update({ is_active: !current }).eq("id", id);
    if (!error) qc.invalidateQueries({ queryKey: ["admin-providers"] });
  }

  async function remove(id: string) {
    if (!confirm("Are you sure? Users will no longer be able to use this provider.")) return;
    const { error } = await (supabase.from("crypto_providers" as any) as any).delete().eq("id", id);
    if (!error) {
      toast({ title: "Provider removed" });
      qc.invalidateQueries({ queryKey: ["admin-providers"] });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground">Digital Currency Providers</h2>
          <p className="text-sm text-muted-foreground">Configure third-party services for "Buy Digital Currency" flow.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-primary shadow-sm"><Plus className="mr-2 h-4 w-4" /> Add Provider</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl rounded-xl border-none shadow-2xl">
            <DialogHeader><DialogTitle className="font-serif text-xl">{editing ? "Edit Provider" : "Add New Provider"}</DialogTitle></DialogHeader>
            <form onSubmit={save} className="flex flex-col h-full">
              <DialogBody className="space-y-6 py-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Provider Name</Label>
                    <Input name="name" defaultValue={editing?.name} required className="rounded-xl h-12 bg-accent border-border/50 focus:bg-background transition-all" placeholder="e.g. MoonPay" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Integration Type</Label>
                    <Select name="integration_type" defaultValue={editing?.integration_type || "redirect"}>
                      <SelectTrigger className="rounded-xl h-12 bg-accent border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-xl">
                        <SelectItem value="redirect">Redirect to URL</SelectItem>
                        <SelectItem value="widget">Embedded Widget</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">URL Template (Use {'{symbol}'}, {'{amount}'}, {'{address}'} as placeholders)</Label>
                  <Input name="url_template" defaultValue={editing?.url_template} required className="rounded-xl h-12 bg-accent border-border/50 font-mono text-xs focus:bg-background transition-all" placeholder="https://buy.provider.com?coin={symbol}&amt={amount}&wallet={address}" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Short Description</Label>
                  <Textarea name="description" defaultValue={editing?.description} className="rounded-xl resize-none h-24 bg-accent border-border/50 focus:bg-background transition-all" placeholder="Display message for users..." />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Supported Assets (JSON Array)</Label>
                    <Input name="supported_assets" defaultValue={JSON.stringify(editing?.supported_assets || ["USDT", "BTC", "ETH"])} required className="rounded-xl h-12 bg-accent border-border/50 font-mono text-xs focus:bg-background transition-all" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Supported Networks (JSON Array)</Label>
                    <Input name="supported_networks" defaultValue={JSON.stringify(editing?.supported_networks || ["ERC20", "TRC20"])} required className="rounded-xl h-12 bg-accent border-border/50 font-mono text-xs focus:bg-background transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Display Order</Label>
                    <Input name="display_order" type="number" defaultValue={editing?.display_order || 0} className="rounded-xl h-12 bg-accent border-border/50 focus:bg-background transition-all" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Set as Default</Label>
                    <Select name="is_default" defaultValue={editing?.is_default?.toString() || "false"}>
                      <SelectTrigger className="rounded-xl h-12 bg-accent border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-xl">
                        <SelectItem value="true">Yes, Primary Provider</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogBody>
              <DialogFooter className="bg-secondary/5 pt-6 pb-6">
                <Button type="submit" className="w-full h-12 rounded-xl font-bold shadow-sm bg-primary hover:bg-primary/90 transition-all">
                  {editing ? "Update Provider Configuration" : "Create Purchase Provider"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((p: any) => (
          <div key={p.id} className={`group relative overflow-hidden rounded-xl border p-6 transition-all duration-300 ${p.is_active ? 'bg-card border-border/50 shadow-sm hover:shadow-card hover:border-primary/20' : 'bg-secondary/20 border-dashed opacity-60'}`}>
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/5">
                  {p.integration_type === 'widget' ? <LayoutGrid className="h-6 w-6" /> : <Globe className="h-6 w-6" />}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold leading-none flex items-center gap-2">
                    {p.name}
                    {p.is_default && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-2 font-bold">{p.integration_type}</p>
                </div>
              </div>
              <Badge variant={p.is_active ? "default" : "secondary"} className="text-[9px] uppercase font-bold tracking-wider rounded-md">
                {p.is_active ? "Active" : "Disabled"}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem] leading-relaxed mb-6">
              {p.description || "No description provided."}
            </p>
            
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1">
                {p.supported_assets.map((asset: string) => (
                  <span key={asset} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-accent border border-border/50">{asset}</span>
                ))}
              </div>

              <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => { setEditing(p); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors" onClick={() => remove(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{p.is_active ? 'Enabled' : 'Disabled'}</span>
                  <Switch checked={p.is_active} onCheckedChange={() => toggle(p.id, p.is_active)} className="data-[state=checked]:bg-primary" />
                </div>
              </div>
            </div>
            
            {p.is_default && (
              <div className="absolute top-0 right-0 p-2">
                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-bold uppercase">Default</Badge>
              </div>
            )}
          </div>
        ))}
      </div>

      {providers.length === 0 && !isLoading && (
        <div className="p-20 text-center rounded-xl border border-dashed border-border/50 bg-secondary/5">
          <Settings className="h-16 w-16 text-muted-foreground mx-auto mb-6 opacity-20" />
          <p className="font-serif text-2xl font-bold text-muted-foreground">No providers found.</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
            Configure third-party digital currency purchase services to enable external payments for your users.
          </p>
          <Button variant="outline" className="mt-8 rounded-xl" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create First Provider
          </Button>
        </div>
      )}
    </div>
  );
}
