import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/invest";
import { format } from "date-fns";
import { Tag, ArrowLeftRight, TrendingUp, Users, Layers, Search, CheckCircle2, XCircle, Ban, Clock, ChevronRight } from "lucide-react";
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

type ViewTab = "pending" | "listings" | "transactions";

export function AdminMarketplace() {
  const qc = useQueryClient();
  const [view, setView] = useState<ViewTab>("pending");
  const [search, setSearch] = useState("");
  const [rejectDialog, setRejectDialog] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: listings = [], isLoading: loadingListings } = useQuery({
    queryKey: ["admin-marketplace-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("secondary_market_listings" as any)
        .select(`
          *,
          investment_properties!secondary_market_listings_property_id_fkey(title, currency, cover_image_url),
          profiles!secondary_market_listings_seller_id_fkey(full_name)
        `)
        .order("created_at", { ascending: false });
      if (error) { console.error("Admin listings fetch error:", error); return []; }
      return (data || []) as any[];
    },
  });

  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
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
      if (error) { console.error("Admin transactions fetch error:", error); return []; }
      return (data || []) as any[];
    },
  });

  const pendingListings  = listings.filter((l: any) => l.status === "pending");
  const approvedListings = listings.filter((l: any) => l.status === "approved");
  const soldListings     = listings.filter((l: any) => l.status === "sold");
  const totalVolume = transactions.reduce(
    (s: number, t: any) => s + Number(t.units_traded) * Number(t.price_per_unit), 0
  );
  const uniqueSellers = new Set(listings.map((l: any) => l.seller_id)).size;
  const uniqueBuyers  = new Set(transactions.map((t: any) => t.buyer_id)).size;

  // --- Approve listing ---
  const approveMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const { error } = await (supabase.rpc as any)("approve_secondary_market_listing", { p_listing_id: listingId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-marketplace-listings"] });
      toast({ title: "Listing Approved", description: "The listing is now live on the secondary market." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // --- Reject listing ---
  const rejectMutation = useMutation({
    mutationFn: async ({ listingId, reason }: { listingId: string; reason: string }) => {
      const { error } = await (supabase.rpc as any)("reject_secondary_market_listing", {
        p_listing_id: listingId,
        p_reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-marketplace-listings"] });
      setRejectDialog(null);
      setRejectReason("");
      toast({ title: "Listing Rejected", description: "The seller has been notified." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // --- Cancel listing (admin) ---
  const cancelMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const { error } = await (supabase.rpc as any)("admin_cancel_secondary_market_listing", {
        p_listing_id: listingId,
        p_reason: "Cancelled by admin.",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-marketplace-listings"] });
      toast({ title: "Listing Cancelled" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const allVisibleListings = view === "pending" ? pendingListings : listings;
  const filteredListings = allVisibleListings.filter((l: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const title = l.investment_properties?.title?.toLowerCase() ?? "";
    return title.includes(q) || l.status.includes(q);
  });

  const filteredTransactions = transactions.filter((t: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const title = t.secondary_market_listings?.investment_properties?.title?.toLowerCase() ?? "";
    return title.includes(q) || (t.payment_method || "").includes(q);
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold">Secondary Marketplace</h2>
        <p className="text-sm text-muted-foreground">
          Review pending listings, monitor trading activity, and manage all peer-to-peer unit trades.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Clock} label="Pending Review" value={pendingListings.length.toString()} accent="text-amber-600" bgAccent="bg-amber-500/10" urgent={pendingListings.length > 0} />
        <StatCard icon={Tag} label="Live Listings" value={approvedListings.length.toString()} accent="text-primary" bgAccent="bg-primary/10" />
        <StatCard icon={ArrowLeftRight} label="Completed Trades" value={soldListings.length.toString()} accent="text-primary" bgAccent="bg-primary/10" />
        <StatCard icon={TrendingUp} label="Total Volume" value={formatMoney(totalVolume)} accent="text-amber-600" bgAccent="bg-amber-500/10" />
      </div>

      {/* View Toggle + Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex bg-accent/50 p-1 rounded-xl gap-1 flex-wrap">
          {([
            { id: "pending", label: "Pending Review", icon: Clock, count: pendingListings.length },
            { id: "listings", label: "All Listings", icon: Layers, count: listings.length },
            { id: "transactions", label: "Transactions", icon: ArrowLeftRight, count: transactions.length },
          ] as const).map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5",
                view === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {count > 0 && (
                <span className={cn(
                  "ml-1 text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center",
                  id === "pending" && count > 0 ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
                )}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by property name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl border-border bg-accent/50"
          />
        </div>
      </div>

      {/* Pending Review Tab */}
      {(view === "pending" || view === "listings") && (
        <div className="rounded-xl border border-border/40 bg-card shadow-soft overflow-hidden">
          {loadingListings ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {view === "pending" ? "No listings pending review." : "No listings found."}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                {filteredListings.map((l: any) => {
                  const currency = l.investment_properties?.currency ?? "USD";
                  const unitsAvail = (l.units_to_sell ?? 0) - (l.units_sold ?? 0);
                  const total = unitsAvail * Number(l.price_per_unit);
                  return (
                    <div key={l.id} className="rounded-xl border border-border/50 bg-background p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted shrink-0">
                          <LazyImage src={l.investment_properties?.cover_image_url || "/placeholder.svg"} className="h-full w-full object-cover" alt="" aspectClass="" wrapperClassName="h-full w-full" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{l.investment_properties?.title ?? "Unknown"}</p>
                          <p className="text-[10px] text-muted-foreground">Seller: {l.profiles?.full_name ?? "—"}</p>
                          <p className="text-[10px] text-muted-foreground">{format(new Date(l.created_at), "MMM dd, yyyy")}</p>
                        </div>
                        <StatusBadge status={l.status} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs border-t border-border/50 pt-3">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-medium">Units</span>
                          <span className="font-semibold">{unitsAvail}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-medium">Per Unit</span>
                          <span className="font-semibold">{formatMoney(Number(l.price_per_unit), currency)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-medium">Total</span>
                          <span className="font-bold text-primary">{formatMoney(total, currency)}</span>
                        </div>
                      </div>
                      {l.status === "pending" && (
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" className="flex-1 h-9 bg-primary text-white rounded-lg text-xs font-semibold"
                            disabled={approveMutation.isPending}
                            onClick={() => approveMutation.mutate(l.id)}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 h-9 rounded-lg text-xs border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => { setRejectDialog(l); setRejectReason(""); }}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                      {l.status === "approved" && (
                        <Button size="sm" variant="outline" className="w-full h-9 rounded-lg text-xs border-border"
                          disabled={cancelMutation.isPending}
                          onClick={() => cancelMutation.mutate(l.id)}>
                          <Ban className="h-3.5 w-3.5 mr-1" /> Cancel Listing
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-accent/50 border-b border-border/40">
                      <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Property</th>
                      <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Seller</th>
                      <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Units</th>
                      <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Price/Unit</th>
                      <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</th>
                      <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Listed</th>
                      <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredListings.map((l: any) => {
                      const currency = l.investment_properties?.currency ?? "USD";
                      const unitsAvail = (l.units_to_sell ?? 0) - (l.units_sold ?? 0);
                      const total = unitsAvail * Number(l.price_per_unit);
                      return (
                        <tr key={l.id} className="hover:bg-secondary/10 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg overflow-hidden bg-muted shrink-0">
                                <LazyImage src={l.investment_properties?.cover_image_url || "/placeholder.svg"} className="h-full w-full object-cover" alt="" aspectClass="" wrapperClassName="h-full w-full" />
                              </div>
                              <span className="font-semibold text-foreground line-clamp-1">{l.investment_properties?.title ?? "Unknown"}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-muted-foreground text-xs">{l.profiles?.full_name ?? "—"}</td>
                          <td className="px-5 py-4 font-medium">
                            {unitsAvail}
                            {(l.units_sold ?? 0) > 0 && (
                              <span className="text-[10px] text-muted-foreground ml-1">({l.units_sold} sold)</span>
                            )}
                          </td>
                          <td className="px-5 py-4 font-medium">{formatMoney(Number(l.price_per_unit), currency)}</td>
                          <td className="px-5 py-4 font-bold">{formatMoney(total, currency)}</td>
                          <td className="px-5 py-4"><StatusBadge status={l.status} /></td>
                          <td className="px-5 py-4 text-muted-foreground text-xs">{format(new Date(l.created_at), "MMM dd, yyyy")}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              {l.status === "pending" && (
                                <>
                                  <Button size="sm" className="h-8 bg-primary text-white rounded-lg text-xs px-3 font-semibold"
                                    disabled={approveMutation.isPending}
                                    onClick={() => approveMutation.mutate(l.id)}>
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs px-3 border-red-200 text-red-600 hover:bg-red-50"
                                    onClick={() => { setRejectDialog(l); setRejectReason(""); }}>
                                    <XCircle className="h-3 w-3 mr-1" /> Reject
                                  </Button>
                                </>
                              )}
                              {l.status === "approved" && (
                                <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs px-3 border-border"
                                  disabled={cancelMutation.isPending}
                                  onClick={() => cancelMutation.mutate(l.id)}>
                                  <Ban className="h-3 w-3 mr-1" /> Cancel
                                </Button>
                              )}
                              {["sold", "cancelled", "rejected"].includes(l.status) && (
                                <span className="text-xs text-muted-foreground">—</span>
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

      {/* Transactions */}
      {view === "transactions" && (
        <div className="rounded-xl border border-border/40 bg-card shadow-soft overflow-hidden">
          {loadingTransactions ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <ArrowLeftRight className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No transactions recorded yet.</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                {filteredTransactions.map((t: any) => {
                  const currency = t.secondary_market_listings?.investment_properties?.currency ?? "USD";
                  const total = Number(t.units_traded) * Number(t.price_per_unit);
                  const title = t.secondary_market_listings?.investment_properties?.title ?? "Unknown";
                  return (
                    <div key={t.id} className="rounded-xl border border-border/50 bg-background p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm line-clamp-2">{title}</p>
                        <Badge variant="outline" className="text-[10px] font-bold capitalize rounded-md px-2 py-0.5 shrink-0">
                          {t.payment_method?.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs border-t border-border/50 pt-3">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-medium">Units</span>
                          <span className="font-semibold">{t.units_traded}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-medium">Per Unit</span>
                          <span className="font-semibold">{formatMoney(Number(t.price_per_unit), currency)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-medium">Total</span>
                          <span className="font-bold text-primary">{formatMoney(total, currency)}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(t.created_at), "MMM dd, yyyy · HH:mm")}</p>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-accent/50 border-b border-border/40">
                      <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Property</th>
                      <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Units</th>
                      <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Price/Unit</th>
                      <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Value</th>
                      <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Method</th>
                      <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredTransactions.map((t: any) => {
                      const currency = t.secondary_market_listings?.investment_properties?.currency ?? "USD";
                      const total = Number(t.units_traded) * Number(t.price_per_unit);
                      const title = t.secondary_market_listings?.investment_properties?.title ?? "Unknown";
                      return (
                        <tr key={t.id} className="hover:bg-secondary/10 transition-colors">
                          <td className="px-5 py-4 font-semibold text-foreground line-clamp-1">{title}</td>
                          <td className="px-5 py-4 font-medium">{t.units_traded}</td>
                          <td className="px-5 py-4 font-medium">{formatMoney(Number(t.price_per_unit), currency)}</td>
                          <td className="px-5 py-4 font-bold text-primary">{formatMoney(total, currency)}</td>
                          <td className="px-5 py-4">
                            <Badge variant="outline" className="text-[10px] font-bold capitalize rounded-md px-2 py-0.5">
                              {t.payment_method?.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-muted-foreground text-xs">{format(new Date(t.created_at), "MMM dd, yyyy · HH:mm")}</td>
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

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(open) => !open && setRejectDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Listing</DialogTitle>
            <DialogDescription>
              Provide an optional reason. The seller will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs font-semibold">Reason (optional)</Label>
            <Textarea
              placeholder="e.g. Insufficient documentation, pricing concerns..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[80px] rounded-xl text-sm"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={rejectMutation.isPending}
              onClick={() => rejectMutation.mutate({ listingId: rejectDialog.id, reason: rejectReason })}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Confirm Reject"}
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
        status === "pending"  && "bg-amber-500/10 text-amber-700 border-amber-500/20",
        status === "approved" && "bg-primary/10 text-primary border-primary/20",
        status === "sold"     && "bg-primary text-primary-foreground border-none shadow-sm",
        status === "cancelled"&& "bg-secondary/50 text-muted-foreground border-border/50",
        status === "rejected" && "bg-red-500/10 text-red-700 border-red-500/20",
      )}
    >
      {status}
    </Badge>
  );
}

function StatCard({ icon: Icon, label, value, accent, bgAccent, urgent }: {
  icon: any; label: string; value: string; accent: string; bgAccent: string; urgent?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-5 shadow-soft", urgent ? "border-amber-500/40" : "border-border/50")}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-9 w-9 rounded-lg ${bgAccent} flex items-center justify-center shrink-0`}>
          <Icon className={`h-4 w-4 ${accent}`} />
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="font-serif text-xl font-bold">{value}</p>
    </div>
  );
}
