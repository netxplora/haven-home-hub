import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ImageUploader } from "@/components/site/ImageUploader";
import { Separator } from "@/components/ui/separator";
import { formatMoney } from "@/lib/invest";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <SiteLayout><div className="container-wide py-12"><Skeleton className="h-96" /></div></SiteLayout>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <SiteLayout><div className="container-wide py-24 text-center"><h1 className="font-serif text-3xl">Admin only</h1><p className="mt-2 text-muted-foreground">You don't have admin access.</p></div></SiteLayout>;

  return (
    <SiteLayout>
      <div className="bg-secondary/40">
        <div className="container-wide py-10">
          <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Admin panel</h1>
          <p className="mt-1 text-muted-foreground">Manage properties, agents, locations, inquiries and bookings.</p>
        </div>
      </div>
      <div className="container-wide py-10">
        <Tabs defaultValue="properties">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="invest">Invest</TabsTrigger>
            <TabsTrigger value="investors">Investors</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>
          <TabsContent value="properties" className="pt-6"><AdminProperties /></TabsContent>
          <TabsContent value="agents" className="pt-6"><AdminAgents /></TabsContent>
          <TabsContent value="locations" className="pt-6"><AdminLocations /></TabsContent>
          <TabsContent value="inquiries" className="pt-6"><AdminInquiries /></TabsContent>
          <TabsContent value="bookings" className="pt-6"><AdminBookings /></TabsContent>
          <TabsContent value="invest" className="pt-6"><AdminInvest /></TabsContent>
          <TabsContent value="investors" className="pt-6"><AdminInvestors /></TabsContent>
          <TabsContent value="payouts" className="pt-6"><AdminPayouts /></TabsContent>
          <TabsContent value="payments" className="pt-6"><AdminPayments /></TabsContent>
          <TabsContent value="withdrawals" className="pt-6"><AdminWithdrawals /></TabsContent>
          <TabsContent value="users" className="pt-6"><AdminUsers /></TabsContent>
        </Tabs>
      </div>
    </SiteLayout>
  );
}

/* ===== PROPERTIES ===== */
function AdminProperties() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: properties = [] } = useQuery({
    queryKey: ["admin-properties"],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("*, locations(name), agents(full_name)").order("created_at", { ascending: false });
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

  async function remove(id: string) {
    if (!confirm("Delete this property?")) return;
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); qc.invalidateQueries({ queryKey: ["admin-properties"] }); }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-gradient-warm hover:opacity-95">
          <Plus className="mr-2 h-4 w-4" /> New property
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left">
            <tr><th className="p-3">Title</th><th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3">Price</th><th className="p-3">Agent</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {properties.map((p: any) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3"><Link to={`/properties/${p.slug}`} className="font-medium hover:text-primary">{p.title}</Link></td>
                <td className="p-3">{p.property_type}</td>
                <td className="p-3"><Badge variant={p.status === "available" ? "default" : "secondary"}>{p.status}</Badge></td>
                <td className="p-3">{Number(p.price).toLocaleString()} {p.currency}</td>
                <td className="p-3">{p.agents?.full_name ?? "—"}</td>
                <td className="p-3 text-right">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit property" : "New property"}</DialogTitle></DialogHeader>
          <PropertyForm initial={editing} locations={locations} agents={agents} onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["admin-properties"] }); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
    bedrooms: initial?.bedrooms ?? "",
    bathrooms: initial?.bathrooms ?? "",
    size_sqm: initial?.size_sqm ?? "",
    features: Array.isArray(initial?.features) ? initial.features.join(", ") : "",
    cover_image_url: initial?.cover_image_url ?? "",
    video_url: initial?.video_url ?? "",
    agent_id: initial?.agent_id ?? "",
    featured: initial?.featured ?? false,
  }));
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
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
      bedrooms: form.bedrooms === "" ? null : Number(form.bedrooms),
      bathrooms: form.bathrooms === "" ? null : Number(form.bathrooms),
      size_sqm: form.size_sqm === "" ? null : Number(form.size_sqm),
      features: form.features ? form.features.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
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
    else { toast({ title: "Saved" }); onClose(); }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="space-y-1.5"><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Description</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5"><Label>Price</Label><Input type="number" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Type</Label>
          <Select value={form.property_type} onValueChange={(v) => setForm({ ...form, property_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="buy">Buy</SelectItem><SelectItem value="rent">Rent</SelectItem><SelectItem value="land">Land</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="available">Available</SelectItem><SelectItem value="reserved">Reserved</SelectItem><SelectItem value="sold">Sold</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Location</Label>
          <Select value={form.location_id || "none"} onValueChange={(v) => setForm({ ...form, location_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
            <SelectContent><SelectItem value="none">None</SelectItem>{locations.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5"><Label>Bedrooms</Label><Input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Bathrooms</Label><Input type="number" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Size (m²)</Label><Input type="number" value={form.size_sqm} onChange={(e) => setForm({ ...form, size_sqm: e.target.value })} /></div>
      </div>
      <div className="space-y-1.5"><Label>Features (comma-separated)</Label><Input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="Pool, Garden, Garage" /></div>
      <div className="space-y-1.5"><Label>Cover image URL</Label><Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://..." /></div>
      <div className="space-y-1.5"><Label>Video URL (embed)</Label><Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Agent</Label>
        <Select value={form.agent_id || "none"} onValueChange={(v) => setForm({ ...form, agent_id: v === "none" ? "" : v })}>
          <SelectTrigger><SelectValue placeholder="Assign" /></SelectTrigger>
          <SelectContent><SelectItem value="none">Unassigned</SelectItem>{agents.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured</label>
      <Button type="submit" disabled={saving} className="w-full bg-gradient-warm hover:opacity-95">{saving ? "Saving..." : "Save"}</Button>
      {initial?.id && (
        <>
          <Separator className="my-4" />
          <div className="space-y-2">
            <Label>Property images</Label>
            <ImageUploader propertyId={initial.id} />
          </div>
        </>
      )}
    </form>
  );
}

/* ===== AGENTS ===== */
function AdminAgents() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const { data: agents = [] } = useQuery({
    queryKey: ["admin-agents"],
    queryFn: async () => (await supabase.from("agents").select("*").order("full_name")).data ?? [],
  });
  async function remove(id: string) {
    if (!confirm("Delete this agent?")) return;
    const { error } = await supabase.from("agents").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); qc.invalidateQueries({ queryKey: ["admin-agents"] }); }
  }
  return (
    <div>
      <div className="mb-4 flex justify-end"><Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-gradient-warm hover:opacity-95"><Plus className="mr-2 h-4 w-4" />New agent</Button></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a: any) => (
          <div key={a.id} className="rounded-xl border border-border bg-card p-4">
            <p className="font-serif font-semibold">{a.full_name}</p>
            <p className="text-xs text-muted-foreground">{a.role_title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{a.email}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setEditing(a); setOpen(true); }}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editing ? "Edit agent" : "New agent"}</DialogTitle></DialogHeader>
          <AgentForm initial={editing} onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["admin-agents"] }); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
function AgentForm({ initial, onClose }: any) {
  const [f, setF] = useState({
    full_name: initial?.full_name ?? "", email: initial?.email ?? "", phone: initial?.phone ?? "",
    whatsapp: initial?.whatsapp ?? "", bio: initial?.bio ?? "", photo_url: initial?.photo_url ?? "",
    role_title: initial?.role_title ?? "", featured: initial?.featured ?? false,
    user_id: initial?.user_id ?? "",
  });
  const [saving, setSaving] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const payload: any = { ...f, user_id: f.user_id || null };
    const { error } = initial ? await supabase.from("agents").update(payload).eq("id", initial.id) : await supabase.from("agents").insert(payload);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Saved" }); onClose(); }
  }
  return (
    <form onSubmit={save} className="space-y-3">
      <div className="space-y-1.5"><Label>Full name</Label><Input required value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Role title</Label><Input value={f.role_title} onChange={(e) => setF({ ...f, role_title: e.target.value })} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>WhatsApp</Label><Input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} /></div>
      </div>
      <div className="space-y-1.5"><Label>Photo URL</Label><Input value={f.photo_url} onChange={(e) => setF({ ...f, photo_url: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Bio</Label><Textarea rows={3} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Linked user ID (optional)</Label><Input value={f.user_id} onChange={(e) => setF({ ...f, user_id: e.target.value })} placeholder="auth.users uuid" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} /> Featured</label>
      <Button type="submit" disabled={saving} className="w-full bg-gradient-warm hover:opacity-95">{saving ? "Saving..." : "Save"}</Button>
    </form>
  );
}

/* ===== LOCATIONS ===== */
function AdminLocations() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin-locations"], queryFn: async () => (await supabase.from("locations").select("*").order("name")).data ?? [] });
  const [f, setF] = useState({ name: "", slug: "", image_url: "", featured: false });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("locations").insert({ ...f, slug: f.slug || slugify(f.name) });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { setF({ name: "", slug: "", image_url: "", featured: false }); qc.invalidateQueries({ queryKey: ["admin-locations"] }); }
  }
  async function remove(id: string) {
    if (!confirm("Delete?")) return;
    await supabase.from("locations").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-locations"] });
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-2">
        {data.map((l: any) => (
          <div key={l.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div><p className="font-medium">{l.name}</p><p className="text-xs text-muted-foreground">/{l.slug}</p></div>
            <Button variant="ghost" size="icon" onClick={() => remove(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="space-y-3 rounded-xl border border-border bg-card p-5">
        <p className="font-serif text-lg font-semibold">Add location</p>
        <div className="space-y-1.5"><Label>Name</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Slug</Label><Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} placeholder="auto" /></div>
        <div className="space-y-1.5"><Label>Image URL</Label><Input value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} /> Featured</label>
        <Button type="submit" className="w-full bg-gradient-warm hover:opacity-95">Add</Button>
      </form>
    </div>
  );
}

/* ===== INQUIRIES ===== */
function AdminInquiries() {
  const { data = [], refetch } = useQuery({
    queryKey: ["admin-inquiries"],
    queryFn: async () => (await supabase.from("inquiries").select("*, properties(title, slug), agents(full_name)").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: agents = [] } = useQuery({ queryKey: ["admin-agents-list"], queryFn: async () => (await supabase.from("agents").select("id, full_name").order("full_name")).data ?? [] });
  return (
    <div className="space-y-3">
      {data.map((i: any) => (
        <div key={i.id} className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link to={`/properties/${i.properties?.slug}`} className="font-serif font-semibold hover:text-primary">{i.properties?.title}</Link>
              <p className="text-xs text-muted-foreground">{i.name} · {i.email}{i.phone ? ` · ${i.phone}` : ""}</p>
              <p className="mt-2 text-sm">{i.message}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select defaultValue={i.agent_id ?? "none"} onValueChange={async (v) => { await supabase.from("inquiries").update({ agent_id: v === "none" ? null : v }).eq("id", i.id); refetch(); }}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Assign agent" /></SelectTrigger>
                <SelectContent><SelectItem value="none">Unassigned</SelectItem>{agents.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}</SelectContent>
              </Select>
              <Select defaultValue={i.status} onValueChange={async (v) => { await supabase.from("inquiries").update({ status: v as any }).eq("id", i.id); refetch(); }}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="in_progress">In progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ))}
      {data.length === 0 && <p className="text-sm text-muted-foreground">No inquiries yet.</p>}
    </div>
  );
}

/* ===== BOOKINGS ===== */
function AdminBookings() {
  const { data = [], refetch } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => (await supabase.from("bookings").select("*, properties(title, slug), agents(full_name)").order("preferred_date")).data ?? [],
  });
  const { data: agents = [] } = useQuery({ queryKey: ["admin-agents-list"], queryFn: async () => (await supabase.from("agents").select("id, full_name").order("full_name")).data ?? [] });
  return (
    <div className="space-y-3">
      {data.map((b: any) => (
        <div key={b.id} className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link to={`/properties/${b.properties?.slug}`} className="font-serif font-semibold hover:text-primary">{b.properties?.title}</Link>
              <p className="text-xs text-muted-foreground">{new Date(b.preferred_date).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{b.name} · {b.email}{b.phone ? ` · ${b.phone}` : ""}</p>
              {b.notes && <p className="mt-2 text-sm">{b.notes}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Select defaultValue={b.agent_id ?? "none"} onValueChange={async (v) => { await supabase.from("bookings").update({ agent_id: v === "none" ? null : v }).eq("id", b.id); refetch(); }}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Assign" /></SelectTrigger>
                <SelectContent><SelectItem value="none">Unassigned</SelectItem>{agents.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}</SelectContent>
              </Select>
              <Select defaultValue={b.status} onValueChange={async (v) => { await supabase.from("bookings").update({ status: v as any }).eq("id", b.id); refetch(); }}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ))}
      {data.length === 0 && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
    </div>
  );
}

/* ===== USERS ===== */
function AdminUsers() {
  const { data = [], refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      return (profiles ?? []).map((p: any) => ({ ...p, roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role) }));
    },
  });
  async function addRole(userId: string, role: string) {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else refetch();
  }
  async function removeRole(userId: string, role: string) {
    await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    refetch();
  }
  return (
    <div className="space-y-3">
      {data.map((u: any) => (
        <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <div>
            <p className="font-medium">{u.full_name ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{u.id}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {u.roles.map((r: string) => (
                <Badge key={r} className="cursor-pointer" onClick={() => removeRole(u.id, r)}>{r} ✕</Badge>
              ))}
            </div>
          </div>
          <Select onValueChange={(v) => addRole(u.id, v)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Grant role" /></SelectTrigger>
            <SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="agent">Agent</SelectItem><SelectItem value="user">User</SelectItem></SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

/* ===== INVEST ===== */
function AdminInvest() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const { data = [] } = useQuery({
    queryKey: ["admin-invest"],
    queryFn: async () => (await supabase.from("investment_properties").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  async function remove(id: string) {
    if (!confirm("Delete this investment property?")) return;
    const { error } = await supabase.from("investment_properties").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else qc.invalidateQueries({ queryKey: ["admin-invest"] });
  }
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-gradient-gold text-[hsl(var(--gold-foreground))] hover:opacity-95">
          <Plus className="mr-2 h-4 w-4" /> New investment property
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left">
            <tr><th className="p-3">Title</th><th className="p-3">Location</th><th className="p-3">Status</th><th className="p-3">Units</th><th className="p-3">Min.</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {data.map((p: any) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3"><Link to={`/invest/${p.slug}`} className="font-medium hover:text-primary">{p.title}</Link></td>
                <td className="p-3">{p.location}</td>
                <td className="p-3"><Badge variant={p.status === "open" ? "default" : "secondary"}>{p.status}</Badge></td>
                <td className="p-3">{p.units_sold}/{p.total_units}</td>
                <td className="p-3">{formatMoney(Number(p.min_investment), p.currency)}</td>
                <td className="p-3 text-right">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit investment property" : "New investment property"}</DialogTitle></DialogHeader>
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
    };
    const { error } = initial
      ? await supabase.from("investment_properties").update(payload).eq("id", initial.id)
      : await supabase.from("investment_properties").insert(payload);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Saved" }); onClose(); }
  }
  return (
    <form onSubmit={save} className="space-y-3">
      <div className="space-y-1.5"><Label>Title</Label><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Description</Label><Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>Location</Label><Input required value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Property type</Label><Input value={f.property_type} onChange={(e) => setF({ ...f, property_type: e.target.value })} /></div>
      </div>
      <div className="space-y-1.5"><Label>Cover image URL</Label><Input value={f.cover_image_url} onChange={(e) => setF({ ...f, cover_image_url: e.target.value })} /></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5"><Label>Total value</Label><Input type="number" required value={f.total_value} onChange={(e) => setF({ ...f, total_value: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Unit price</Label><Input type="number" required value={f.unit_price} onChange={(e) => setF({ ...f, unit_price: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Total units</Label><Input type="number" required value={f.total_units} onChange={(e) => setF({ ...f, total_units: e.target.value })} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5"><Label>Min. investment</Label><Input type="number" required value={f.min_investment} onChange={(e) => setF({ ...f, min_investment: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Currency</Label><Input value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Holding (months)</Label><Input type="number" value={f.holding_period_months} onChange={(e) => setF({ ...f, holding_period_months: e.target.value })} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5"><Label>Projected return min %</Label><Input type="number" step="0.1" value={f.projected_return_min} onChange={(e) => setF({ ...f, projected_return_min: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Projected return max %</Label><Input type="number" step="0.1" value={f.projected_return_max} onChange={(e) => setF({ ...f, projected_return_max: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Rental yield %</Label><Input type="number" step="0.1" value={f.estimated_rental_yield} onChange={(e) => setF({ ...f, estimated_rental_yield: e.target.value })} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>Distribution frequency</Label>
          <Select value={f.distribution_frequency} onValueChange={(v) => setF({ ...f, distribution_frequency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="semi_annual">Semi-annual</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Status</Label>
          <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
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
      <div className="space-y-1.5"><Label>Income model</Label><Textarea rows={2} value={f.income_model} onChange={(e) => setF({ ...f, income_model: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Risk notes</Label><Textarea rows={2} value={f.risk_notes} onChange={(e) => setF({ ...f, risk_notes: e.target.value })} /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} /> Featured</label>
      <Button type="submit" disabled={saving} className="w-full bg-gradient-gold text-[hsl(var(--gold-foreground))] hover:opacity-95">{saving ? "Saving..." : "Save"}</Button>
    </form>
  );
}

/* ===== INVESTORS ===== */
function AdminInvestors() {
  const { data = [] } = useQuery({
    queryKey: ["admin-investors"],
    queryFn: async () => (await supabase.from("user_investments").select("*, investment_properties(title, slug, currency), profiles(full_name)").order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary/60 text-left"><tr><th className="p-3">When</th><th className="p-3">Investor</th><th className="p-3">Property</th><th className="p-3">Units</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th></tr></thead>
        <tbody>
          {data.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No investors yet.</td></tr> : data.map((i: any) => (
            <tr key={i.id} className="border-t border-border">
              <td className="p-3">{new Date(i.created_at).toLocaleDateString()}</td>
              <td className="p-3">{i.profiles?.full_name ?? i.user_id.slice(0,8)}</td>
              <td className="p-3"><Link to={`/invest/${i.investment_properties?.slug}`} className="hover:text-primary">{i.investment_properties?.title}</Link></td>
              <td className="p-3">{i.units_owned}</td>
              <td className="p-3 text-right">{formatMoney(Number(i.amount_invested), i.investment_properties?.currency ?? "USD")}</td>
              <td className="p-3"><Badge variant={i.status === "confirmed" ? "default" : "secondary"}>{i.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ===== PAYOUTS ===== */
function AdminPayouts() {
  const qc = useQueryClient();
  const { data: payouts = [] } = useQuery({ queryKey: ["admin-payouts"], queryFn: async () => (await supabase.from("payouts").select("*, investment_properties(title, currency)").order("distribution_date", { ascending: false })).data ?? [] });
  const { data: props = [] } = useQuery({ queryKey: ["admin-invest-list"], queryFn: async () => (await supabase.from("investment_properties").select("id, title").order("title")).data ?? [] });
  const [f, setF] = useState({ property_id: "", amount: "", distribution_date: new Date().toISOString().slice(0,10), notes: "" });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!f.property_id) return;
    // Create payout
    const { data: payout, error } = await supabase.from("payouts").insert({
      property_id: f.property_id, amount: Number(f.amount), distribution_date: f.distribution_date, notes: f.notes || null,
    }).select().single();
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    // Distribute pro-rata to confirmed investors
    const { data: invs } = await supabase.from("user_investments").select("user_id, units_owned").eq("property_id", f.property_id).eq("status", "confirmed");
    const totalUnits = (invs ?? []).reduce((s: number, r: any) => s + r.units_owned, 0);
    if (totalUnits > 0) {
      const rows = (invs ?? []).map((r: any) => ({
        user_id: r.user_id,
        property_id: f.property_id,
        payout_id: payout.id,
        amount_received: Number(((Number(f.amount) * r.units_owned) / totalUnits).toFixed(2)),
        distribution_date: f.distribution_date,
      }));
      await supabase.from("returns").insert(rows);
    }
    setF({ property_id: "", amount: "", distribution_date: new Date().toISOString().slice(0,10), notes: "" });
    qc.invalidateQueries({ queryKey: ["admin-payouts"] });
    toast({ title: "Payout recorded and distributed" });
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left"><tr><th className="p-3">Date</th><th className="p-3">Property</th><th className="p-3 text-right">Amount</th><th className="p-3">Notes</th></tr></thead>
          <tbody>
            {payouts.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No payouts yet.</td></tr> : payouts.map((p: any) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3">{new Date(p.distribution_date).toLocaleDateString()}</td>
                <td className="p-3">{p.investment_properties?.title}</td>
                <td className="p-3 text-right">{formatMoney(Number(p.amount), p.investment_properties?.currency ?? "USD")}</td>
                <td className="p-3 text-muted-foreground">{p.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form onSubmit={add} className="space-y-3 rounded-xl border border-border bg-card p-5">
        <p className="font-serif text-lg font-semibold">Record payout</p>
        <div className="space-y-1.5"><Label>Property</Label>
          <Select value={f.property_id} onValueChange={(v) => setF({ ...f, property_id: v })}>
            <SelectTrigger><SelectValue placeholder="Pick property" /></SelectTrigger>
            <SelectContent>{props.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Total amount distributed</Label><Input type="number" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={f.distribution_date} onChange={(e) => setF({ ...f, distribution_date: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <Button type="submit" className="w-full bg-gradient-gold text-[hsl(var(--gold-foreground))] hover:opacity-95">Record & distribute</Button>
        <p className="text-xs text-muted-foreground">Amount is distributed pro-rata to confirmed investors by units held.</p>
      </form>
    </div>
  );
}

/* ===== PAYMENTS ===== */
function AdminPayments() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const { data = [] } = useQuery({
    queryKey: ["admin-payments", status, type],
    queryFn: async () => {
      let q = supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(500);
      if (status !== "all") q = q.eq("status", status as any);
      if (type !== "all") q = q.eq("payment_type", type as any);
      return (await q).data ?? [];
    },
  });
  async function mark(id: string, action: "success" | "failed") {
    const { error } = await supabase.functions.invoke("verify-payment", { body: { payment_id: id, action } });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: `Marked ${action}` }); qc.invalidateQueries({ queryKey: ["admin-payments"] }); }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="processing">Processing</SelectItem><SelectItem value="success">Success</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All types</SelectItem><SelectItem value="investment">Investment</SelectItem><SelectItem value="booking">Booking</SelectItem><SelectItem value="reservation">Reservation</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left"><tr><th className="p-3">When</th><th className="p-3">Reference</th><th className="p-3">Type</th><th className="p-3">Method</th><th className="p-3">Status</th><th className="p-3 text-right">Amount</th><th className="p-3 text-right">Actions</th></tr></thead>
          <tbody>
            {data.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No payments.</td></tr> : data.map((p: any) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3">{new Date(p.created_at).toLocaleString()}</td>
                <td className="p-3 font-mono text-xs">{p.reference}</td>
                <td className="p-3 capitalize">{p.payment_type}</td>
                <td className="p-3 capitalize">{p.provider.replace("_"," ")}</td>
                <td className="p-3"><Badge variant={p.status === "success" ? "default" : p.status === "failed" ? "destructive" : "secondary"}>{p.status}</Badge></td>
                <td className="p-3 text-right">{formatMoney(Number(p.amount), p.currency)}</td>
                <td className="p-3 text-right">
                  {p.status !== "success" && <Button size="sm" variant="outline" onClick={() => mark(p.id, "success")}>Verify</Button>}
                  {" "}{p.status !== "failed" && <Button size="sm" variant="ghost" onClick={() => mark(p.id, "failed")}>Reject</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===== WITHDRAWALS ===== */
function AdminWithdrawals() {
  const qc = useQueryClient();
  const [statusF, setStatusF] = useState("all");
  const { data = [] } = useQuery({
    queryKey: ["admin-withdrawals", statusF],
    queryFn: async () => {
      let q = supabase.from("withdrawal_requests").select("*, profiles(full_name)").order("created_at", { ascending: false }).limit(500);
      if (statusF !== "all") q = q.eq("status", statusF as any);
      return (await q).data ?? [];
    },
  });
  async function act(id: string, action: "approve" | "reject" | "complete" | "fail", extra: Record<string, string> = {}) {
    const { error } = await supabase.functions.invoke("manage-withdrawal", { body: { withdrawal_id: id, action, ...extra } });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: `Marked ${action}` }); qc.invalidateQueries({ queryKey: ["admin-withdrawals"] }); }
  }
  return (
    <div className="space-y-4">
      <Select value={statusF} onValueChange={setStatusF}>
        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
        </SelectContent>
      </Select>
      <div className="space-y-3">
        {data.length === 0 && <p className="text-sm text-muted-foreground">No withdrawal requests.</p>}
        {data.map((w: any) => (
          <div key={w.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-serif text-lg font-semibold">{formatMoney(Number(w.amount), w.currency)}</p>
                <p className="text-xs text-muted-foreground">
                  {w.profiles?.full_name ?? w.user_id.slice(0,8)} · {w.method.replace("_"," ")} · {new Date(w.created_at).toLocaleString()}
                </p>
                {w.method === "bank_transfer" ? (
                  <p className="mt-2 text-sm">{w.bank_name} · {w.bank_account_name} · <span className="font-mono">{w.bank_account_number}</span></p>
                ) : (
                  <p className="mt-2 text-sm">{w.crypto_currency}: <span className="font-mono text-xs break-all">{w.crypto_address}</span></p>
                )}
                {w.transaction_reference && <p className="mt-1 text-xs text-muted-foreground">Tx ref: {w.transaction_reference}</p>}
                {w.rejection_reason && <p className="mt-1 text-xs text-destructive">Reason: {w.rejection_reason}</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={w.status === "completed" ? "default" : w.status === "rejected" || w.status === "failed" ? "destructive" : "secondary"}>{w.status}</Badge>
                <div className="flex flex-wrap gap-2">
                  {w.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => act(w.id, "approve")} className="bg-gradient-warm hover:opacity-95">Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => { const r = prompt("Reason for rejection?"); if (r) act(w.id, "reject", { rejection_reason: r }); }}>Reject</Button>
                    </>
                  )}
                  {w.status === "approved" && (
                    <>
                      <Button size="sm" onClick={() => { const ref = prompt("Transaction reference / tx hash?") ?? ""; act(w.id, "complete", { transaction_reference: ref }); }} className="bg-gradient-warm hover:opacity-95">Mark paid</Button>
                      <Button size="sm" variant="outline" onClick={() => { const r = prompt("Failure reason?") ?? ""; act(w.id, "fail", { rejection_reason: r }); }}>Mark failed</Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}