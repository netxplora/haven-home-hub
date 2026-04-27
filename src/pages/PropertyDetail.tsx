import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bed, Bath, Maximize2, MapPin, Phone, MessageSquare, Heart, Calendar, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InquiryForm } from "@/components/site/InquiryForm";
import { BookingForm } from "@/components/site/BookingForm";
import { formatPrice, propertyTypeLabel, statusLabel, resolveImage } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { PropertyCard, PropertyCardData } from "@/components/site/PropertyCard";
import { Reviews } from "@/components/site/Reviews";

export default function PropertyDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeImg, setActiveImg] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);

  const { data: property, isLoading } = useQuery({
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
    return <SiteLayout><div className="container-wide py-12"><Skeleton className="h-[500px] rounded-2xl" /></div></SiteLayout>;
  }
  if (!property) {
    return (
      <SiteLayout>
        <div className="container-wide py-24 text-center">
          <h1 className="font-serif text-3xl">Property not found</h1>
          <Button asChild className="mt-6"><Link to="/properties">Back to listings</Link></Button>
        </div>
      </SiteLayout>
    );
  }

  const images = property.property_images?.length
    ? property.property_images.sort((a: any, b: any) => a.sort_order - b.sort_order).map((i: any) => resolveImage(i.url))
    : [resolveImage(property.cover_image_url)];

  const agent = property.agents as any;
  const features: string[] = Array.isArray(property.features) ? property.features as string[] : [];

  return (
    <SiteLayout>
      <div className="container-wide pt-8">
        <Link to="/properties" className="text-sm text-muted-foreground hover:text-primary">← Back to listings</Link>
      </div>

      {/* Gallery */}
      <section className="container-wide pt-4">
        <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted shadow-card md:aspect-[16/10]">
            <img src={images[activeImg]} alt={property.title} className="h-full w-full object-cover" />
            <div className="absolute left-4 top-4 flex gap-2">
              <Badge className="bg-background/95 text-foreground">{propertyTypeLabel(property.property_type)}</Badge>
              <Badge variant={property.status === "available" ? "default" : "secondary"}>{statusLabel(property.status)}</Badge>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
            {images.slice(0, 4).map((img: string, i: number) => (
              <button key={i} onClick={() => setActiveImg(i)}
                className={`relative aspect-[4/3] overflow-hidden rounded-xl ${activeImg === i ? "ring-2 ring-primary" : ""}`}>
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="container-wide grid gap-10 py-10 lg:grid-cols-[1fr_360px]">
        <div>
          <p className="text-sm font-medium text-primary">{propertyTypeLabel(property.property_type)}</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold sm:text-4xl">{property.title}</h1>
          <p className="mt-2 flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {property.address ?? property.locations?.name ?? "—"}
          </p>
          <p className="mt-4 font-serif text-3xl font-semibold text-primary">
            {formatPrice(Number(property.price), property.currency, property.property_type)}
          </p>

          <div className="mt-6 flex flex-wrap gap-6 rounded-xl border border-border bg-card p-5 shadow-soft">
            {property.bedrooms != null && (
              <div className="flex items-center gap-2"><Bed className="h-5 w-5 text-primary" /> <span><strong>{property.bedrooms}</strong> bedrooms</span></div>
            )}
            {property.bathrooms != null && (
              <div className="flex items-center gap-2"><Bath className="h-5 w-5 text-primary" /> <span><strong>{property.bathrooms}</strong> bathrooms</span></div>
            )}
            {property.size_sqm != null && (
              <div className="flex items-center gap-2"><Maximize2 className="h-5 w-5 text-primary" /> <span><strong>{Number(property.size_sqm).toLocaleString()}</strong> m²</span></div>
            )}
          </div>

          <div className="mt-8">
            <h2 className="font-serif text-xl font-semibold">About this property</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-foreground/85">{property.description}</p>
          </div>

          {features.length > 0 && (
            <div className="mt-8">
              <h2 className="font-serif text-xl font-semibold">Features</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-foreground/85">
                    <Check className="h-4 w-4 text-accent" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {property.video_url && (
            <div className="mt-8">
              <h2 className="font-serif text-xl font-semibold">Walkthrough</h2>
              <div className="mt-3 aspect-video overflow-hidden rounded-xl">
                <iframe src={property.video_url} className="h-full w-full" allowFullScreen />
              </div>
            </div>
          )}

          <Reviews target={{ propertyId: property.id }} />
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {agent && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center gap-4">
                <img src={resolveImage(agent.photo_url)} alt={agent.full_name}
                  className="h-16 w-16 rounded-full object-cover" />
                <div>
                  <p className="font-serif text-lg font-semibold">{agent.full_name}</p>
                  <p className="text-xs text-muted-foreground">{agent.role_title}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {agent.phone && (
                  <Button asChild variant="outline" size="sm">
                    <a href={`tel:${agent.phone}`}><Phone className="mr-1 h-4 w-4" /> Call</a>
                  </Button>
                )}
                {agent.whatsapp && (
                  <Button asChild variant="outline" size="sm" className="border-accent/40 text-accent hover:bg-accent/10 hover:text-accent">
                    <a href={`https://wa.me/${agent.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                      <MessageSquare className="mr-1 h-4 w-4" /> WhatsApp
                    </a>
                  </Button>
                )}
              </div>
              <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
                <DialogTrigger asChild>
                  <Button className="mt-3 w-full bg-gradient-warm hover:opacity-95">
                    <Calendar className="mr-2 h-4 w-4" /> Book inspection
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request an inspection</DialogTitle>
                  </DialogHeader>
                  <BookingForm propertyId={property.id} agentId={agent.id} onSuccess={() => setBookingOpen(false)} />
                </DialogContent>
              </Dialog>
              <Button onClick={toggleSave} variant="outline" className="mt-2 w-full">
                <Heart className={`mr-2 h-4 w-4 ${saved ? "fill-primary text-primary" : ""}`} />
                {saved ? "Saved" : "Save property"}
              </Button>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h3 className="font-serif text-lg font-semibold">Send an inquiry</h3>
            <p className="mt-1 text-sm text-muted-foreground">We&apos;ll respond within one business day.</p>
            <div className="mt-4">
              <InquiryForm propertyId={property.id} agentId={agent?.id ?? null} />
            </div>
          </div>
        </aside>
      </section>

      {related.length > 0 && (
        <section className="container-wide py-12">
          <h2 className="mb-6 font-serif text-2xl font-semibold">You may also like</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => <PropertyCard key={p.id} property={p} />)}
          </div>
        </section>
      )}
    </SiteLayout>
  );
}