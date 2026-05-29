import { memo } from "react";
import { Link } from "react-router-dom";
import { Bed, Bath, Maximize2, MapPin, Star, ArrowUpRight, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { propertyTypeLabel, resolveImage } from "@/lib/format";
import { useCompare } from "@/hooks/useCompare";
import { useFormatPrice } from "@/hooks/useFormatPrice";

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
  const { addToCompare, removeFromCompare, compareList } = useCompare();
  const formatPrice = useFormatPrice();
    
  const statusConfig = {
    reserved: { label: "Reserved", className: "bg-secondary/90 text-secondary-foreground" },
    sold: { label: "Sold", className: "bg-destructive text-destructive-foreground" },
    under_offer: { label: "Under Offer", className: "bg-primary text-primary-foreground" },
    available: null
  }[property.status];

  const inCompare = compareList.some(p => p.id === property.id);
  const isNew = property.created_at ? new Date(property.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : false;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card shadow-soft transition-all duration-550 ease-out hover:shadow-card hover:border-primary/30 hover:-translate-y-1.5 flex flex-col h-full">
      <Link to={`/properties/${property.slug}`} className="absolute inset-0 z-0" />
      
      {/* Image Block */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted pointer-events-none">
        <img
          src={img}
          alt={property.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-50 group-hover:opacity-30 transition-opacity duration-550" />
        
        {/* Glassmorphic Badges */}
        <div className="absolute left-4 top-4 flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            <Badge className="bg-background/90 text-foreground hover:bg-background border border-white/20 backdrop-blur-md shadow-sm text-xs font-semibold px-2.5 py-1">
              {propertyTypeLabel(property.property_type)}
            </Badge>
            {property.featured && (
              <Badge className="bg-primary/95 text-primary-foreground border border-primary/20 backdrop-blur-sm shadow-sm gap-1 text-xs px-2.5 py-1">
                <Star className="h-3 w-3 fill-current" /> {"Featured"}
              </Badge>
            )}
            {isNew && (
              <Badge className="bg-primary/90 text-white border border-primary/ backdrop-blur-sm shadow-sm text-xs px-2.5 py-1">
                {"New Listing"}
              </Badge>
            )}
          </div>
          {statusConfig && (
            <Badge className={`${statusConfig.className} border border-white/10 backdrop-blur-md shadow-sm text-[10px] font-bold uppercase tracking-wider py-1 px-2.5 w-fit`}>
              {statusConfig.label}
            </Badge>
          )}
        </div>
        
        {/* Interactive Compare button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (inCompare) {
              removeFromCompare(property.id);
            } else {
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
          className={`absolute top-4 right-4 h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-300 ease-out z-20 pointer-events-auto shadow-md border ${
            inCompare 
              ? 'bg-primary text-primary-foreground border-primary/30' 
              : 'bg-background/85 text-muted-foreground border-white/20 opacity-0 group-hover:opacity-100 hover:bg-background hover:text-primary'
          }`}
          title={inCompare ? "Added to compare" : "Add to compare"}
        >
          <Scale className="h-4 w-4" />
        </button>

        {/* Dynamic Detail Overlay Button */}
        <div className="absolute bottom-4 right-4 translate-y-8 opacity-0 scale-95 group-hover:translate-y-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-400 ease-out z-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-primary shadow-lg border border-primary/10">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
      </div>
      
      {/* Content Block */}
      <div className="relative z-10 p-5 pointer-events-none flex-1 flex flex-col justify-between bg-gradient-to-b from-card to-background/50">
        <div>
          <p className="font-serif text-lg sm:text-xl font-bold text-primary transition-colors group-hover:text-primary-dark">
            {formatPrice(property.price, property.currency, property.property_type)}
          </p>
          <h3 className="mt-1.5 line-clamp-1 text-sm sm:text-[15px] font-bold text-foreground group-hover:text-primary transition-colors duration-300">
            {property.title}
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <MapPin className="h-3.5 w-3.5 text-primary/60 shrink-0" />
            <span className="truncate">
              {property.city && property.country 
                ? `${property.city}${property.state ? `, ${property.state}` : ''}, ${property.country}`
                : property.locations?.name ?? property.address ?? "—"}
            </span>
          </p>
        </div>
        
        {/* Specs Toolbar */}
        <div className="mt-5 pt-4 border-t border-border/40 flex items-center gap-4 text-xs text-muted-foreground font-semibold">
          {property.property_type === 'land' ? (
            <>
              {property.size_sqm != null && (
                <span className="flex items-center gap-1.5"><Maximize2 className="h-4 w-4 text-primary/60" /> {Number(property.size_sqm).toLocaleString()} {"sqm"}</span>
              )}
              <span className="flex items-center gap-1.5 ml-auto text-primary"><MapPin className="h-4 w-4 text-primary/60" /> Land Plot</span>
            </>
          ) : (
            <>
              {property.bedrooms != null && (
                <span className="flex items-center gap-1.5"><Bed className="h-4 w-4 text-primary/60" /> {property.bedrooms}</span>
              )}
              {property.bathrooms != null && (
                <span className="flex items-center gap-1.5"><Bath className="h-4 w-4 text-primary/60" /> {property.bathrooms}</span>
              )}
              {property.size_sqm != null && (
                <span className="flex items-center gap-1.5 ml-auto"><Maximize2 className="h-4 w-4 text-primary/60" /> {Number(property.size_sqm).toLocaleString()} {"sqm"}</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});
