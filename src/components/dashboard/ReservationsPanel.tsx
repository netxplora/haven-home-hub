import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, ExternalLink, Clock, CheckCircle2, XCircle, AlertCircle, CalendarDays, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/invest";

export function ReservationsPanel({ userId }: { userId: string }) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["my-reservations", userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("reservations")
        .select(`
          *,
          properties(title, slug, cover_image_url),
          investment_properties(title, slug, cover_image_url)
        `)
        .eq("user_id", userId)
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
      default: return <AlertCircle className="h-3 w-3" />;
    }
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
              const item = r.properties || r.investment_properties;
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
                                     {r.status}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground font-mono bg-accent px-2 py-0.5 rounded-md">ID: {r.id.split('-')[0]}</span>
                               </div>
                            </div>
                            <div className="text-right">
                               <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Fee Paid</p>
                               <p className="font-serif text-xl font-bold">{formatMoney(r.fee_paid)}</p>
                            </div>
                         </div>
                         
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
                            <div className="sm:col-span-2 flex justify-end gap-2">
                               <Button asChild variant="outline" size="sm" className="rounded-xl border-border/40 text-[11px] font-bold h-9">
                                  <Link to={`/${pathPrefix}/${item?.slug}`}>
                                     Property Details <ExternalLink className="ml-1.5 h-3 w-3" />
                                  </Link>
                               </Button>
                                {r.status === 'pending_review' && (
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
      )
}
    </div>
  );
}
