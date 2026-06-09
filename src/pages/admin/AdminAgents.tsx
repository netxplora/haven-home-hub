import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, UserCheck, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export function AdminAgents() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["admin-agents"],
    queryFn: async () => (await supabase.from("agents").select("*").order("full_name")).data ?? [],
  });

  async function remove(id: string) {
    if (!confirm("Delete this agent? This will not remove their linked user account.")) return;
    const { error } = await supabase.from("agents").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Agent removed" });
      qc.invalidateQueries({ queryKey: ["admin-agents"] });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold">Agents</h2>
          <p className="text-sm text-muted-foreground">Manage property agents and their public profiles.</p>
        </div>
        <Button 
          onClick={() => { setEditing(null); setOpen(true); }} 
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-[0.98] rounded-xl font-bold"
        >
          <Plus className="mr-2 h-4 w-4" /> New Agent
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a: any) => (
          <div key={a.id} className="relative group overflow-hidden rounded-xl border border-border/50 bg-card p-6 transition-all duration-300 hover:shadow-card hover:border-primary/20">
            <div className="flex items-start justify-between mb-4">
              <div className="h-14 w-14 rounded-xl overflow-hidden bg-accent border border-border/30">
                {a.photo_url ? (
                  <img src={a.photo_url} alt={a.full_name} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                    <UserCheck className="h-6 w-6" />
                  </div>
                )}
              </div>
              <Badge variant={a.featured ? "default" : "secondary"} className="text-[8px] uppercase tracking-tighter">
                {a.featured ? "Featured" : "Standard"}
              </Badge>
            </div>

            <div>
              <h3 className="font-serif text-lg font-bold text-foreground">{a.full_name}</h3>
              <p className="text-xs font-medium text-primary uppercase tracking-widest mt-1">{a.role_title || "Property Consultant"}</p>
              <div className="mt-4 space-y-1.5">
                <p className="text-[10px] text-muted-foreground truncate">{a.email}</p>
                <p className="text-[10px] text-muted-foreground">{a.phone || "No phone listed"}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-border/30">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEditing(a); setOpen(true); }} className="rounded-lg h-8 px-3 text-[10px] font-bold">Edit Profile</Button>
                <Button size="icon" variant="ghost" onClick={() => remove(a.id)} className="h-8 w-8 rounded-lg hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {a.user_id && (
                <span title="Linked to user account">
                  <Shield className="h-3 w-3 text-primary" />
                </span>
              )}
            </div>
          </div>
        ))}
        {agents.length === 0 && !isLoading && (
          <div className="col-span-full p-12 text-center rounded-xl border border-dashed border-border/50 bg-secondary/10">
            <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="font-serif text-lg text-muted-foreground italic">No agents found.</p>
            <p className="text-sm text-muted-foreground mt-1">Start by adding your first property consultant.</p>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="bg-primary pb-6">
            <DialogTitle className="font-serif text-2xl text-white">{editing ? "Edit Agent Profile" : "Create Agent Profile"}</DialogTitle>
          </DialogHeader>
          <AgentForm 
            initial={editing} 
            onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["admin-agents"] }); }} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AgentForm({ initial, onClose }: any) {
  const [f, setF] = useState({
    full_name: initial?.full_name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    whatsapp: initial?.whatsapp ?? "",
    bio: initial?.bio ?? "",
    photo_url: initial?.photo_url ?? "",
    role_title: initial?.role_title ?? "",
    featured: initial?.featured ?? false,
    user_id: initial?.user_id ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: any = { ...f, user_id: f.user_id || null };
    const { error } = initial 
      ? await supabase.from("agents").update(payload).eq("id", initial.id) 
      : await supabase.from("agents").insert(payload);
    
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile saved successfully" });
      onClose();
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col h-full overflow-hidden">
      <DialogBody className="space-y-6 py-6">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Full Name</Label>
          <Input required value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} className="rounded-xl h-12 bg-accent/50 focus:bg-background transition-all" placeholder="Enter agent's full name" />
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Public Email</Label>
            <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="rounded-xl h-12 bg-accent/50 focus:bg-background transition-all" placeholder="email@example.com" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Role Title</Label>
            <Input value={f.role_title} onChange={(e) => setF({ ...f, role_title: e.target.value })} placeholder="e.g. Luxury Consultant" className="rounded-xl h-12 bg-accent/50 focus:bg-background transition-all" />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Phone Number</Label>
            <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className="rounded-xl h-12 bg-accent/50 focus:bg-background transition-all" placeholder="+1..." />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">WhatsApp Link</Label>
            <Input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} className="rounded-xl h-12 bg-accent/50 focus:bg-background transition-all" placeholder="WhatsApp number" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Photo URL</Label>
          <Input value={f.photo_url} onChange={(e) => setF({ ...f, photo_url: e.target.value })} placeholder="https://..." className="rounded-xl h-12 bg-accent/50 focus:bg-background transition-all" />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Biography</Label>
          <Textarea rows={4} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} className="rounded-xl resize-none bg-accent/50 focus:bg-background transition-all" placeholder="Write a short professional profile..." />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Linked User ID (Optional)</Label>
          <Input value={f.user_id} onChange={(e) => setF({ ...f, user_id: e.target.value })} placeholder="System User ID" className="rounded-xl h-12 font-mono text-[10px] bg-accent/50 focus:bg-background transition-all" />
        </div>

        <div className="flex items-center gap-3 py-2 px-1">
          <input type="checkbox" id="featured-agent" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} className="h-5 w-5 rounded-md border-border text-primary focus:ring-primary/20 transition-all cursor-pointer" />
          <Label htmlFor="featured-agent" className="text-sm font-bold text-foreground/80 cursor-pointer">Highlight as Featured Agent</Label>
        </div>
      </DialogBody>
      <DialogFooter className="bg-secondary/5 pt-6 pb-6">
        <Button type="submit" disabled={saving} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold shadow-sm transition-all">
          {saving ? "Saving Changes..." : initial ? "Update Agent Profile" : "Create Agent Profile"}
        </Button>
      </DialogFooter>
    </form>
  );
}
