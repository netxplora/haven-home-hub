import { useState, useEffect, lazy, Suspense } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Bed, 
  Bath, 
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
import { propertyTypeLabel, statusLabel, resolveImage } from "@/lib/format";
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

const InteractivePropertyMap = lazy(() => import("@/components/site/InteractivePropertyMap").then(mod => ({ default: mod.InteractivePropertyMap })));

export default function PropertyDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<any>("digital_currency");
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
  const property = rawProperty as any;

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
          <h1 className="font-serif text-3xl">Listing not found</h1>
          <Button asChild className="mt-6"><Link to="/properties">Back to listings</Link></Button>
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

  return (
    <SiteLayout>
      <SEO title={property.title} description={property.description?.slice(0, 160)} image={resolveImage(property.cover_image_url)} />
      <PropertyJsonLd property={property} />
      
      <div className="container-wide pt-8 pb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link to="/properties" className="hover:text-primary transition-colors">Marketplace</Link>
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
                <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">Listing Price</p>
                <p className="font-serif text-3xl font-semibold text-foreground">
                  {formatPrice(Number(property.price), property.currency, property.property_type)}
                </p>
                <div className="flex items-center justify-end gap-3 mt-4">
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
                    <ExternalLink className="h-4 w-4 mr-2" /> Share
                  </Button>
                  {property.virtual_tour_url && (
                    <VirtualTourButton url={property.virtual_tour_url} title={`${property.title} — 3D Tour`} />
                  )}
                </div>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border bg-card p-4 text-center group hover:border-primary/30 transition-colors">
                <Bed className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Bedrooms</p>
                <p className="text-lg font-bold">{property.bedrooms ?? "—"}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 text-center group hover:border-primary/30 transition-colors">
                <Bath className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Bathrooms</p>
                <p className="text-lg font-bold">{property.bathrooms ?? "—"}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 text-center group hover:border-primary/30 transition-colors">
                <Car className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Parking</p>
                <p className="text-lg font-bold">{property.parking_spaces ?? "0"}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 text-center group hover:border-primary/30 transition-colors">
                <Maximize2 className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total Area</p>
                <p className="text-lg font-bold">{Number(property.size_sqm).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">sq ft</span></p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h2 className="font-serif text-xl font-semibold flex items-center gap-2.5 text-foreground">
              <FileText className="h-5 w-5 text-primary" /> Description
            </h2>
            <div className="mt-6">
              <p className="whitespace-pre-line leading-relaxed text-foreground/80 text-lg">
                {property.description}
              </p>
            </div>
          </div>

          {/* 3D Virtual Tour */}
          {property.virtual_tour_url && (
            <VirtualTourEmbed url={property.virtual_tour_url} title={`${property.title} — 3D Tour`} />
          )}

          {/* Key Details Grid */}
          <div className="rounded-xl bg-accent/50 p-8 border border-border/50">
            <h2 className="font-serif text-lg font-semibold mb-5 text-foreground">Property Overview</h2>
            <div className="grid gap-y-6 gap-x-12 sm:grid-cols-2">
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-sm text-muted-foreground flex items-center gap-2 font-medium"><Hash className="h-4 w-4" /> Property ID</span>
                <span className="text-sm font-bold font-mono">{property.internal_id || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-sm text-muted-foreground flex items-center gap-2 font-medium"><Building2 className="h-4 w-4" /> Property Type</span>
                <span className="text-sm font-bold capitalize">{property.property_type}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-sm text-muted-foreground flex items-center gap-2 font-medium"><Clock className="h-4 w-4" /> Year Built</span>
                <span className="text-sm font-bold">{property.year_built || "Modern"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-sm text-muted-foreground flex items-center gap-2 font-medium"><Calendar className="h-4 w-4" /> Listing Date</span>
                <span className="text-sm font-bold">{new Date(property.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
          </div>

          {/* Features & Amenities */}
          {(interior_features.length > 0 || exterior_features.length > 0) && (
            <div className="space-y-8">
              <h2 className="font-serif text-xl font-semibold flex items-center gap-2.5 text-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary" /> Amenities & Features
              </h2>
              
              <div className="grid gap-10 sm:grid-cols-2">
                {interior_features.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Interior Features
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
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Exterior Features
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

          {/* Location & Neighborhood */}
          <div className="space-y-8 mt-16 pt-12 border-t border-gray-200">
            <div className="flex flex-col gap-2">
              <h2 className="font-serif text-3xl font-bold text-gray-900">
                Neighborhood & Location
              </h2>
              <p className="text-gray-600 max-w-2xl text-lg">
                Explore the surrounding area, local amenities, and the unique characteristics that make this location desirable.
              </p>
            </div>
            
            <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
              <div className="space-y-6">
                {/* Map Container */}
                <div className="h-[320px] md:h-[480px] w-full rounded-xl overflow-hidden border border-gray-200 relative z-0 flex flex-col">
                  <Suspense fallback={
                    <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 animate-pulse">
                      <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm border border-gray-100">
                        <MapPin className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium font-sans">Loading interactive map...</p>
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
                  
                  {/* Overlay Banner */}
                  <div className="pointer-events-none absolute bottom-6 left-6 right-6 p-4 rounded-lg bg-white/95 backdrop-blur border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-20">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Registered Address</p>
                        <p className="text-base sm:text-lg font-bold leading-tight text-gray-900 line-clamp-1">{property.address || "Location on request"}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="pointer-events-auto rounded-lg font-bold border-gray-300 text-gray-700 hover:bg-gray-50 shrink-0" asChild>
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address || property.title)}`} target="_blank" rel="noreferrer">
                        Get Directions <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Location Quick Stats */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm flex flex-col justify-between">
                    <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 shrink-0 mb-3">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Viewing Schedule</p>
                      <p className="text-sm font-medium leading-relaxed text-gray-900">
                        {property.inspection_availability || "Available for viewing Monday to Saturday, 9AM - 5PM."}
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm flex flex-col justify-between">
                    <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 shrink-0 mb-3">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">District Profile</p>
                      <p className="text-sm font-medium leading-relaxed text-gray-900">
                        Premium {property.property_type === 'commercial' ? 'Business' : 'Residential'} District
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nearby POIs */}
              <div className="space-y-4 flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <h3 className="font-serif text-xl font-bold text-gray-900">
                    Local Amenities
                  </h3>
                  <span className="text-sm font-medium text-gray-500">
                    {nearbyPois.length} Found
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar max-h-[600px]">
                  {nearbyPois.length > 0 ? nearbyPois.map((poi, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:border-gray-200 transition-colors">
                      <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 shrink-0">
                        {poi.type.toLowerCase().includes('school') ? <Building2 className="h-4 w-4" /> : 
                         poi.type.toLowerCase().includes('hospital') ? <ShieldCheck className="h-4 w-4" /> : 
                         poi.type.toLowerCase().includes('shopping') ? <MapPin className="h-4 w-4" /> :
                         <MapPin className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{poi.name}</p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">{poi.type}</p>
                      </div>
                      {poi.distance_km && (
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-gray-900">{poi.distance_km} km</p>
                          <p className="text-[10px] text-gray-500 font-medium uppercase">Distance</p>
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="h-full min-h-[200px] flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50">
                      <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm border border-gray-100">
                        <MapPin className="h-5 w-5 text-gray-400" />
                      </div>
                      <p className="font-serif text-base font-bold text-gray-900">No specific amenities listed</p>
                      <p className="mt-1 text-sm text-gray-500">Check the map view for a general overview.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>


          {property.video_url && (
            <div className="mt-8">
              <h2 className="font-serif text-2xl font-bold flex items-center gap-3 text-foreground">
                <Maximize2 className="h-6 w-6 text-primary" /> Property Tour
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
                <Star className="h-5 w-5 text-amber-400" /> Agent Reviews
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
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-emerald-500 rounded-full border-4 border-card flex items-center justify-center">
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
                    <a href={`tel:${agent.phone}`}><Phone className="mr-2 h-4 w-4" /> Call Agent</a>
                  </Button>
                )}
                {agent.whatsapp && (
                  <Button asChild variant="outline" className="rounded-xl h-11 border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 shadow-sm font-bold text-xs">
                    <a href={`https://wa.me/${agent.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                      <MessageSquare className="mr-2 h-4 w-4" /> WhatsApp</a>
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
                      <Calendar className="mr-2 h-4 w-4" /> Schedule Viewing
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader className="bg-primary pb-6">
                      <DialogTitle className="font-serif text-2xl text-white">Schedule a Viewing</DialogTitle>
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
              {userReservation?.status === 'confirmed' 
                ? 'Complete Purchase' 
                : ['reserved', 'sold', 'rented', 'unavailable', 'payment_under_review'].includes(property.status) 
                  ? `Property ${property.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}`
                  : 'Reserve Property'}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {userReservation?.status === 'confirmed'
                ? 'Your reservation is approved. You can now complete the final purchase of this property.'
                : property.status === 'reserved' 
                ? 'This property has been officially reserved and is currently off the market.' 
                : property.status === 'sold'
                ? 'This property has been sold and is no longer available.'
                : property.status === 'rented'
                ? 'This property is currently rented out.'
                : property.status === 'payment_under_review'
                ? 'A payment for this property is currently being reviewed.'
                : property.status === 'unavailable'
                ? 'This property is currently not available for purchase.'
                : 'Hold this property for 7 days to finalize your purchase.'}
            </p>
            {(!userReservation || userReservation.status !== 'confirmed') && property.status === 'available' && (
              <div className="mt-5 flex items-center justify-between p-3.5 rounded-lg bg-accent/50 border border-border/50">
                <span className="text-xs font-medium text-muted-foreground">Reservation Fee</span>
                <span className="text-lg font-semibold text-primary font-serif">500.00 USD</span>
              </div>
            )}
            
            {userReservation?.status === 'confirmed' ? (
              <div className="space-y-5 mt-5">
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-primary/5 border border-primary/20">
                  <span className="text-xs font-medium text-primary">Remaining Balance</span>
                  <span className="text-lg font-semibold text-primary font-serif">
                    {formatPrice(Number(property.price) - 500, property.currency, property.property_type)}
                  </span>
                </div>
                
                <div className="rounded-xl border border-border/50 bg-secondary/5 p-4 space-y-3">
                  <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
                </div>

                <Button 
                  className="w-full h-11 bg-primary text-primary-foreground font-medium rounded-lg shadow-sm hover:bg-primary/90 transition-colors"
                  onClick={() => setPaymentModalOpen(true)}
                >
                  Complete Purchase
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
                  ? 'Reserve Now' 
                  : property.status === 'reserved' 
                  ? 'Already Reserved' 
                  : property.status === 'sold'
                  ? 'Sold'
                  : property.status === 'rented'
                  ? 'Rented'
                  : property.status === 'payment_under_review'
                  ? 'Payment Under Review'
                  : 'Unavailable'}
              </Button>
            )}
            
            <p className="mt-3 text-[11px] text-center text-muted-foreground">
              {property.status === 'available' || userReservation?.status === 'confirmed' ? 'Processed securely via escrow' : 'This property is currently unavailable'}
            </p>
            <ReserveDialog
              open={reserveOpen}
              onClose={() => setReserveOpen(false)}
              property={{
                id: property.id,
                title: property.title,
                currency: property.currency
              }}
              type={property.is_investment ? "investment" : "property"}
            />
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft">
            <h3 className="font-serif text-lg font-semibold text-foreground">Questions?</h3>
            <p className="mt-1 text-sm text-muted-foreground">Inquire about details or flexible payment plans.</p>
            <div className="mt-6">
              <InquiryForm propertyId={property.id} agentId={agent?.id ?? null} />
            </div>
          </div>
        </aside>
      </section>

      {/* Footer Related Listings */}
      {related.length > 0 && (
        <section className="container-wide py-16 bg-accent/40">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-serif text-2xl font-semibold">Similar Properties</h2>
              <p className="text-muted-foreground mt-1 text-sm">More listings in {property.locations?.name || "the area"}.</p>
            </div>
            <Button asChild variant="ghost" className="rounded-lg font-medium text-primary hover:bg-primary/5 group">
              <Link to="/properties">View all <ExternalLink className="ml-2 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" /></Link>
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
          amount={Number(property.price) - 500}
          currency={property.currency}
          paymentType="property"
          targetId={property.id}
          bookingId={userReservation.id}
        />
      )}
    </SiteLayout>
  );
}