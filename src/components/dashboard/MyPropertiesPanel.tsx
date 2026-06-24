import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  ClipboardList, ExternalLink, Clock, CheckCircle2, XCircle, AlertCircle, 
  CalendarDays, FileText, RefreshCcw, Loader2, Search, Home, ShieldCheck, 
  MapPin, Receipt, History, Building2, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/invest";
import { ReceiptDialog } from "./ReceiptDialog";
import { LegalDocumentsDialog } from "./LegalDocumentsDialog";
import { ManualPaymentModal } from "./ManualPaymentModal";
import { SavedPanel } from "./SavedPanel";
import { toast } from "sonner";
import { SellUnitsDialog } from "./SellUnitsDialog";

export function MyPropertiesPanel({ userId }: { userId: string }) {
  const [activeTab, setActiveTab] = useState("reservations");
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedPropertyForDocs, setSelectedPropertyForDocs] = useState<{ id: string; title: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReservation, setSelectedReservation] = useState<any | null>(null);
  const [cancellingResId, setCancellingResId] = useState<string | null>(null);
  const [investmentToSell, setInvestmentToSell] = useState<any>(null);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isFetchingInvestment, setIsFetchingInvestment] = useState<string | null>(null);

  // ── Query 1: Fetch all user reservations/purchases/rentals ──
  const { data: reservations = [], isLoading: isResLoading, refetch: refetchReservations } = useQuery({
    queryKey: ["my-reservations-consolidated", userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("reservations")
        .select(`
          *,
          properties:property_id(title, slug, cover_image_url, property_type, locations(name), bedrooms, bathrooms, size_sqm, price),
          investment_properties:investment_property_id(title, slug, cover_image_url, location, property_type, total_value, unit_price)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("Error fetching consolidated reservations:", error);
        throw error;
      }
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  // ── Query 2: Fetch user ownership records ──
  const { data: ownerships = [], isLoading: isOwnLoading, refetch: refetchOwnerships } = useQuery({
    queryKey: ["my-ownership-records", userId],
    queryFn: async () => {
      const { data: records, error } = await supabase
        .from("ownership_records")
        .select("*")
        .eq("user_id", userId)
        .order("purchase_date", { ascending: false });
        
      if (error) {
        console.error("Error fetching ownership records:", error);
        throw error;
      }
      
      if (!records || records.length === 0) return [];

      const propertyIds = records.map((r: any) => r.property_id).filter(Boolean);
      let propertiesMap: Record<string, any> = {};

      if (propertyIds.length > 0) {
        const { data: propertiesData, error: propsError } = await supabase
          .from("properties")
          .select("id, title, slug, cover_image_url, property_type, locations(name), bedrooms, bathrooms, size_sqm, price")
          .in("id", propertyIds);

        if (!propsError && propertiesData) {
          propertiesMap = propertiesData.reduce((acc: Record<string, any>, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});
        } else if (propsError) {
          console.error("Error fetching properties for ownership records:", propsError);
        }
      }

      return records.map((r: any) => ({
        ...r,
        properties: propertiesMap[r.property_id] || null
      }));
    },
  });

  const isLoading = isResLoading || isOwnLoading;

  const handleCancelReservation = async (reservationId: string) => {
    setCancellingResId(reservationId);
    try {
      const { error } = await supabase.rpc("cancel_reservation", {
        p_reservation_id: reservationId
      });
      if (error) throw error;
      toast.success("Reservation Hold Cancelled Successfully.");
      refetchReservations();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel reservation.");
    } finally {
      setCancellingResId(null);
    }
  };

  const handleSellUnits = async (r: any) => {
    setIsFetchingInvestment(r.id);
    try {
      const { data, error } = await supabase
        .from("user_investments")
        .select(`*, investment_properties(*)`)
        .eq("user_id", userId)
        .eq("property_id", r.investment_property_id)
        .in("status", ["active", "confirmed", "completed", "roi_active", "roi_paused", "preparing_for_roi"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setInvestmentToSell(data);
        setIsSellModalOpen(true);
      } else {
        toast.error("Could not find an active fractional investment record for this asset.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load investment details.");
    } finally {
      setIsFetchingInvestment(null);
    }
  };

  const handleViewReceipt = async (purchase: any) => {
    try {
      const { data: payment, error: paymentError } = await (supabase as any)
        .from("payments")
        .select("id")
        .eq("reservation_id", purchase.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (paymentError) throw paymentError;

      let query = (supabase as any)
        .from("receipts")
        .select("*")
        .eq("user_id", userId);

      if (payment?.id) {
        query = query.or(`payment_id.eq.${payment.id},metadata->>reservation_id.eq.${purchase.id}`);
      } else {
        query = query.eq("metadata->>reservation_id", purchase.id);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSelectedReceipt(data);
        setIsReceiptOpen(true);
      } else {
        toast.error("Receipt not found for this purchase.");
      }
    } catch (err) {
      console.error("Error loading receipt:", err);
      toast.error("Could not load receipt.");
    }
  };

  // Helper functions for status styling
  function getStatusStyle(status: string) {
    switch (status) {
      case "confirmed":
      case "success":
      case "completed":
      case "rented": return "bg-primary/10 text-primary border-primary/20";
      case "rejected":
      case "expired":
      case "failed":
      case "cancelled": return "bg-destructive/10 text-destructive border-destructive/20";
      case "pending_review":
      case "information_requested":
      case "pending":
      case "processing": return "bg-secondary/10 text-secondary border-secondary/20";
      case "awaiting_reservation_fee": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "installment_active": return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      default: return "bg-accent text-accent-foreground";
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "confirmed":
      case "success":
      case "completed":
      case "rented": return <CheckCircle2 className="h-3 w-3" />;
      case "rejected":
      case "expired":
      case "failed":
      case "cancelled": return <XCircle className="h-3 w-3" />;
      case "pending_review":
      case "information_requested":
      case "pending":
      case "processing": return <Clock className="h-3 w-3" />;
      case "awaiting_reservation_fee": return <AlertCircle className="h-3 w-3" />;
      case "installment_active": return <Clock className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  }

  function getExpiryCountdown(expiresAt: string) {
    const expiry = new Date(expiresAt).getTime();
    const now = new Date().getTime();
    const diff = expiry - now;
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) {
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m remaining`;
    }
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h remaining`;
  }

  // Filter logic for Reservations Tab
  const activeReservations = reservations.filter((r: any) => {
    return !["completed", "confirmed", "rented"].includes(r.status);
  });

  // Filter logic for Purchased Tab
  const purchasedReservations = reservations.filter((r: any) => {
    const prop = Array.isArray(r.properties) ? r.properties[0] : r.properties;
    const invProp = Array.isArray(r.investment_properties) ? r.investment_properties[0] : r.investment_properties;
    const item = prop || invProp;
    const isRent = item?.property_type === "rent";
    return ["completed", "confirmed", "installment_active"].includes(r.status) && !isRent;
  });

  // Filter logic for Rented Tab
  const rentedReservations = reservations.filter((r: any) => {
    const prop = Array.isArray(r.properties) ? r.properties[0] : r.properties;
    const item = prop;
    const isRent = item?.property_type === "rent";
    return (["completed", "confirmed", "rented"].includes(r.status) && isRent) || r.status === "rented";
  });

  const getFilteredItems = (items: any[]) => {
    return items.filter((r: any) => {
      const prop = Array.isArray(r.properties) ? r.properties[0] : r.properties;
      const invProp = Array.isArray(r.investment_properties) ? r.investment_properties[0] : r.investment_properties;
      const item = prop || invProp;
      const title = (item?.title || "").toLowerCase();
      const searchMatch = title.includes(searchTerm.toLowerCase());
      if (!searchMatch) return false;

      if (statusFilter !== "all" && activeTab === "reservations") {
        if (statusFilter === "pending") {
          return r.status === "pending" || r.status === "pending_review";
        }
        if (statusFilter === "awaiting_reservation_fee") {
          return r.status === "awaiting_reservation_fee" || r.status === "under_admin_review" || r.status === "information_requested" || r.status === "processing";
        }
        if (statusFilter === "rejected") {
          return r.status === "rejected" || r.status === "failed";
        }
        if (statusFilter === "expired") {
          return r.status === "expired";
        }
        if (statusFilter === "cancelled") {
          return r.status === "cancelled";
        }
      }
      return true;
    });
  };

  const getFilteredOwnerships = (items: any[]) => {
    return items.filter((o: any) => {
      const prop = Array.isArray(o.properties) ? o.properties[0] : o.properties;
      const title = (prop?.title || "").toLowerCase();
      return title.includes(searchTerm.toLowerCase());
    });
  };

  const handleRefetch = () => {
    refetchReservations();
    refetchOwnerships();
  };

  return (
    <div className="space-y-6">
      <ReceiptDialog open={isReceiptOpen} onClose={() => setIsReceiptOpen(false)} receipt={selectedReceipt} />
      <LegalDocumentsDialog 
        open={!!selectedPropertyForDocs} 
        onClose={() => setSelectedPropertyForDocs(null)} 
        propertyId={selectedPropertyForDocs?.id || ""} 
        propertyTitle={selectedPropertyForDocs?.title || ""} 
        userId={userId} 
      />
      <SellUnitsDialog
        open={isSellModalOpen}
        onOpenChange={setIsSellModalOpen}
        investment={investmentToSell}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between p-5 sm:p-8 rounded-xl border border-border/40 bg-card shadow-soft">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">My Properties Management</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage your holds, active reservations, rents, and fully owned properties in one unified center.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={handleRefetch} className="rounded-xl border-border/40 hover:bg-accent h-9 w-9">
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setSearchTerm(""); setStatusFilter("all"); }} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 border border-border/40 rounded-xl h-auto flex flex-wrap gap-1 w-fit">
          <TabsTrigger value="saved" className="rounded-lg px-4 py-2 text-xs font-bold gap-2">
            Saved
          </TabsTrigger>
          <TabsTrigger value="reservations" className="rounded-lg px-4 py-2 text-xs font-bold gap-2">
            Reservations ({activeReservations.length})
          </TabsTrigger>
          <TabsTrigger value="purchased" className="rounded-lg px-4 py-2 text-xs font-bold gap-2">
            Purchased ({purchasedReservations.length})
          </TabsTrigger>
          <TabsTrigger value="rented" className="rounded-lg px-4 py-2 text-xs font-bold gap-2">
            Rented ({rentedReservations.length})
          </TabsTrigger>
          <TabsTrigger value="owned" className="rounded-lg px-4 py-2 text-xs font-bold gap-2">
            Owned ({ownerships.length})
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by property name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rounded-xl border-border/40 bg-card"
            />
          </div>
          {activeTab === "reservations" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[220px] rounded-xl border-border/40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/40">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="awaiting_reservation_fee">Payment Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {isLoading && activeTab !== "saved" ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : (
          <>
            {/* ── Saved Content ── */}
            <TabsContent value="saved" className="space-y-6">
              <SavedPanel userId={userId} />
            </TabsContent>

            {/* ── Reservations Content ── */}
            <TabsContent value="reservations" className="space-y-6">
              {getFilteredItems(activeReservations).length === 0 ? (
                <EmptyState message="No active reservations found" description="Explore our properties catalog and place a reservation hold to secure a listing." />
              ) : (
                <div className="grid gap-6">
                  {getFilteredItems(activeReservations).map((r: any) => {
                    const prop = Array.isArray(r.properties) ? r.properties[0] : r.properties;
                    const invProp = Array.isArray(r.investment_properties) ? r.investment_properties[0] : r.investment_properties;
                    const item = prop || invProp;
                    const isInvestment = !!r.investment_property_id;
                    const pathPrefix = isInvestment ? "invest" : "properties";

                    return (
                      <div key={r.id} className="rounded-xl border border-border/40 bg-card p-6 shadow-soft transition-all duration-300 hover:shadow-md group">
                        <div className="flex flex-col md:flex-row gap-6">
                          <div className="h-32 w-full md:w-48 rounded-xl overflow-hidden shrink-0 bg-muted">
                            <img src={item?.cover_image_url || "/placeholder.svg"} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" alt="" />
                          </div>
                          <div className="flex-1 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                              <div>
                                <Badge variant="outline" className="text-[9px] uppercase tracking-tighter px-1.5 h-4 border-primary/20 text-primary font-bold mb-1">
                                  {isInvestment ? "Fractional Investment" : item?.property_type || "Property"}
                                </Badge>
                                <h4 className="font-serif text-xl font-bold line-clamp-1">{item?.title}</h4>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <Badge className={`capitalize rounded-md flex w-fit items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold ${getStatusStyle(r.status)}`}>
                                    {getStatusIcon(r.status)}
                                    {r.status === "awaiting_reservation_fee" ? "Payment Pending" : r.status.replace("_", " ")}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground font-mono bg-accent px-2 py-0.5 rounded-md">ID: {r.id.split('-')[0].toUpperCase()}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Hold Fee</p>
                                <p className="font-serif text-xl font-bold">{formatMoney(r.fee_paid)}</p>
                              </div>
                            </div>

                            {r.status === "awaiting_reservation_fee" && (
                              <div className="p-3.5 bg-amber-500/5 border border-amber-500/10 rounded-lg flex items-center gap-3">
                                <AlertCircle className="h-4.5 w-4.5 text-amber-600 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-amber-800">Action Required: Reservation Fee Submission</p>
                                  <p className="text-[10px] text-amber-700/80 mt-0.5 font-normal">Please submit payment proof before expiry to secure your hold.</p>
                                </div>
                                {r.expires_at && (
                                  <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20 shrink-0 font-mono text-[9px]">
                                    {getExpiryCountdown(r.expires_at)}
                                  </Badge>
                                )}
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-border/40">
                              <div className="space-y-1">
                                <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                  <CalendarDays className="h-3 w-3" /> Date Reserved
                                </p>
                                <p className="text-xs font-semibold">{new Date(r.created_at).toLocaleDateString()}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                  <Clock className="h-3 w-3" /> Reserved Until
                                </p>
                                <p className="text-xs font-semibold text-amber-600">
                                  {r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "No Expiry"}
                                </p>
                              </div>
                              <div className="sm:col-span-2 flex flex-col sm:flex-row justify-end gap-2 items-stretch sm:items-center w-full sm:w-auto">
                                <Button asChild variant="outline" size="sm" className="rounded-xl border-border/40 text-[11px] font-bold h-9 w-full sm:w-auto">
                                  <Link to={`/${pathPrefix}/${item?.slug}`} className="justify-center">
                                    Details <ExternalLink className="ml-1.5 h-3 w-3" />
                                  </Link>
                                </Button>
                                {r.status === 'awaiting_reservation_fee' && (
                                  <Button 
                                    size="sm" 
                                    className="rounded-xl px-5 text-[11px] font-bold h-9 bg-amber-600 hover:bg-amber-700 text-white shrink-0 w-full sm:w-auto"
                                    onClick={() => setSelectedReservation(r)}
                                  >
                                    Submit Payment
                                  </Button>
                                )}
                                {(r.status === 'pending' || r.status === 'awaiting_reservation_fee') && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-bold h-9 gap-1.5 w-full sm:w-auto"
                                    onClick={() => handleCancelReservation(r.id)}
                                    disabled={cancellingResId === r.id}
                                  >
                                    {cancellingResId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                                    Cancel Hold
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ── Purchased Content ── */}
            <TabsContent value="purchased" className="space-y-6">
              {getFilteredItems(purchasedReservations).length === 0 ? (
                <EmptyState message="No properties purchased yet" description="Your fully purchased houses, lands, and investments will appear here." />
              ) : (
                <div className="grid gap-6">
                  {getFilteredItems(purchasedReservations).map((r: any) => {
                    const prop = Array.isArray(r.properties) ? r.properties[0] : r.properties;
                    const invProp = Array.isArray(r.investment_properties) ? r.investment_properties[0] : r.investment_properties;
                    const item = prop || invProp;
                    const isInvestment = !!r.investment_property_id;
                    const pathPrefix = isInvestment ? "invest" : "properties";

                    return (
                      <div key={r.id} className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-soft transition-all duration-300 hover:shadow-md group flex flex-col md:flex-row">
                        <div className="relative w-full md:w-64 h-48 md:h-auto shrink-0 bg-accent overflow-hidden">
                          <img src={item?.cover_image_url || "/placeholder.svg"} alt={item?.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          <div className="absolute top-4 left-4">
                            <Badge variant="outline" className={`rounded-md shadow-sm font-bold backdrop-blur-md bg-white/90 border-white/20 capitalize ${getStatusStyle(r.status)}`}>
                              <span className="flex items-center gap-1.5">
                                {getStatusIcon(r.status)}
                                {r.status.replace("_", " ")}
                              </span>
                            </Badge>
                          </div>
                        </div>

                        <div className="flex-1 p-6 flex flex-col justify-between">
                          <div>
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-2">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-accent px-2 py-0.5 rounded-md">
                                    {isInvestment ? "Fractional Investment" : item?.property_type || "Property"}
                                  </span>
                                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <ShieldCheck className="h-3 w-3" /> VERIFIED
                                  </span>
                                </div>
                                <h3 className="font-serif text-xl font-bold text-foreground hover:text-primary transition-colors">
                                  <Link to={`/${pathPrefix}/${item?.slug}`}>{item?.title || "Property Loading..."}</Link>
                                </h3>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1.5">
                                  <MapPin className="h-4 w-4" />
                                  {item?.locations?.name || item?.location || "Location Not Specified"}
                                </div>
                              </div>
                              <div className="sm:text-right">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Price</p>
                                <p className="text-lg font-bold text-foreground">{formatMoney(r.total_price || r.amount || r.metadata?.amount_invested || item?.price || item?.total_value || 0, "USD")}</p>
                              </div>
                            </div>

                            {!isInvestment && (
                              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                                {item?.bedrooms && <span className="flex items-center gap-1 font-medium bg-accent/50 px-2.5 py-1 rounded-md"><span className="text-foreground font-bold">{item.bedrooms}</span> Beds</span>}
                                {item?.bathrooms && <span className="flex items-center gap-1 font-medium bg-accent/50 px-2.5 py-1 rounded-md"><span className="text-foreground font-bold">{item.bathrooms}</span> Baths</span>}
                                {item?.size_sqm && <span className="flex items-center gap-1 font-medium bg-accent/50 px-2.5 py-1 rounded-md"><span className="text-foreground font-bold">{item.size_sqm}</span> SQM</span>}
                              </div>
                            )}

                            {r.status === 'installment_active' && r.metadata?.installment_plan && (
                              <div className="mt-4 p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Installment Progress</span>
                                  <span className="text-xs font-bold text-blue-800 dark:text-blue-300">{Math.round(((r.amount || 0) / (r.total_price || 1)) * 100)}% Paid</span>
                                </div>
                                <div className="w-full bg-blue-100 dark:bg-blue-950 rounded-full h-1.5 mb-1">
                                  <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.round(((r.amount || 0) / (r.total_price || 1)) * 100)}%` }}></div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-5 border-t border-border/40">
                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground w-full sm:w-auto">
                              <span className="flex flex-col">
                                <span className="uppercase tracking-widest font-bold text-[9px] mb-0.5">Purchased On</span>
                                <span className="font-medium text-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                              </span>
                              <div className="h-8 w-px bg-border/50 hidden sm:block"></div>
                              <span className="flex flex-col">
                                <span className="uppercase tracking-widest font-bold text-[9px] mb-0.5">Reference ID</span>
                                <span className="font-mono text-foreground">{r.id.split('-')[0].toUpperCase()}</span>
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0 justify-end">
                              {isInvestment && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="rounded-lg flex-1 sm:flex-none font-bold text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200" 
                                  onClick={() => handleSellUnits(r)}
                                  disabled={isFetchingInvestment === r.id}
                                >
                                  {isFetchingInvestment === r.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Layers className="mr-2 h-4 w-4" />}
                                  List for Sale
                                </Button>
                              )}
                              {item?.property_type === 'land' && (
                                <Button variant="outline" size="sm" className="rounded-lg flex-1 sm:flex-none font-bold text-blue-700 hover:text-blue-800 hover:bg-blue-50 border-blue-200" onClick={() => setSelectedPropertyForDocs({ id: item.id || r.related_id, title: item.title })}>
                                  <FileText className="mr-2 h-4 w-4" /> Legal Docs
                                </Button>
                              )}
                              <Button variant="outline" size="sm" className="rounded-lg flex-1 sm:flex-none font-bold text-primary hover:text-primary hover:bg-primary/10 border-primary/25" onClick={() => handleViewReceipt(r)}>
                                <Receipt className="mr-2 h-4 w-4" /> Receipt
                              </Button>
                              <Button variant="outline" size="sm" className="rounded-lg flex-1 sm:flex-none font-bold shadow-sm" asChild>
                                <Link to={`/${pathPrefix}/${item?.slug}`}>
                                  <ExternalLink className="mr-2 h-4 w-4" /> Details
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ── Rented Content ── */}
            <TabsContent value="rented" className="space-y-6">
              {getFilteredItems(rentedReservations).length === 0 ? (
                <EmptyState message="No rental agreements found" description="When you successfully rent or secure a lease hold, it will appear here." />
              ) : (
                <div className="grid gap-6">
                  {getFilteredItems(rentedReservations).map((r: any) => {
                    const prop = Array.isArray(r.properties) ? r.properties[0] : r.properties;
                    const item = prop;

                    return (
                      <div key={r.id} className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-soft transition-all duration-300 hover:shadow-md group flex flex-col md:flex-row">
                        <div className="relative w-full md:w-64 h-48 md:h-auto shrink-0 bg-accent overflow-hidden">
                          <img src={item?.cover_image_url || "/placeholder.svg"} alt={item?.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          <div className="absolute top-4 left-4">
                            <Badge variant="outline" className="rounded-md shadow-sm font-bold backdrop-blur-md bg-white/90 border-white/20 capitalize bg-primary/10 text-primary border-primary/20">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-3 w-3" />
                                Rented / Leased
                              </span>
                            </Badge>
                          </div>
                        </div>

                        <div className="flex-1 p-6 flex flex-col justify-between">
                          <div>
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-2">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-accent px-2 py-0.5 rounded-md">
                                    Rental Property
                                  </span>
                                </div>
                                <h3 className="font-serif text-xl font-bold text-foreground hover:text-primary transition-colors">
                                  <Link to={`/properties/${item?.slug}`}>{item?.title || "Property Loading..."}</Link>
                                </h3>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1.5">
                                  <MapPin className="h-4 w-4" />
                                  {item?.locations?.name || "Location Not Specified"}
                                </div>
                              </div>
                              <div className="sm:text-right">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Monthly Rent</p>
                                <p className="text-lg font-bold text-foreground">{formatMoney(r.total_price || item?.price || 0, "USD")}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                              {item?.bedrooms && <span className="flex items-center gap-1 font-medium bg-accent/50 px-2.5 py-1 rounded-md"><span className="text-foreground font-bold">{item.bedrooms}</span> Beds</span>}
                              {item?.bathrooms && <span className="flex items-center gap-1 font-medium bg-accent/50 px-2.5 py-1 rounded-md"><span className="text-foreground font-bold">{item.bathrooms}</span> Baths</span>}
                              {item?.size_sqm && <span className="flex items-center gap-1 font-medium bg-accent/50 px-2.5 py-1 rounded-md"><span className="text-foreground font-bold">{item.size_sqm}</span> SQM</span>}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-5 border-t border-border/40">
                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground w-full sm:w-auto">
                              <span className="flex flex-col">
                                <span className="uppercase tracking-widest font-bold text-[9px] mb-0.5">Lease Started On</span>
                                <span className="font-medium text-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                              </span>
                              <div className="h-8 w-px bg-border/50 hidden sm:block"></div>
                              <span className="flex flex-col">
                                <span className="uppercase tracking-widest font-bold text-[9px] mb-0.5">Lease Reference</span>
                                <span className="font-mono text-foreground">{r.id.split('-')[0].toUpperCase()}</span>
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0 justify-end">
                              <Button variant="outline" size="sm" className="rounded-lg flex-1 sm:flex-none font-bold text-primary hover:text-primary hover:bg-primary/10 border-primary/25" onClick={() => handleViewReceipt(r)}>
                                <Receipt className="mr-2 h-4 w-4" /> Receipt
                              </Button>
                              <Button variant="outline" size="sm" className="rounded-lg flex-1 sm:flex-none font-bold shadow-sm" asChild>
                                <Link to={`/properties/${item?.slug}`}>
                                  <ExternalLink className="mr-2 h-4 w-4" /> View Listing
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ── Owned Content ── */}
            <TabsContent value="owned" className="space-y-6">
              {getFilteredOwnerships(ownerships).length === 0 ? (
                <EmptyState message="No certified ownership records" description="Your fully completed, verified deeds and title certificates will be registered here after settlement." />
              ) : (
                <div className="grid gap-6">
                  {getFilteredOwnerships(ownerships).map((o: any) => {
                    const prop = o.properties;
                    if (!prop) return null;
                    return (
                      <div key={o.id} className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-soft transition-all duration-300 hover:shadow-md group flex flex-col md:flex-row">
                        <div className="relative w-full md:w-64 h-48 md:h-auto shrink-0 bg-accent overflow-hidden">
                          <img src={prop.cover_image_url || "/placeholder.svg"} alt={prop.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          <div className="absolute top-4 left-4">
                            <Badge variant="outline" className="rounded-md shadow-sm font-bold backdrop-blur-md bg-white/90 border-white/20 text-emerald-700 bg-emerald-500/10 border-emerald-500/20 uppercase text-[9px] tracking-wider">
                              <span className="flex items-center gap-1.5">
                                <ShieldCheck className="h-3 w-3" />
                                Certified Owner
                              </span>
                            </Badge>
                          </div>
                        </div>

                        <div className="flex-1 p-6 flex flex-col justify-between">
                          <div>
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-2">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-accent px-2 py-0.5 rounded-md">
                                    {prop.property_type || "Property"}
                                  </span>
                                </div>
                                <h3 className="font-serif text-xl font-bold text-foreground hover:text-primary transition-colors">
                                  <Link to={`/properties/${prop.slug}`}>{prop.title}</Link>
                                </h3>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1.5">
                                  <MapPin className="h-4 w-4" />
                                  {prop.locations?.name || "Location Not Specified"}
                                </div>
                              </div>
                              <div className="sm:text-right">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Acquired Price</p>
                                <p className="text-lg font-bold text-foreground">{formatMoney(prop.price || 0, "USD")}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                              {prop.bedrooms && <span className="flex items-center gap-1 font-medium bg-accent/50 px-2.5 py-1 rounded-md"><span className="text-foreground font-bold">{prop.bedrooms}</span> Beds</span>}
                              {prop.bathrooms && <span className="flex items-center gap-1 font-medium bg-accent/50 px-2.5 py-1 rounded-md"><span className="text-foreground font-bold">{prop.bathrooms}</span> Baths</span>}
                              {prop.size_sqm && <span className="flex items-center gap-1 font-medium bg-accent/50 px-2.5 py-1 rounded-md"><span className="text-foreground font-bold">{prop.size_sqm}</span> SQM</span>}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-5 border-t border-border/40">
                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground w-full sm:w-auto">
                              <span className="flex flex-col">
                                <span className="uppercase tracking-widest font-bold text-[9px] mb-0.5">Settlement Date</span>
                                <span className="font-medium text-foreground">{new Date(o.purchase_date).toLocaleDateString()}</span>
                              </span>
                              <div className="h-8 w-px bg-border/50 hidden sm:block"></div>
                              <span className="flex flex-col">
                                <span className="uppercase tracking-widest font-bold text-[9px] mb-0.5">Deed Number</span>
                                <span className="font-mono text-foreground">{o.id.split('-')[0].toUpperCase()}</span>
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0 justify-end">
                              <Button variant="outline" size="sm" className="rounded-lg flex-1 sm:flex-none font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200" onClick={() => setSelectedPropertyForDocs({ id: prop.id, title: prop.title })}>
                                <FileText className="mr-2 h-4 w-4" /> Title Deeds
                              </Button>
                              <Button variant="outline" size="sm" className="rounded-lg flex-1 sm:flex-none font-bold shadow-sm" asChild>
                                <Link to={`/properties/${prop.slug}`}>
                                  <ExternalLink className="mr-2 h-4 w-4" /> Details
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

      {selectedReservation && (
        <ManualPaymentModal
          open={!!selectedReservation}
          onClose={() => setSelectedReservation(null)}
          amount={500}
          currency="USD"
          paymentType="reservation"
          targetId={selectedReservation.property_id || selectedReservation.investment_property_id}
          bookingId={selectedReservation.id}
          isInvestmentProperty={!!selectedReservation.investment_property_id}
          holdHours={48}
          metadata={{
            reservation_type: selectedReservation.investment_property_id ? "investment_property" : "property",
            property_title: selectedReservation.properties?.title || selectedReservation.investment_properties?.title
          }}
          onSuccess={async () => {
            refetchReservations();
          }}
        />
      )}
    </div>
  );
}

function EmptyState({ message, description }: { message: string, description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 p-16 text-center bg-card shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/50 mb-4">
        <Home className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <p className="font-serif text-xl font-bold text-foreground">{message}</p>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>
      <Button asChild className="mt-8 rounded-xl px-8 shadow-sm font-bold" size="lg">
        <Link to="/properties">Explore Catalog</Link>
      </Button>
    </div>
  );
}
