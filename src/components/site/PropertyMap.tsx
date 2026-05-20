import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from "react-leaflet";
import { useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { PropertyCardData } from "@/components/site/PropertyCard";
import { Link } from "react-router-dom";
import { useFormatPrice } from "@/hooks/useFormatPrice";

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface PropertyMapProps {
  properties: PropertyCardData[];
  onRadiusSearch?: (lat: number, lng: number, radiusKm: number) => void;
}

function MapEvents({ onMapClick }: { onMapClick: (e: L.LeafletMouseEvent) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e);
    },
  });
  return null;
}

export function PropertyMap({ properties, onRadiusSearch }: PropertyMapProps) {
  const formatPrice = useFormatPrice();
  const [searchRadius, setSearchRadius] = useState<{lat: number, lng: number, radiusKm: number} | null>(null);

  // Find center based on properties or default to a generic location
  const center: [number, number] = properties.length > 0 && properties[0].latitude && properties[0].longitude
    ? [properties[0].latitude, properties[0].longitude]
    : [6.5244, 3.3792]; // Default to Lagos, Nigeria if no valid coords

  return (
    <div className="h-[600px] w-full rounded-xl overflow-hidden border border-border shadow-soft relative z-0">
      <MapContainer center={center} zoom={10} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents 
          onMapClick={(e) => {
            const newRadius = { lat: e.latlng.lat, lng: e.latlng.lng, radiusKm: searchRadius?.radiusKm || 5 };
            setSearchRadius(newRadius);
            if (onRadiusSearch) onRadiusSearch(newRadius.lat, newRadius.lng, newRadius.radiusKm);
          }} 
        />
        {searchRadius && (
          <Circle 
            center={[searchRadius.lat, searchRadius.lng]} 
            radius={searchRadius.radiusKm * 1000} 
            pathOptions={{ color: 'hsl(var(--primary))', fillColor: 'hsl(var(--primary))', fillOpacity: 0.1 }}
          />
        )}
        {properties.map((p) => {
          if (!p.latitude || !p.longitude) return null;
          
          // If a radius is active, only show properties inside it visually
          if (searchRadius) {
            const distance = L.latLng(searchRadius.lat, searchRadius.lng).distanceTo(L.latLng(p.latitude, p.longitude));
            if (distance > searchRadius.radiusKm * 1000) return null;
          }

          return (
            <Marker key={p.id} position={[p.latitude, p.longitude]}>
              <Popup className="property-popup">
                <Link to={`/properties/${p.slug}`} className="block w-48 no-underline text-foreground">
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-t-md">
                    <img 
                      src={p.cover_image_url} 
                      alt={p.title} 
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                    />
                  </div>
                  <div className="p-2 bg-card rounded-b-md border-x border-b border-border">
                    <h3 className="font-bold text-sm line-clamp-1">{p.title}</h3>
                    <p className="text-primary font-bold mt-1">
                      {formatPrice(p.price, p.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {p.city}, {p.state}
                    </p>
                  </div>
                </Link>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Radius Controls overlay */}
      {searchRadius && (
        <div className="absolute top-4 right-4 z-[400] bg-background/95 backdrop-blur border border-border p-3 rounded-lg shadow-lg w-64">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold">Search Radius</span>
            <span className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">{searchRadius.radiusKm} km</span>
          </div>
          <input 
            type="range" 
            min="1" max="50" step="1" 
            value={searchRadius.radiusKm}
            onChange={(e) => {
              const km = parseInt(e.target.value);
              setSearchRadius({ ...searchRadius, radiusKm: km });
              if (onRadiusSearch) onRadiusSearch(searchRadius.lat, searchRadius.lng, km);
            }}
            className="w-full accent-primary"
          />
          <button 
            onClick={() => {
              setSearchRadius(null);
              if (onRadiusSearch) onRadiusSearch(0, 0, 0); // Reset
            }}
            className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear Search Area
          </button>
        </div>
      )}
    </div>
  );
}
