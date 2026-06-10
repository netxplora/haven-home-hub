import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, MessageSquare, Star, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export function AdminTestimonials() {
  const qc = useQueryClient();
  const { data: testimonials = [], isLoading } = useQuery({ 
    queryKey: ["admin-testimonials"], 
    queryFn: async () => (await supabase.from("testimonials").select("*").order("created_at", { ascending: false })).data ?? [] 
  });
  
  const [f, setF] = useState({ name: "", user_type: "Client", image_url: "", rating: 5, content: "", featured: false });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit(t: any) {
    setEditingId(t.id);
    setF({ name: t.name, user_type: t.user_type, image_url: t.image_url || "", rating: t.rating, content: t.content, featured: t.featured });
  }

  function cancelEdit() {
    setEditingId(null);
    setF({ name: "", user_type: "Client", image_url: "", rating: 5, content: "", featured: false });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    if (editingId) {
      const { error } = await supabase
        .from("testimonials")
        .update({ ...f, image_url: f.image_url || null })
        .eq("id", editingId);

      setSaving(false);
      if (error) {
        toast({ title: "Update Failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Testimonial updated" });
        cancelEdit();
        qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
        qc.invalidateQueries({ queryKey: ["homepage-testimonials"] });
      }
    } else {
      const { error } = await supabase.from("testimonials").insert([{ ...f, image_url: f.image_url || null }]);
      setSaving(false);
      if (error) {
        toast({ title: "Failed", description: error.message, variant: "destructive" });
      } else { 
        toast({ title: "Testimonial added" });
        cancelEdit(); 
        qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
        qc.invalidateQueries({ queryKey: ["homepage-testimonials"] });
      }
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this testimonial?")) return;
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Testimonial removed" });
      if (editingId === id) cancelEdit();
      qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
      qc.invalidateQueries({ queryKey: ["homepage-testimonials"] });
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] animate-in fade-in">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold font-serif flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Testimonials CMS
          </h2>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          {testimonials.map((t: any) => (
            <div key={t.id} className={`group flex flex-col justify-between rounded-xl border bg-card p-5 transition-all hover:shadow-md ${editingId === t.id ? 'border-primary/50 shadow-md ring-1 ring-primary/20' : 'border-border/50 hover:border-primary/20'}`}>
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    {t.image_url ? (
                      <img src={t.image_url} alt={t.name} className="h-10 w-10 rounded-full object-cover border border-border" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {t.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-serif font-bold text-foreground leading-none">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{t.user_type}</p>
                    </div>
                  </div>
                  <div className="flex text-amber-500">
                    {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground italic line-clamp-3">"{t.content}"</p>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/40">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.featured ? <span className="text-primary">Featured</span> : "Hidden"}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(t)} className="h-8 w-8 rounded-lg hover:text-primary">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(t.id)} className="h-8 w-8 rounded-lg hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {testimonials.length === 0 && !isLoading && (
          <div className="p-12 text-center rounded-xl border border-dashed border-border/50 bg-secondary/10">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="font-serif text-lg text-muted-foreground italic">No testimonials added yet.</p>
          </div>
        )}
      </div>

      <div className="relative">
        <form onSubmit={handleSubmit} className="sticky top-6 space-y-4 rounded-xl border border-border/50 bg-card p-6 shadow-xl shadow-primary/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${editingId ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'}`}>
                {editingId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold">{editingId ? "Edit Testimonial" : "Add Testimonial"}</h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{editingId ? "Update Details" : "New Client Story"}</p>
              </div>
            </div>
            {editingId && (
              <Button type="button" variant="ghost" size="icon" onClick={cancelEdit} className="h-8 w-8 rounded-lg text-muted-foreground">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">Client Name</Label>
              <Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="rounded-xl" placeholder="e.g. John Doe" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest">User Type</Label>
                <Input required value={f.user_type} onChange={(e) => setF({ ...f, user_type: e.target.value })} className="rounded-xl" placeholder="Investor, Tenant..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest">Rating (1-5)</Label>
                <Input required type="number" min="1" max="5" value={f.rating} onChange={(e) => setF({ ...f, rating: parseInt(e.target.value) || 5 })} className="rounded-xl" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">Image URL (Optional)</Label>
              <Input value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} placeholder="https://..." className="rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">Testimonial Content</Label>
              <Textarea required rows={4} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} placeholder="Their review..." className="rounded-xl resize-none" />
            </div>

            <div className="flex items-center justify-between py-2 px-1 border border-border/50 rounded-xl bg-accent/30 p-3">
              <Label htmlFor="featured-t" className="text-sm font-medium cursor-pointer">Feature on Homepage</Label>
              <Switch id="featured-t" checked={f.featured} onCheckedChange={(c) => setF({ ...f, featured: c })} />
            </div>

            <Button type="submit" disabled={saving} className="w-full h-12 rounded-xl font-bold">
              {saving ? (editingId ? "Updating..." : "Adding...") : (editingId ? "Update Testimonial" : "Add Testimonial")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
