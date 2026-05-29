import { Navigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Building2, Inbox, CalendarClock, Landmark, TrendingUp, Search, Filter, Mail, Phone, CalendarDays } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/invest";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AgentDashboard() {
  const { user, isAgent, isAdmin, loading } = useAuth();
  if (loading) return <SiteLayout><div className="container-wide py-12"><Skeleton className="h-96" /></div></SiteLayout>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAgent && !isAdmin) return <Navigate to="/" replace />;

  return (
    <SiteLayout>
      <div className="bg-gradient-to-r from-secondary/50 via-background to-primary/5 border-b border-border relative overflow-hidden">
        <div className="container-wide py-12 relative z-10">
          <h1 className="font-serif text-4xl font-bold sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Agent Dashboard</h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl">Manage your property listings, client inquiries, and property viewings.</p>
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
    return <div className="rounded-xl border border-dashed border-border p-12 text-center">
      <p className="font-serif text-xl">No agent profile linked to your account.</p>
      <p className="mt-2 text-sm text-muted-foreground">Ask an admin to link your account.</p>
    </div>;
  }
  return (
    <Tabs defaultValue="overview" className="space-y-8">
      <TabsList className="bg-card/50 backdrop-blur-md border border-border/50 p-1 rounded-xl shadow-sm">
        <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none">Overview</TabsTrigger>
        <TabsTrigger value="listings" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none">My Listings</TabsTrigger>
        <TabsTrigger value="inquiries" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none">Inquiries</TabsTrigger>
        <TabsTrigger value="bookings" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none">Viewings</TabsTrigger>
        <TabsTrigger value="reservations" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none">Reservations</TabsTrigger>
      </TabsList>
      <div className="bg-card border border-border/50 rounded-xl p-6 sm:p-8 shadow-soft">
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
        promises.push(
          supabase.from("payments")
            .select("id", { count: "exact", head: true })
            .in("property_id", propIds)
            .eq("payment_type", "reservation")
            .eq("status", "success")
        );
      } else {
        promises.push(Promise.resolve({ count: 0 }));
      }

      const [p, i, b, r] = await Promise.all(promises);
      
      return { 
        listings: p.count ?? 0, 
        inquiries: i.count ?? 0, 
        bookings: b.count ?? 0,
        reservations: r.count ?? 0 
      };
    },
  });
  const tiles = [
    { icon: Building2, label: "Active Listings", v: data?.listings ?? 0 },
    { icon: Inbox, label: "Open Inquiries", v: data?.inquiries ?? 0 },
    { icon: CalendarClock, label: "Upcoming Viewings", v: data?.bookings ?? 0 },
    { icon: Landmark, label: "Property Reservations", v: data?.reservations ?? 0 },
  ];
  // Simulated performance metrics based on agent activity
  const totalListings = data?.listings ?? 0;
  const totalInquiries = data?.inquiries ?? 0;
  const conversionRate = totalListings > 0 ? ((data?.reservations ?? 0) / totalListings * 100).toFixed(1) : "0.0";
  const buyerQuality = totalInquiries > 0 ? Math.min(9.5, 6.5 + (data?.reservations ?? 0) * 0.8).toFixed(1) : "—";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-serif font-semibold text-foreground">Dashboard Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">Summary of your current activities.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-border/50 bg-card p-5 transition-colors hover:border-border">
            <div className="flex flex-col h-full justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/8 text-primary mb-3">
                <t.icon className="h-5 w-5" />
              </span>
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{t.label}</p>
              <p className="mt-1 text-2xl font-serif font-semibold text-foreground">{t.v}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Listing Performance Metrics */}
      <div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-serif text-base font-semibold text-foreground">Listing Performance</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Metrics & Conversion Data</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border/50 bg-accent/30 p-4 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Conversion Rate</p>
            <p className="text-2xl font-bold text-primary">{conversionRate}%</p>
            <p className="text-[10px] text-muted-foreground mt-1">Reservations / Listings</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-accent/30 p-4 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Buyer Quality Score</p>
            <p className="text-2xl font-bold text-foreground">{buyerQuality}<span className="text-xs font-normal text-muted-foreground">/10</span></p>
            <p className="text-[10px] text-muted-foreground mt-1">Based on inquiry-to-reservation</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-accent/30 p-4 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Response Rate</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalInquiries > 0 ? "Active" : "—"}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{totalInquiries} open inquiries</p>
          </div>
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search properties..." 
            className="pl-9 w-full bg-accent border-border/50 focus-visible:ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px] bg-accent border-border/50">
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

      <div className="space-y-3">
        {filteredData.map((p: any) => (
          <div key={p.id} className="group flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm">
            <div className="flex-1 min-w-[200px]">
              <Link to={`/properties/${p.slug}`} className="font-serif text-lg font-semibold hover:text-primary transition-colors">
                {p.title}
              </Link>
              <div className="flex gap-2 items-center mt-1 text-xs text-muted-foreground">
                <Badge variant="outline" className="capitalize text-[10px] py-0">{p.property_type}</Badge>
                <span>{formatMoney(p.price, p.currency)}</span>
              </div>
            </div>
            
            <Select defaultValue={p.status} onValueChange={(v) => setStatus(p.id, v)}>
              <SelectTrigger className={`w-[140px] ${p.status === 'available' ? 'border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400' : p.status === 'reserved' ? 'border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400' : 'border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400'}`}>
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
          <div className="p-8 text-center border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground">No properties match your filters.</p>
            <Button variant="link" onClick={() => { setSearch(""); setStatusFilter("all"); }}>Clear filters</Button>
          </div>
        )}
        {data.length === 0 && (
          <div className="p-8 text-center border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground">No assigned listings yet.</p>
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
  return (
    <div className="space-y-4">
      {data.map((i: any) => (
        <div key={i.id} className="group rounded-xl border border-border/50 bg-card p-5 transition-all hover:shadow-md hover:border-primary/20">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div>
                <Link to={`/properties/${i.properties?.slug}`} className="font-serif text-lg font-semibold hover:text-primary transition-colors">
                  {i.properties?.title || "General Inquiry"}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-medium">{i.name}</span>
                  <span className="text-xs text-muted-foreground">• {new Date(i.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 bg-accent px-2 py-1 rounded-md">
                  <Mail className="h-3 w-3" />
                  <a href={`mailto:${i.email}`} className="hover:text-primary">{i.email}</a>
                </div>
                {i.phone && (
                  <div className="flex items-center gap-1.5 bg-accent px-2 py-1 rounded-md">
                    <Phone className="h-3 w-3" />
                    <a href={`tel:${i.phone}`} className="hover:text-primary">{i.phone}</a>
                  </div>
                )}
              </div>
              
              <div className="rounded-xl bg-accent/50 p-3 text-sm text-foreground/90 italic border border-border/30">
                "{i.message}"
              </div>
            </div>
            
            <Select defaultValue={i.status} onValueChange={(v) => setStatus(i.id, v)}>
              <SelectTrigger className={`w-full sm:w-[140px] ${
                i.status === 'new' ? 'border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400' :
                i.status === 'in_progress' ? 'border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400' :
                i.status === 'resolved' ? 'border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400' :
                'border-border/50 bg-accent text-muted-foreground'
              }`}>
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
        <div className="p-8 text-center border border-dashed border-border rounded-xl">
          <p className="text-muted-foreground">No inquiries yet.</p>
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
  return (
    <div className="space-y-4">
      {data.map((b: any) => (
        <div key={b.id} className="group rounded-xl border border-border/50 bg-card p-5 transition-all hover:shadow-md hover:border-primary/20">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div>
                <Link to={`/properties/${b.properties?.slug}`} className="font-serif text-lg font-semibold hover:text-primary transition-colors">
                  {b.properties?.title || "Property Inspection"}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-medium">{b.name}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 bg-primary/5 text-primary px-3 py-1.5 rounded-lg border border-primary/20 font-medium">
                  <CalendarDays className="h-4 w-4" />
                  <span>{new Date(b.preferred_date).toLocaleString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 bg-accent px-2 py-1 rounded-md">
                  <Mail className="h-3 w-3" />
                  <a href={`mailto:${b.email}`} className="hover:text-primary">{b.email}</a>
                </div>
                {b.phone && (
                  <div className="flex items-center gap-1.5 bg-accent px-2 py-1 rounded-md">
                    <Phone className="h-3 w-3" />
                    <a href={`tel:${b.phone}`} className="hover:text-primary">{b.phone}</a>
                  </div>
                )}
              </div>
              
              {b.notes && (
                <div className="rounded-xl bg-accent/50 p-3 text-sm text-foreground/90 italic border border-border/30">
                  <span className="font-medium text-xs not-italic text-muted-foreground uppercase tracking-wider block mb-1">Notes</span>
                  "{b.notes}"
                </div>
              )}
            </div>
            
            <Select defaultValue={b.status} onValueChange={(v) => setStatus(b.id, v)}>
              <SelectTrigger className={`w-full sm:w-[140px] ${
                b.status === 'pending' ? 'border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400' :
                b.status === 'confirmed' ? 'border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400' :
                b.status === 'completed' ? 'border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400' :
                'border-border/50 bg-accent text-muted-foreground'
              }`}>
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
        <div className="p-8 text-center border border-dashed border-border rounded-xl">
          <p className="text-muted-foreground">No property viewings booked yet.</p>
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
    <div className="rounded-xl border border-dashed border-border p-12 text-center">
      <p className="font-serif text-xl">No property reservations yet</p>
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

  return (
    <div className="space-y-4">
      {reservations.map((r: any) => {
        const target = r.properties;
        const targetSlug = `/properties/${target?.slug}`;
        const statusLabel = r.status === "confirmed" ? "confirmed" : r.status;
        
        return (
          <div key={r.id} className="group overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-all hover:shadow-md hover:border-primary/20">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 min-w-[200px] space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div>
                    {target ? (
                      <Link to={targetSlug} className="font-serif text-lg font-semibold hover:text-primary transition-colors">
                        {target.title}
                      </Link>
                    ) : (
                      <p className="font-serif text-lg font-semibold text-muted-foreground">Unknown</p>
                    )}
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {new Date(r.created_at).toLocaleDateString()} · By {r.profiles?.first_name} {r.profiles?.last_name}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-xs pt-1">
                  <div className="px-3 py-1.5 rounded-lg bg-accent border border-border/30">
                    <span className="text-muted-foreground">Ref: </span>
                    <span className="font-mono font-medium">{r.reference}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-accent border border-border/30 capitalize">
                    <span className="text-muted-foreground">Method: </span>
                    <span className="font-medium">{r.provider?.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <p className="font-serif text-xl font-bold">{formatMoney(Number(r.amount), r.currency)}</p>
                
                <Select defaultValue={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                  <SelectTrigger className="w-[140px] h-8 text-xs font-medium capitalize">
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
