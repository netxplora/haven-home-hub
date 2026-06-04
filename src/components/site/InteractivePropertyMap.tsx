import { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapPin, Info, RefreshCw, Layers, Compass, Star, School, ShoppingBag, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// Dynamic map view updater to handle property changes or geocoding resolution
function MapViewUpdater({ center, zoom = 15 }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, {
        animate: true,
        duration: 1.5,
      });
      // Force leaflet to re-verify container dimensions
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }
  }, [center, zoom, map]);

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

// Helper to determine POI color and icons based on categories
function getPoiColorAndIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes("school") || t.includes("university") || t.includes("education")) {
    return {
      bg: "bg-indigo-600",
      text: "text-indigo-600",
      border: "border-indigo-200",
      fill: "hsl(226, 70%, 55%)",
      icon: "School"
    };
  }
  if (t.includes("hospital") || t.includes("clinic") || t.includes("medical") || t.includes("health")) {
    return {
      bg: "bg-primary",
      text: "text-primary",
      border: "border-primary/25",
      fill: "hsl(346, 77%, 50%)",
      icon: "ShieldAlert"
    };
  }
  if (t.includes("mall") || t.includes("shopping") || t.includes("store") || t.includes("supermarket")) {
    return {
      bg: "bg-amber-600",
      text: "text-amber-600",
      border: "border-amber-200",
      fill: "hsl(35, 92%, 50%)",
      icon: "ShoppingBag"
    };
  }
  // Default fallback
  return {
    bg: "bg-slate-600",
    text: "text-slate-600",
    border: "border-slate-200",
    fill: "hsl(215, 16%, 47%)",
    icon: "Compass"
  };
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
  const [showRadius, setShowRadius] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [tileStyle, setTileStyle] = useState<"voyager" | "standard">("voyager");

  // Keep track of resolved coordinates to prevent repeated lookups
  const geocodedCacheRef = useRef<{ [key: string]: [number, number] }>({});

  const hasCoords = latitude && longitude && Math.abs(latitude) > 0.0001 && Math.abs(longitude) > 0.0001;

  // 1. Geocoding Resolver Hook
  useEffect(() => {
    if (hasCoords) {
      setMapCoords([latitude, longitude]);
      setGeocodeError(null);
      return;
    }

    const geocodeAddress = async () => {
      const searchKey = address || title;
      if (!searchKey) {
        setGeocodeError("No location coordinates or address specified in database.");
        return;
      }

      // Check cache first
      if (geocodedCacheRef.current[searchKey]) {
        setMapCoords(geocodedCacheRef.current[searchKey]);
        setGeocodeError(null);
        return;
      }

      setIsGeocoding(true);
      setGeocodeError(null);

      try {
        const query = encodeURIComponent(searchKey);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
          headers: {
            "User-Agent": "HavenHomeHub/1.0 (admin@havenhomehub.local)"
          }
        });

        if (!res.ok) throw new Error("Network status error");
        const data = await res.json();

        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          const resolved: [number, number] = [lat, lon];
          
          geocodedCacheRef.current[searchKey] = resolved;
          setMapCoords(resolved);
        } else {
          // If detailed address lookup failed, try splitting and searching by city
          const parts = searchKey.split(",");
          if (parts.length > 1) {
            const cityQuery = encodeURIComponent(parts[parts.length - 2].trim() + ", " + parts[parts.length - 1].trim());
            const cityRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${cityQuery}&format=json&limit=1`, {
              headers: {
                "User-Agent": "HavenHomeHub/1.0 (admin@havenhomehub.local)"
              }
            });
            const cityData = await cityRes.json();
            
            if (cityData && cityData.length > 0) {
              const lat = parseFloat(cityData[0].lat);
              const lon = parseFloat(cityData[0].lon);
              const resolved: [number, number] = [lat, lon];
              
              geocodedCacheRef.current[searchKey] = resolved;
              setMapCoords(resolved);
              return;
            }
          }
          setGeocodeError("Could not resolve address details. Coordinates unavailable.");
        }
      } catch (err) {
        setGeocodeError("Geocoding failed due to network limitations. Please retry.");
      } finally {
        setIsGeocoding(false);
      }
    };

    geocodeAddress();
  }, [latitude, longitude, address, title, hasCoords]);

  // 2. Custom Glowing Map Pin
  const propertyIcon = useMemo(() => {
    return L.divIcon({
      html: `
        <div class="relative flex items-center justify-center h-12 w-12">
          <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-primary/20 opacity-75"></span>
          <div class="relative h-8 w-8 rounded-full bg-primary border-2 border-white shadow-lg flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>
      `,
      className: "custom-leaflet-pin",
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });
  }, []);

  // 3. Landmarks Mathematical Projection Logic
  // Since database POIs only hold distances, we plot them deterministically in a ring
  const landmarkMarkers = useMemo(() => {
    if (!mapCoords || !nearbyPois.length) return [];

    const lat = mapCoords[0];
    const lng = mapCoords[1];

    return nearbyPois.map((poi, idx) => {
      const distance = poi.distance_km || 0.5;
      
      // Use index to deterministically space items around a circle
      const angle = (idx * (2 * Math.PI)) / Math.max(nearbyPois.length, 1);

      // 1 degree latitude = 111.3km
      // 1 degree longitude = 111.3km * cos(latitude)
      const latOffset = (distance * Math.sin(angle)) / 111.3;
      const lngOffset = (distance * Math.cos(angle)) / (111.3 * Math.cos((lat * Math.PI) / 180));

      const poiLat = lat + latOffset;
      const poiLng = lng + lngOffset;

      const style = getPoiColorAndIcon(poi.type);

      // Create beautiful mini-pin for POIs
      const icon = L.divIcon({
        html: `
          <div class="h-6 w-6 rounded-full ${style.bg} border border-white shadow flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all">
            <span class="text-[9px] font-bold font-sans">${poi.name.slice(0, 1)}</span>
          </div>
        `,
        className: "custom-poi-pin",
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      return {
        id: idx,
        name: poi.name,
        type: poi.type,
        distance,
        coords: [poiLat, poiLng] as [number, number],
        icon,
        style
      };
    });
  }, [mapCoords, nearbyPois]);

  // Tile layer configuration
  const tileUrl = tileStyle === "voyager"
    ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const tileAttribution = tileStyle === "voyager"
    ? '&copy; <a href="https://carto.com/">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  // 4. Render Error / geocoding loading states
  if (isGeocoding) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-secondary/5 rounded-xl border border-border/80">
        <RefreshCw className="h-8 w-8 text-primary animate-spin mb-3" />
        <p className="text-sm font-bold text-foreground font-sans">Resolving registered address coordinates...</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs text-center line-clamp-1">{address}</p>
      </div>
    );
  }

  if (geocodeError || !mapCoords) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-red-50/50 dark:bg-red-950/10 rounded-xl border border-red-200 dark:border-red-900/30 p-6 text-center">
        <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center mb-4 text-red-600">
          <MapPin className="h-6 w-6" />
        </div>
        <h4 className="font-serif text-base font-bold text-gray-900 dark:text-gray-100">Location Preview Unavailable</h4>
        <p className="mt-2 text-xs text-muted-foreground max-w-xs leading-relaxed">
          {geocodeError || "Address coordinates could not be loaded."}
        </p>
        <div className="mt-4 flex flex-col items-center gap-2">
          {address && <Badge variant="outline" className="font-mono text-[10px] py-1 max-w-xs truncate">{address}</Badge>}
          <Button 
            size="sm" 
            variant="outline" 
            className="mt-2 rounded-lg font-bold text-xs" 
            onClick={() => {
              // Trigger reload by resetting coordinates
              setGeocodeError(null);
            }}
          >
            <RefreshCw className="h-3 w-3 mr-1.5" /> Retry Loading Map
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Dynamic Controls Bar overlay */}
      <div className="absolute top-4 left-4 z-[400] bg-background/95 backdrop-blur-md border border-border/60 p-3 rounded-xl shadow-lg flex flex-col gap-2.5 w-52 font-sans text-xs">
        <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-0.5">
          <span className="font-bold text-foreground">Map Options</span>
          <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-bold text-primary px-1.5 py-0">Live</Badge>
        </div>
        
        {/* Radius Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="radius-toggle" className="text-muted-foreground font-semibold cursor-pointer">Neighborhood Area</Label>
          <Switch 
            id="radius-toggle" 
            checked={showRadius} 
            onCheckedChange={setShowRadius} 
            className="data-[state=checked]:bg-primary"
          />
        </div>

        {/* Landmarks Toggle */}
        {nearbyPois.length > 0 && (
          <div className="flex items-center justify-between">
            <Label htmlFor="landmarks-toggle" className="text-muted-foreground font-semibold cursor-pointer">Show Landmarks</Label>
            <Switch 
              id="landmarks-toggle" 
              checked={showLandmarks} 
              onCheckedChange={setShowLandmarks}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        )}

        {/* Map Tile theme toggler */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <span className="text-muted-foreground font-semibold">Map Style</span>
          <div className="flex bg-secondary/30 rounded-lg p-0.5 border border-border/40">
            <button 
              onClick={() => setTileStyle("voyager")}
              className={`px-2 py-0.5 rounded-md font-bold text-[9px] transition-colors uppercase ${tileStyle === "voyager" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              Voyager
            </button>
            <button 
              onClick={() => setTileStyle("standard")}
              className={`px-2 py-0.5 rounded-md font-bold text-[9px] transition-colors uppercase ${tileStyle === "standard" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              OSM
            </button>
          </div>
        </div>
      </div>

      {/* Actual interactive Leaflet canvas */}
      <div className="flex-1 w-full h-full relative z-0">
        <MapContainer 
          center={mapCoords} 
          zoom={15} 
          scrollWheelZoom={false} // Disable wheel hijacking for natural document scrolling
          className="h-full w-full z-0 font-sans"
        >
          <TileLayer attribution={tileAttribution} url={tileUrl} />
          
          <MapViewUpdater center={mapCoords} />
          
          {/* Main Pin */}
          <Marker position={mapCoords} icon={propertyIcon}>
            <Popup className="property-popup font-sans">
              <div className="p-2 bg-card rounded-md font-sans">
                <h4 className="font-serif text-sm font-bold text-foreground line-clamp-1">{title}</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{address}</p>
                <div className="mt-2 flex items-center justify-between bg-primary/5 rounded px-2 py-1 text-[9px] font-bold text-primary uppercase">
                  <span>Registered Center</span>
                  <MapPin className="h-3 w-3" />
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Neighborhood highlight circle */}
          {showRadius && (
            <Circle 
              center={mapCoords} 
              radius={1000} // 1km radius
              pathOptions={{ 
                color: 'hsl(var(--primary))', 
                fillColor: 'hsl(var(--primary))', 
                fillOpacity: 0.08,
                weight: 1.5,
                dashArray: '4, 6'
              }}
            />
          )}

          {/* Landmarks micro markers */}
          {showLandmarks && landmarkMarkers.map((marker) => (
            <Marker key={marker.id} position={marker.coords} icon={marker.icon}>
              <Popup className="poi-popup font-sans">
                <div className="p-2 bg-card rounded-md font-sans text-xs">
                  <div className="flex items-center gap-1.5 mb-1.5 border-b border-border/50 pb-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${marker.style.bg}`} />
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{marker.type}</span>
                  </div>
                  <h4 className="font-bold text-foreground">{marker.name}</h4>
                  <p className="text-[10px] font-bold text-primary mt-1">
                    ~ {marker.distance.toFixed(2)} km distance
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Mobile touch gesture helper overlay */}
        <div className="absolute inset-0 bg-transparent pointer-events-none md:hidden z-10 flex items-center justify-center touch-none">
          {/* Transparent container to catch single touch conflicts without breaking zoom */}
        </div>
      </div>
    </div>
  );
}
