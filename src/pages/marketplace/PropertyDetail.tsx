import { useState, useEffect, lazy, Suspense } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Bed, 
  Bath, 
  Car, 
  Maximize2, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Heart, 
  Calendar, 
  Check, 
  Clock, 
  Hash, 
  Building2, 
  Map as MapIcon,
  ExternalLink, 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  Star, 
  Scale,
  TrendingUp,
  Activity,
  Droplets,
  ClipboardCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Share2
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
import { LazyImage } from "@/components/ui/LazyImage";

const InteractivePropertyMap = lazy(() => 
  import("@/components/site/InteractivePropertyMap").then(mod => ({ default: mod.InteractivePropertyMap }))
);

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
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

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
        .limit(4);
      return (data ?? []) as PropertyCardData[];
    },
    enabled: !!property,
  });

  const { data: saved } = useQuery({
    queryKey: ["saved", property?.id, user?.id],
    queryFn: async () => {
      if (!user || !property) return false;
      const { data } = await supabase
        .from("saved_properties")
        .select("id")
        .eq("user_id", user.id)
        .eq("property_id", property.id)
        .maybeSingle();
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
      toast({ title: "Removed from saved listings" });
    } else {
      await supabase.from("saved_properties").insert({ user_id: user.id, property_id: property.id });
      toast({ title: "Saved to your listings" });
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
        description: `"${property.title}" has been removed from your comparison list.`,
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
        description: `"${property.title}" has been added to your comparison list.`,
      });
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link Copied", description: "Property link copied to your clipboard." });
  };

  const scrollToMap = () => {
    const el = document.getElementById("location-map-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <SiteLayout transparentNav="mobile">
        <div className="container-wide pt-20 md:pt-24 pb-10 space-y-8 animate-pulse">
          <Skeleton className="h-4 w-48 rounded-md" />
          <Skeleton className="h-[460px] w-full rounded-2xl" />
          <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              <Skeleton className="h-10 w-3/4 rounded-xl" />
              <Skeleton className="h-6 w-1/2 rounded-lg" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
            <Skeleton className="h-[450px] w-full rounded-2xl" />
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (!property) {
    return (
      <SiteLayout transparentNav="mobile">
        <div className="container-wide pt-20 md:pt-24 pb-28 text-center">
          <h1 className="font-serif text-3xl font-bold text-foreground">Property Not Found</h1>
          <p className="text-muted-foreground mt-2 text-base">The listing you are looking for may have been sold or removed.</p>
          <Button asChild className="mt-6 rounded-xl">
            <Link to="/properties">Explore All Properties</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  // Media preparation
  const images = property.property_images?.length
    ? [...property.property_images].sort((a: any, b: any) => a.sort_order - b.sort_order).map((i: any) => resolveImage(i.url))
    : [resolveImage(property.cover_image_url)];

  const agent = property.agents as any;
  const interior_features: string[] = Array.isArray(property.interior_features) ? property.interior_features as string[] : [];
  const exterior_features: string[] = Array.isArray(property.exterior_features) ? property.exterior_features as string[] : [];
  const nearbyPois: any[] = Array.isArray(property.nearby_pois) ? property.nearby_pois : [];

  // Financial calculations
  const remainingBalance = property ? Math.max(0, Number(property.price) - 500) : 0;
  const installmentEnabled = property ? !!(property as any).installment_available : false;
  const minDownPct = property ? Number((property as any).min_down_payment_pct ?? 20) : 20;
  const downPaymentAmount = remainingBalance * (minDownPct / 100);
  const monthlyInstallment = durationMonths > 0 ? (remainingBalance - downPaymentAmount) / durationMonths : 0;
  const payAmount = paymentMode === "installment" ? downPaymentAmount : remainingBalance;

  // Format reference ID
  const referenceId = property.internal_id || `REF-${property.id.substring(0, 8).toUpperCase()}`;

  // Primary action label
  const primaryActionLabel = 
    userReservation?.status === 'approved' || userReservation?.status === 'confirmed'
      ? "Complete Purchase"
      : property.status === 'available'
      ? (property.is_investment ? "Invest in Asset" : property.property_type === 'land' ? "Reserve Plot" : property.property_type === 'rent' ? "Reserve Rental" : "Reserve Property")
      : property.status === 'reserved'
      ? "Reserved"
      : property.status === 'sold'
      ? "Sold"
      : property.status === 'rented'
      ? "Rented"
      : property.status === 'payment_under_review'
      ? "Payment Under Review"
      : "Unavailable";

  return (
    <SiteLayout transparentNav="mobile">
      <SEO 
        title={`${property.title} — ${propertyTypeLabel(property.property_type)} in ${property.locations?.name || property.city || 'United States'}`} 
        description={`Explore this verified ${property.property_type} for ${formatPrice(Number(property.price), property.currency, property.property_type)}. ${property.description?.slice(0, 140)}...`} 
        image={resolveImage(property.cover_image_url)} 
        canonicalUrl={`${window.location.origin}/properties/${property.slug}`}
      />
      <PropertyJsonLd property={property} />

      {/* ── 1. Top Navigation & Breadcrumbs ── */}
      <div className="container-wide pt-14 md:pt-24 pb-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted-foreground font-medium flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link to="/properties" className="hover:text-primary transition-colors">Properties</Link>
          <span>/</span>
          {property.locations?.name && (
            <>
              <Link to={`/properties?location=${property.locations.slug || ''}`} className="hover:text-primary transition-colors">
                {property.locations.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground font-semibold truncate max-w-[200px] sm:max-w-xs">{property.title}</span>
        </nav>
      </div>

      {/* ── 2. Primary Image Gallery (Clean, Bright, Photography-First) ── */}
      <section className="container-wide mb-8">
        <PropertyGallery 
          images={images} 
          title={property.title}
          propertyType={property.property_type}
          status={property.status}
          typeLabel={propertyTypeLabel(property.property_type)}
          statusLabel={statusLabel(property.status)}
        />
      </section>

      {/* ── 3. Main Content Grid (Information Hierarchy & Sticky Sidebar) ── */}
      <section className="container-wide grid gap-10 pb-16 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_400px]">
        <div className="space-y-10 min-w-0">
          {/* ── Header Information ── */}
          <div className="space-y-4">
            {/* Top metadata row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 bg-accent/40 text-primary border-primary/20">
                  {propertyTypeLabel(property.property_type)}
                </Badge>
                <Badge 
                  variant={property.status === 'available' ? 'default' : 'secondary'}
                  className="text-xs font-semibold px-2.5 py-1"
                >
                  {statusLabel(property.status)}
                </Badge>
                {property.isVerified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/50">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                )}
              </div>

              <span className="text-xs font-mono font-medium text-muted-foreground">
                ID: <span className="text-foreground font-semibold">{referenceId}</span>
              </span>
            </div>

            {/* Title */}
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground tracking-tight leading-[1.2]">
              {property.title}
            </h1>

            {/* Location & Quick Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <button
                onClick={scrollToMap}
                className="flex items-center gap-1.5 text-sm sm:text-base text-muted-foreground hover:text-primary transition-colors group text-left"
              >
                <MapPin className="h-4 w-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                <span className="underline underline-offset-4 decoration-border group-hover:decoration-primary">
                  {property.address ?? property.locations?.name ?? "Location on request"}
                </span>
              </button>

              {/* Utility Action Buttons */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleSave} 
                  className={`rounded-xl font-semibold text-xs h-9 px-3 transition-all ${
                    saved ? "text-primary border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Heart className={`h-3.5 w-3.5 mr-1.5 ${saved ? "fill-primary text-primary" : ""}`} />
                  {saved ? "Saved" : "Save"}
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCompareToggle} 
                  className={`rounded-xl font-semibold text-xs h-9 px-3 transition-all ${
                    inCompare ? "text-primary border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Scale className="h-3.5 w-3.5 mr-1.5" />
                  {inCompare ? "Comparing" : "Compare"}
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleShare}
                  className="rounded-xl font-semibold text-xs h-9 px-3 text-muted-foreground hover:text-foreground"
                >
                  <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share
                </Button>

                {property.virtual_tour_url && (
                  <VirtualTourButton url={property.virtual_tour_url} title={`${property.title} — 3D Tour`} />
                )}
              </div>
            </div>

            {/* Price Banner (Mobile & Desktop) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-wrap items-center justify-between gap-4 mt-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Listing Price</p>
                <p className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mt-0.5">
                  {formatPrice(Number(property.price), property.currency, property.property_type)}
                </p>
              </div>

              {property.property_type === 'rent' ? (
                <span className="text-xs font-medium text-muted-foreground px-3 py-1 bg-muted rounded-lg">
                  Billed Monthly / Lease terms available
                </span>
              ) : property.installment_available ? (
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 px-3 py-1.5 rounded-lg">
                  Installment plans available ({property.min_down_payment_pct || 20}% min down)
                </span>
              ) : null}
            </div>
          </div>

          {/* ── 4. Dynamic Quick Stats Row ── */}
          {property.property_type === 'land' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-xl border border-border/60 bg-card text-center shadow-xs">
                <Maximize2 className="h-4 w-4 text-primary mx-auto mb-1.5" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Land Area</p>
                <p className="text-base font-bold text-foreground mt-0.5">{Number(property.size_sqm).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">sqm</span></p>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-card text-center shadow-xs">
                <Building2 className="h-4 w-4 text-primary mx-auto mb-1.5" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Zoning</p>
                <p className="text-base font-bold capitalize text-foreground mt-0.5">{property.property_category || "Residential"}</p>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-card text-center shadow-xs">
                <FileText className="h-4 w-4 text-primary mx-auto mb-1.5" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title Status</p>
                <p className="text-sm font-bold text-foreground mt-0.5">Clear / Insured</p>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-card text-center shadow-xs">
                <MapIcon className="h-4 w-4 text-primary mx-auto mb-1.5" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Topography</p>
                <p className="text-sm font-bold text-foreground mt-0.5">Surveyed & Clear</p>
              </div>
            </div>
          ) : property.is_investment ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-xl border border-border/60 bg-card text-center shadow-xs">
                <TrendingUp className="h-4 w-4 text-primary mx-auto mb-1.5" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Target Return</p>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{property.expected_return || 12}% p.a.</p>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-card text-center shadow-xs">
                <Maximize2 className="h-4 w-4 text-primary mx-auto mb-1.5" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Unit Price</p>
                <p className="text-base font-bold text-foreground mt-0.5">{formatPrice(Number(property.unit_price || 500), property.currency)}</p>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-card text-center shadow-xs">
                <Calendar className="h-4 w-4 text-primary mx-auto mb-1.5" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payout Schedule</p>
                <p className="text-sm font-bold text-foreground mt-0.5">Quarterly</p>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-card text-center shadow-xs">
                <Clock className="h-4 w-4 text-primary mx-auto mb-1.5" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Holding Term</p>
                <p className="text-sm font-bold text-foreground mt-0.5">24 Months</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-xl border border-border/60 bg-card text-center shadow-xs">
                <Bed className="h-4 w-4 text-primary mx-auto mb-1.5" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bedrooms</p>
                <p className="text-lg font-bold text-foreground mt-0.5">{property.bedrooms ?? "—"}</p>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-card text-center shadow-xs">
                <Bath className="h-4 w-4 text-primary mx-auto mb-1.5" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bathrooms</p>
                <p className="text-lg font-bold text-foreground mt-0.5">{property.bathrooms ?? "—"}</p>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-card text-center shadow-xs">
                <Car className="h-4 w-4 text-primary mx-auto mb-1.5" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Parking</p>
                <p className="text-lg font-bold text-foreground mt-0.5">{property.parking_spaces ?? "1"}</p>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-card text-center shadow-xs">
                <Maximize2 className="h-4 w-4 text-primary mx-auto mb-1.5" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Floor Area</p>
                <p className="text-base font-bold text-foreground mt-0.5">{Number(property.size_sqm).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">sq ft</span></p>
              </div>
            </div>
          )}

          <Separator className="bg-border/60" />

          {/* ── 5. Editorial Description Section ── */}
          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> About This Property
            </h2>
            <div className="relative text-base text-foreground/80 leading-relaxed max-w-3xl space-y-4">
              <p className={`whitespace-pre-line ${!descriptionExpanded && property.description?.length > 400 ? "line-clamp-4" : ""}`}>
                {property.description || "No description provided for this listing."}
              </p>

              {property.description?.length > 400 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                  className="text-primary hover:text-primary font-semibold text-xs p-0 h-auto gap-1"
                >
                  {descriptionExpanded ? (
                    <>Show less <ChevronUp className="h-3.5 w-3.5" /></>
                  ) : (
                    <>Read full description <ChevronDown className="h-3.5 w-3.5" /></>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* ── 6. Decision Intelligence & Verification Audit ── */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
            <div className="px-6 py-4 bg-muted/30 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-foreground">Property Intelligence</h3>
                  <p className="text-[11px] font-medium text-muted-foreground">Standard assessment and verification metrics</p>
                </div>
              </div>
              {property.isVerified && (
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200/50 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified
                </span>
              )}
            </div>

            <div className="p-6 space-y-6">
              {/* Telemetry Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl border border-border/50 bg-background p-3.5 text-center">
                  <Activity className="h-4 w-4 text-primary mx-auto mb-1.5" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tax Rate</p>
                  <p className="text-base font-bold text-foreground mt-0.5">{property.taxRate || "1.25"}%</p>
                  <p className="text-[10px] text-muted-foreground">Estimated annual</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background p-3.5 text-center">
                  <Droplets className={`h-4 w-4 mx-auto mb-1.5 ${property.isFloodSafe ? 'text-blue-500' : 'text-destructive'}`} />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Flood Zone</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{property.isFloodSafe ? "Zone X (Minimal)" : "Moderate"}</p>
                  <p className="text-[10px] text-muted-foreground">{property.floodRisk || "FEMA Standard"}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background p-3.5 text-center">
                  <MapPin className="h-4 w-4 text-primary mx-auto mb-1.5" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Walk Score</p>
                  <p className="text-base font-bold text-foreground mt-0.5">{property.walkScore || 85} / 100</p>
                  <p className="text-[10px] text-muted-foreground">Pedestrian friendly</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background p-3.5 text-center">
                  <Clock className="h-4 w-4 text-primary mx-auto mb-1.5" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Listing Age</p>
                  <p className="text-base font-bold text-foreground mt-0.5">{property.daysOnMarket || 8} days</p>
                  <p className="text-[10px] text-muted-foreground">Active on market</p>
                </div>
              </div>

              {/* Audit Checkpoints */}
              <div className="space-y-2.5 pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ClipboardCheck className="h-3.5 w-3.5 text-primary" /> Verification Checklist
                </p>
                <div className="grid sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background border border-border/50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Title Document Checked</p>
                      <p className="text-[10px] text-muted-foreground">Clear legal ownership on file</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background border border-border/50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">On-Site Inspection Cleared</p>
                      <p className="text-[10px] text-muted-foreground">Independent report verified</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background border border-border/50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Licensed Agent Verified</p>
                      <p className="text-[10px] text-muted-foreground">Authorized representative active</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background border border-border/50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Automated Valuation Alignment</p>
                      <p className="text-[10px] text-muted-foreground">Priced within market brackets</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── 7. 3D Tour Embed (if available) ── */}
          {property.virtual_tour_url && (
            <div className="space-y-4">
              <h2 className="font-serif text-2xl font-semibold text-foreground flex items-center gap-2">
                <Maximize2 className="h-5 w-5 text-primary" /> Interactive 3D Tour
              </h2>
              <div className="aspect-video w-full rounded-2xl overflow-hidden border border-border/60 shadow-sm bg-black">
                <VirtualTourEmbed url={property.virtual_tour_url} title={`${property.title} — 3D Tour`} />
              </div>
            </div>
          )}

          {/* ── 8. Features & Amenities Presentation ── */}
          {property.property_type !== 'land' && (interior_features.length > 0 || exterior_features.length > 0) && (
            <div className="space-y-6">
              <h2 className="font-serif text-2xl font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" /> Features & Specifications
              </h2>

              <div className="grid gap-8 sm:grid-cols-2">
                {interior_features.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Interior Highlights
                    </h3>
                    <ul className="space-y-2.5">
                      {interior_features.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/80 font-medium">
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {exterior_features.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Exterior & Building Amenities
                    </h3>
                    <ul className="space-y-2.5">
                      {exterior_features.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/80 font-medium">
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── 9. Location & Neighborhood Map ── */}
          <div id="location-map-section" className="space-y-6 pt-6 border-t border-border/60">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Location Profile</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                {property.city ? `${property.neighborhood || property.city}, ${property.state || 'US'}` : "Neighborhood & Surroundings"}
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl">
                {property.address || "Precise location details provided upon inquiry and site booking."}
              </p>
            </div>

            {/* Interactive Leaflet/OpenStreetMap Map (Zero Heavy Dark Overlays) */}
            <div className="rounded-2xl overflow-hidden border border-border/60 relative shadow-sm bg-muted/20">
              <div className="aspect-[16/9] md:aspect-[21/9] max-h-[380px] w-full relative">
                <Suspense fallback={
                  <div className="h-full w-full flex flex-col items-center justify-center bg-muted/30 animate-pulse">
                    <MapPin className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground font-medium">Loading map...</p>
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

              {/* Minimal floating address card with directions */}
              <div className="p-3 sm:p-4 bg-card/95 backdrop-blur-md border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate max-w-xs sm:max-w-md">{property.address || property.locations?.name || "Standard Metropolitan Area"}</span>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-lg" asChild>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address || property.title)}`} target="_blank" rel="noreferrer">
                    Get Directions <ExternalLink className="ml-1.5 h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Local Amenities Points of Interest */}
            {nearbyPois.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nearby Points of Interest</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {nearbyPois.map((poi, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-xs font-semibold text-foreground truncate" title={poi.name}>{poi.name}</span>
                      </div>
                      {poi.distance_km && (
                        <span className="text-[11px] font-mono text-muted-foreground shrink-0">{poi.distance_km} km</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 10. Financial Calculators ── */}
          {property.is_investment ? (
            <div className="pt-6 border-t border-border/60">
              <YieldCalculator 
                unitPrice={Number(property.unit_price || property.price)} 
                currency={property.currency || 'USD'} 
                expectedYield={Number(property.expected_return || 12)} 
              />
            </div>
          ) : property.property_type !== 'land' ? (
            <div className="pt-6 border-t border-border/60">
              <MortgageCalculator price={Number(property.price)} currency={property.currency || 'USD'} />
            </div>
          ) : null}

          {/* ── 11. Property Reviews ── */}
          <div className="pt-6 border-t border-border/60">
            <Reviews target={{ propertyId: property.id }} />
          </div>

          {/* ── 12. Agent Reviews ── */}
          {agent && (
            <div className="pt-6 border-t border-border/60 space-y-4">
              <h2 className="font-serif text-xl font-semibold text-foreground flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" /> Verified Agent Feedback
              </h2>
              <AgentReviews agentId={agent.id} agentName={agent.full_name} propertyId={property.id} />
            </div>
          )}
        </div>

        {/* ── 13. Desktop Sticky Action Sidebar ── */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {/* Reservation / Transaction Card */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price Summary</p>
              <p className="font-serif text-3xl font-bold text-foreground mt-0.5">
                {formatPrice(Number(property.price), property.currency, property.property_type)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Status: <span className="font-semibold text-foreground capitalize">{statusLabel(property.status)}</span>
              </p>
            </div>

            <Separator className="bg-border/60" />

            {/* Approved Reservation State -> Complete Payment */}
            {userReservation?.status === 'approved' || userReservation?.status === 'confirmed' ? (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 text-emerald-800 dark:text-emerald-200 text-xs">
                  <p className="font-semibold">Reservation Confirmed</p>
                  <p className="mt-0.5 opacity-90">Your reservation has been approved. You can now complete checkout.</p>
                </div>

                {installmentEnabled && (
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/50">
                    <button 
                      onClick={() => setPaymentMode("full")}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        paymentMode === "full" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Full Payment
                    </button>
                    <button 
                      onClick={() => setPaymentMode("installment")}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        paymentMode === "installment" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Installment Plan
                    </button>
                  </div>
                )}

                {paymentMode === "full" ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-accent/40 border border-primary/20">
                    <span className="text-xs font-medium text-foreground">Remaining Balance</span>
                    <span className="text-base font-bold text-primary font-serif">
                      {formatPrice(remainingBalance, property.currency, property.property_type)}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-accent/40 border border-primary/20">
                      <span className="text-xs font-medium text-foreground">Down Payment ({minDownPct}%)</span>
                      <span className="text-base font-bold text-primary font-serif">
                        {formatPrice(downPaymentAmount, property.currency, property.property_type)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
                      <span className="text-xs font-medium text-muted-foreground">{durationMonths} Monthly Installments</span>
                      <span className="text-sm font-semibold text-foreground font-serif">
                        {formatPrice(monthlyInstallment, property.currency, property.property_type)} / mo
                      </span>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-border/50 bg-background p-3.5 space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground">Select Payment Method</p>
                  <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
                </div>

                <Button 
                  className="w-full h-11 bg-primary text-primary-foreground font-semibold rounded-xl shadow-xs hover:bg-primary/90 transition-all"
                  onClick={() => setPaymentModalOpen(true)}
                >
                  {paymentMode === "installment" ? "Initialize Installment Schedule" : "Complete Purchase via Escrow"}
                </Button>
              </div>
            ) : (
              /* Standard Action */
              <div className="space-y-4">
                {property.status === 'available' && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-accent/30 border border-border/50">
                    <span className="text-xs font-medium text-muted-foreground">Reservation Deposit</span>
                    <span className="text-sm font-bold text-primary font-serif">500.00 USD</span>
                  </div>
                )}

                <Button 
                  className="w-full h-11 bg-primary text-primary-foreground font-semibold rounded-xl shadow-xs hover:bg-primary/90 transition-all disabled:opacity-50"
                  disabled={property.status !== 'available'}
                  onClick={() => {
                    if (!user) {
                      toast({ title: "Sign in required", description: "Please sign in or create an account to reserve this listing." });
                      return;
                    }
                    setReserveOpen(true);
                  }}
                >
                  {primaryActionLabel}
                </Button>

                <p className="text-[11px] text-center text-muted-foreground">
                  {property.status === 'available' 
                    ? "Secured by standard client escrow agreement" 
                    : "This listing is currently not open for reservation"}
                </p>
              </div>
            )}
          </div>

          {/* Dedicated Agent Card */}
          {agent && (
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <LazyImage 
                    src={resolveImage(agent.photo_url)} 
                    alt={agent.full_name} 
                    aspectClass="" 
                    wrapperClassName="h-14 w-14 rounded-xl overflow-hidden shadow-2xs"
                    className="h-full w-full object-cover border border-border/60" 
                  />
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-primary rounded-full border-2 border-card flex items-center justify-center">
                    <ShieldCheck className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-base font-bold text-foreground truncate">{agent.full_name}</p>
                  <p className="text-xs text-primary font-medium">{agent.role_title || "Property Specialist"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {agent.phone && (
                  <Button asChild variant="outline" size="sm" className="h-9 text-xs font-semibold rounded-xl">
                    <a href={`tel:${agent.phone}`}><Phone className="mr-1.5 h-3.5 w-3.5 text-primary" /> Call</a>
                  </Button>
                )}
                {agent.whatsapp && (
                  <Button asChild variant="outline" size="sm" className="h-9 text-xs font-semibold rounded-xl text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                    <a href={`https://wa.me/${agent.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                      <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> WhatsApp
                    </a>
                  </Button>
                )}
              </div>

              {agent.user_id && (
                <MessageAgentButton
                  agentUserId={agent.user_id}
                  agentName={agent.full_name}
                  propertyId={property.id}
                  propertyTitle={property.title}
                />
              )}

              <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="w-full h-10 text-xs font-semibold rounded-xl">
                    <Calendar className="mr-1.5 h-3.5 w-3.5 text-primary" /> 
                    {property.property_type === 'land' ? "Schedule Site Inspection" : "Schedule Viewing"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader className="bg-primary pb-4">
                    <DialogTitle className="font-serif text-xl text-white">
                      {property.property_type === 'land' ? "Schedule Site Inspection" : "Schedule a Viewing"}
                    </DialogTitle>
                    <p className="text-xs text-white/80">{property.title}</p>
                  </DialogHeader>
                  <DialogBody className="py-4">
                    <BookingForm propertyId={property.id} agentId={agent.id} onSuccess={() => setBookingOpen(false)} />
                  </DialogBody>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Quick Inquiry Form */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs space-y-3">
            <h3 className="font-serif text-base font-semibold text-foreground">Have Questions?</h3>
            <p className="text-xs text-muted-foreground">Send a direct message to our listing desk for expedited response.</p>
            <div className="pt-2">
              <InquiryForm propertyId={property.id} agentId={agent?.id ?? null} />
            </div>
          </div>

          {/* Promotional Banner Widget */}
          <PromoBanner placement="property_detail" />
        </aside>
      </section>

      {/* ── 14. Related Similar Properties Section ── */}
      {related.length > 0 && (
        <section className="border-t border-border/60 bg-muted/20 py-16">
          <div className="container-wide space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Discover More</span>
                <h2 className="font-serif text-2xl font-bold text-foreground mt-0.5">Similar Listings</h2>
              </div>
              <Button asChild variant="ghost" className="text-xs font-semibold text-primary hover:bg-primary/5">
                <Link to="/properties">View All Listings <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {related.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 15. Mobile Floating Sticky Bottom Action Bar ── */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/60 p-3 sm:hidden shadow-lg flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Price</p>
          <p className="font-serif text-base font-bold text-foreground truncate">
            {formatPrice(Number(property.price), property.currency, property.property_type)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={toggleSave}
            className={`h-10 w-10 rounded-xl ${saved ? "text-primary border-primary bg-primary/5" : ""}`}
            aria-label="Save listing"
          >
            <Heart className={`h-4 w-4 ${saved ? "fill-primary text-primary" : ""}`} />
          </Button>

          <Button 
            className="h-10 px-4 text-xs font-semibold rounded-xl bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
            disabled={property.status !== 'available' && userReservation?.status !== 'approved' && userReservation?.status !== 'confirmed'}
            onClick={() => {
              if (userReservation?.status === 'approved' || userReservation?.status === 'confirmed') {
                setPaymentModalOpen(true);
              } else if (!user) {
                toast({ title: "Sign in required", description: "Please sign in to reserve this listing." });
              } else {
                setReserveOpen(true);
              }
            }}
          >
            {primaryActionLabel}
          </Button>
        </div>
      </div>

      {/* ── 16. Modals (Reserve & Manual Payment) ── */}
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
