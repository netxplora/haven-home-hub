import { Link } from "react-router-dom";
import { Bed, Bath, Maximize2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice, propertyTypeLabel, resolveImage } from "@/lib/format";

export interface PropertyCardData {
  id: string;
  slug: string;
  title: string;
  price: number;
  currency: string;
  property_type: "buy" | "rent" | "land";
  status: "available" | "reserved" | "sold";
  bedrooms?: number | null;
  bathrooms?: number | null;
  size_sqm?: number | null;
  cover_image_url?: string | null;
  address?: string | null;
  locations?: { name: string } | null;
}

export function PropertyCard({ property }: { property: PropertyCardData }) {
  const img = resolveImage(property.cover_image_url);
  return (
    <Link
      to={`/properties/${property.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-card"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={img}
          alt={property.title}
          loading="lazy"
          width={1280}
          height={960}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          <Badge className="bg-background/90 text-foreground hover:bg-background">
            {propertyTypeLabel(property.property_type)}
          </Badge>
          {property.status !== "available" && (
            <Badge variant="secondary">{property.status}</Badge>
          )}
        </div>
      </div>
      <div className="space-y-3 p-5">
        <div>
          <p className="font-serif text-xl font-semibold text-foreground">
            {formatPrice(property.price, property.currency, property.property_type)}
          </p>
          <h3 className="mt-1 line-clamp-1 text-base font-medium text-foreground">{property.title}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="line-clamp-1">{property.locations?.name ?? property.address ?? "—"}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
          {property.bedrooms != null && (
            <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" /> {property.bedrooms} bd</span>
          )}
          {property.bathrooms != null && (
            <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" /> {property.bathrooms} ba</span>
          )}
          {property.size_sqm != null && (
            <span className="flex items-center gap-1"><Maximize2 className="h-3.5 w-3.5" /> {property.size_sqm.toLocaleString()} m²</span>
          )}
        </div>
      </div>
    </Link>
  );
}