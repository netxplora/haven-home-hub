import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapPin, RefreshCw, Layers, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// ── Fix Leaflet's broken default marker icons when bundled with Vite ──────────
// Without this, all markers show a broken-image placeholder.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── MapViewUpdater: stable reference to prevent infinite flyTo loops ──────────
function MapViewUpdater({ lat, lng, zoom = 15 }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  // Store previous coords to avoid refiring flyTo on every render
  const prevRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (prevRef.current?.lat === lat && prevRef.current?.lng === lng) return;
    prevRef.current = { lat, lng };
    map.flyTo([lat, lng], zoom, { animate: true, duration: 1.2 });
    // Re-check container size after animation
    setTimeout(() => map.invalidateSize(), 300);
  }, [lat, lng, zoom, map]);

  return null;
}

interface POI {
  name: string;
  type: string;
  distance_km?: number;
}

interface InteractivePropertyMapProps {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  title: string;
  nearbyPois?: POI[];
}

// ── POI colour helper ─────────────────────────────────────────────────────────
function getPoiStyle(type: string) {
  const t = type.toLowerCase();
  if (t.includes("school") || t.includes("university") || t.includes("education"))
    return { bg: "bg-indigo-600", fill: "#4f46e5" };
  if (t.includes("hospital") || t.includes("clinic") || t.includes("medical") || t.includes("health"))
    return { bg: "bg-red-600", fill: "#dc2626" };
  if (t.includes("mall") || t.includes("shopping") || t.includes("store") || t.includes("supermarket"))
    return { bg: "bg-amber-500", fill: "#f59e0b" };
  if (t.includes("park") || t.includes("garden") || t.includes("recreation"))
    return { bg: "bg-emerald-600", fill: "#059669" };
  return { bg: "bg-slate-600", fill: "#475569" };
}

export function InteractivePropertyMap({
  latitude,
  longitude,
  address,
  title,
  nearbyPois = [],
}: InteractivePropertyMapProps) {
  const [mapCoords, setMapCoords] = useState<[number, number] | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const [retryKey, setRetryKey] = useState(0);

  // Ref-based cache — persists across re-renders without causing re-renders itself
  const geocodedCacheRef = useRef<Record<string, [number, number]>>({});

  const hasCoords =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Math.abs(latitude) > 0.0001 &&
    Math.abs(longitude) > 0.0001;

  // ── 1. Coordinate resolution ──────────────────────────────────────────────
  useEffect(() => {
    if (hasCoords) {
      setMapCoords([latitude as number, longitude as number]);
      setGeocodeError(null);
      return;
    }

    const searchKey = (address || title || "").trim();
    if (!searchKey) {
      setGeocodeError("No location coordinates or address provided for this property.");
      return;
    }

    // Serve from in-memory cache first
    if (geocodedCacheRef.current[searchKey]) {
      setMapCoords(geocodedCacheRef.current[searchKey]);
      setGeocodeError(null);
      return;
    }

    let cancelled = false;

    const geocode = async () => {
      setIsGeocoding(true);
      setGeocodeError(null);

      try {
        // Primary lookup — full address
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchKey)}&format=json&limit=1&addressdetails=0`,
          { headers: { "User-Agent": "HavenHomeHub/1.0 (contact@havenhomehub.com)" } }
        );
        if (!res.ok) throw new Error("Network error");
        const data = await res.json();

        if (!cancelled && data?.length > 0) {
          const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
          geocodedCacheRef.current[searchKey] = coords;
          setMapCoords(coords);
          return;
        }

        // Fallback — try just city + country portion of address
        const parts = searchKey.split(",").map((s: string) => s.trim()).filter(Boolean);
        if (parts.length > 1) {
          const fallbackQuery = parts.slice(-2).join(", ");
          const r2 = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fallbackQuery)}&format=json&limit=1`,
            { headers: { "User-Agent": "HavenHomeHub/1.0 (contact@havenhomehub.com)" } }
          );
          const d2 = await r2.json();
          if (!cancelled && d2?.length > 0) {
            const coords: [number, number] = [parseFloat(d2[0].lat), parseFloat(d2[0].lon)];
            geocodedCacheRef.current[searchKey] = coords;
            setMapCoords(coords);
            return;
          }
        }

        if (!cancelled) {
          setGeocodeError("Location coordinates could not be resolved for this address.");
        }
      } catch {
        if (!cancelled) setGeocodeError("Unable to load map. Please check your connection and try again.");
      } finally {
        if (!cancelled) setIsGeocoding(false);
      }
    };

    geocode();
    return () => { cancelled = true; };
    // retryKey increments when the user clicks "Retry" — forces the effect to re-run
  }, [hasCoords, latitude, longitude, address, title, retryKey]);

  // ── 2. Pulsing property pin icon ─────────────────────────────────────────
  const propertyIcon = useMemo(
    () =>
      L.divIcon({
        html: `
          <div style="position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;">
            <span style="position:absolute;width:32px;height:32px;border-radius:50%;background:hsl(160,84%,39%);opacity:0.25;animation:leaflet-ping 1.8s ease-out infinite;"></span>
            <div style="position:relative;width:32px;height:32px;border-radius:50%;background:hsl(160,84%,39%);border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
          </div>`,
        className: "custom-leaflet-pin",
        iconSize: [48, 48],
        iconAnchor: [24, 40],
        popupAnchor: [0, -44],
      }),
    []
  );

  // ── 3. POI markers arranged in a ring around the property ────────────────
  const landmarkMarkers = useMemo(() => {
    if (!mapCoords || !nearbyPois.length) return [];
    const [lat, lng] = mapCoords;
    return nearbyPois.map((poi, idx) => {
      const dist = poi.distance_km || 0.4;
      const angle = (idx * (2 * Math.PI)) / Math.max(nearbyPois.length, 1);
      const latOffset = (dist * Math.sin(angle)) / 111.3;
      const lngOffset = (dist * Math.cos(angle)) / (111.3 * Math.cos((lat * Math.PI) / 180));
      const style = getPoiStyle(poi.type);
      const icon = L.divIcon({
        html: `<div style="width:24px;height:24px;border-radius:50%;background:${style.fill};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700;">${poi.name.charAt(0).toUpperCase()}</div>`,
        className: "custom-poi-pin",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -14],
      });
      return {
        id: idx,
        name: poi.name,
        type: poi.type,
        distance: dist,
        coords: [lat + latOffset, lng + lngOffset] as [number, number],
        icon,
        style,
      };
    });
  }, [mapCoords, nearbyPois]);

  // ── 4. Tile URLs (both 100% free, no API key) ────────────────────────────
  const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isGeocoding) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-muted/20 rounded-xl border border-border">
        <RefreshCw className="h-8 w-8 text-primary animate-spin mb-3" />
        <p className="text-sm font-semibold text-foreground">Locating address on map…</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs text-center truncate px-4">{address || title}</p>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (geocodeError || !mapCoords) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-red-50/40 dark:bg-red-950/10 rounded-xl border border-red-200 dark:border-red-900/30 p-6 text-center gap-3">
        <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-600">
          <MapPin className="h-6 w-6" />
        </div>
        <div>
          <h4 className="font-serif text-base font-bold text-foreground">Map Unavailable</h4>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs leading-relaxed">
            {geocodeError || "Location coordinates could not be resolved."}
          </p>
        </div>
        {address && (
          <Badge variant="outline" className="font-mono text-[10px] py-1 max-w-xs truncate">{address}</Badge>
        )}
        <Button
          size="sm"
          variant="outline"
          className="rounded-lg font-bold text-xs"
          onClick={() => { setGeocodeError(null); setRetryKey(k => k + 1); }}
        >
          <RefreshCw className="h-3 w-3 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  // ── Map render ────────────────────────────────────────────────────────────
  return (
    <div className="relative h-full w-full flex flex-col rounded-xl overflow-hidden border border-border">


      {/* Leaflet map canvas */}
      <MapContainer
        center={mapCoords}
        zoom={15}
        scrollWheelZoom={false}
        zoomControl={true}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <TileLayer
          url={tileUrl}
          attribution={tileAttribution}
          maxZoom={19}
          minZoom={3}
          tileSize={256}
          detectRetina={true}
        />

        <MapViewUpdater lat={mapCoords[0]} lng={mapCoords[1]} zoom={15} />

        {/* Main property pin */}
        <Marker position={mapCoords} icon={propertyIcon}>
          <Popup className="property-popup font-sans" minWidth={200}>
            <div className="p-2 font-sans">
              <h4 className="font-serif text-sm font-bold text-foreground line-clamp-2 leading-snug">{title}</h4>
              {address && (
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{address}</p>
              )}
              <div className="mt-2 flex items-center gap-1 bg-primary/10 rounded px-2 py-1">
                <MapPin className="h-3 w-3 text-primary" />
                <span className="text-[9px] font-bold text-primary uppercase tracking-wide">Property Location</span>
              </div>
            </div>
          </Popup>
        </Marker>

        {/* 1km neighbourhood highlight */}
        <Circle
          center={mapCoords}
          radius={1000}
          pathOptions={{
            color: "hsl(160, 84%, 39%)",
            fillColor: "hsl(160, 84%, 39%)",
            fillOpacity: 0.06,
            weight: 1.5,
            dashArray: "5, 7",
          }}
        />

        {/* POI landmark pins */}
        {landmarkMarkers.map((marker) => (
          <Marker key={marker.id} position={marker.coords} icon={marker.icon}>
            <Popup className="poi-popup font-sans" minWidth={160}>
              <div className="p-2 font-sans text-xs">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{marker.type}</p>
                <h4 className="font-bold text-foreground leading-snug">{marker.name}</h4>
                <p className="text-[10px] font-semibold text-primary mt-1">~{marker.distance.toFixed(1)} km away</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
