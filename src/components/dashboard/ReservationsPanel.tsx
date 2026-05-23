import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, ExternalLink, Clock, CheckCircle2, XCircle, AlertCircle, CalendarDays, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/invest";
import { ManualPaymentModal } from "./ManualPaymentModal";

export function ReservationsPanel({ userId }: { userId: string }) {
  const [selectedReservation, setSelectedReservation] = useState<any | null>(null);

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
        .in("status", ["pending", "pending_review", "approved", "awaiting_reservation_fee", "under_admin_review", "information_requested", "confirmed", "success", "rejected", "expired", "failed", "cancelled"])
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("Error fetching reservations:", error);
        throw error;
      }
      return data ?? [];
    },
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
           <Badge variant="secondary" className="rounded-lg px-4 py-1.5 font-bold">{items.length} Total</Badge>
        </div>
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
      ) : (
        <div className="grid gap-6">
           {items.map((r: any) => {
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
                         
                         <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-4 border-t border-border/40">
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
                            <div className="sm:col-span-2 flex justify-end gap-2 items-center">
                               <Button asChild variant="outline" size="sm" className="rounded-xl border-border/40 text-[11px] font-bold h-9">
                                  <Link to={`/${pathPrefix}/${item?.slug}`}>
                                     Property Details <ExternalLink className="ml-1.5 h-3 w-3" />
                                  </Link>
                               </Button>
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
                                {(r.status === 'confirmed' || r.status === 'success') && (
                                  <Button asChild size="sm" className="rounded-xl px-5 text-[11px] font-bold h-9 bg-primary hover:bg-primary/90">
                                     <Link to={isInvestment ? `/invest/${item?.slug}` : `/properties/${item?.slug}`}>
                                        Complete Purchase
                                     </Link>
                                  </Button>
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
