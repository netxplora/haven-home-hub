import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix leaflet default marker icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
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
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogBody } from "@/components/ui/dialog";
import { InquiryForm } from "@/components/site/InquiryForm";
import { BookingForm } from "@/components/site/BookingForm";
import { formatPrice, propertyTypeLabel, statusLabel, resolveImage } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { PropertyCard, PropertyCardData } from "@/components/site/PropertyCard";
import { Reviews } from "@/components/site/Reviews";
import { SEO } from "@/components/site/SEO";
import { PropertyGallery } from "@/components/site/PropertyGallery";
import { Separator } from "@/components/ui/separator";
import { ReserveDialog } from "@/components/invest/ReserveDialog";
import { MortgageCalculator } from "@/components/site/MortgageCalculator";
import { YieldCalculator } from "@/components/site/YieldCalculator";
import { ManualPaymentModal } from "@/components/dashboard/ManualPaymentModal";

export default function PropertyDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<any>("crypto");

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
  const features: string[] = Array.isArray(property.features) ? property.features as string[] : [];
  const nearbyPois: any[] = Array.isArray(property.nearby_pois) ? property.nearby_pois : [];

  return (
    <SiteLayout>
      <SEO title={property.title} description={property.description?.slice(0, 160)} image={resolveImage(property.cover_image_url)} />
      
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
                    className="rounded-lg font-medium"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast({ title: "Link Copied", description: "Property link copied to clipboard." });
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" /> Share
                  </Button>
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
          {features.length > 0 && (
            <div className="space-y-8">
              <h2 className="font-serif text-xl font-semibold flex items-center gap-2.5 text-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary" /> Amenities & Features
              </h2>
              
              <div className="grid gap-10 sm:grid-cols-2">
                {(() => {
                  const categories = {
                    "Interior & Comfort": ["AC", "Air Conditioning", "Heating", "Smart Home", "Chef's Kitchen", "Fitted Kitchen", "Wine Cellar", "Private Cinema", "Home Office", "Marble Floors", "High Ceilings", "Elevator"],
                    "Exterior & Lifestyle": ["Pool", "Swimming Pool", "Infinity Pool", "Garden", "Balcony", "Terrace", "Rooftop Terrace", "Lagoon View", "Waterfront", "Private Dock", "City Views", "Staff Quarters"],
                    "Security & Utility": ["Security", "CCTV", "Gated Estate", "Bulletproof Security", "Secure Compound", "Backup Power", "Power Backup", "24/7 Power", "Ample Parking", "Customer Parking"],
                  };

                  const grouped: Record<string, string[]> = {};
                  const unmatched: string[] = [];

                  features.forEach(f => {
                    let found = false;
                    for (const [cat, keywords] of Object.entries(categories)) {
                      if (keywords.some(k => f.toLowerCase().includes(k.toLowerCase()))) {
                        if (!grouped[cat]) grouped[cat] = [];
                        grouped[cat].push(f);
                        found = true;
                        break;
                      }
                    }
                    if (!found) unmatched.push(f);
                  });

                  return (
                    <>
                      {Object.entries(grouped).map(([cat, items]) => (
                        <div key={cat} className="space-y-4">
                          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {cat}
                          </h3>
                          <div className="grid gap-3">
                            {items.map(f => (
                              <div key={f} className="flex items-center gap-3">
                                <Check className="h-4 w-4 text-primary shrink-0" />
                                <span className="text-sm font-medium text-foreground/80">{f}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {unmatched.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Additional Features
                          </h3>
                          <div className="grid gap-3">
                            {unmatched.map(f => (
                              <div key={f} className="flex items-center gap-3">
                                <Check className="h-4 w-4 text-primary shrink-0" />
                                <span className="text-sm font-medium text-foreground/80">{f}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Location & Neighborhood */}
          <div className="space-y-8">
            <h2 className="font-serif text-xl font-semibold flex items-center gap-2.5 text-foreground">
              <MapIcon className="h-5 w-5 text-primary" /> Neighborhood & Location
            </h2>
            
            <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
              <div className="space-y-6">
                <div className="aspect-[21/9] w-full rounded-xl overflow-hidden border border-border bg-muted relative group z-0">
                  {property.latitude && property.longitude ? (
                    <MapContainer 
                      center={[property.latitude, property.longitude]} 
                      zoom={14} 
                      scrollWheelZoom={false}
                      className="h-full w-full z-0"
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[property.latitude, property.longitude]} />
                    </MapContainer>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-secondary/20">
                      <p className="text-muted-foreground font-medium flex items-center gap-2">
                        <MapPin className="h-5 w-5" /> Location coordinates not available
                      </p>
                    </div>
                  )}
                  <div className="absolute inset-0 pointer-events-none bg-primary/5 group-hover:bg-transparent transition-colors z-10" />
                  <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-background/90 backdrop-blur-md border border-border shadow-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Exact Address</p>
                      <p className="text-sm font-bold truncate">{property.address}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="rounded-xl text-primary font-bold hover:bg-primary/5" asChild>
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address || property.title)}`} target="_blank" rel="noreferrer">
                        Open Maps <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-6 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">Viewing Schedule</p>
                      <p className="text-sm font-medium leading-relaxed italic text-foreground/80">
                        {property.inspection_availability || "Available for viewing Monday to Saturday, 9AM - 5PM."}
                      </p>
                    </div>
                  </div>
                  <div className="p-6 rounded-xl bg-accent/50 border border-border flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center text-muted-foreground shrink-0">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Neighborhood Type</p>
                      <p className="text-sm font-bold text-foreground/80">Prime {property.property_type === 'commercial' ? 'Business' : 'Residential'} District</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="font-serif text-lg font-bold text-foreground flex items-center justify-between">
                  Nearby Essentials
                  <Badge variant="outline" className="rounded-md border-primary/20 text-primary font-bold text-[9px] uppercase tracking-wider">{nearbyPois.length} Found</Badge>
                </h3>
                <div className="space-y-3">
                  {nearbyPois.length > 0 ? nearbyPois.map((poi, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/20 hover:shadow-sm transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                          {poi.type.toLowerCase().includes('school') ? <Building2 className="h-5 w-5" /> : 
                           poi.type.toLowerCase().includes('hospital') ? <ShieldCheck className="h-5 w-5" /> : 
                           <MapPin className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold leading-none">{poi.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-bold">{poi.type}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-accent text-muted-foreground group-hover:text-primary transition-colors">{poi.distance}</span>
                    </div>
                  )) : (
                    <div className="p-8 text-center rounded-xl border border-dashed border-border bg-secondary/5">
                      <p className="text-xs text-muted-foreground italic">No nearby points of interest listed.</p>
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
        </div>

        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {agent && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-card overflow-hidden">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={resolveImage(agent.photo_url)} alt={agent.full_name}
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
              
              <div className="mt-6 grid grid-cols-2 gap-3">
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
              {userReservation?.status === 'confirmed' ? 'Complete Purchase' : property.status === 'reserved' ? 'Property Reserved' : property.status === 'under_offer' ? 'Reservation Pending' : 'Reserve Property'}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {userReservation?.status === 'confirmed'
                ? 'Your reservation is approved. You can now complete the final purchase of this property.'
                : property.status === 'reserved' 
                ? 'This property has been officially reserved and is currently off the market.' 
                : property.status === 'under_offer'
                ? 'Someone has submitted a reservation for this property. It is currently under offer.'
                : 'Hold this property for 7 days to finalize your purchase.'}
            </p>
            {userReservation?.status !== 'confirmed' && (
              <div className="mt-5 flex items-center justify-between p-3.5 rounded-lg bg-accent/50 border border-border/50">
                <span className="text-xs font-medium text-muted-foreground">Reservation Fee</span>
                <span className="text-lg font-semibold text-primary font-serif">500.00 USD</span>
              </div>
            )}
            
            {userReservation?.status === 'confirmed' ? (
              <div className="space-y-4 mt-5">
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-primary/5 border border-primary/20">
                  <span className="text-xs font-medium text-primary">Remaining Balance</span>
                  <span className="text-lg font-semibold text-primary font-serif">
                    {formatPrice(Number(property.price) - 500, property.currency, property.property_type)}
                  </span>
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
                {property.status === 'available' ? 'Reserve Now' : property.status === 'reserved' ? 'Already Reserved' : 'Under Offer'}
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
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
        />
      )}
    </SiteLayout>
  );
}