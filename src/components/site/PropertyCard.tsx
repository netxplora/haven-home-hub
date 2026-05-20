import { memo } from "react";
import { Link } from "react-router-dom";
import { Bed, Bath, Maximize2, MapPin, Car, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { propertyTypeLabel, resolveImage } from "@/lib/format";
import { useCompare } from "@/hooks/useCompare";
import { useFormatPrice } from "@/hooks/useFormatPrice";
import { Scale } from "lucide-react";

export interface PropertyCardData {
  id: string;
  slug: string;
  title: string;
  price: number;
  currency: string;
  property_type: "buy" | "rent" | "land";
  status: "available" | "reserved" | "sold" | "under_offer";
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking_spaces?: number | null;
  size_sqm?: number | null;
  cover_image_url?: string | null;
  address?: string | null;
  featured?: boolean;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  property_category?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locations?: { name: string } | null;
  created_at?: string;
}

export const PropertyCard = memo(function PropertyCard({ property }: { property: PropertyCardData }) {
  const img = resolveImage(property.cover_image_url);
  const { addToCompare, compareList } = useCompare();
  const formatPrice = useFormatPrice();
  
  const statusConfig = {
    reserved: { label: "Reserved", className: "bg-secondary text-secondary-foreground" },
    sold: { label: "Sold", className: "bg-destructive text-destructive-foreground" },
    under_offer: { label: "Under Offer", className: "bg-primary text-primary-foreground" },
    available: null
  }[property.status];

  const inCompare = compareList.some(p => p.id === property.id);
  const isNew = property.created_at ? new Date(property.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : false;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-soft transition-all duration-300 hover:shadow-card hover:border-border">
      <Link to={`/properties/${property.slug}`} className="absolute inset-0 z-0" />
      
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted pointer-events-none">
        <img
          src={img}
          alt={property.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <Badge className="bg-white/95 text-foreground hover:bg-white border-none shadow-sm text-xs font-medium px-2.5 py-1">
              {propertyTypeLabel(property.property_type)}
            </Badge>
            {property.featured && (
              <Badge className="bg-primary text-primary-foreground border-none shadow-sm gap-1 text-xs px-2.5 py-1">
                <Star className="h-3 w-3 fill-current" /> Featured
              </Badge>
            )}
            {isNew && (
              <Badge className="bg-emerald-500 text-white border-none shadow-sm gap-1 text-xs px-2.5 py-1">
                New Listing
              </Badge>
            )}
          </div>
          {statusConfig && (
            <Badge className={`${statusConfig.className} border-none shadow-sm text-[10px] font-semibold uppercase tracking-wider py-1 px-2.5 w-fit`}>
              {statusConfig.label}
            </Badge>
          )}
        </div>
        
        {/* Compare button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!inCompare) {
              addToCompare({
                id: property.id,
                title: property.title,
                price: property.price,
                currency: property.currency,
                property_type: property.property_type,
                cover_image_url: property.cover_image_url || null
              });
            }
          }}
          className={`absolute top-3 right-3 h-8 w-8 rounded-lg flex items-center justify-center transition-all z-20 pointer-events-auto ${
            inCompare 
              ? 'bg-primary text-primary-foreground shadow-sm' 
              : 'bg-white/90 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-white hover:text-foreground shadow-sm'
          }`}
          title={inCompare ? "Added to compare" : "Add to compare"}
        >
          <Scale className="h-3.5 w-3.5" />
        </button>
      </div>
      
      {/* Content */}
      <div className="relative z-10 p-3 sm:p-5 pointer-events-none flex flex-col h-full">
        <p className="font-serif text-lg sm:text-xl font-semibold text-primary">
          {formatPrice(property.price, property.currency, property.property_type)}
        </p>
        <h3 className="mt-1 sm:mt-1.5 line-clamp-1 text-sm sm:text-[15px] font-medium text-foreground">
          {property.title}
        </h3>
        <p className="mt-1 sm:mt-1.5 flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-muted-foreground">
          <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
          <span className="line-clamp-1">
            {property.city && property.country 
              ? `${property.city}${property.state ? `, ${property.state}` : ''}, ${property.country}`
              : property.locations?.name ?? property.address ?? "—"}
          </span>
        </p>
        
        {/* Specs */}
        <div className="mt-auto pt-3 sm:pt-4 border-t border-border/50 flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-1 sm:gap-y-1.5 text-[10px] sm:text-xs text-muted-foreground">
          {property.bedrooms != null && (
            <span className="flex items-center gap-1"><Bed className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {property.bedrooms}</span>
          )}
          {property.bathrooms != null && (
            <span className="flex items-center gap-1"><Bath className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {property.bathrooms}</span>
          )}
          {property.size_sqm != null && (
            <span className="flex items-center gap-1"><Maximize2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {Number(property.size_sqm).toLocaleString()} sqm</span>
          )}
        </div>
      </div>
    </div>
  );
});