import { Navigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Inbox, CalendarClock, Landmark, TrendingUp,
  Search, Filter, Mail, Phone, CalendarDays, ArrowUpRight,
  ShieldCheck
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/invest";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useBrand } from "@/hooks/useBrand";

export default function AgentDashboard() {
  const { user, isAgent, isAdmin, loading } = useAuth();
  const { brand } = useBrand();

  if (loading) return (
    <SiteLayout>
      <div className="container-wide py-12 space-y-6">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </SiteLayout>
  );
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAgent && !isAdmin) return <Navigate to="/" replace />;

  return (
    <SiteLayout>
      {/* ── Agent Hero Banner ─────────────────────────────────── */}
      <section className="relative overflow-hidden bg-secondary border-b border-border/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(184,134,11,0.08),transparent_60%)]" />
        <div className="container-wide relative z-10 py-10 sm:py-14">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <span className="inline-block mb-3 text-[11px] font-bold tracking-[0.15em] uppercase text-primary/80 border border-primary/20 rounded-full px-3 py-1 bg-primary/5">
                Agent Portal
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-secondary-foreground tracking-tight">
                Agent Dashboard
              </h1>
              <p className="mt-2 text-sm text-secondary-foreground/60 max-w-md">
                Manage your property listings, client inquiries, and scheduled viewings.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <Link to="/properties">
                <Button variant="outline" size="sm" className="h-9 rounded-xl border-white/20 bg-white/5 text-secondary-foreground hover:bg-white/10 text-xs font-medium">
                  View Listings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="container-wide py-10">
        <Inner userId={user.id} />
      </div>
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
    return (
      <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center max-w-lg mx-auto">
        <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground/30 mb-4" />
        <p className="font-serif text-xl font-semibold">No agent profile found</p>
        <p className="mt-2 text-sm text-muted-foreground">Ask an administrator to link your account to an agent profile.</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      {/* Tab Navigation */}
      <TabsList className="bg-card border border-border/50 p-1 rounded-xl shadow-sm overflow-x-auto flex-nowrap w-full justify-start sm:justify-start h-auto gap-0.5">
        {[
          { value: "overview", label: "Overview" },
          { value: "listings", label: "My Listings" },
          { value: "inquiries", label: "Inquiries" },
          { value: "bookings", label: "Viewings" },
          { value: "reservations", label: "Reservations" },
        ].map(tab => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all whitespace-nowrap"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="rounded-2xl border border-border/50 bg-card p-6 sm:p-8 shadow-sm">
        <TabsContent value="overview" className="mt-0"><Overview agentId={agent.id} /></TabsContent>
        <TabsContent value="listings" className="mt-0"><MyListings agentId={agent.id} /></TabsContent>
        <TabsContent value="inquiries" className="mt-0"><AgentInquiries agentId={agent.id} /></TabsContent>
        <TabsContent value="bookings" className="mt-0"><AgentBookings agentId={agent.id} /></TabsContent>
        <TabsContent value="reservations" className="mt-0"><AgentReservations agentId={agent.id} /></TabsContent>
      </div>
    </Tabs>
  );
}

function Overview({ agentId }: { agentId: string }) {
  const { data } = useQuery({
    queryKey: ["agent-kpis", agentId],
    queryFn: async () => {
      const { data: props } = await supabase.from("properties").select("id").eq("agent_id", agentId);
      const propIds = props?.map((d: any) => d.id) || [];
      const promises: any[] = [
        supabase.from("properties").select("id", { count: "exact", head: true }).eq("agent_id", agentId),
        supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("agent_id", agentId).neq("status", "closed"),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("agent_id", agentId).in("status", ["pending", "confirmed"])
      ];
      if (propIds.length > 0) {
        promises.push(supabase.from("payments").select("id", { count: "exact", head: true }).in("property_id", propIds).eq("payment_type", "reservation").eq("status", "success"));
      } else {
        promises.push(Promise.resolve({ count: 0 }));
      }
      const [p, i, b, r] = await Promise.all(promises);
      return { listings: p.count ?? 0, inquiries: i.count ?? 0, bookings: b.count ?? 0, reservations: r.count ?? 0 };
    },
  });

  const tiles = [
    { icon: Building2, label: "Active Listings", value: data?.listings ?? 0, color: "bg-primary/8 text-primary" },
    { icon: Inbox, label: "Open Inquiries", value: data?.inquiries ?? 0, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    { icon: CalendarClock, label: "Upcoming Viewings", value: data?.bookings ?? 0, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    { icon: Landmark, label: "Property Reservations", value: data?.reservations ?? 0, color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  ];

  const totalListings = data?.listings ?? 0;
  const totalInquiries = data?.inquiries ?? 0;
  const conversionRate = totalListings > 0 ? ((data?.reservations ?? 0) / totalListings * 100).toFixed(1) : "0.0";
  const buyerQuality = totalInquiries > 0 ? Math.min(9.5, 6.5 + (data?.reservations ?? 0) * 0.8).toFixed(1) : "—";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-xl font-semibold text-foreground">Dashboard Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">Your activity summary at a glance.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-border/50 bg-background p-5 hover:border-border hover:shadow-sm transition-all">
            <div className="flex flex-col h-full justify-between gap-4">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${t.color}`}>
                <t.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase mb-1">{t.label}</p>
                <p className="text-3xl font-serif font-bold text-foreground tabular-nums">{t.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Metrics */}
      <div className="rounded-2xl border border-border/50 bg-background p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-serif text-base font-semibold text-foreground">Performance Metrics</h3>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Conversion & Activity Data</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Conversion Rate", value: `${conversionRate}%`, sub: "Reservations / Listings", highlight: true },
            { label: "Buyer Quality Score", value: `${buyerQuality}${buyerQuality !== "—" ? "/10" : ""}`, sub: "Based on inquiry-to-reservation", highlight: false },
            { label: "Open Inquiries", value: totalInquiries > 0 ? "Active" : "None", sub: `${totalInquiries} inquiries pending`, highlight: false, green: totalInquiries > 0 },
          ].map(m => (
            <div key={m.label} className={`rounded-xl border p-4 text-center ${m.highlight ? "border-primary/20 bg-primary/5" : "border-border/50 bg-accent/30"}`}>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{m.label}</p>
              <p className={`text-2xl font-bold ${m.highlight ? "text-primary" : m.green ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>{m.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MyListings({ agentId }: { agentId: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
    else {
      toast({ title: "Status updated" });
      qc.invalidateQueries({ queryKey: ["agent-listings", agentId] });
    }
  }

  const filteredData = data.filter((p: any) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors: Record<string, string> = {
    available: "border-green-500/20 bg-green-500/5 text-green-700 dark:text-green-400",
    reserved: "border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400",
    sold: "border-blue-500/20 bg-blue-500/5 text-blue-700 dark:text-blue-400",
    under_offer: "border-purple-500/20 bg-purple-500/5 text-purple-700 dark:text-purple-400",
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search listings..."
            className="pl-9 bg-accent/50 border-border/60"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-accent/50 border-border/60 text-sm">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2.5">
        {filteredData.map((p: any) => (
          <div key={p.id} className="group flex flex-wrap items-center gap-4 rounded-xl border border-border/50 bg-background p-4 transition-all hover:border-primary/20 hover:shadow-sm">
            <div className="flex-1 min-w-[200px]">
              <Link to={`/properties/${p.slug}`} className="font-serif text-base font-semibold hover:text-primary transition-colors flex items-center gap-1.5 group/link">
                {p.title}
                <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover/link:opacity-100 transition-opacity" />
              </Link>
              <div className="flex gap-2 items-center mt-1 text-xs text-muted-foreground">
                <Badge variant="outline" className="capitalize text-[10px] py-0 font-medium">{p.property_type}</Badge>
                <span>{formatMoney(p.price, p.currency)}</span>
              </div>
            </div>
            <Select defaultValue={p.status} onValueChange={(v) => setStatus(p.id, v)}>
              <SelectTrigger className={`w-[140px] text-xs font-semibold ${statusColors[p.status] || "border-border/60 bg-accent"}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
        {data.length > 0 && filteredData.length === 0 && (
          <div className="p-10 text-center border border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground text-sm">No properties match your filters.</p>
            <Button variant="link" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); }}>Clear filters</Button>
          </div>
        )}
        {data.length === 0 && (
          <div className="p-10 text-center border border-dashed border-border rounded-2xl">
            <Building2 className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No assigned listings yet.</p>
          </div>
        )}
      </div>
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

  const statusBadge: Record<string, string> = {
    new: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    in_progress: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    resolved: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    closed: "bg-muted text-muted-foreground border-border/50",
  };

  return (
    <div className="space-y-3">
      {data.map((i: any) => (
        <div key={i.id} className="group rounded-xl border border-border/50 bg-background p-5 transition-all hover:shadow-sm hover:border-primary/20">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1 space-y-3 min-w-0">
              <div>
                <Link to={`/properties/${i.properties?.slug}`} className="font-serif text-base font-semibold hover:text-primary transition-colors">
                  {i.properties?.title || "General Inquiry"}
                </Link>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{i.name}</span>
                  <span>·</span>
                  <span>{new Date(i.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <a href={`mailto:${i.email}`} className="flex items-center gap-1.5 bg-accent px-2.5 py-1.5 rounded-lg hover:text-primary transition-colors">
                  <Mail className="h-3 w-3" /> {i.email}
                </a>
                {i.phone && (
                  <a href={`tel:${i.phone}`} className="flex items-center gap-1.5 bg-accent px-2.5 py-1.5 rounded-lg hover:text-primary transition-colors">
                    <Phone className="h-3 w-3" /> {i.phone}
                  </a>
                )}
              </div>
              <blockquote className="rounded-xl bg-accent/50 px-4 py-3 text-sm text-foreground/80 italic border border-border/30">
                "{i.message}"
              </blockquote>
            </div>
            <Select defaultValue={i.status} onValueChange={(v) => setStatus(i.id, v)}>
              <SelectTrigger className={`w-full sm:w-[140px] text-xs font-semibold shrink-0 ${statusBadge[i.status] || ""}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}
      {data.length === 0 && (
        <div className="p-10 text-center border border-dashed border-border rounded-2xl">
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">No inquiries yet.</p>
        </div>
      )}
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

  const statusBadge: Record<string, string> = {
    pending: "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400",
    confirmed: "border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400",
    completed: "border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400",
    cancelled: "border-border/50 bg-accent text-muted-foreground",
  };

  return (
    <div className="space-y-3">
      {data.map((b: any) => (
        <div key={b.id} className="group rounded-xl border border-border/50 bg-background p-5 transition-all hover:shadow-sm hover:border-primary/20">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1 space-y-3 min-w-0">
              <div>
                <Link to={`/properties/${b.properties?.slug}`} className="font-serif text-base font-semibold hover:text-primary transition-colors">
                  {b.properties?.title || "Property Inspection"}
                </Link>
                <p className="text-sm font-medium text-foreground/80 mt-0.5">{b.name}</p>
              </div>
              <div className="flex items-center gap-1.5 bg-primary/5 text-primary px-3 py-2 rounded-lg border border-primary/15 w-fit text-xs font-medium">
                <CalendarDays className="h-4 w-4 shrink-0" />
                {new Date(b.preferred_date).toLocaleString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <a href={`mailto:${b.email}`} className="flex items-center gap-1.5 bg-accent px-2.5 py-1.5 rounded-lg hover:text-primary transition-colors">
                  <Mail className="h-3 w-3" /> {b.email}
                </a>
                {b.phone && (
                  <a href={`tel:${b.phone}`} className="flex items-center gap-1.5 bg-accent px-2.5 py-1.5 rounded-lg hover:text-primary transition-colors">
                    <Phone className="h-3 w-3" /> {b.phone}
                  </a>
                )}
              </div>
              {b.notes && (
                <blockquote className="rounded-xl bg-accent/50 px-4 py-3 text-sm text-foreground/80 italic border border-border/30">
                  <span className="font-semibold text-[10px] not-italic uppercase tracking-wider text-muted-foreground block mb-1">Notes</span>
                  "{b.notes}"
                </blockquote>
              )}
            </div>
            <Select defaultValue={b.status} onValueChange={(v) => setStatus(b.id, v)}>
              <SelectTrigger className={`w-full sm:w-[140px] text-xs font-semibold shrink-0 ${statusBadge[b.status] || ""}`}>
                <SelectValue />
              </SelectTrigger>
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
      {data.length === 0 && (
        <div className="p-10 text-center border border-dashed border-border rounded-2xl">
          <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">No property viewings booked yet.</p>
        </div>
      )}
    </div>
  );
}

function AgentReservations({ agentId }: { agentId: string }) {
  const qc = useQueryClient();
  const { data: props } = useQuery({
    queryKey: ["agent-props-ids", agentId],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("id").eq("agent_id", agentId);
      return data?.map((d: any) => d.id) || [];
    }
  });

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ["agent-reservations", agentId, props],
    enabled: !!props && props.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*, properties(title, slug), profiles!payments_user_id_fkey(first_name, last_name, email)")
        .in("property_id", props!)
        .eq("payment_type", "reservation")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (isLoading) return <Skeleton className="h-60 rounded-xl" />;

  if (reservations.length === 0) return (
    <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center">
      <Landmark className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
      <p className="font-serif text-lg font-semibold">No reservations yet</p>
      <p className="mt-2 text-sm text-muted-foreground">Reservations on your properties will appear here.</p>
    </div>
  );

  async function updateStatus(id: string, newStatus: string) {
    const status = newStatus as "pending" | "processing" | "success" | "failed" | "refunded";
    const { error } = await supabase.from("payments").update({ status }).eq("id", id);
    if (error) toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Status updated", description: "Reservation status has been saved." });
      qc.invalidateQueries({ queryKey: ["agent-reservations", agentId] });
    }
  }

  const statusBadge: Record<string, string> = {
    pending: "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400",
    processing: "border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400",
    success: "border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400",
    failed: "border-destructive/20 bg-destructive/5 text-destructive",
  };

  return (
    <div className="space-y-3">
      {reservations.map((r: any) => {
        const target = r.properties;
        return (
          <div key={r.id} className="group overflow-hidden rounded-xl border border-border/50 bg-background p-5 transition-all hover:shadow-sm hover:border-primary/20">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 min-w-[200px] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div>
                    {target ? (
                      <Link to={`/properties/${target.slug}`} className="font-serif text-base font-semibold hover:text-primary transition-colors">
                        {target.title}
                      </Link>
                    ) : (
                      <p className="font-serif text-base font-semibold text-muted-foreground">Unknown Property</p>
                    )}
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">
                      {new Date(r.created_at).toLocaleDateString()} · {r.profiles?.first_name} {r.profiles?.last_name}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <div className="px-2.5 py-1.5 rounded-lg bg-accent border border-border/30">
                    <span className="text-muted-foreground">Ref: </span>
                    <span className="font-mono font-medium">{r.reference}</span>
                  </div>
                  <div className="px-2.5 py-1.5 rounded-lg bg-accent border border-border/30 capitalize">
                    <span className="text-muted-foreground">Method: </span>
                    <span className="font-medium">{r.provider?.replace("_", " ")}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2.5">
                <p className="font-serif text-xl font-bold tabular-nums">{formatMoney(Number(r.amount), r.currency)}</p>
                <Select defaultValue={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                  <SelectTrigger className={`w-[140px] h-8 text-xs font-semibold ${statusBadge[r.status] || ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="success">Confirmed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                {r.provider === "crypto" && r.crypto_currency && (
                  <p className="text-[10px] text-primary font-bold">{r.crypto_amount} {r.crypto_currency}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
