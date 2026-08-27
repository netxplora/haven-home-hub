import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from "react-leaflet";
import { useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { PropertyCardData } from "@/components/site/PropertyCard";
import { Link } from "react-router-dom";
import { useFormatPrice } from "@/hooks/useFormatPrice";

// ── Fix Leaflet default marker icon broken by Vite bundler ───────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface PropertyMapProps {
  properties: PropertyCardData[];
  onRadiusSearch?: (lat: number, lng: number, radiusKm: number) => void;
}

function MapClickHandler({ onMapClick }: { onMapClick: (e: L.LeafletMouseEvent) => void }) {
  useMapEvents({ click: onMapClick });
  return null;
}

export function PropertyMap({ properties, onRadiusSearch }: PropertyMapProps) {
  const formatPrice = useFormatPrice();
  const [searchRadius, setSearchRadius] = useState<{ lat: number; lng: number; radiusKm: number } | null>(null);

  // Find a valid center from properties that have coordinates, fall back to Lagos
  const center: [number, number] = (() => {
    const p = properties.find((p) => p.latitude && p.longitude);
    return p?.latitude && p?.longitude ? [p.latitude, p.longitude] : [6.5244, 3.3792];
  })();

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    const radius = { lat: e.latlng.lat, lng: e.latlng.lng, radiusKm: searchRadius?.radiusKm ?? 5 };
    setSearchRadius(radius);
    onRadiusSearch?.(radius.lat, radius.lng, radius.radiusKm);
  };

  const handleClearRadius = () => {
    setSearchRadius(null);
    onRadiusSearch?.(0, 0, 0);
  };

  return (
    <div className="h-[600px] w-full rounded-xl overflow-hidden border border-border shadow-sm relative z-0">
      <MapContainer
        center={center}
        zoom={properties.length === 1 ? 14 : 10}
        zoomControl={true}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
          minZoom={3}
          tileSize={256}
          detectRetina={true}
        />

        <MapClickHandler onMapClick={handleMapClick} />

        {/* Radius circle */}
        {searchRadius && (
          <Circle
            center={[searchRadius.lat, searchRadius.lng]}
            radius={searchRadius.radiusKm * 1000}
            pathOptions={{
              color: "hsl(160, 84%, 39%)",
              fillColor: "hsl(160, 84%, 39%)",
              fillOpacity: 0.08,
              weight: 2,
              dashArray: "5, 7",
            }}
          />
        )}

        {/* Property markers */}
        {properties.map((p) => {
          if (!p.latitude || !p.longitude) return null;

          // If a radius is active, only show markers inside it
          if (searchRadius) {
            const dist = L.latLng(searchRadius.lat, searchRadius.lng).distanceTo(
              L.latLng(p.latitude, p.longitude)
            );
            if (dist > searchRadius.radiusKm * 1000) return null;
          }

          return (
            <Marker key={p.id} position={[p.latitude, p.longitude]}>
              <Popup className="property-popup" minWidth={200} maxWidth={240}>
                <Link to={`/properties/${p.slug}`} className="block no-underline text-foreground">
                  <div className="w-48">
                    <div className="aspect-[4/3] w-full overflow-hidden rounded-t-md bg-muted">
                      <img
                        src={p.cover_image_url || "/placeholder.svg"}
                        alt={p.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                      />
                    </div>
                    <div className="p-2 bg-card rounded-b-md border-x border-b border-border">
                      <h3 className="font-bold text-sm line-clamp-1 text-foreground">{p.title}</h3>
                      <p className="text-primary font-bold mt-0.5 text-sm">
                        {formatPrice(p.price, p.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {[p.city, p.state].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>
                </Link>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Radius search control overlay */}
      {searchRadius && (
        <div className="absolute top-4 right-4 z-[400] bg-background/95 backdrop-blur border border-border p-3 rounded-xl shadow-lg w-60">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-foreground">Search Radius</span>
            <span className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
              {searchRadius.radiusKm} km
            </span>
          </div>
          <input
            type="range"
            min="1" max="50" step="1"
            value={searchRadius.radiusKm}
            onChange={(e) => {
              const km = parseInt(e.target.value);
              const updated = { ...searchRadius, radiusKm: km };
              setSearchRadius(updated);
              onRadiusSearch?.(updated.lat, updated.lng, km);
            }}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5 mb-2">
            <span>1 km</span><span>50 km</span>
          </div>
          <button
            onClick={handleClearRadius}
            className="w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Clear Search Area
          </button>
        </div>
      )}

      {/* Click-to-search hint — only when no radius is active */}
      {!searchRadius && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[400] bg-background/90 backdrop-blur border border-border px-3 py-1.5 rounded-full shadow text-[11px] text-muted-foreground font-medium pointer-events-none">
          Click anywhere on the map to set a search radius
        </div>
      )}
    </div>
  );
}
