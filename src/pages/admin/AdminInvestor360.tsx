import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, ShieldCheck, ShieldAlert, Clock, Mail, Phone, CalendarDays,
  LayoutDashboard, TrendingUp, CreditCard, Calendar, ArrowLeftRight, Settings,
  CheckCircle2, Search, Building2, Eye, ExternalLink, X, MapPin, ChevronRight, ChevronLeft, ArrowUpDown
} from "lucide-react";
import { formatMoney } from "@/lib/invest";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Admin Note persistence using localStorage since no DB table exists yet
const getNotes = (id: string) => localStorage.getItem(`admin_notes_${id}`) || "";
const setNotes = (id: string, notes: string) => localStorage.setItem(`admin_notes_${id}`, notes);

const getFlag = (id: string) => localStorage.getItem(`admin_flag_${id}`) === "true";
const setFlag = (id: string, flag: boolean) => localStorage.setItem(`admin_flag_${id}`, String(flag));

const getSuspension = (id: string) => localStorage.getItem(`admin_suspended_${id}`) === "true";
const setSuspension = (id: string, suspended: boolean) => localStorage.setItem(`admin_suspended_${id}`, String(suspended));

export function AdminInvestor360({ initialUserId, onBack }: { initialUserId?: string, onBack?: () => void }) {
  const qc = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId || null);
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (initialUserId) {
      setSelectedUserId(initialUserId);
    }
  }, [initialUserId]);

  // Fetch users for dropdown search
  const { data: users = [] } = useQuery({
    queryKey: ["admin-360-users-lookup"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email, phone").order("full_name");
      return data ?? [];
    },
  });

  const filteredUsers = users.filter((u: any) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (u.full_name || "").toLowerCase().includes(term) || (u.email || "").toLowerCase().includes(term) || (u.id || "").toLowerCase().includes(term);
  }).slice(0, 50);

  // Core Data Fetching for Selected User
  const { data: profileData, isLoading: loadingProfile, refetch: refetchProfile } = useQuery({
    queryKey: ["admin-360-profile", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return null;
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", selectedUserId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", selectedUserId),
      ]);
      if (!profileRes.data) return null;
      return {
        ...profileRes.data,
        roles: rolesRes.data?.map((r: any) => r.role) || [],
      };
    },
    enabled: !!selectedUserId,
  });

  const { data: activityData, isLoading: loadingActivity } = useQuery({
    queryKey: ["admin-360-activity", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return null;
      
      const [invRes, payRes, resRes, listingsRes, tradesRes] = await Promise.all([
        supabase.from("user_investments").select(`
          *,
          investment_properties(title, slug, currency)
        `).eq("user_id", selectedUserId).order("created_at", { ascending: false }),
        
        supabase.from("payments").select(`
          *,
          properties(title),
          investment_properties(title)
        `).eq("user_id", selectedUserId).order("created_at", { ascending: false }),
        
        supabase.from("reservations").select(`
          *,
          properties:property_id(title, currency),
          investment_properties:investment_property_id(title, currency)
        `).eq("user_id", selectedUserId).order("created_at", { ascending: false }),
        
        supabase.from("secondary_market_listings" as any).select(`
          *,
          investment_properties!secondary_market_listings_property_id_fkey(title, currency)
        `).eq("seller_id", selectedUserId).order("created_at", { ascending: false }),
        
        supabase.from("secondary_market_transactions" as any).select(`
          *,
          secondary_market_listings!secondary_market_transactions_listing_id_fkey(
            investment_properties!secondary_market_listings_property_id_fkey(title, currency)
          )
        `).eq("buyer_id", selectedUserId).order("created_at", { ascending: false })
      ]);

      return {
        investments: invRes.data || [],
        payments: payRes.data || [],
        reservations: resRes.data || [],
        listings: listingsRes.data || [],
        trades: tradesRes.data || [],
      };
    },
    enabled: !!selectedUserId,
  });

  // Calculate completeness
  const completenessScore = profileData ? Math.round(
    ([
      !!profileData.full_name,
      !!profileData.phone,
      profileData.kyc_status === "approved",
      !!profileData.id_document_url,
      !!profileData.proof_of_address_url,
    ].filter(Boolean).length / 5) * 100
  ) : 0;

  // Local state for admin controls (since DB tables might not exist for these yet)
  const [adminNotes, setAdminNotesState] = useState("");
  const [isFlagged, setIsFlagged] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    if (selectedUserId) {
      setAdminNotesState(getNotes(selectedUserId));
      setIsFlagged(getFlag(selectedUserId));
      setIsSuspended(getSuspension(selectedUserId));
    }
  }, [selectedUserId]);

  const handleSaveNotes = () => {
    if (!selectedUserId) return;
    setNotes(selectedUserId, adminNotes);
    toast({ title: "Admin notes saved locally." });
  };

  const handleToggleFlag = (v: boolean) => {
    if (!selectedUserId) return;
    setIsFlagged(v);
    setFlag(selectedUserId, v);
    toast({ title: v ? "Investor flagged for review" : "Flag removed" });
  };

  const handleToggleSuspension = (v: boolean) => {
    if (!selectedUserId) return;
    setIsSuspended(v);
    setSuspension(selectedUserId, v);
    toast({ title: v ? "Account locally suspended" : "Account reactivated" });
  };

  const updateKycStatus = async (status: string) => {
    if (!selectedUserId) return;
    const { error } = await supabase.from("profiles").update({ kyc_status: status }).eq("id", selectedUserId);
    if (error) toast({ title: "Failed to update KYC", description: error.message, variant: "destructive" });
    else {
      toast({ title: "KYC Status updated" });
      refetchProfile();
    }
  };

  const handleAddRole = async (role: string) => {
    if (!selectedUserId) return;
    const { error } = await supabase.from("user_roles").insert({ user_id: selectedUserId, role: role as any });
    if (!error) refetchProfile();
  };

  const handleRemoveRole = async (role: string) => {
    if (!selectedUserId) return;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", selectedUserId).eq("role", role as any);
    if (!error) refetchProfile();
  };

  if (!selectedUserId) {
    return <GlobalInvestorDirectory onSelectUser={setSelectedUserId} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => { setSelectedUserId(null); if (onBack) onBack(); }} className="rounded-lg h-9">
            <X className="h-4 w-4 mr-1.5" /> Close Profile
          </Button>
          <div className="h-4 w-px bg-border/50" />
          <h2 className="font-serif text-xl font-bold flex items-center gap-2">
            Investor Profile 360
          </h2>
        </div>
        
        {/* User Search Switcher */}
        <div className="relative hidden md:block w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            placeholder="Switch user..." 
            className="pl-8 h-9 rounded-lg bg-card text-xs border-border/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <div className="absolute top-full mt-1 w-full bg-card border rounded-lg shadow-lg z-50 max-h-[300px] overflow-y-auto">
              {filteredUsers.map((u: any) => (
                <button 
                  key={u.id}
                  onClick={() => { setSelectedUserId(u.id); setSearch(""); }}
                  className="w-full text-left px-3 py-2 hover:bg-secondary/50 text-xs border-b last:border-0"
                >
                  <span className="font-medium block">{u.full_name || 'Unnamed'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loadingProfile ? (
        <div className="bg-card rounded-xl p-8 border border-border/50 space-y-4"><Skeleton className="h-24 w-full" /></div>
      ) : profileData ? (
        <>
          {/* Identity Header */}
          <div className={`relative overflow-hidden bg-card border rounded-xl p-6 shadow-sm ${isSuspended ? 'border-red-500/50' : 'border-border/50'}`}>
            {isSuspended && (
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
            )}
            {isFlagged && (
              <div className="absolute top-0 right-0 p-2">
                <Badge variant="destructive" className="uppercase text-[9px] font-bold"><ShieldAlert className="h-3 w-3 mr-1" /> Flagged</Badge>
              </div>
            )}
            
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl uppercase shrink-0 ring-4 ring-background shadow-sm">
                {profileData.full_name ? profileData.full_name[0] : "U"}
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-bold font-serif">{profileData.full_name || "Unnamed Investor"}</h3>
                  <Badge variant={profileData.kyc_status === 'approved' ? 'default' : profileData.kyc_status === 'pending' ? 'secondary' : 'outline'} className="uppercase text-[10px] font-bold">
                    {profileData.kyc_status === 'approved' ? <ShieldCheck className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                    {profileData.kyc_status || 'Unverified'}
                  </Badge>
                  {profileData.roles?.map((r: string) => (
                    <Badge key={r} variant="secondary" className="uppercase text-[10px] font-bold">{r}</Badge>
                  ))}
                  {isSuspended && <Badge variant="destructive" className="uppercase text-[10px] font-bold">Suspended</Badge>}
                </div>
                
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <User className="h-3.5 w-3.5" /> ID: {profileData.id.slice(0,8)}...
                    <button onClick={() => { navigator.clipboard.writeText(profileData.id); toast({title:"Copied"}); }} className="hover:text-foreground p-1"><ExternalLink className="h-3 w-3" /></button>
                  </div>
                  {profileData.email && <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {profileData.email}</div>}
                  {profileData.phone && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {profileData.phone}</div>}
                  <div className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Joined {format(new Date(profileData.created_at), "MMM d, yyyy")}</div>
                </div>
              </div>
              
              <div className="w-full md:w-48 bg-secondary/20 rounded-xl p-4 border border-border/50 shrink-0">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Profile Completeness</span>
                  <span className="text-xs font-bold">{completenessScore}%</span>
                </div>
                <Progress value={completenessScore} className="h-2" />
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex overflow-x-auto no-scrollbar border-b border-border/50">
            {[
              { id: "overview", label: "Overview", icon: LayoutDashboard },
              { id: "investments", label: "Investments", icon: TrendingUp, count: activityData?.investments?.length },
              { id: "payments", label: "Payments", icon: CreditCard, count: activityData?.payments?.length },
              { id: "reservations", label: "Reservations", icon: Calendar, count: activityData?.reservations?.length },
              { id: "marketplace", label: "Marketplace", icon: ArrowLeftRight, count: (activityData?.listings?.length || 0) + (activityData?.trades?.length || 0) },
              { id: "admin", label: "Admin Controls", icon: Settings },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/50"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== undefined && <span className="bg-secondary/50 text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full">{tab.count}</span>}
              </button>
            ))}
          </div>

          {/* Tab Content Areas */}
          <div className="pt-2">
            
            {/* ── OVERVIEW TAB ── */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard 
                    title="Total Invested" 
                    value={formatMoney(activityData?.investments?.reduce((sum: number, i: any) => sum + Number(i.total_amount || i.amount_invested || 0), 0) || 0)} 
                    icon={TrendingUp} 
                  />
                  <StatCard 
                    title="Active Investments" 
                    value={activityData?.investments?.filter((i:any) => i.status === 'active' || i.status === 'confirmed').length.toString() || "0"} 
                    icon={Building2} 
                  />
                  <StatCard 
                    title="Total Payments" 
                    value={formatMoney(activityData?.payments?.filter((p:any) => p.status === 'success' || p.status === 'confirmed').reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) || 0)} 
                    icon={CreditCard} 
                  />
                  <StatCard 
                    title="Market Trades" 
                    value={activityData?.trades?.length.toString() || "0"} 
                    icon={ArrowLeftRight} 
                  />
                </div>
                
                {isFlagged && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-destructive">Account Flagged for Review</h4>
                      <p className="text-xs text-destructive/80 mt-1">This account has been flagged by an administrator. Check Admin Controls for notes.</p>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Activity Timeline */}
                  <div className="bg-card border border-border/50 rounded-xl p-6">
                    <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
                    <div className="space-y-4">
                      {/* Mix of recent payments and investments - simplified for view */}
                      {(!activityData?.investments?.length && !activityData?.payments?.length) ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
                      ) : (
                        [...(activityData?.investments || []).map((i:any)=>({...i, _type:'inv'})), 
                         ...(activityData?.payments || []).map((p:any)=>({...p, _type:'pay'}))]
                        .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .slice(0, 5)
                        .map((item: any, idx) => (
                          <div key={idx} className="flex gap-3 items-start">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${item._type === 'inv' ? 'bg-primary/10 text-primary' : 'bg-rose-500/10 text-rose-600'}`}>
                              {item._type === 'inv' ? <TrendingUp className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {item._type === 'inv' ? 'New Investment' : 'Payment Made'}
                                <span className="mx-2 text-muted-foreground">·</span>
                                {formatMoney(Number(item.total_amount || item.amount_invested || item.amount || 0), item.currency || 'USD')}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {item.investment_properties?.title || item.properties?.title || "Unknown Property"}
                              </p>
                            </div>
                            <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {format(new Date(item.created_at), "MMM d")}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                  {/* KYC Snapshot */}
                  <div className="bg-card border border-border/50 rounded-xl p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">KYC Documents</h3>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab("admin")} className="h-7 text-xs">Manage</Button>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-secondary/10">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className={`h-4 w-4 ${profileData.id_document_url ? 'text-green-500' : 'text-muted-foreground/30'}`} />
                          <span className="text-sm font-medium">Identity Document</span>
                        </div>
                        {profileData.id_document_url ? (
                          <a href={profileData.id_document_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><Eye className="h-3 w-3"/> View</a>
                        ) : <span className="text-xs text-muted-foreground">Not uploaded</span>}
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-secondary/10">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className={`h-4 w-4 ${profileData.proof_of_address_url ? 'text-green-500' : 'text-muted-foreground/30'}`} />
                          <span className="text-sm font-medium">Proof of Address</span>
                        </div>
                        {profileData.proof_of_address_url ? (
                          <a href={profileData.proof_of_address_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><Eye className="h-3 w-3"/> View</a>
                        ) : <span className="text-xs text-muted-foreground">Not uploaded</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── INVESTMENTS TAB ── */}
            {activeTab === "investments" && (
              <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-secondary/40 border-b">
                    <tr>
                      <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Property</th>
                      <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                      <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                      <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {activityData?.investments?.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No investments found.</td></tr>
                    ) : (
                      activityData?.investments?.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-secondary/10">
                          <td className="p-4 font-medium">{inv.investment_properties?.title}</td>
                          <td className="p-4 font-mono">{formatMoney(Number(inv.total_amount || inv.amount_invested || 0), inv.investment_properties?.currency || 'USD')}</td>
                          <td className="p-4"><Badge variant="outline" className="uppercase text-[9px]">{inv.investment_type || 'full'}</Badge></td>
                          <td className="p-4"><Badge variant={inv.status === 'active' || inv.status === 'confirmed' ? 'default' : 'secondary'} className="uppercase text-[9px]">{inv.status}</Badge></td>
                          <td className="p-4 text-muted-foreground text-xs">{format(new Date(inv.created_at), "MMM d, yyyy")}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── PAYMENTS TAB ── */}
            {activeTab === "payments" && (
              <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-secondary/40 border-b">
                    <tr>
                      <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Property</th>
                      <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                      <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Method</th>
                      <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {activityData?.payments?.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No payments found.</td></tr>
                    ) : (
                      activityData?.payments?.map((pay: any) => (
                        <tr key={pay.id} className="hover:bg-secondary/10">
                          <td className="p-4 font-medium truncate max-w-[200px]">{pay.investment_properties?.title || pay.properties?.title || 'General'}</td>
                          <td className="p-4 font-mono font-semibold text-green-600">{formatMoney(Number(pay.amount || 0), pay.currency || 'USD')}</td>
                          <td className="p-4"><Badge variant="outline" className="uppercase text-[9px]">{pay.payment_method?.replace(/_/g, ' ')}</Badge></td>
                          <td className="p-4"><Badge variant={pay.status === 'success' || pay.status === 'confirmed' ? 'default' : 'secondary'} className="uppercase text-[9px]">{pay.status}</Badge></td>
                          <td className="p-4 text-muted-foreground text-xs">{format(new Date(pay.created_at), "MMM d, yyyy")}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── RESERVATIONS TAB ── */}
            {activeTab === "reservations" && (
              <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-secondary/40 border-b">
                    <tr>
                      <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Property</th>
                      <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                      <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                      <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {activityData?.reservations?.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No reservations found.</td></tr>
                    ) : (
                      activityData?.reservations?.map((res: any) => (
                        <tr key={res.id} className="hover:bg-secondary/10">
                          <td className="p-4 font-medium">{res.investment_properties?.title || res.properties?.title}</td>
                          <td className="p-4"><Badge variant="outline" className="uppercase text-[9px]">{res.type}</Badge></td>
                          <td className="p-4 font-mono">{formatMoney(Number(res.reservation_fee || res.amount || 0), res.investment_properties?.currency || res.properties?.currency || 'USD')}</td>
                          <td className="p-4"><Badge variant={res.status === 'confirmed' ? 'default' : 'secondary'} className="uppercase text-[9px]">{res.status}</Badge></td>
                          <td className="p-4 text-muted-foreground text-xs">{format(new Date(res.created_at), "MMM d, yyyy")}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* ── MARKETPLACE TAB ── */}
            {activeTab === "marketplace" && (
              <div className="space-y-6">
                <div className="bg-card border border-border/50 rounded-xl p-6">
                  <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Active Listings (Selling)</h3>
                  {activityData?.listings?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active listings.</p>
                  ) : (
                    <div className="space-y-2">
                      {activityData?.listings?.map((l:any) => (
                        <div key={l.id} className="flex justify-between items-center p-3 border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{l.investment_properties?.title}</p>
                            <p className="text-xs text-muted-foreground">{l.units_to_sell} units @ {formatMoney(Number(l.price_per_unit), l.investment_properties?.currency || 'USD')}</p>
                          </div>
                          <Badge variant={l.status === 'active' ? 'default' : 'secondary'} className="uppercase text-[9px]">{l.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="bg-card border border-border/50 rounded-xl p-6">
                  <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Purchase History (Bought)</h3>
                  {activityData?.trades?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No secondary market purchases.</p>
                  ) : (
                    <div className="space-y-2">
                      {activityData?.trades?.map((t:any) => (
                        <div key={t.id} className="flex justify-between items-center p-3 border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{t.secondary_market_listings?.investment_properties?.title}</p>
                            <p className="text-xs text-muted-foreground">{t.units_traded} units @ {formatMoney(Number(t.price_per_unit))}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{format(new Date(t.created_at), "MMM d, yyyy")}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── ADMIN CONTROLS TAB ── */}
            {activeTab === "admin" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Account Security */}
                <div className="bg-card border border-border/50 rounded-xl p-6 space-y-6">
                  <div>
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Account Security & Access</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm text-destructive">Suspend Account</p>
                          <p className="text-xs text-muted-foreground">Locally blocks admin-level operations (simulated)</p>
                        </div>
                        <Switch checked={isSuspended} onCheckedChange={handleToggleSuspension} />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm text-amber-600">Flag for Review</p>
                          <p className="text-xs text-muted-foreground">Adds a visual warning to this profile</p>
                        </div>
                        <Switch checked={isFlagged} onCheckedChange={handleToggleFlag} />
                      </div>
                    </div>
                  </div>
                  
                  {/* Role Management */}
                  <div>
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Role Management</h3>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {profileData.roles?.length === 0 ? <span className="text-xs text-muted-foreground">No roles assigned</span> : 
                          profileData.roles?.map((r: string) => (
                            <Badge key={r} variant="secondary" className="px-2 py-1 flex items-center gap-1 cursor-pointer hover:bg-destructive hover:text-white" onClick={() => handleRemoveRole(r)}>
                              {r} <X className="h-3 w-3" />
                            </Badge>
                          ))
                        }
                      </div>
                      <Select onValueChange={handleAddRole}>
                        <SelectTrigger className="w-full bg-secondary/10"><SelectValue placeholder="+ Grant New Role" /></SelectTrigger>
                        <SelectContent>
                          {["admin", "agent", "user"].filter(r => !profileData.roles?.includes(r)).map(r => (
                            <SelectItem key={r} value={r} className="uppercase text-[10px] font-bold">{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* KYC Override & Notes */}
                <div className="space-y-6">
                  <div className="bg-card border border-border/50 rounded-xl p-6">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">KYC Override</h3>
                    <Select value={profileData.kyc_status || 'unverified'} onValueChange={updateKycStatus}>
                      <SelectTrigger className="w-full mb-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="pending">Pending Review</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="unverified">Unverified</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Force-override the user's current identity verification status.</p>
                  </div>
                  
                  <div className="bg-card border border-border/50 rounded-xl p-6">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Admin Notes</h3>
                    <Textarea 
                      placeholder="Add private notes about this investor. Only visible to admins..." 
                      className="min-h-[120px] mb-3 bg-secondary/5 resize-none text-sm"
                      value={adminNotes}
                      onChange={(e) => setAdminNotesState(e.target.value)}
                    />
                    <Button onClick={handleSaveNotes} className="w-full font-bold">Save Private Notes</Button>
                    <p className="text-[10px] text-muted-foreground text-center mt-2">Notes are saved locally in this browser.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string, value: string, icon: any }) {
  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm flex flex-col justify-between">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{title}</p>
        <div className="p-1.5 bg-primary/10 rounded-lg text-primary"><Icon className="h-4 w-4" /></div>
      </div>
      <p className="text-xl font-bold font-serif text-foreground">{value}</p>
    </div>
  );
}

const ITEMS_PER_PAGE = 20;

function GlobalInvestorDirectory({ onSelectUser }: { onSelectUser: (id: string) => void }) {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kycFilter, setKycFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  // Setup real-time sync for profiles and investments
  useEffect(() => {
    const channel = supabase
      .channel("admin-global-directory-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => qc.invalidateQueries({ queryKey: ["admin-global-directory"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "user_investments" }, () => qc.invalidateQueries({ queryKey: ["admin-global-directory"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ["admin-global-directory"],
    queryFn: async () => {
      const [profilesRes, rolesRes, invRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("user_investments").select("user_id, amount_invested, total_amount, status")
      ]);

      const profiles = profilesRes.data || [];
      const roles = rolesRes.data || [];
      const investments = invRes.data || [];

      return profiles.map((p: any) => {
        const userInv = investments.filter(i => i.user_id === p.id && (i.status === 'active' || i.status === 'confirmed'));
        const isSuspended = getSuspension(p.id);
        const invCount = userInv.length;
        const totalVal = userInv.reduce((sum, i) => sum + Number(i.total_amount || i.amount_invested || 0), 0);
        
        let investorStatus = "inactive";
        if (isSuspended) investorStatus = "suspended";
        else if (invCount > 0) investorStatus = "active";
        else investorStatus = "pending";

        return {
          ...p,
          roles: roles.filter(r => r.user_id === p.id).map(r => r.role),
          investorStatus,
          invCount,
          totalVal
        };
      });
    },
  });

  const filtered = useMemo(() => {
    let result = [...allUsers];

    // Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(u =>
        (u.full_name || "").toLowerCase().includes(term) ||
        (u.email || "").toLowerCase().includes(term) ||
        (u.phone || "").toLowerCase().includes(term) ||
        (u.id || "").toLowerCase().includes(term)
      );
    }

    // Filters
    if (statusFilter !== "all") {
      result = result.filter(u => u.investorStatus === statusFilter);
    }
    
    if (kycFilter !== "all") {
      if (kycFilter === "verified") {
        result = result.filter(u => u.kyc_status === "approved");
      } else {
        result = result.filter(u => u.kyc_status !== "approved");
      }
    }

    // Sorting
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "highest_value":
        result.sort((a, b) => b.totalVal - a.totalVal);
        break;
      case "most_active":
        result.sort((a, b) => b.invCount - a.invCount);
        break;
    }

    return result;
  }, [allUsers, searchTerm, statusFilter, kycFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold">Global Investor Directory</h2>
          <p className="text-sm text-muted-foreground">Real-time synchronized list of all registered platform users.</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
          <User className="h-4 w-4" /> {allUsers.length} Total Users
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-border/50 bg-secondary/10 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, email, phone, or ID..." 
              className="pl-9 h-10 bg-background"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="flex gap-2 flex-wrap lg:flex-nowrap">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[140px] h-10 bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={kycFilter} onValueChange={(v) => { setKycFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[140px] h-10 bg-background"><SelectValue placeholder="KYC" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All KYC</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[180px] h-10 bg-background"><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="highest_value">Highest Inv. Value</SelectItem>
                <SelectItem value="most_active">Most Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto min-h-[400px]">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-secondary/40 border-b">
                <tr>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Investor</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Contact</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Joined</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Status / KYC</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Investments</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paginated.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">No users found.</td></tr>
                ) : (
                  paginated.map((u: any) => (
                    <tr key={u.id} className="hover:bg-secondary/10 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {u.full_name ? u.full_name[0].toUpperCase() : "U"}
                          </div>
                          <div>
                            <p className="font-medium">{u.full_name || 'Unnamed'}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{u.id.substring(0,8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs space-y-1">
                          {u.email ? <p className="text-muted-foreground">{u.email}</p> : <p className="text-muted-foreground/50 italic">No email</p>}
                          {u.phone && <p className="text-muted-foreground">{u.phone}</p>}
                        </div>
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {format(new Date(u.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="p-4 space-y-1.5">
                        <div>
                          <Badge variant={u.investorStatus === 'active' ? 'default' : u.investorStatus === 'suspended' ? 'destructive' : 'secondary'} className="uppercase text-[9px] font-bold">
                            {u.investorStatus}
                          </Badge>
                        </div>
                        <div>
                          {u.kyc_status === 'approved' ? (
                            <span className="text-[10px] font-bold text-green-600 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> VERIFIED</span>
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {u.kyc_status || 'UNVERIFIED'}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-mono font-semibold">{formatMoney(u.totalVal)}</p>
                        <p className="text-[10px] text-muted-foreground">{u.invCount} active {u.invCount === 1 ? 'investment' : 'investments'}</p>
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="outline" size="sm" className="h-8 rounded-lg font-medium" onClick={() => onSelectUser(u.id)}>
                          View Profile <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-accent/30">
            <p className="text-xs text-muted-foreground">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium text-foreground min-w-[60px] text-center">Page {currentPage} of {totalPages}</span>
              <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
