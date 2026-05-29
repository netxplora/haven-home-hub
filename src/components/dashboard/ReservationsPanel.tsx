import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, ExternalLink, Clock, CheckCircle2, XCircle, AlertCircle, CalendarDays, FileText, RefreshCcw, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/invest";
import { ManualPaymentModal } from "./ManualPaymentModal";
import { toast } from "@/hooks/use-toast";

export function ReservationsPanel({ userId }: { userId: string }) {
  const [selectedReservation, setSelectedReservation] = useState<any | null>(null);
  const [cancellingResId, setCancellingResId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["my-reservations", userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("reservations")
        .select(`
          *,
          properties:property_id(title, slug, cover_image_url),
          investment_properties:investment_property_id(title, slug, cover_image_url)
        `)
        .eq("user_id", userId)
        .in("status", ["pending", "pending_review", "approved", "awaiting_reservation_fee", "under_admin_review", "information_requested", "confirmed", "rejected", "expired", "cancelled"])
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("Error fetching reservations:", error);
        throw error;
      }
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  const handleCancelReservation = async (reservationId: string) => {
    setCancellingResId(reservationId);
    try {
      const { error } = await supabase.rpc("cancel_reservation", {
        p_reservation_id: reservationId
      });
      if (error) throw error;
      toast({
        title: "Reservation Cancelled",
        description: "Your reservation hold has been cancelled successfully."
      });
      refetch();
    } catch (err: any) {
      toast({
        title: "Cancellation Failed",
        description: err.message || "Failed to cancel reservation.",
        variant: "destructive"
      });
    } finally {
      setCancellingResId(null);
    }
  };

  const filteredItems = items.filter((r: any) => {
    const prop = Array.isArray(r.properties) ? r.properties[0] : r.properties;
    const invProp = Array.isArray(r.investment_properties) ? r.investment_properties[0] : r.investment_properties;
    const item = prop || invProp;
    const title = (item?.title || "").toLowerCase();
    const searchMatch = title.includes(searchTerm.toLowerCase());

    if (!searchMatch) return false;

    if (statusFilter !== "all") {
      if (statusFilter === "pending") {
        return r.status === "pending" || r.status === "pending_review";
      }
      if (statusFilter === "awaiting_reservation_fee") {
        return r.status === "awaiting_reservation_fee" || r.status === "under_admin_review" || r.status === "information_requested" || r.status === "processing";
      }
      if (statusFilter === "confirmed") {
        return r.status === "approved" || r.status === "confirmed" || r.status === "success" || r.status === "completed";
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

  function getStatusStyle(status: string) {
    switch (status) {
      case "confirmed":
      case "success": return "bg-primary text-primary-foreground border-none shadow-sm";
      case "rejected":
      case "expired":
      case "failed":
      case "cancelled": return "bg-destructive/10 text-destructive border-destructive/20";
      case "pending_review":
      case "information_requested":
      case "pending":
      case "processing": return "bg-secondary/10 text-secondary border-secondary/20";
      case "awaiting_reservation_fee": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      default: return "bg-accent text-accent-foreground";
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "confirmed":
      case "success": return <CheckCircle2 className="h-3 w-3" />;
      case "rejected":
      case "expired":
      case "failed":
      case "cancelled": return <XCircle className="h-3 w-3" />;
      case "pending_review":
      case "information_requested":
      case "pending":
      case "processing": return <Clock className="h-3 w-3" />;
      case "awaiting_reservation_fee": return <AlertCircle className="h-3 w-3" />;
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

  return (
    <div className="space-y-6 ">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between p-8 rounded-xl border border-border/40 bg-card shadow-soft">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight">My Reservations</h2>
          <p className="mt-1 text-sm text-muted-foreground">Properties and investments you have placed on hold.</p>
        </div>
        <div className="flex items-center gap-3">
           <Badge variant="secondary" className="rounded-lg px-4 py-1.5 font-bold mr-1">{items.length} Total</Badge>
           <Button variant="outline" size="icon" onClick={() => refetch()} className="rounded-xl border-border/40 hover:bg-accent h-9 w-9">
              <RefreshCcw className="h-4 w-4" />
           </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by property name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 rounded-xl border-border/40"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[220px] rounded-xl border-border/40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/40">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending Review</SelectItem>
            <SelectItem value="awaiting_reservation_fee">Payment Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
           {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-16 text-center bg-secondary/5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/50 mb-4">
            <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="font-serif text-xl font-medium text-foreground">No active reservations</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">Found a property you like? Place a reservation to hold it while we review your request.</p>
          <Button asChild className="mt-8 rounded-xl px-8" size="lg">
            <Link to="/properties">View Properties</Link>
          </Button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-12 text-center bg-secondary/5">
          <p className="font-serif text-lg font-medium text-foreground">No reservations match your filters</p>
          <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search terms or filter settings.</p>
          <Button onClick={() => { setSearchTerm(""); setStatusFilter("all"); }} variant="outline" className="mt-4 rounded-xl">
             Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-6">
           {filteredItems.map((r: any) => {
              const prop = Array.isArray(r.properties) ? r.properties[0] : r.properties;
              const invProp = Array.isArray(r.investment_properties) ? r.investment_properties[0] : r.investment_properties;
              const item = prop || invProp;
              const isInvestment = !!r.investment_property_id;
              const pathPrefix = isInvestment ? "invest" : "properties";
              
              return (
                <div key={r.id} className="rounded-xl border border-border/40 bg-card p-6 shadow-soft transition-all duration-300 hover:shadow-md group">
                   <div className="flex flex-col md:flex-row gap-6">
                      <div className="h-32 w-full md:w-48 rounded-xl overflow-hidden shrink-0 bg-muted">
                         <img src={item?.cover_image_url || "/placeholder.svg"} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" alt="" />
                      </div>
                      <div className="flex-1 space-y-4">
                         <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-[9px] uppercase tracking-tighter px-1.5 h-4 border-primary/20 text-primary font-bold">
                                     {isInvestment ? "Investment Unit" : "Full Ownership"}
                                  </Badge>
                               </div>
                               <h4 className="font-serif text-xl font-bold line-clamp-1">{item?.title}</h4>
                               <div className="flex items-center gap-3 mt-1.5">
                                  <Badge className={`capitalize rounded-md flex w-fit items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold ${getStatusStyle(r.status)}`}>
                                     {getStatusIcon(r.status)}
                                     {r.status === "awaiting_reservation_fee" ? "Payment Pending" : r.status}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground font-mono bg-accent px-2 py-0.5 rounded-md">ID: {r.id.split('-')[0]}</span>
                                </div>
                            </div>
                            <div className="text-right">
                               <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Fee Paid</p>
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

                         {r.status === "approved" && (
                           <div className="p-3.5 bg-green-500/5 border border-green-500/20 rounded-lg flex items-center gap-3">
                             <CheckCircle2 className="h-4.5 w-4.5 text-green-600 shrink-0" />
                             <div className="flex-1 min-w-0">
                               <p className="text-xs font-semibold text-green-800">Reservation Approved</p>
                               <p className="text-[10px] text-green-700/80 mt-0.5 font-normal">Your reservation has been approved. You can now complete full payment to secure this property.</p>
                             </div>
                           </div>
                         )}
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-4 gap-6 pt-4 border-t border-border/40">
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
                            <div className="sm:col-span-2 flex justify-end gap-2 items-center flex-wrap">
                               {item?.slug ? (
                                 <Button asChild variant="outline" size="sm" className="rounded-xl border-border/40 text-[11px] font-bold h-9">
                                    <Link to={`/${pathPrefix}/${item.slug}`}>
                                       Property Details <ExternalLink className="ml-1.5 h-3 w-3" />
                                    </Link>
                                 </Button>
                               ) : (
                                 <Button variant="outline" size="sm" disabled className="rounded-xl border-border/40 text-[11px] font-bold h-9">
                                    Listing Unavailable
                                 </Button>
                               )}
                                 {r.status === 'pending' && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[10px] py-1">
                                      Under Review
                                    </Badge>
                                  )}
                                 {r.status === 'information_requested' && (
                                   <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[10px] py-1">
                                     Information Requested
                                   </Badge>
                                 )}
                                {(r.status === 'approved' || r.status === 'confirmed' || r.status === 'success') && (
                                  item?.slug ? (
                                    <Button asChild size="sm" className="rounded-xl px-5 text-[11px] font-bold h-9 bg-primary hover:bg-primary/90">
                                       <Link to={isInvestment ? `/invest/${item.slug}` : `/properties/${item.slug}`}>
                                          Complete Purchase
                                       </Link>
                                    </Button>
                                  ) : (
                                    <Button size="sm" disabled className="rounded-xl px-5 text-[11px] font-bold h-9 bg-primary/50 text-white">
                                       Property Unavailable
                                    </Button>
                                  )
                                )}
                                {r.status === 'awaiting_reservation_fee' && (
                                  <Button 
                                    size="sm" 
                                    className="rounded-xl px-5 text-[11px] font-bold h-11 sm:h-9 bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                                    onClick={() => setSelectedReservation(r)}
                                  >
                                    Complete Payment Submission
                                  </Button>
                                )}
                                {(r.status === 'pending' || r.status === 'awaiting_reservation_fee') && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-bold h-9 gap-1.5"
                                    onClick={() => handleCancelReservation(r.id)}
                                    disabled={cancellingResId === r.id}
                                  >
                                    {cancellingResId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                                    Cancel Hold
                                  </Button>
                                )}
                                {r.status === 'rejected' && (
                                  <p className="text-[10px] text-red-500 font-medium max-w-[150px] italic">
                                    {r.rejection_reason || "Declined by admin"}
                                  </p>
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
            refetch();
          }}
        />
      )}
    </div>
  );
}
