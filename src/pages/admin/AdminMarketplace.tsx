import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/invest";
import { format } from "date-fns";
import { 
  Tag, 
  ArrowLeftRight, 
  TrendingUp, 
  Layers, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Ban, 
  Clock, 
  Eye, 
  Building2, 
  User, 
  Info, 
  AlertCircle,
  Loader2,
  RefreshCw,
  ArrowUpRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LazyImage } from "@/components/ui/LazyImage";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type ViewTab = "pending" | "approved" | "sold" | "rejected" | "all" | "transactions";

const COMMON_REJECTION_REASONS = [
  "Pricing deviates significantly from market valuation",
  "Seller account verification incomplete",
  "Minimum holding period requirement not met",
  "Asset trading temporarily restricted by administration",
  "Seller requested order cancellation"
];

export function AdminMarketplace() {
  const qc = useQueryClient();
  const [view, setView] = useState<ViewTab>("pending");
  const [search, setSearch] = useState("");
  
  // Modals & Drawers state
  const [reviewModalListing, setReviewModalListing] = useState<any>(null);
  const [rejectDialogListing, setRejectDialogListing] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");

  // ── Query 1: All Secondary Market Listings ──
  const { data: listings = [], isLoading: loadingListings, refetch: refetchListings } = useQuery({
    queryKey: ["admin-marketplace-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("secondary_market_listings" as any)
        .select(`
          *,
          investment_properties!secondary_market_listings_property_id_fkey(
            id, title, currency, cover_image_url, location, unit_price
          ),
          profiles!secondary_market_listings_seller_id_profiles_fkey(
            id, full_name, email, phone
          )
        `)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Admin listings fetch error:", error);
        return [];
      }
      return (data || []) as any[];
    },
  });

  // ── Query 2: All Secondary Market Transactions ──
  const { data: transactions = [], isLoading: loadingTransactions, refetch: refetchTransactions } = useQuery({
    queryKey: ["admin-marketplace-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("secondary_market_transactions" as any)
        .select(`
          *,
          secondary_market_listings!secondary_market_transactions_listing_id_fkey(
            property_id,
            investment_properties!secondary_market_listings_property_id_fkey(title, currency)
          )
        `)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Admin transactions fetch error:", error);
        return [];
      }
      return (data || []) as any[];
    },
  });

  // Computed metrics & counts
  const pendingListings  = listings.filter((l: any) => l.status === "pending");
  const approvedListings = listings.filter((l: any) => l.status === "approved");
  const soldListings     = listings.filter((l: any) => l.status === "sold");
  const rejectedListings = listings.filter((l: any) => l.status === "rejected" || l.status === "cancelled");
  
  const totalVolume = transactions.reduce(
    (s: number, t: any) => s + (Number(t.units_traded || 0) * Number(t.price_per_unit || 0)), 0
  );

  // ── Mutation: Approve Listing ──
  const approveMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const { error } = await (supabase.rpc as any)("approve_secondary_market_listing", {
        p_listing_id: listingId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-marketplace-listings"] });
      qc.invalidateQueries({ queryKey: ["secondary_market_listings"] });
      qc.invalidateQueries({ queryKey: ["my-secondary-listings"] });
      if (reviewModalListing) setReviewModalListing(null);
      toast({
        title: "Sell Order Approved",
        description: "The listing is now active and publicly available on the Trade Center.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Approval Failed",
        description: err.message || "Could not approve the listing.",
        variant: "destructive",
      });
    },
  });

  // ── Mutation: Reject Listing ──
  const rejectMutation = useMutation({
    mutationFn: async ({ listingId, reason }: { listingId: string; reason: string }) => {
      const { error } = await (supabase.rpc as any)("reject_secondary_market_listing", {
        p_listing_id: listingId,
        p_reason: reason || "Listing did not meet platform approval criteria.",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-marketplace-listings"] });
      qc.invalidateQueries({ queryKey: ["secondary_market_listings"] });
      qc.invalidateQueries({ queryKey: ["my-secondary-listings"] });
      setRejectDialogListing(null);
      setRejectReason("");
      if (reviewModalListing) setReviewModalListing(null);
      toast({
        title: "Sell Order Rejected",
        description: "The listing was rejected and the seller has been notified with the reason.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Rejection Failed",
        description: err.message || "Could not reject the listing.",
        variant: "destructive",
      });
    },
  });

  // ── Mutation: Cancel Listing (Admin) ──
  const cancelMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const { error } = await (supabase.rpc as any)("admin_cancel_secondary_market_listing", {
        p_listing_id: listingId,
        p_reason: "Cancelled by platform administrator.",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-marketplace-listings"] });
      qc.invalidateQueries({ queryKey: ["secondary_market_listings"] });
      qc.invalidateQueries({ queryKey: ["my-secondary-listings"] });
      if (reviewModalListing) setReviewModalListing(null);
      toast({
        title: "Listing Cancelled",
        description: "The listing was removed from the active marketplace.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Cancellation Failed",
        description: err.message || "Could not cancel listing.",
        variant: "destructive",
      });
    },
  });

  // Filter listings based on current view tab
  const getVisibleListings = () => {
    switch (view) {
      case "pending":  return pendingListings;
      case "approved": return approvedListings;
      case "sold":     return soldListings;
      case "rejected": return rejectedListings;
      case "all":      return listings;
      default:         return pendingListings;
    }
  };

  const filteredListings = getVisibleListings().filter((l: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const title = l.investment_properties?.title?.toLowerCase() ?? "";
    const seller = l.profiles?.full_name?.toLowerCase() ?? "";
    const email = l.profiles?.email?.toLowerCase() ?? "";
    const id = l.id?.toLowerCase() ?? "";
    return title.includes(q) || seller.includes(q) || email.includes(q) || id.includes(q);
  });

  const filteredTransactions = transactions.filter((t: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const title = t.secondary_market_listings?.investment_properties?.title?.toLowerCase() ?? "";
    const method = (t.payment_method || "").toLowerCase();
    return title.includes(q) || method.includes(q);
  });

  const handleManualRefresh = () => {
    refetchListings();
    refetchTransactions();
    toast({ title: "Refreshed", description: "Secondary marketplace data updated." });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">Secondary Marketplace Review</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve user unit sell orders, manage live exchange listings, and monitor peer-to-peer trades.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          className="self-start sm:self-auto rounded-xl border-border/80 hover:bg-accent font-semibold text-xs h-9"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh Orders
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard 
          icon={Clock} 
          label="Pending Review" 
          value={pendingListings.length.toString()} 
          accent="text-amber-600" 
          bgAccent="bg-amber-500/10" 
          urgent={pendingListings.length > 0} 
        />
        <StatCard 
          icon={Tag} 
          label="Live on Exchange" 
          value={approvedListings.length.toString()} 
          accent="text-primary" 
          bgAccent="bg-primary/10" 
        />
        <StatCard 
          icon={ArrowLeftRight} 
          label="Completed Trades" 
          value={soldListings.length.toString()} 
          accent="text-emerald-600" 
          bgAccent="bg-emerald-500/10" 
        />
        <StatCard 
          icon={TrendingUp} 
          label="Total Traded Volume" 
          value={formatMoney(totalVolume)} 
          accent="text-primary" 
          bgAccent="bg-primary/10" 
        />
      </div>

      {/* View Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex bg-accent/50 p-1 rounded-xl gap-1 flex-wrap">
          {([
            { id: "pending", label: "Pending Review", icon: Clock, count: pendingListings.length },
            { id: "approved", label: "Active Listings", icon: Tag, count: approvedListings.length },
            { id: "sold", label: "Sold", icon: CheckCircle2, count: soldListings.length },
            { id: "rejected", label: "Rejected / Cancelled", icon: XCircle, count: rejectedListings.length },
            { id: "all", label: "All Orders", icon: Layers, count: listings.length },
            { id: "transactions", label: "Trade Logs", icon: ArrowLeftRight, count: transactions.length },
          ] as const).map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={cn(
                "px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5",
                view === id 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
              {count > 0 && (
                <span className={cn(
                  "text-[10px] font-bold rounded-full px-1.5 py-0.2 min-w-[18px] text-center",
                  id === "pending" && count > 0 
                    ? "bg-amber-500 text-white animate-pulse" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search property, seller, or order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl border-border bg-card text-xs sm:text-sm"
          />
        </div>
      </div>

      {/* Listings Table / Cards View */}
      {view !== "transactions" && (
        <div className="rounded-2xl border border-border/40 bg-card shadow-soft overflow-hidden">
          {loadingListings ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="p-16 text-center">
              <Layers className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-serif text-lg font-semibold text-foreground">No listings found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {view === "pending" 
                  ? "There are currently no sell orders waiting for administrative review." 
                  : "No listings match the selected filters."}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                {filteredListings.map((l: any) => {
                  const currency = l.investment_properties?.currency ?? "USD";
                  const unitsToSell = l.units_to_sell ?? 0;
                  const unitsSold = l.units_sold ?? 0;
                  const unitsAvail = Math.max(0, unitsToSell - unitsSold);
                  const askingPrice = Number(l.price_per_unit || 0);
                  const total = unitsAvail * askingPrice;
                  const isPending = l.status === "pending";
                  const isApproved = l.status === "approved";

                  return (
                    <div key={l.id} className="rounded-xl border border-border/60 bg-background p-4 space-y-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-12 w-12 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/50">
                            <LazyImage 
                              src={l.investment_properties?.cover_image_url || "/placeholder.svg"} 
                              className="h-full w-full object-cover" 
                              alt="" 
                              aspectClass="" 
                              wrapperClassName="h-full w-full" 
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{l.investment_properties?.title ?? "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">Seller: {l.profiles?.full_name ?? "—"}</p>
                            <p className="text-[10px] text-muted-foreground">{format(new Date(l.created_at), "MMM dd, yyyy · HH:mm")}</p>
                          </div>
                        </div>
                        <StatusBadge status={l.status} />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs bg-muted/20 border border-border/40 rounded-lg p-2.5">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold">Units</span>
                          <span className="font-semibold text-foreground">{unitsAvail} of {unitsToSell}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold">Asking/Unit</span>
                          <span className="font-semibold text-foreground">{formatMoney(askingPrice, currency)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Order</span>
                          <span className="font-bold text-primary">{formatMoney(total, currency)}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 h-9 rounded-lg text-xs font-semibold"
                          onClick={() => setReviewModalListing(l)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Inspect
                        </Button>

                        {isPending && (
                          <>
                            <Button 
                              size="sm" 
                              className="flex-1 h-9 rounded-lg text-xs font-bold"
                              disabled={approveMutation.isPending}
                              onClick={() => approveMutation.mutate(l.id)}
                            >
                              {approveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-9 px-3 rounded-lg text-xs border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => { setRejectDialogListing(l); setRejectReason(""); }}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}

                        {isApproved && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 h-9 rounded-lg text-xs text-red-600 border-red-200 hover:bg-red-50"
                            disabled={cancelMutation.isPending}
                            onClick={() => cancelMutation.mutate(l.id)}
                          >
                            <Ban className="h-3.5 w-3.5 mr-1" /> Delist
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border/50">
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Property</th>
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Seller</th>
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Units</th>
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Asking Price</th>
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Valuation</th>
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Date Submitted</th>
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-sans">
                    {filteredListings.map((l: any) => {
                      const currency = l.investment_properties?.currency ?? "USD";
                      const unitsToSell = l.units_to_sell ?? 0;
                      const unitsSold = l.units_sold ?? 0;
                      const unitsAvail = Math.max(0, unitsToSell - unitsSold);
                      const askingPrice = Number(l.price_per_unit || 0);
                      const total = unitsAvail * askingPrice;
                      const isPending = l.status === "pending";
                      const isApproved = l.status === "approved";

                      return (
                        <tr key={l.id} className="hover:bg-muted/15 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/50">
                                <LazyImage 
                                  src={l.investment_properties?.cover_image_url || "/placeholder.svg"} 
                                  className="h-full w-full object-cover" 
                                  alt="" 
                                  aspectClass="" 
                                  wrapperClassName="h-full w-full" 
                                />
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-foreground line-clamp-1">{l.investment_properties?.title ?? "Unknown"}</span>
                                <span className="text-[11px] text-muted-foreground">{l.investment_properties?.location ?? "—"}</span>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-medium text-foreground text-xs">{l.profiles?.full_name ?? "—"}</p>
                            <p className="text-[10px] text-muted-foreground">{l.profiles?.email ?? ""}</p>
                          </td>

                          <td className="px-5 py-4 font-medium">
                            {unitsAvail}
                            {unitsSold > 0 && (
                              <span className="text-[11px] text-muted-foreground ml-1">({unitsSold} sold)</span>
                            )}
                          </td>

                          <td className="px-5 py-4 font-mono font-medium">
                            {formatMoney(askingPrice, currency)}
                          </td>

                          <td className="px-5 py-4 font-mono font-bold text-foreground">
                            {formatMoney(total, currency)}
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge status={l.status} />
                          </td>

                          <td className="px-5 py-4 text-muted-foreground text-xs">
                            {format(new Date(l.created_at), "MMM dd, yyyy")}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground"
                                onClick={() => setReviewModalListing(l)}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" /> Inspect
                              </Button>

                              {isPending && (
                                <>
                                  <Button 
                                    size="sm" 
                                    className="h-8 px-3 rounded-lg text-xs font-bold shadow-sm"
                                    disabled={approveMutation.isPending}
                                    onClick={() => approveMutation.mutate(l.id)}
                                  >
                                    {approveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                                    Approve
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 px-2.5 rounded-lg text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                    onClick={() => { setRejectDialogListing(l); setRejectReason(""); }}
                                  >
                                    <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                                  </Button>
                                </>
                              )}

                              {isApproved && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 px-2.5 rounded-lg text-xs border-red-200 text-red-600 hover:bg-red-50"
                                  disabled={cancelMutation.isPending}
                                  onClick={() => cancelMutation.mutate(l.id)}
                                >
                                  <Ban className="h-3.5 w-3.5 mr-1" /> Delist
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {view === "transactions" && (
        <div className="rounded-2xl border border-border/40 bg-card shadow-soft overflow-hidden">
          {loadingTransactions ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-16 text-center">
              <ArrowLeftRight className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-serif text-lg font-semibold text-foreground">No transactions recorded</p>
              <p className="text-sm text-muted-foreground mt-1">Completed secondary share purchases will appear here in real time.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/50">
                    <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Property</th>
                    <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Units Traded</th>
                    <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Price/Unit</th>
                    <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Settlement</th>
                    <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Method</th>
                    <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-sans">
                  {filteredTransactions.map((t: any) => {
                    const currency = t.secondary_market_listings?.investment_properties?.currency ?? "USD";
                    const total = Number(t.units_traded) * Number(t.price_per_unit);
                    const title = t.secondary_market_listings?.investment_properties?.title ?? "Unknown Property";
                    return (
                      <tr key={t.id} className="hover:bg-muted/15 transition-colors">
                        <td className="px-5 py-4 font-semibold text-foreground">{title}</td>
                        <td className="px-5 py-4 font-medium">{t.units_traded}</td>
                        <td className="px-5 py-4 font-mono">{formatMoney(Number(t.price_per_unit), currency)}</td>
                        <td className="px-5 py-4 font-mono font-bold text-primary">{formatMoney(total, currency)}</td>
                        <td className="px-5 py-4">
                          <Badge variant="outline" className="text-[10px] font-bold capitalize rounded-md px-2 py-0.5">
                            {t.payment_method?.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground text-xs">
                          {format(new Date(t.created_at), "MMM dd, yyyy · HH:mm")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal 1: Comprehensive Order Inspection Drawer ── */}
      <Dialog open={!!reviewModalListing} onOpenChange={(open) => !open && setReviewModalListing(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden border border-border bg-background shadow-lux">
          {reviewModalListing && (() => {
            const l = reviewModalListing;
            const currency = l.investment_properties?.currency ?? "USD";
            const originalPrice = Number(l.investment_properties?.unit_price || 0);
            const askingPrice = Number(l.price_per_unit || 0);
            const diff = askingPrice - originalPrice;
            const diffPct = originalPrice > 0 ? (diff / originalPrice) * 100 : 0;
            const totalValuation = Number(l.units_to_sell || 0) * askingPrice;
            const isPending = l.status === "pending";

            return (
              <>
                <DialogHeader className="p-6 border-b border-border/40 bg-muted/20">
                  <div className="flex items-center justify-between gap-4">
                    <DialogTitle className="font-serif text-xl font-bold">
                      Sell Order Inspection
                    </DialogTitle>
                    <StatusBadge status={l.status} />
                  </div>
                  <DialogDescription className="text-xs text-muted-foreground mt-1">
                    Order ID: <span className="font-mono">{l.id}</span>
                  </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  {/* Property Info */}
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-muted/20">
                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/60">
                      <LazyImage
                        src={l.investment_properties?.cover_image_url || "/placeholder.svg"}
                        className="h-full w-full object-cover"
                        alt=""
                        aspectClass=""
                        wrapperClassName="h-full w-full"
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-foreground leading-tight">{l.investment_properties?.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {l.investment_properties?.location}
                      </p>
                    </div>
                  </div>

                  {/* Seller Details */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Seller Information</p>
                    <div className="p-4 rounded-xl border border-border/50 bg-card space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Full Name:</span>
                        <span className="font-semibold text-foreground">{l.profiles?.full_name ?? "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-mono text-foreground">{l.profiles?.email ?? "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Seller ID:</span>
                        <span className="font-mono text-muted-foreground">{l.seller_id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial & Share Breakdown */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Order Breakdown</p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl border border-border/50 bg-card">
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Units to Sell</span>
                        <span className="font-serif text-xl font-bold text-foreground mt-1 block">{l.units_to_sell} Units</span>
                        <span className="text-[10px] text-muted-foreground">{l.units_sold || 0} already sold</span>
                      </div>

                      <div className="p-3.5 rounded-xl border border-border/50 bg-card">
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Asking Price/Unit</span>
                        <span className="font-serif text-xl font-bold text-primary mt-1 block">{formatMoney(askingPrice, currency)}</span>
                        {diffPct !== 0 && (
                          <span className={`text-[10px] font-semibold ${diffPct > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                            {diffPct > 0 ? `+${diffPct.toFixed(1)}%` : `${diffPct.toFixed(1)}%`} vs original
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between mt-3">
                      <div>
                        <p className="text-xs font-bold text-foreground">Total Listed Value</p>
                        <p className="text-[11px] text-muted-foreground">Gross order proceeds</p>
                      </div>
                      <p className="font-serif text-2xl font-bold text-primary">{formatMoney(totalValuation, currency)}</p>
                    </div>
                  </div>

                  {/* Rejection reason if any */}
                  {l.rejection_reason && (
                    <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 text-xs space-y-1">
                      <p className="font-bold text-red-700 flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4" /> Rejection Note
                      </p>
                      <p className="text-red-600">{l.rejection_reason}</p>
                    </div>
                  )}
                </div>

                <DialogFooter className="p-6 border-t border-border/40 bg-muted/10 gap-2 sm:justify-between">
                  <Button variant="outline" onClick={() => setReviewModalListing(null)}>
                    Close
                  </Button>
                  {isPending && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setRejectDialogListing(l);
                          setRejectReason("");
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1.5" /> Reject Order
                      </Button>
                      <Button
                        className="font-bold shadow-sm"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(l.id)}
                      >
                        {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                        Approve &amp; Publish
                      </Button>
                    </div>
                  )}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Modal 2: Rejection Confirmation with Preset Reasons ── */}
      <Dialog open={!!rejectDialogListing} onOpenChange={(open) => !open && setRejectDialogListing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg font-bold flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" /> Reject Sell Order
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Please specify the reason for declining this sell order. The seller will be notified directly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Select Preset Reason
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_REJECTION_REASONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectReason(preset)}
                    className={cn(
                      "text-[11px] px-2.5 py-1 rounded-lg border text-left transition-colors",
                      rejectReason === preset
                        ? "bg-primary text-primary-foreground border-primary font-medium"
                        : "bg-muted/40 border-border/60 hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Custom Feedback / Notes</Label>
              <Textarea
                placeholder="Enter specific feedback or reason for the seller..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-h-[90px] rounded-xl text-xs sm:text-sm font-sans"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setRejectDialogListing(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
              disabled={rejectMutation.isPending}
              onClick={() => {
                if (!rejectDialogListing) return;
                rejectMutation.mutate({
                  listingId: rejectDialogListing.id,
                  reason: rejectReason,
                });
              }}
            >
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-md px-2 py-0.5 text-[10px] font-bold capitalize border",
        status === "pending"   && "bg-amber-500/10 text-amber-700 border-amber-500/30",
        status === "approved"  && "bg-primary/10 text-primary border-primary/30",
        status === "sold"      && "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
        status === "cancelled" && "bg-secondary/50 text-muted-foreground border-border/50",
        status === "rejected"  && "bg-red-500/10 text-red-700 border-red-500/30",
      )}
    >
      {status}
    </Badge>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  accent, 
  bgAccent, 
  urgent 
}: {
  icon: any; 
  label: string; 
  value: string; 
  accent: string; 
  bgAccent: string; 
  urgent?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-2xl border bg-card p-5 shadow-soft transition-all",
      urgent ? "border-amber-500/40 bg-amber-500/5" : "border-border/50"
    )}>
      <div className="flex items-center gap-3 mb-2.5">
        <div className={`h-9 w-9 rounded-xl ${bgAccent} flex items-center justify-center shrink-0`}>
          <Icon className={`h-4 w-4 ${accent}`} />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="font-serif text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
