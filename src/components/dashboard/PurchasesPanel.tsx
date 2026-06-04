import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Home, ExternalLink, Clock, CheckCircle2, ShieldCheck, MapPin, Receipt, History, FileText, Search, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/invest";
import { ReceiptDialog } from "./ReceiptDialog";
import { LegalDocumentsDialog } from "./LegalDocumentsDialog";
import { toast } from "sonner";

export function PurchasesPanel({ userId }: { userId: string }) {
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedPropertyForDocs, setSelectedPropertyForDocs] = useState<{ id: string; title: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["my-purchases", userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("reservations")
        .select(`
          *,
          properties:property_id(title, slug, cover_image_url, property_type, locations(name), bedrooms, bathrooms, size_sqm, price),
          investment_properties:investment_property_id(title, slug, cover_image_url, location, property_type, total_value, unit_price)
        `)
        .eq("user_id", userId)
        .in("status", ["completed", "confirmed"])
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("Error fetching purchases:", error);
        throw error;
      }
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  const filteredItems = items.filter((r: any) => {
    const prop = Array.isArray(r.properties) ? r.properties[0] : r.properties;
    const invProp = Array.isArray(r.investment_properties) ? r.investment_properties[0] : r.investment_properties;
    const item = prop || invProp;
    const title = (item?.title || "").toLowerCase();
    const searchMatch = title.includes(searchTerm.toLowerCase());

    if (!searchMatch) return false;

    if (typeFilter !== "all") {
      const isInvestment = !!r.investment_property_id;
      if (typeFilter === "investment") {
        return isInvestment;
      }
      if (typeFilter === "property") {
        return !isInvestment;
      }
    }
    return true;
  });

  const handleViewReceipt = async (purchase: any) => {
    try {
      // 1. Find the payment for this reservation
      const { data: payment, error: paymentError } = await (supabase as any)
        .from("payments")
        .select("id")
        .eq("reservation_id", purchase.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (paymentError) throw paymentError;

      // 2. Build receipt query using payment_id or reservation_id in metadata
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

  function getStatusStyle(status: string) {
    switch (status) {
      case "confirmed":
      case "success":
      case "completed":
      case "rented": return "bg-primary/10 text-primary border-primary/20";
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
      case "installment_active": return <Clock className="h-3 w-3" />;
      default: return <CheckCircle2 className="h-3 w-3" />;
    }
  }

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
      
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between p-8 rounded-xl border border-border/40 bg-card shadow-soft">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">Property Purchases</h2>
          <p className="mt-1 text-sm text-muted-foreground">Properties you have successfully purchased, rented, or hold an active installment for.</p>
        </div>
        <div className="flex items-center gap-3">
           <Badge variant="secondary" className="rounded-lg px-4 py-1.5 font-bold text-sm bg-primary/10 text-primary">{items.length} Properties Owned</Badge>
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[220px] rounded-xl border-border/40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/40">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="property">Full Ownership</SelectItem>
            <SelectItem value="investment">Fractional Investment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
           {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-16 text-center bg-card shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/50 mb-4">
            <Home className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="font-serif text-xl font-bold text-foreground">No property purchases yet</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">When you complete a purchase, rent a property, or start an installment plan, it will appear here.</p>
          <Button asChild className="mt-8 rounded-xl px-8 shadow-sm font-bold" size="lg">
            <Link to="/properties">Explore Properties</Link>
          </Button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center bg-secondary/5">
          <p className="font-serif text-lg font-medium text-foreground">No purchases match your filters</p>
          <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search terms or filter settings.</p>
          <Button onClick={() => { setSearchTerm(""); setTypeFilter("all"); }} variant="outline" className="mt-4 rounded-xl">
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
                <div key={r.id} className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-soft transition-all duration-300 hover:shadow-md group flex flex-col md:flex-row">
                  {/* Image Section */}
                  <div className="relative w-full md:w-64 h-48 md:h-auto shrink-0 bg-accent overflow-hidden">
                    {item?.cover_image_url ? (
                      <img src={item.cover_image_url} alt={item.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-secondary/20">
                        <Home className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <Badge variant="outline" className={`rounded-md shadow-sm font-bold backdrop-blur-md bg-white/90 border-white/20 capitalize ${getStatusStyle(r.status)}`}>
                        <span className="flex items-center gap-1.5">
                          {getStatusIcon(r.status)}
                          {r.status.replace("_", " ")}
                        </span>
                      </Badge>
                    </div>
                  </div>

                  {/* Content Section */}
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
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Value</p>
                          <p className="text-lg font-bold text-foreground">{formatMoney(r.total_price || r.amount || r.metadata?.amount_invested || item?.price || item?.total_value || 0, "USD")}</p>
                        </div>
                      </div>

                      {/* Specifications */}
                      {!isInvestment && (
                        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                          {item?.bedrooms && <span className="flex items-center gap-1 font-medium bg-accent/50 px-2.5 py-1 rounded-md"><span className="text-foreground font-bold">{item.bedrooms}</span> Beds</span>}
                          {item?.bathrooms && <span className="flex items-center gap-1 font-medium bg-accent/50 px-2.5 py-1 rounded-md"><span className="text-foreground font-bold">{item.bathrooms}</span> Baths</span>}
                          {item?.size_sqm && <span className="flex items-center gap-1 font-medium bg-accent/50 px-2.5 py-1 rounded-md"><span className="text-foreground font-bold">{item.size_sqm}</span> SQM</span>}
                        </div>
                      )}

                      {/* Installment Info if applicable */}
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
                        {item?.property_type === 'land' && ['confirmed', 'completed', 'success'].includes(r.status) && (
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
    </div>
  );
}
