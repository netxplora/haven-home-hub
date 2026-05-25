import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Landmark, TrendingUp, Eye, CheckCircle2, XCircle, Trash2, RefreshCw, Clock, MessageSquare, Calendar, AlertCircle, Search, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/invest";
import { Skeleton } from "@/components/ui/skeleton";

type ReservationFilter = "all" | "reservation" | "investment";
type StatusFilter = "all" | "awaiting_reservation_fee" | "under_admin_review" | "pending_review" | "approved" | "rejected" | "information_requested";

const ITEMS_PER_PAGE = 10;

export function AdminReservations() {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<ReservationFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const [selected, setSelected] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [infoRequest, setInfoRequest] = useState("");

  // Fetch reservations and user_investments
  const { data: allApplications = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-applications-all"],
    queryFn: async () => {
      const [resResult, invResult] = await Promise.all([
        supabase
          .from("reservations")
          .select(`
            *,
            profiles(full_name),
            properties:property_id(title, slug, status, price, currency),
            investment_properties:investment_property_id(title, slug, unit_price, currency)
          `),
        supabase
          .from("user_investments")
          .select(`
            *,
            profiles(full_name),
            investment_properties:property_id(title, slug, unit_price, currency, total_units, units_sold)
          `)
      ]);

      if (resResult.error) throw resResult.error;
      if (invResult.error) throw invResult.error;

      const merged = [
        ...(resResult.data || []).map(r => {
          const prop = Array.isArray(r.properties) ? r.properties[0] : r.properties;
          const invProp = Array.isArray(r.investment_properties) ? r.investment_properties[0] : r.investment_properties;
          const target = prop || invProp;
          return { 
            ...r, 
            app_type: "reservation",
            display_title: target?.title || "Property Reservation",
            display_amount: target?.price || target?.unit_price || 0,
            display_currency: target?.currency || "USD"
          };
        }),
        ...(invResult.data || []).map(i => {
          const invProp = Array.isArray(i.investment_properties) ? i.investment_properties[0] : i.investment_properties;
          return { 
            ...i, 
            app_type: "investment",
            display_title: invProp?.title || "Investment Commitment",
            display_amount: i.amount_invested,
            display_currency: invProp?.currency || "USD"
          };
        })
      ];

      return merged;
    },
  });

  const filtered = useMemo(() => {
    let result = [...allApplications];

    /* Search */
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((app: any) =>
        (app.display_title ?? "").toLowerCase().includes(term) ||
        (app.profiles?.full_name ?? "").toLowerCase().includes(term)
      );
    }

    /* Filters */
    if (typeFilter !== "all") {
      result = result.filter((app: any) => app.app_type === typeFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((app: any) => app.status === statusFilter);
    }

    /* Sort */
    switch (sortBy) {
      case "newest":
        result.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "oldest":
        result.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "value_high":
        result.sort((a: any, b: any) => Number(b.display_amount ?? 0) - Number(a.display_amount ?? 0));
        break;
      case "value_low":
        result.sort((a: any, b: any) => Number(a.display_amount ?? 0) - Number(b.display_amount ?? 0));
        break;
    }

    return result;
  }, [allApplications, searchTerm, typeFilter, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  /* Reset page when filters change */
  const handleFilterChange = (setter: Function, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  // Stats (computed from all data so they don't change drastically when filtering, but we'll use filtered data to be consistent with other pages)
  const pendingCount = allApplications.filter((r: any) => r.status === "pending_review" || r.status === "under_admin_review").length;
  const confirmedCount = allApplications.filter((r: any) => r.status === "approved" || r.status === "confirmed" || r.status === "pending").length;
  const totalValue = allApplications.reduce((s: number, r: any) => s + Number(r.display_amount || 0), 0);

  async function handleApprove(app: any) {
    try {
      const rpcName = app.app_type === "reservation" ? "approve_reservation" : "approve_investment";
      const idParam = app.app_type === "reservation" ? "p_reservation_id" : "p_investment_id";
      
      const { error } = await (supabase as any).rpc(rpcName, {
        [idParam]: app.id,
        p_admin_notes: adminNotes
      });

      if (error) throw error;

      toast({ title: "Application Approved", description: "The user has been notified and can now proceed to payment." });
      qc.invalidateQueries({ queryKey: ["admin-applications-all"] });
      setSelected(null);
      setAdminNotes("");
    } catch (err: any) {
      toast({ title: "Approval failed", description: err.message, variant: "destructive" });
    }
  }

  async function handleReject(app: any) {
    if (!rejectionReason) {
      toast({ title: "Reason required", description: "Please provide a reason for declining.", variant: "destructive" });
      return;
    }

    try {
      const isRes = app.app_type === "reservation";
      const rpcName = isRes ? "reject_reservation" : "reject_investment";
      const idParam = isRes ? "p_reservation_id" : "p_investment_id";
      const notesParam = isRes ? "p_admin_notes" : "p_reason";
      
      const { error } = await (supabase as any).rpc(rpcName, {
        [idParam]: app.id,
        [notesParam]: rejectionReason
      });

      if (error) throw error;

      toast({ title: "Application Declined", description: "The user has been notified of the decision." });
      qc.invalidateQueries({ queryKey: ["admin-applications-all"] });
      setSelected(null);
      setRejectionReason("");
    } catch (err: any) {
      toast({ title: "Operation failed", description: err.message, variant: "destructive" });
    }
  }

  async function handleRequestInfo(app: any) {
    if (!infoRequest) {
      toast({ title: "Message required", description: "Please provide a message for the user.", variant: "destructive" });
      return;
    }

    try {
      const isRes = app.app_type === "reservation";
      const rpcName = isRes ? "request_info_reservation" : "request_info_investment";
      const idParam = isRes ? "p_reservation_id" : "p_investment_id";
      const notesParam = isRes ? "p_admin_notes" : "p_message";
      
      const { error } = await (supabase as any).rpc(rpcName, {
        [idParam]: app.id,
        [notesParam]: infoRequest
      });

      if (error) throw error;

      toast({ title: "Information Requested", description: "The user has been notified of your request." });
      qc.invalidateQueries({ queryKey: ["admin-applications-all"] });
      setSelected(null);
      setInfoRequest("");
    } catch (err: any) {
      toast({ title: "Request failed", description: err.message, variant: "destructive" });
    }
  }

  async function handleCleanup() {
    try {
      const { error } = await supabase.rpc('expire_stale_reservations');
      if (error) throw error;
      toast({ title: "Cleanup complete", description: "Expired reservations have been processed." });
      qc.invalidateQueries({ queryKey: ["admin-applications-all"] });
    } catch (err: any) {
      toast({ title: "Cleanup failed", description: err.message, variant: "destructive" });
    }
  }

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold">Pending Requests</h2>
          <p className="text-sm text-muted-foreground">Review property reservations and investment requests. {filtered.length} results.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl gap-2 border-border/50" onClick={handleCleanup}>
            <Trash2 className="h-4 w-4" /> Clear Expired
          </Button>
          <Button size="sm" className="rounded-xl gap-2 bg-primary/10 text-primary hover:bg-primary/20 border-none shadow-sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Valuation</p>
          <p className="mt-1 font-serif text-2xl font-bold">{formatMoney(totalValue)}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">Needs Review</p>
          <p className="mt-1 font-serif text-2xl font-bold text-amber-700 dark:text-amber-400">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-green-500/20 bg-green-50/50 dark:bg-green-950/20 p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-green-700 dark:text-green-400">Approved</p>
          <p className="mt-1 font-serif text-2xl font-bold text-green-700 dark:text-green-400">{confirmedCount}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Requests</p>
          <p className="mt-1 font-serif text-2xl font-bold">{allApplications.length}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search asset or user..."
            value={searchTerm}
            onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
            className="pl-10 rounded-xl border-border/50 bg-card"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => handleFilterChange(setTypeFilter, v)}>
          <SelectTrigger className="w-[180px] rounded-xl border-border/50 bg-card shadow-sm"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="reservation">Property Reservation</SelectItem>
            <SelectItem value="investment">Investment Request</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => handleFilterChange(setStatusFilter, v)}>
          <SelectTrigger className="w-[180px] rounded-xl border-border/50 bg-card shadow-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="awaiting_reservation_fee">Awaiting Fee</SelectItem>
            <SelectItem value="under_admin_review">Under Review</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="information_requested">Info Requested</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Declined</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => handleFilterChange(setSortBy, v)}>
          <SelectTrigger className="w-[160px] rounded-xl border-border/50 bg-card shadow-sm">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="value_high">Value: High → Low</SelectItem>
            <SelectItem value="value_low">Value: Low → High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
        {/* ── Mobile Card Layout ── */}
        <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
          {paginated.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-3 opacity-20" />
              No applications match your filters.
            </div>
          ) : (
            paginated.map((app: any) => (
              <div key={app.id} className="rounded-xl border border-border/45 bg-card p-4 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-foreground text-sm line-clamp-1">{app.display_title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {app.profiles?.full_name || "Unknown"}
                    </p>
                  </div>
                  <Badge className="rounded-md px-2 py-0.5 text-[10px] font-bold capitalize shrink-0"
                    variant={app.status === "approved" || app.status === "confirmed" || app.status === "pending" ? "default" : app.status === "rejected" ? "destructive" : "secondary"}>
                    {app.status === "rejected" ? "Declined" : app.status?.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-border/30">
                  <div>
                    <span className="block text-muted-foreground font-medium uppercase tracking-wider text-[10px] mb-0.5">Type</span>
                    <Badge variant="outline" className="text-[10px] font-bold capitalize gap-1 py-0 px-1.5">
                      {app.app_type === "investment" ? <TrendingUp className="h-3 w-3" /> : <Landmark className="h-3 w-3" />}
                      {app.app_type}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="block text-muted-foreground font-medium uppercase tracking-wider text-[10px] mb-0.5">Value</span>
                    <span className="font-bold text-foreground">{formatMoney(app.display_amount, app.display_currency)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-border/30 items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {new Date(app.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <Button size="sm" variant="outline" className="h-11 px-4 rounded-lg font-bold gap-1.5" onClick={() => setSelected(app)}>
                    <Eye className="h-4 w-4" /> Review
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Desktop Table Layout ── */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/40 border-b border-border/50">
              <tr>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Date</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Type</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">User</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Property / Asset</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground text-right whitespace-nowrap">Amount</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Status</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center">
                    <div className="max-w-xs mx-auto space-y-4">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto opacity-20" />
                      <p className="font-serif text-lg text-muted-foreground italic">No applications match your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : paginated.map((app: any) => (
                <tr key={app.id} className="transition-colors hover:bg-secondary/20">
                  <td className="p-4 text-muted-foreground whitespace-nowrap">
                    {new Date(app.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className="text-[10px] font-bold capitalize gap-1.5">
                      {app.app_type === "investment" ? <TrendingUp className="h-3 w-3" /> : <Landmark className="h-3 w-3" />}
                      {app.app_type}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <p className="font-medium">{app.profiles?.full_name || "Unknown"}</p>
                  </td>
                  <td className="p-4 font-medium max-w-[200px] truncate">{app.display_title}</td>
                  <td className="p-4 text-right font-bold text-primary">{formatMoney(app.display_amount, app.display_currency)}</td>
                  <td className="p-4">
                    <Badge className="rounded-md px-2 py-0.5 text-[10px] font-bold capitalize"
                      variant={app.status === "approved" || app.status === "confirmed" || app.status === "pending" ? "default" : app.status === "rejected" ? "destructive" : "secondary"}>
                      {app.status === "rejected" ? "Declined" : app.status?.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <Button size="sm" variant="ghost" className="h-8 rounded-lg gap-1.5" onClick={() => setSelected(app)}>
                      <Eye className="h-3.5 w-3.5" /> Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-accent/30">
            <p className="text-xs text-muted-foreground">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button 
                size="icon" 
                variant="outline" 
                className="h-8 w-8 rounded-lg" 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium text-foreground min-w-[60px] text-center">
                Page {currentPage} of {totalPages}
              </span>
              <Button 
                size="icon" 
                variant="outline" 
                className="h-8 w-8 rounded-lg" 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-md p-0 border border-border">
            <DialogHeader className="bg-secondary/40 p-6 border-b border-border/50 shrink-0">
              <DialogTitle className="font-serif text-2xl">Request Review</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-6 py-6">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-accent/50 border border-border/50">
                  <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px] mb-1">User</p>
                  <p className="font-bold text-sm">{selected.profiles?.full_name || "Unknown"}</p>
                </div>
                <div className="p-4 rounded-xl bg-accent/50 border border-border/50">
                  <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px] mb-1">Type</p>
                  <p className="font-bold text-sm capitalize">{selected.app_type}</p>
                </div>
              </div>

              <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Asset</p>
                  <p className="text-lg font-serif font-bold">{selected.display_title}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Value</p>
                  <p className="text-xl font-bold text-primary">{formatMoney(selected.display_amount, selected.display_currency)}</p>
                </div>
                {selected.units_owned > 0 && (
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Requested Units</p>
                    <p className="text-sm font-bold">{selected.units_owned} units</p>
                  </div>
                )}
              </div>

              {selected.status === "awaiting_reservation_fee" ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="font-bold text-amber-700">Payment Required</p>
                  <p className="text-xs text-amber-600/80 mt-1">User has not completed the reservation fee. Admin review is locked.</p>
                </div>
              ) : selected.status === "under_admin_review" || selected.status === "pending_review" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground ml-1">Internal Admin Notes</label>
                    <Textarea 
                      placeholder="Add notes for other admins..." 
                      className="rounded-xl resize-none min-h-[80px]"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button 
                      className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-bold text-base gap-2"
                      onClick={() => handleApprove(selected)}
                    >
                      <CheckCircle2 className="h-5 w-5" /> Approve Application
                    </Button>

                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <label className="text-xs font-medium uppercase tracking-wider text-amber-600 ml-1">Request More Info</label>
                      <Input 
                        placeholder="What else do you need to know?" 
                        className="rounded-xl border-amber-500/20"
                        value={infoRequest}
                        onChange={(e) => setInfoRequest(e.target.value)}
                      />
                      <Button 
                        variant="outline" 
                        className="w-full h-12 rounded-xl text-amber-600 border-amber-500/20 font-bold hover:bg-amber-500/10 gap-2"
                        onClick={() => handleRequestInfo(selected)}
                      >
                        <MessageSquare className="h-4 w-4" /> Request Information
                      </Button>
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <label className="text-xs font-medium uppercase tracking-wider text-destructive ml-1">Decline Reason (Sent to User)</label>
                      <Input 
                        placeholder="Why is this being declined?" 
                        className="rounded-xl border-destructive/20"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                      />
                      <Button 
                        variant="ghost" 
                        className="w-full h-12 rounded-xl text-destructive font-bold hover:bg-destructive/10 gap-2"
                        onClick={() => handleReject(selected)}
                      >
                        <XCircle className="h-4 w-4" /> Decline Application
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-secondary/20 border border-border/50 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold capitalize">Status: {selected.status}</p>
                    {selected.rejection_reason && (
                      <p className="text-xs text-destructive mt-1">Reason: {selected.rejection_reason}</p>
                    )}
                    {selected.admin_notes && (
                      <p className="text-xs text-muted-foreground mt-1">Note: {selected.admin_notes}</p>
                    )}
                  </div>
                </div>
              )}
            </DialogBody>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
