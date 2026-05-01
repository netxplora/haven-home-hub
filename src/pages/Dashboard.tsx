import { useEffect, useState } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PropertyCard, PropertyCardData } from "@/components/site/PropertyCard";
import { toast } from "@/hooks/use-toast";
import { WithdrawalDialog } from "@/components/dashboard/WithdrawalDialog";
import { useNotifications } from "@/hooks/useNotifications";
import { formatMoney } from "@/lib/invest";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const initialTab = params.get("tab") ?? "saved";
  if (loading) return <SiteLayout><div className="container-wide py-12"><Skeleton className="h-96" /></div></SiteLayout>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <SiteLayout>
      <div className="bg-secondary/40">
        <div className="container-wide py-10">
          <h1 className="font-serif text-3xl font-semibold sm:text-4xl">My dashboard</h1>
          <p className="mt-1 text-muted-foreground">Saved homes, inquiries, inspections and your profile.</p>
        </div>
      </div>

      <div className="container-wide py-10">
        <Tabs defaultValue={initialTab}>
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="saved">Saved</TabsTrigger>
            <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
            <TabsTrigger value="bookings">Inspections</TabsTrigger>
            <TabsTrigger value="investments">Investments</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="saved" className="pt-6"><Saved userId={user.id} /></TabsContent>
          <TabsContent value="inquiries" className="pt-6"><Inquiries userId={user.id} /></TabsContent>
          <TabsContent value="bookings" className="pt-6"><Bookings userId={user.id} /></TabsContent>
          <TabsContent value="investments" className="pt-6"><InvestmentsPanel /></TabsContent>
          <TabsContent value="withdrawals" className="pt-6"><WithdrawalsPanel userId={user.id} /></TabsContent>
          <TabsContent value="notifications" className="pt-6"><NotificationsPanel /></TabsContent>
          <TabsContent value="profile" className="pt-6"><Profile userId={user.id} /></TabsContent>
        </Tabs>
      </div>
    </SiteLayout>
  );
}

function WithdrawalsPanel({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const { data: balance = 0 } = useQuery({
    queryKey: ["available-balance", userId],
    queryFn: async () => {
      const { data } = await supabase.rpc("user_available_balance");
      return Number(data ?? 0);
    },
  });
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["withdrawals", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Available to withdraw</p>
          <p className="mt-1 font-serif text-3xl font-semibold">{formatMoney(balance)}</p>
        </div>
        <Button
          className="bg-gradient-warm hover:opacity-95"
          disabled={balance <= 0}
          onClick={() => setOpen(true)}
        >
          Request withdrawal
        </Button>
      </div>
      {isLoading ? <Skeleton className="h-40" /> : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="font-serif text-lg">No withdrawal requests yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr><th className="p-3">Date</th><th className="p-3">Method</th><th className="p-3">Status</th><th className="p-3">Reference</th><th className="p-3 text-right">Amount</th></tr>
            </thead>
            <tbody>
              {items.map((w: any) => (
                <tr key={w.id} className="border-t border-border">
                  <td className="p-3">{new Date(w.created_at).toLocaleDateString()}</td>
                  <td className="p-3 capitalize">{w.method.replace("_"," ")}</td>
                  <td className="p-3">
                    <Badge variant={w.status === "completed" ? "default" : w.status === "rejected" || w.status === "failed" ? "destructive" : "secondary"}>{w.status}</Badge>
                    {w.rejection_reason && <p className="mt-1 text-[11px] text-muted-foreground">{w.rejection_reason}</p>}
                  </td>
                  <td className="p-3 font-mono text-xs">{w.transaction_reference ?? "—"}</td>
                  <td className="p-3 text-right font-medium">{formatMoney(Number(w.amount), w.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <WithdrawalDialog open={open} onClose={() => setOpen(false)} available={balance} />
    </div>
  );
}

function NotificationsPanel() {
  const { items, markRead, markAllRead, unread } = useNotifications();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{unread} unread</p>
        {unread > 0 && <Button size="sm" variant="outline" onClick={markAllRead}>Mark all read</Button>}
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="font-serif text-lg">No notifications yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {items.map((n) => (
            <li key={n.id} className={`flex gap-3 p-4 ${!n.read_at ? "bg-secondary/30" : ""}`}>
              <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-primary"}`} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                {n.link && <Link to={n.link} className="mt-1 inline-block text-xs text-primary hover:underline">View</Link>}
              </div>
              {!n.read_at && <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Mark read</Button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InvestmentsPanel() {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
      <p className="font-serif text-2xl">Your investment portfolio</p>
      <p className="mt-2 text-sm text-muted-foreground">Track investments, returns and payouts in one place.</p>
      <Button asChild className="mt-5 bg-gradient-gold text-[hsl(var(--gold-foreground))] hover:opacity-95">
        <Link to="/invest/portfolio">Open portfolio</Link>
      </Button>
    </div>
  );
}

function Saved({ userId }: { userId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["saved-list", userId],
    queryFn: async () => {
      const { data } = await supabase.from("saved_properties")
        .select("property_id, properties(id, slug, title, price, currency, property_type, status, bedrooms, bathrooms, size_sqm, cover_image_url, address, locations(name))")
        .eq("user_id", userId);
      return (data ?? []).map((r: any) => r.properties).filter(Boolean) as PropertyCardData[];
    },
  });
  if (isLoading) return <Skeleton className="h-60 rounded-2xl" />;
  if (data.length === 0) return <EmptyState title="No saved properties yet" cta="Browse listings" to="/properties" />;
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((p) => <PropertyCard key={p.id} property={p} />)}
    </div>
  );
}

function Inquiries({ userId }: { userId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["my-inquiries", userId],
    queryFn: async () => {
      const { data } = await supabase.from("inquiries")
        .select("*, properties(title, slug), agents(full_name)")
        .eq("user_id", userId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  if (isLoading) return <Skeleton className="h-60" />;
  if (data.length === 0) return <EmptyState title="No inquiries yet" cta="Find a property" to="/properties" />;
  return (
    <div className="space-y-3">
      {data.map((i: any) => (
        <div key={i.id} className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-5">
          <div>
            <Link to={`/properties/${i.properties?.slug}`} className="font-serif text-lg font-semibold hover:text-primary">
              {i.properties?.title}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">Agent: {i.agents?.full_name ?? "Unassigned"}</p>
            <p className="mt-2 text-sm text-foreground/80 line-clamp-2">{i.message}</p>
          </div>
          <Badge>{i.status}</Badge>
        </div>
      ))}
    </div>
  );
}

function Bookings({ userId }: { userId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["my-bookings", userId],
    queryFn: async () => {
      const { data } = await supabase.from("bookings")
        .select("*, properties(title, slug), agents(full_name)")
        .eq("user_id", userId).order("preferred_date", { ascending: true });
      return data ?? [];
    },
  });
  if (isLoading) return <Skeleton className="h-60" />;
  if (data.length === 0) return <EmptyState title="No inspections booked" cta="Book one now" to="/properties" />;
  return (
    <div className="space-y-3">
      {data.map((b: any) => (
        <div key={b.id} className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-5">
          <div>
            <Link to={`/properties/${b.properties?.slug}`} className="font-serif text-lg font-semibold hover:text-primary">
              {b.properties?.title}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(b.preferred_date).toLocaleString()} · Agent: {b.agents?.full_name ?? "Unassigned"}
            </p>
            {b.notes && <p className="mt-2 text-sm text-foreground/80 line-clamp-2">{b.notes}</p>}
          </div>
          <Badge variant={b.status === "confirmed" ? "default" : "secondary"}>{b.status}</Badge>
        </div>
      ))}
    </div>
  );
}

function Profile({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      return data;
    },
  });
  const [form, setForm] = useState({ full_name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name ?? "", phone: profile.phone ?? "" });
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", userId);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Profile updated" }); qc.invalidateQueries({ queryKey: ["profile", userId] }); }
  }

  if (isLoading) return <Skeleton className="h-40" />;
  return (
    <form onSubmit={save} className="max-w-md space-y-4 rounded-xl border border-border bg-card p-6">
      <div className="space-y-1.5"><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} maxLength={100} /></div>
      <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={40} /></div>
      <Button type="submit" disabled={saving} className="bg-gradient-warm hover:opacity-95">{saving ? "Saving..." : "Save changes"}</Button>
    </form>
  );
}

function EmptyState({ title, cta, to }: { title: string; cta: string; to: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-12 text-center">
      <p className="font-serif text-xl">{title}</p>
      <Button asChild className="mt-5"><Link to={to}>{cta}</Link></Button>
    </div>
  );
}