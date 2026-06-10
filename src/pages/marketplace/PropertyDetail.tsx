import { useState, useEffect, lazy, Suspense } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Bed, 
  Bath, 
  Zap,
  Droplets,
  Activity,
  ClipboardCheck,
  AlertTriangle,
  Maximize2, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Heart, 
  Calendar, 
  Check, 
  Car, 
  Clock, 
  Hash, 
  Building2, 
  Map as MapIcon,
  Info,
  ExternalLink,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Star,
  Scale
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogBody } from "@/components/ui/dialog";
import { InquiryForm } from "@/components/site/InquiryForm";
import { BookingForm } from "@/components/site/BookingForm";
import { propertyTypeLabel, statusLabel, resolveImage, enrichProperty } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { useFormatPrice } from "@/hooks/useFormatPrice";
import { toast } from "@/hooks/use-toast";
import { useCompare } from "@/hooks/useCompare";
import { PropertyCard, PropertyCardData } from "@/components/site/PropertyCard";
import { Reviews } from "@/components/site/Reviews";
import { AgentReviews } from "@/components/site/AgentReviews";
import { SEO } from "@/components/site/SEO";
import { PropertyJsonLd } from "@/components/site/JsonLd";
import { PropertyGallery } from "@/components/site/PropertyGallery";
import { Separator } from "@/components/ui/separator";
import { ReserveDialog } from "@/components/invest/ReserveDialog";
import { MortgageCalculator } from "@/components/site/MortgageCalculator";
import { PaymentMethodPicker } from "@/components/payments/PaymentMethodPicker";
import { YieldCalculator } from "@/components/site/YieldCalculator";
import { ManualPaymentModal } from "@/components/dashboard/ManualPaymentModal";
import { VirtualTourButton, VirtualTourEmbed } from "@/components/site/VirtualTour";
import { MessageAgentButton } from "@/components/site/Messaging";
import { PromoBanner } from "@/components/site/PromoBanner";

const InteractivePropertyMap = lazy(() => import("@/components/site/InteractivePropertyMap").then(mod => ({ default: mod.InteractivePropertyMap })));

export default function PropertyDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<any>("digital_currency");
  const [paymentMode, setPaymentMode] = useState<"full" | "installment">("full");
  const [durationMonths, setDurationMonths] = useState<number>(24);
  const formatPrice = useFormatPrice();
  const { compareList, addToCompare, removeFromCompare } = useCompare();

  const { data: rawProperty, isLoading } = useQuery({
    queryKey: ["property", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*, locations(name, slug), agents(*), property_images(*)")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Cast to any to avoid TypeScript errors for newly added schema fields not yet in generated types
  const property = enrichProperty(rawProperty as any);

  const { data: related = [] } = useQuery({
    queryKey: ["related", property?.id, property?.property_type],
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("id, slug, title, price, currency, property_type, status, bedrooms, bathrooms, size_sqm, cover_image_url, address, locations(name)")
        .eq("property_type", property!.property_type)
        .neq("id", property!.id)
        .neq("status", "sold")
        .limit(3);
      return (data ?? []) as PropertyCardData[];
    },
    enabled: !!property,
  });

  const { data: saved } = useQuery({
    queryKey: ["saved", property?.id, user?.id],
    queryFn: async () => {
      if (!user || !property) return false;
      const { data } = await supabase.from("saved_properties").select("id")
        .eq("user_id", user.id).eq("property_id", property.id).maybeSingle();
      return !!data;
    },
    enabled: !!user && !!property,
  });

  const { data: userReservation } = useQuery({
    queryKey: ["user-reservation", property?.id, user?.id],
    queryFn: async () => {
      if (!user || !property) return null;
      const { data } = await supabase
        .from("reservations")
        .select("*")
        .eq("user_id", user.id)
        .eq("related_id", property.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!property,
  });

  async function toggleSave() {
    if (!user) {
      toast({ title: "Please sign in", description: "Create an account to save properties." });
      return;
    }
    if (!property) return;
    if (saved) {
      await supabase.from("saved_properties").delete().eq("user_id", user.id).eq("property_id", property.id);
    } else {
      await supabase.from("saved_properties").insert({ user_id: user.id, property_id: property.id });
    }
    qc.invalidateQueries({ queryKey: ["saved", property.id, user.id] });
  }

  const inCompare = property ? compareList.some((p) => p.id === property.id) : false;

  const handleCompareToggle = () => {
    if (!property) return;
    if (inCompare) {
      removeFromCompare(property.id);
      toast({
        title: "Removed from comparison",
        description: `"$title" has been removed from your comparison list.`,
      });
    } else {
      if (compareList.length >= 4) {
        toast({
          title: "Comparison list full",
          description: "You can compare up to 4 properties. Remove one to add this property.",
          variant: "destructive",
        });
        return;
      }
      addToCompare({
        id: property.id,
        title: property.title,
        price: property.price,
        currency: property.currency,
        property_type: property.property_type,
        cover_image_url: property.cover_image_url || null
      });
      toast({
        title: "Added to comparison",
        description: `"$title" has been added to your comparison list.`,
      });
    }
  };

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="container-wide py-12 space-y-8">
          <Skeleton className="h-[500px] rounded-xl" />
          <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <Skeleton className="h-12 w-2/3" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-40 w-full" />
            </div>
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (!property) {
    return (
      <SiteLayout>
        <div className="container-wide py-24 text-center">
          <h1 className="font-serif text-3xl">{"Listing not found"}</h1>
          <Button asChild className="mt-6"><Link to="/properties">{"Back to listings"}</Link></Button>
        </div>
      </SiteLayout>
    );
  }

  const images = property.property_images?.length
    ? [...property.property_images].sort((a: any, b: any) => a.sort_order - b.sort_order).map((i: any) => resolveImage(i.url))
    : [resolveImage(property.cover_image_url)];

  const agent = property.agents as any;
  const interior_features: string[] = Array.isArray(property.interior_features) ? property.interior_features as string[] : [];
  const exterior_features: string[] = Array.isArray(property.exterior_features) ? property.exterior_features as string[] : [];
  const nearbyPois: any[] = Array.isArray(property.nearby_pois) ? property.nearby_pois : [];

  const remainingBalance = property ? Number(property.price) - 500 : 0;
  const installmentEnabled = property ? !!(property as any).installment_available : false;
  const minDownPct = property ? Number((property as any).min_down_payment_pct ?? 20) : 20;
  const downPaymentAmount = remainingBalance * (minDownPct / 100);
  const monthlyInstallment = durationMonths > 0 ? (remainingBalance - downPaymentAmount) / durationMonths : 0;
  const payAmount = paymentMode === "installment" ? downPaymentAmount : remainingBalance;

  return (
    <SiteLayout>
      <SEO 
        title={property.title} 
        description={property.description?.slice(0, 160)} 
        image={resolveImage(property.cover_image_url)} 
        canonicalUrl={`https://haven-home-hub.vercel.app/properties/${property.slug}`}
      />
      <PropertyJsonLd property={property} />
      
      <div className="container-wide pt-8 pb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors">{"Home"}</Link>
          <span>/</span>
          <Link to="/properties" className="hover:text-primary transition-colors">{"Marketplace"}</Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate">{property.title}</span>
        </div>
      </div>

      {/* Gallery Section */}
      <section className="container-wide">
        <PropertyGallery 
          images={images} 
          title={property.title}
          propertyType={property.property_type}
          status={property.status}
          typeLabel={propertyTypeLabel(property.property_type)}
          statusLabel={statusLabel(property.status)}
        />
      </section>

      {/* Content Section */}
      <section className="container-wide grid gap-10 py-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-12">
          {/* Header & Price */}
          <div>
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex-1">
                <h1 className="font-serif text-2xl font-semibold sm:text-3xl lg:text-4xl leading-tight text-foreground">{property.title}</h1>
                <p className="mt-3 flex items-center gap-1.5 text-base text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  {property.address ?? property.locations?.name ?? "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">{"Listing Price"}</p>
                <p className="font-serif text-3xl font-semibold text-foreground">
                  {formatPrice(Number(property.price), property.currency, property.property_type)}
                </p>
                <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={toggleSave} 
                    className={`rounded-lg font-medium ${saved ? "text-primary border-primary bg-primary/5" : ""}`}
                  >
                    <Heart className={`h-4 w-4 mr-2 ${saved ? "fill-primary" : ""}`} />
                    {saved ? "Saved" : "Save Property"}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCompareToggle} 
                    className={`rounded-lg font-medium ${inCompare ? "text-primary border-primary bg-primary/5" : ""}`}
                  >
                    <Scale className="h-4 w-4 mr-2" />
                    {inCompare ? "Compared" : "Compare"}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-lg font-medium"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast({ title: "Link Copied", description: "Property link copied to clipboard." });
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" /> {"Share"}
                  </Button>
                  {property.virtual_tour_url && (
                    <VirtualTourButton url={property.virtual_tour_url} title={`${property.title} — 3D Tour`} />
                  )}
                </div>
              </div>
            </div>

            {property.property_type === 'land' ? (
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-border bg-card p-4 text-center group hover:border-primary/30 transition-colors">
                  <Maximize2 className="h-5 w-5 text-primary mx-auto mb-2" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{"Land Size"}</p>
                  <p className="text-lg font-bold">{Number(property.size_sqm).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{"sqm"}</span></p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center group hover:border-primary/30 transition-colors">
                  <Building2 className="h-5 w-5 text-primary mx-auto mb-2" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{"Land Type"}</p>
                  <p className="text-lg font-bold capitalize">{property.property_category || "Residential Land"}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center group hover:border-primary/30 transition-colors">
                  <FileText className="h-5 w-5 text-primary mx-auto mb-2" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{"Title Status"}</p>
                  <p className="text-sm font-bold mt-1 text-foreground">{"Clear Title / Insured"}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center group hover:border-primary/30 transition-colors">
                  <MapIcon className="h-5 w-5 text-primary mx-auto mb-2" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{"Topography"}</p>
                  <p className="text-sm font-bold mt-1 text-foreground">{"Surveyed & Cleared"}</p>
                </div>
              </div>
            ) : (
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-border bg-card p-4 text-center group hover:border-primary/30 transition-colors">
                  <Bed className="h-5 w-5 text-primary mx-auto mb-2" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{"Bedrooms"}</p>
                  <p className="text-lg font-bold">{property.bedrooms ?? "—"}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center group hover:border-primary/30 transition-colors">
                  <Bath className="h-5 w-5 text-primary mx-auto mb-2" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{"Bathrooms"}</p>
                  <p className="text-lg font-bold">{property.bathrooms ?? "—"}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center group hover:border-primary/30 transition-colors">
                  <Car className="h-5 w-5 text-primary mx-auto mb-2" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{"Parking"}</p>
                  <p className="text-lg font-bold">{property.parking_spaces ?? "0"}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center group hover:border-primary/30 transition-colors">
                  <Maximize2 className="h-5 w-5 text-primary mx-auto mb-2" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{"Total Area"}</p>
                  <p className="text-lg font-bold">{Number(property.size_sqm).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{"sq ft"}</span></p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h2 className="font-serif text-xl font-semibold flex items-center gap-2.5 text-foreground">
              <FileText className="h-5 w-5 text-primary" /> {"Description"}
            </h2>
            <div className="mt-6">
              <p className="whitespace-pre-line leading-relaxed text-foreground/80 text-lg">
                {property.description}
              </p>
            </div>
          </div>

          {/* Decision Intelligence Panel */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft">
            <div className="px-6 py-4 bg-accent/50 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-foreground">Property Intelligence</h2>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Assessment & Verification Data</p>
                </div>
              </div>
              {property.isVerified && (
                <Badge className="badge-verified-gold gap-1 text-[10px] uppercase font-bold py-1 px-2.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified Listing
                </Badge>
              )}
            </div>

            <div className="p-6 space-y-6">
              {/* Telemetry Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-border bg-accent/30 p-4 text-center">
                  <Activity className="h-5 w-5 text-emerald-500 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Est. Tax Rate</p>
                  <p className="text-xl font-bold text-foreground mt-1">{property.taxRate}<span className="text-xs font-normal text-muted-foreground">%</span></p>
                  <p className="text-[10px] text-muted-foreground mt-1">Annual Property Tax</p>
                </div>
                <div className="rounded-xl border border-border bg-accent/30 p-4 text-center">
                  <Droplets className={`h-5 w-5 mx-auto mb-2 ${property.isFloodSafe ? 'text-blue-500' : 'text-destructive'}`} />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">FEMA Zone</p>
                  <p className={`text-sm font-bold mt-1 ${property.isFloodSafe ? 'text-blue-600 dark:text-blue-400' : 'text-destructive'}`}>
                    {property.isFloodSafe ? 'Zone X' : 'At Risk'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">{property.floodRisk}</p>
                </div>
                <div className="rounded-xl border border-border bg-accent/30 p-4 text-center">
                  <MapPin className="h-5 w-5 text-amber-400 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Walk Score</p>
                  <p className="text-xl font-bold text-foreground mt-1">{property.walkScore}<span className="text-xs font-normal text-muted-foreground">/100</span></p>
                  <p className="text-[10px] text-muted-foreground mt-1">Very Walkable</p>
                </div>
                <div className="rounded-xl border border-border bg-accent/30 p-4 text-center">
                  <Clock className="h-5 w-5 text-primary mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Days Listed</p>
                  <p className="text-xl font-bold text-foreground mt-1">{property.daysOnMarket}</p>
                  <p className={`text-[10px] mt-1 font-semibold ${property.daysOnMarket < 15 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                    {property.daysOnMarket < 15 ? 'High Demand' : 'Stable Demand'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Verification Audit Trail */}
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                  <ClipboardCheck className="h-4 w-4 text-primary" /> Verification Audit Trail
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Title Document Verified</p>
                        <p className="text-[10px] text-muted-foreground">Title Insurance Policy confirmed</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase">Passed</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Physical Inspection</p>
                        <p className="text-[10px] text-muted-foreground">Third-party inspection report available</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase">Passed</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center ${property.isVerified ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                        {property.isVerified 
                          ? <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                          : <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">State License Check</p>
                        <p className="text-[10px] text-muted-foreground">Broker & Developer licensing active</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase ${property.isVerified ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {property.isVerified ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Automated Valuation (AVM)</p>
                        <p className="text-[10px] text-muted-foreground">Market-rate algorithm alignment passed</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase">Passed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3D Virtual Tour */}
          {property.virtual_tour_url && (
            <VirtualTourEmbed url={property.virtual_tour_url} title={`${property.title} — 3D Tour`} />
          )}

          {/* Key Details Grid */}
          <div className="rounded-xl bg-accent/50 p-8 border border-border/50">
            <h2 className="font-serif text-lg font-semibold mb-5 text-foreground">{"Property Overview"}</h2>
            <div className="grid gap-y-6 gap-x-12 sm:grid-cols-2">
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-sm text-muted-foreground flex items-center gap-2 font-medium"><Hash className="h-4 w-4" /> {"Property ID"}</span>
                <span className="text-sm font-bold font-mono">{property.internal_id || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-sm text-muted-foreground flex items-center gap-2 font-medium"><Building2 className="h-4 w-4" /> {"Property Type"}</span>
                <span className="text-sm font-bold capitalize">{property.property_type}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-sm text-muted-foreground flex items-center gap-2 font-medium"><Clock className="h-4 w-4" /> {"Year Built"}</span>
                <span className="text-sm font-bold">{property.year_built || "Modern"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-sm text-muted-foreground flex items-center gap-2 font-medium"><Calendar className="h-4 w-4" /> {"Listing Date"}</span>
                <span className="text-sm font-bold">{new Date(property.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
          </div>

          {/* Features & Amenities */}
          {property.property_type !== 'land' && (interior_features.length > 0 || exterior_features.length > 0) && (
            <div className="space-y-8">
              <h2 className="font-serif text-xl font-semibold flex items-center gap-2.5 text-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary" /> {"Amenities & Features"}
              </h2>
              
              <div className="grid gap-10 sm:grid-cols-2">
                {interior_features.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {"Interior Features"}
                    </h3>
                    <div className="grid gap-3">
                      {interior_features.map(f => (
                        <div key={f} className="flex items-center gap-3">
                          <Check className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm font-medium text-foreground/80">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {exterior_features.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {"Exterior Features"}
                    </h3>
                    <div className="grid gap-3">
                      {exterior_features.map(f => (
                        <div key={f} className="flex items-center gap-3">
                          <Check className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm font-medium text-foreground/80">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {property.property_type === 'land' && (
            <div className="space-y-12 mt-8">
              <div className="space-y-6">
                <h2 className="font-serif text-2xl font-bold flex items-center gap-3 text-foreground">
                  <FileText className="h-6 w-6 text-primary" /> {"Ownership & Documentation"}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card shadow-sm">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-bold text-foreground">Title Insurance Policy</p>
                      <p className="text-xs text-muted-foreground">Verified by national underwriters</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card shadow-sm">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-bold text-foreground">HOA Disclosures</p>
                      <p className="text-xs text-muted-foreground">Full CC&R packets available</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card shadow-sm">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-bold text-foreground">Inspection Report</p>
                      <p className="text-xs text-muted-foreground">Recent third-party inspection cleared</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card shadow-sm">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-bold text-foreground">Escrow Instructions</p>
                      <p className="text-xs text-muted-foreground">Prepared for secure digital closing</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="font-serif text-2xl font-bold flex items-center gap-3 text-foreground">
                  <Building2 className="h-6 w-6 text-primary" /> {"Investment Highlights & Development"}
                </h2>
                <div className="rounded-xl border border-border bg-secondary/20 p-6 space-y-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-lg mb-1">High Appreciation Potential</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">Located in a rapidly developing zone with projected high ROI over the next 3-5 years. Perfect for long term holds.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <MapIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-lg mb-1">Strategic Accessibility</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">Direct access to major road networks, upcoming infrastructure projects, and commercial hubs.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-lg mb-1">Development-Ready</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">Zoned appropriately, clear title. Ready for immediate allocation and physical development. Zero encroachments.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Location & Neighborhood */}
          <div className="space-y-8 mt-16 pt-12 border-t border-border">
            {/* 1. Neighborhood Summary Header */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 mb-1">
                <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest rounded-md">
                  {"Neighborhood Profile"}
                </span>
              </div>
              <h2 className="font-serif text-3xl font-bold text-foreground">
                {property.city ? `${property.neighborhood || property.city}, ${property.state || ''}` : "Neighborhood & Location"}
              </h2>
              <p className="text-muted-foreground max-w-2xl text-lg">
                {property.property_type === 'land'
                  ? "A strategic land parcel located in a high-potential development zone."
                  : property.property_type === 'commercial' 
                  ? "A strategic business location with excellent connectivity and established commercial infrastructure." 
                  : "A well-connected residential district offering convenient access to essential community amenities."}
              </p>
            </div>
            
            {/* 2. Categorized Local Amenities Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="font-serif text-xl font-bold text-foreground">
                  {"Local Amenities"}
                </h3>
                <span className="text-sm font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                  {nearbyPois.length} {"Found"}
                </span>
              </div>
              
              {nearbyPois.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {nearbyPois.map((poi, idx) => {
                    let Icon = MapPin;
                    let iconBg = "bg-gray-50";
                    let iconColor = "text-gray-500";
                    const typeLower = poi.type.toLowerCase();
                    
                    if (typeLower.includes('school')) {
                      Icon = Building2;
                      iconBg = "bg-indigo-50";
                      iconColor = "text-indigo-600";
                    } else if (typeLower.includes('hospital') || typeLower.includes('medical')) {
                      Icon = ShieldCheck;
                      iconBg = "bg-primary/10";
                      iconColor = "text-primary";
                    } else if (typeLower.includes('shopping') || typeLower.includes('mall') || typeLower.includes('retail')) {
                      Icon = MapPin;
                      iconBg = "bg-amber-50";
                      iconColor = "text-amber-600";
                    }

                    return (
                      <div key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card shadow-sm hover:border-border transition-colors">
                        <div className={`h-10 w-10 rounded-full ${iconBg} flex items-center justify-center ${iconColor} shrink-0`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate" title={poi.name}>{poi.name}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{poi.type}</p>
                        </div>
                        {poi.distance_km && (
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-foreground">{poi.distance_km} km</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="w-full flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border bg-secondary/30">
                  <div className="h-12 w-12 rounded-full bg-card flex items-center justify-center mb-3 shadow-sm border border-border/50">
                    <MapPin className="h-5 w-5 text-muted-foreground/60" />
                  </div>
                  <p className="font-serif text-base font-bold text-foreground">{"Neighborhood information pending"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{"Local amenity data is currently being updated for this listing."}</p>
                </div>
              )}
            </div>

            {/* 3. Landscape Interactive Map */}
            <div className="w-full rounded-xl overflow-hidden border border-border relative z-0 flex flex-col shadow-sm bg-secondary/20">
              <div className="aspect-[16/9] md:aspect-[21/9] max-h-[400px] w-full relative">
                <Suspense fallback={
                  <div className="h-full w-full flex flex-col items-center justify-center bg-secondary/30 animate-pulse absolute inset-0">
                    <div className="h-16 w-16 rounded-full bg-card flex items-center justify-center mb-4 shadow-sm border border-border/50">
                      <MapPin className="h-8 w-8 text-muted-foreground/60" />
                    </div>
                    <p className="text-muted-foreground font-medium font-sans">{"Loading interactive map..."}</p>
                  </div>
                }>
                  <InteractivePropertyMap 
                    latitude={property.latitude}
                    longitude={property.longitude}
                    address={property.address}
                    title={property.title}
                    nearbyPois={nearbyPois}
                  />
                </Suspense>
              </div>
              
              {/* Context Banner Overlay */}
              <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-auto md:w-[400px] p-4 rounded-lg bg-card/95 backdrop-blur border border-border shadow-md flex flex-col gap-2 z-20 pointer-events-none">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{"Registered Address"}</p>
                <p className="text-sm font-bold leading-tight text-foreground line-clamp-2">{property.address || "Location on request"}</p>
                <Button variant="outline" size="sm" className="pointer-events-auto mt-2 rounded-md font-bold border-border text-foreground hover:bg-secondary w-fit" asChild>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address || property.title)}`} target="_blank" rel="noreferrer">
                    {"Get Directions"} <ExternalLink className="ml-2 h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>

            {/* 4. Surrounding Context Layer */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="p-5 rounded-xl bg-card border border-border shadow-sm flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-foreground shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">{"Viewing Schedule"}</p>
                  <p className="text-sm font-medium leading-relaxed text-foreground">
                    {property.inspection_availability || "Available for viewing Monday to Saturday, 9AM - 5PM."}
                  </p>
                </div>
              </div>
              
              <div className="p-5 rounded-xl bg-card border border-border shadow-sm flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-foreground shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">{"Zoning Status"}</p>
                  <p className="text-sm font-medium leading-relaxed text-foreground">
                    {property.property_type === 'commercial' ? "Premium Business Zone" : "Premium Residential Zone"}
                  </p>
                </div>
              </div>
            </div>
          </div>


          {property.video_url && (
            <div className="mt-8">
              <h2 className="font-serif text-2xl font-bold flex items-center gap-3 text-foreground">
                <Maximize2 className="h-6 w-6 text-primary" /> {"Property Tour"}
              </h2>
              <div className="mt-6 aspect-video overflow-hidden rounded-xl border-4 border-card shadow-card">
                <iframe src={property.video_url} className="h-full w-full" allowFullScreen />
              </div>
            </div>
          )}

          {property.is_investment ? (
            <div className="mt-12">
              <YieldCalculator 
                unitPrice={Number(property.unit_price || property.price)} 
                currency={property.currency || 'USD'} 
                expectedYield={Number(property.expected_return || 5.5)} 
              />
            </div>
          ) : property.property_type !== 'land' ? (
            <div className="mt-12">
              <MortgageCalculator price={Number(property.price)} currency={property.currency || 'USD'} />
            </div>
          ) : null}

          <div className="mt-12">
            <Reviews target={{ propertyId: property.id }} />
          </div>

          {agent && (
            <div className="mt-12">
              <h2 className="font-serif text-xl font-semibold flex items-center gap-2.5 text-foreground mb-6">
                <Star className="h-5 w-5 text-amber-400" /> {"Agent Reviews"}
              </h2>
              <AgentReviews agentId={agent.id} agentName={agent.full_name} propertyId={property.id} />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {agent && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-card overflow-hidden">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={resolveImage(agent.photo_url)} alt={agent.full_name} loading="lazy"
                    className="h-20 w-20 rounded-xl object-cover border border-border shadow-sm" />
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-primary/100 rounded-full border-4 border-card flex items-center justify-center">
                    <ShieldCheck className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div>
                  <p className="font-serif text-xl font-bold text-foreground">{agent.full_name}</p>
                  <p className="text-xs font-medium text-primary uppercase tracking-wider mt-1">{agent.role_title}</p>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {agent.phone && (
                  <Button asChild variant="outline" className="rounded-xl h-11 border-border hover:bg-secondary font-bold text-xs shadow-sm">
                    <a href={`tel:${agent.phone}`}><Phone className="mr-2 h-4 w-4" /> {"Call Agent"}</a>
                  </Button>
                )}
                {agent.whatsapp && (
                  <Button asChild variant="outline" className="rounded-xl h-11 border-primary/20 text-primary hover:bg-primary/10 shadow-sm font-bold text-xs">
                    <a href={`https://wa.me/${agent.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                      <MessageSquare className="mr-2 h-4 w-4" /> {"WhatsApp"}</a>
                  </Button>
                )}
                {agent.user_id && (
                  <MessageAgentButton
                    agentUserId={agent.user_id}
                    agentName={agent.full_name}
                    propertyId={property.id}
                    propertyTitle={property.title}
                  />
                )}
              </div>

              <div className="mt-4 space-y-3">
                <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold shadow-sm text-sm">
                      <Calendar className="mr-2 h-4 w-4" /> {property.property_type === 'land' ? "Schedule Site Inspection" : "Schedule Viewing"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader className="bg-primary pb-6">
                      <DialogTitle className="font-serif text-2xl text-white">{property.property_type === 'land' ? "Schedule Site Inspection" : "Schedule a Viewing"}</DialogTitle>
                      <p className="text-sm text-white/80 italic">{property.title}</p>
                    </DialogHeader>
                    <DialogBody className="py-6">
                      <BookingForm propertyId={property.id} agentId={agent.id} onSuccess={() => setBookingOpen(false)} />
                    </DialogBody>
                  </DialogContent>
                </Dialog>

                <Button onClick={toggleSave} variant="secondary" className="w-full h-12 rounded-xl font-bold text-sm bg-secondary/80 hover:bg-secondary border border-border/50 transition-all">
                  <Heart className={`mr-2 h-5 w-5 ${saved ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  {saved ? "Added to Saved" : "Save Listing"}
                </Button>
              </div>
            </div>
          )}

          {/* Reservation Card */}
          <div className="rounded-xl border border-primary/15 bg-card p-6 shadow-soft">
            <h3 className="font-serif text-lg font-semibold text-foreground">
              {userReservation?.status === 'approved' || userReservation?.status === 'confirmed'
                ? "Complete Purchase" 
                : ['reserved', 'sold', 'rented', 'unavailable', 'payment_under_review'].includes(property.status) 
                  ? `${property.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}`
                  : property.property_type === 'land' ? "Reserve Plot" : "Reserve Property"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {userReservation?.status === 'approved' || userReservation?.status === 'confirmed'
                ? "Your reservation has been approved. You can now complete full payment to secure this property."
                : property.status === 'reserved' 
                ? "This property has been officially reserved and is currently off the market." 
                : property.status === 'sold'
                ? "This property has been sold and is no longer available."
                : property.status === 'rented'
                ? "This property is currently rented out."
                : property.status === 'payment_under_review'
                ? "A payment for this property is currently being reviewed."
                : property.status === 'unavailable'
                ? "This property is currently not available for purchase."
                : property.property_type === 'land' ? "Hold this plot for 7 days to finalize your purchase." : "Hold this property for 7 days to finalize your purchase."}
            </p>
            {(!userReservation || (userReservation.status !== 'approved' && userReservation.status !== 'confirmed')) && property.status === 'available' && (
              <div className="mt-5 flex items-center justify-between p-3.5 rounded-lg bg-accent/50 border border-border/50">
                <span className="text-xs font-medium text-muted-foreground">{"Reservation Fee"}</span>
                <span className="text-lg font-semibold text-primary font-serif">500.00 USD</span>
              </div>
            )}
            
            {userReservation?.status === 'approved' || userReservation?.status === 'confirmed' ? (
              <div className="space-y-5 mt-5">
                {installmentEnabled && (
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-secondary/50 border border-border/50">
                    <button 
                      onClick={() => setPaymentMode("full")}
                      className={`py-2 rounded-lg text-sm font-bold transition-all ${paymentMode === "full" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Pay Full
                    </button>
                    <button 
                      onClick={() => setPaymentMode("installment")}
                      className={`py-2 rounded-lg text-sm font-bold transition-all ${paymentMode === "installment" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Installments
                    </button>
                  </div>
                )}

                {paymentMode === "full" ? (
                  <div className="flex items-center justify-between p-3.5 rounded-lg bg-primary/5 border border-primary/20">
                    <span className="text-xs font-medium text-primary">{"Remaining Balance"}</span>
                    <span className="text-lg font-semibold text-primary font-serif">
                      {formatPrice(remainingBalance, property.currency, property.property_type)}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3.5 rounded-lg bg-primary/5 border border-primary/20">
                      <span className="text-xs font-medium text-primary">{`Down Payment (${minDownPct}%)`}</span>
                      <span className="text-lg font-semibold text-primary font-serif">
                        {formatPrice(downPaymentAmount, property.currency, property.property_type)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 rounded-lg bg-secondary/20 border border-border/50">
                      <span className="text-xs font-medium text-muted-foreground">{`Monthly (${durationMonths} months)`}</span>
                      <span className="text-sm font-semibold text-foreground font-serif">
                        {formatPrice(monthlyInstallment, property.currency, property.property_type)} / mo
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="rounded-xl border border-border/50 bg-secondary/5 p-4 space-y-3">
                  <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
                </div>

                <Button 
                  className="w-full h-11 bg-primary text-primary-foreground font-medium rounded-lg shadow-sm hover:bg-primary/90 transition-colors"
                  onClick={() => setPaymentModalOpen(true)}
                >
                  {paymentMode === "installment" ? "Start Installment Plan" : "Complete Purchase"}
                </Button>
              </div>
            ) : (
              <Button 
                className="mt-4 w-full h-11 bg-primary text-primary-foreground font-medium rounded-lg shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:hover:bg-primary"
                disabled={property.status !== 'available'}
                onClick={() => {
                  if (!user) {
                    toast({ title: "Sign in required", description: "Please sign in to reserve this property." });
                    return;
                  }
                  setReserveOpen(true);
                }}
              >
                {property.status === 'available' 
                  ? (property.property_type === 'land' ? "Reserve Plot" : "Reserve Now") 
                  : property.status === 'reserved'  
                  ? "Already Reserved" 
                  : property.status === 'sold'
                  ? "Sold"
                  : property.status === 'rented'
                  ? "Rented"
                  : property.status === 'payment_under_review'
                  ? "Payment Under Review"
                  : "Unavailable"}
              </Button>
            )}
            
            <p className="mt-3 text-[11px] text-center text-muted-foreground">
              {property.status === 'available' || userReservation?.status === 'approved' || userReservation?.status === 'confirmed' ? "Processed securely via escrow" : "This property is currently unavailable"}
            </p>
            <ReserveDialog
              open={reserveOpen}
              onClose={() => setReserveOpen(false)}
              property={{
                id: property.id,
                title: property.title,
                currency: property.currency,
                property_type: property.property_type,
                location: property.locations?.name || property.address || undefined
              }}
              type={property.is_investment ? "investment" : "property"}
            />
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft">
            <h3 className="font-serif text-lg font-semibold text-foreground">{"Questions?"}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{"Inquire about details or flexible payment plans."}</p>
            <div className="mt-6">
              <InquiryForm propertyId={property.id} agentId={agent?.id ?? null} />
            </div>
          </div>
          
          <div className="mt-6">
            <PromoBanner placement="property_detail" />
          </div>
        </aside>
      </section>

      {/* Footer Related Listings */}
      {related.length > 0 && (
        <section className="container-wide py-16 bg-accent/40">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-serif text-2xl font-semibold">{"Similar Properties"}</h2>
              <p className="text-muted-foreground mt-1 text-sm">{property.locations?.name ? `More listings in $location.` : "More listings in the area."}</p>
            </div>
            <Button asChild variant="ghost" className="rounded-lg font-medium text-primary hover:bg-primary/5 group">
              <Link to="/properties">{"View all"} <ExternalLink className="ml-2 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {related.map((p) => <PropertyCard key={p.id} property={p} />)}
          </div>
        </section>
      )}

      {userReservation && (
        <ManualPaymentModal
          open={paymentModalOpen}
          method={paymentMethod}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={() => {
            setPaymentModalOpen(false);
            qc.invalidateQueries({ queryKey: ["property", slug] });
          }}
          amount={payAmount}
          isInstallment={paymentMode === "installment"}
          installmentConfig={paymentMode === "installment" ? {
            monthlyAmount: monthlyInstallment,
            durationMonths: durationMonths
          } : undefined}
          currency={property.currency}
          paymentType="purchase"
          targetId={property.id}
          bookingId={userReservation.id}
          propertyData={{
            title: property.title,
            property_type: property.property_type,
            location: property.locations?.name || property.address || undefined
          }}
        />
      )}
    </SiteLayout>
  );
}
