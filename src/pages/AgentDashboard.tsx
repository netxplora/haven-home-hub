import { Navigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Building2, Inbox, CalendarClock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

export default function AgentDashboard() {
  const { user, isAgent, isAdmin, loading } = useAuth();
  if (loading) return <SiteLayout><div className="container-wide py-12"><Skeleton className="h-96" /></div></SiteLayout>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAgent && !isAdmin) return <Navigate to="/" replace />;

  return (
    <SiteLayout>
      <div className="bg-secondary/40">
        <div className="container-wide py-10">
          <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Agent dashboard</h1>
          <p className="mt-1 text-muted-foreground">Your assigned listings, inquiries and inspections.</p>
        </div>
      </div>
      <div className="container-wide py-10"><Inner userId={user.id} /></div>
    </SiteLayout>
  );
}

function Inner({ userId }: { userId: string }) {
  const { data: agent } = useQuery({
    queryKey: ["agent-self", userId],
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("*").eq("user_id", userId).maybeSingle();
      return data;
    },
  });
  if (!agent) {
    return <div className="rounded-2xl border border-dashed border-border p-12 text-center">
      <p className="font-serif text-xl">No agent profile linked to your account.</p>
      <p className="mt-2 text-sm text-muted-foreground">Ask an admin to link your account.</p>
    </div>;
  }
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="listings">My listings</TabsTrigger>
        <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
        <TabsTrigger value="bookings">Inspections</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="pt-6"><Overview agentId={agent.id} /></TabsContent>
      <TabsContent value="listings" className="pt-6"><MyListings agentId={agent.id} /></TabsContent>
      <TabsContent value="inquiries" className="pt-6"><AgentInquiries agentId={agent.id} /></TabsContent>
      <TabsContent value="bookings" className="pt-6"><AgentBookings agentId={agent.id} /></TabsContent>
    </Tabs>
  );
}

function Overview({ agentId }: { agentId: string }) {
  const { data } = useQuery({
    queryKey: ["agent-kpis", agentId],
    queryFn: async () => {
      const [p, i, b] = await Promise.all([
        supabase.from("properties").select("id", { count: "exact", head: true }).eq("agent_id", agentId),
        supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("agent_id", agentId).neq("status", "closed"),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("agent_id", agentId).in("status", ["pending", "confirmed"]),
      ]);
      return { listings: p.count ?? 0, inquiries: i.count ?? 0, bookings: b.count ?? 0 };
    },
  });
  const tiles = [
    { icon: Building2, label: "Listings", v: data?.listings ?? 0 },
    { icon: Inbox, label: "Open inquiries", v: data?.inquiries ?? 0 },
    { icon: CalendarClock, label: "Upcoming inspections", v: data?.bookings ?? 0 },
  ];
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-warm text-primary-foreground"><t.icon className="h-5 w-5" /></span>
          <p className="mt-4 font-serif text-3xl font-semibold">{t.v}</p>
          <p className="text-sm text-muted-foreground">{t.label}</p>
        </div>
      ))}
    </div>
  );
}

function MyListings({ agentId }: { agentId: string }) {
  const { data = [] } = useQuery({
    queryKey: ["agent-listings", agentId],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("id, title, slug, status, price, currency, property_type").eq("agent_id", agentId);
      return data ?? [];
    },
  });
  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("properties").update({ status: status as any }).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else toast({ title: "Status updated" });
  }
  return (
    <div className="space-y-3">
      {data.map((p: any) => (
        <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
          <Link to={`/properties/${p.slug}`} className="flex-1 font-medium hover:text-primary">{p.title}</Link>
          <Select defaultValue={p.status} onValueChange={(v) => setStatus(p.id, v)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ))}
      {data.length === 0 && <p className="text-sm text-muted-foreground">No assigned listings yet.</p>}
    </div>
  );
}

function AgentInquiries({ agentId }: { agentId: string }) {
  const { data = [], refetch } = useQuery({
    queryKey: ["agent-inquiries", agentId],
    queryFn: async () => {
      const { data } = await supabase.from("inquiries").select("*, properties(title, slug)").eq("agent_id", agentId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  async function setStatus(id: string, status: string) {
    await supabase.from("inquiries").update({ status: status as any }).eq("id", id);
    refetch();
  }
  return (
    <div className="space-y-3">
      {data.map((i: any) => (
        <div key={i.id} className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link to={`/properties/${i.properties?.slug}`} className="font-serif font-semibold hover:text-primary">{i.properties?.title}</Link>
              <p className="text-sm text-muted-foreground">{i.name} · {i.email}{i.phone ? ` · ${i.phone}` : ""}</p>
              <p className="mt-2 text-sm">{i.message}</p>
            </div>
            <Select defaultValue={i.status} onValueChange={(v) => setStatus(i.id, v)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}
      {data.length === 0 && <p className="text-sm text-muted-foreground">No inquiries yet.</p>}
    </div>
  );
}

function AgentBookings({ agentId }: { agentId: string }) {
  const { data = [], refetch } = useQuery({
    queryKey: ["agent-bookings", agentId],
    queryFn: async () => {
      const { data } = await supabase.from("bookings").select("*, properties(title, slug)").eq("agent_id", agentId).order("preferred_date");
      return data ?? [];
    },
  });
  async function setStatus(id: string, status: string) {
    await supabase.from("bookings").update({ status: status as any }).eq("id", id);
    refetch();
  }
  return (
    <div className="space-y-3">
      {data.map((b: any) => (
        <div key={b.id} className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link to={`/properties/${b.properties?.slug}`} className="font-serif font-semibold hover:text-primary">{b.properties?.title}</Link>
              <p className="text-sm text-muted-foreground">{new Date(b.preferred_date).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{b.name} · {b.email}{b.phone ? ` · ${b.phone}` : ""}</p>
              {b.notes && <p className="mt-2 text-sm">{b.notes}</p>}
            </div>
            <Select defaultValue={b.status} onValueChange={(v) => setStatus(b.id, v)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}
      {data.length === 0 && <p className="text-sm text-muted-foreground">No inspections booked yet.</p>}
    </div>
  );
}