import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Link } from "react-router-dom";
import {
  Map as MapIcon, Filter, Layers, DollarSign, Percent,
  MapPin, Search, SlidersHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/invest";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEO } from "@/components/site/SEO";
import { Header } from "@/components/site/Header";
import { useBrand } from "@/hooks/useBrand";

// ── Fix Leaflet default marker icon broken by Vite bundler ───────────────────
// This MUST be set before any <Marker> renders or icons will be broken images.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Custom coloured dot markers per property type ────────────────────────────
const createCustomIcon = (type: string) => {
  const isInvestment = type === "fractional_investment" || type === "investment";
  const color = isInvestment ? "#0f766e" : "#2563eb";
  return L.divIcon({
    className: "", // clear leaflet's own wrapper class so our style is clean
    html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.25);"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });
};

// ── Force map to re-check its container size after layout shifts ─────────────
function MapResizer() {
  const map = useMap();
  React.useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

// ── Types ────────────────────────────────────────────────────────────────────
interface MapItem {
  id: string;
  type: "standard" | "investment";
  subType?: string;
  title: string;
  slug: string;
  price: number;
  image: string;
  lat: number;
  lng: number;
  link: string;
  specs?: string;
  yieldPct?: number;
}

export default function PropertyMapExplorer() {
  const { brand } = useBrand();
  const [filterType, setFilterType] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10_000_000]);
  const [minYield, setMinYield] = useState<number>(0);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: standardProperties = [], isLoading: isLoadingStandard } = useQuery({
    queryKey: ["map-standard-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, slug, price, cover_image_url, property_type, bedrooms, bathrooms, size_sqm, latitude, longitude")
        .eq("status", "available");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: investmentProperties = [], isLoading: isLoadingInvestments } = useQuery({
    queryKey: ["map-investment-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investment_properties")
        .select("id, title, slug, total_value, min_investment, projected_return_min, cover_image_url, property_type, city, state, country")
        .in("status", ["open", "funded"]);
      if (error) throw error;
      return data || [];
    },
  });

  // ── Merge & normalise ──────────────────────────────────────────────────────
  const allMapItems = useMemo<MapItem[]>(() => {
    const items: MapItem[] = [];

    standardProperties.forEach((p: any) => {
      if (!p.latitude || !p.longitude) return; // skip — no coords to plot
      items.push({
        id: p.id,
        type: "standard",
        subType: p.property_type,
        title: p.title,
        slug: p.slug,
        price: p.price ?? 0,
        image: p.cover_image_url || "/placeholder.svg",
        lat: p.latitude,
        lng: p.longitude,
        link: `/properties/${p.slug}`,
        specs: [
          p.bedrooms   ? `${p.bedrooms} Beds`   : null,
          p.bathrooms  ? `${p.bathrooms} Baths`  : null,
          p.size_sqm   ? `${p.size_sqm} sqm`    : null,
        ].filter(Boolean).join(" · "),
      });
    });

    // investment_properties has no lat/lng columns — they will appear in the
    // sidebar count only; they cannot be plotted until coordinates are added.
    investmentProperties.forEach(() => {
      // intentionally left blank — no coords available
    });

    return items;
  }, [standardProperties, investmentProperties]);

  // ── Filters ────────────────────────────────────────────────────────────────
  const filteredItems = useMemo<MapItem[]>(() => {
    return allMapItems.filter((item) => {
      if (filterType !== "all" && item.type !== filterType && item.subType !== filterType) return false;
      if (item.price < priceRange[0] || item.price > priceRange[1]) return false;
      if (item.type === "investment" && item.yieldPct != null && item.yieldPct < minYield) return false;
      return true;
    });
  }, [allMapItems, filterType, priceRange, minYield]);

  const isLoading = isLoadingStandard || isLoadingInvestments;

  // ── Map center: first item or world view ───────────────────────────────────
  const mapCenter: [number, number] =
    filteredItems.length > 0
      ? [filteredItems[0].lat, filteredItems[0].lng]
      : [6.5244, 3.3792]; // Lagos default
  const mapZoom = filteredItems.length === 1 ? 14 : 5;

  return (
    <>
      <SEO
        title={`Property Map Explorer | ${brand.platform_name}`}
        description="Browse available real estate listings on an interactive map. Filter by price and property type."
      />

      <Header />

      <main className="flex h-screen pt-[64px] flex-col md:flex-row overflow-hidden bg-background">

        {/* ── Mobile filter trigger ─────────────────────────────────────── */}
        <div className="md:hidden p-3 border-b border-border/40 bg-card z-10 shadow-sm flex items-center justify-between">
          <h1 className="font-serif font-bold text-base flex items-center gap-2">
            <MapIcon className="h-4 w-4 text-primary" /> Map Explorer
          </h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filter Properties</SheetTitle>
              </SheetHeader>
              <div className="mt-4 px-1">
                <FilterPanel
                  filterType={filterType} setFilterType={setFilterType}
                  priceRange={priceRange} setPriceRange={setPriceRange}
                  minYield={minYield} setMinYield={setMinYield}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* ── Desktop sidebar ───────────────────────────────────────────── */}
        <aside className="hidden md:flex flex-col w-80 lg:w-96 border-r border-border/50 bg-card z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-full overflow-y-auto shrink-0">
          <div className="p-6 border-b border-border/40 sticky top-0 bg-card/95 backdrop-blur z-20">
            <h1 className="font-serif text-xl font-bold flex items-center gap-2 text-foreground">
              <MapIcon className="h-5 w-5 text-primary" /> Map Explorer
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Browse properties by location. Click a pin to view details.
            </p>
          </div>

          <div className="p-6 flex-1">
            <FilterPanel
              filterType={filterType} setFilterType={setFilterType}
              priceRange={priceRange} setPriceRange={setPriceRange}
              minYield={minYield} setMinYield={setMinYield}
            />
          </div>

          <div className="p-5 bg-accent/30 border-t border-border/40 mt-auto">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-muted-foreground">Properties on map</span>
              <Badge variant="secondary" className="font-bold text-primary">
                {filteredItems.length}
              </Badge>
            </div>
            {filteredItems.length === 0 && !isLoading && (
              <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                No properties with map coordinates match the current filters.
              </p>
            )}
          </div>
        </aside>

        {/* ── Map area ──────────────────────────────────────────────────── */}
        <div className="flex-1 relative h-full w-full bg-muted/20 overflow-hidden">
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-[1000] bg-background/60 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-card px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 border border-border">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="font-semibold text-sm">Loading map data…</span>
              </div>
            </div>
          )}

          {/* Empty state overlay (no pins at all) */}
          {!isLoading && filteredItems.length === 0 && (
            <div className="absolute inset-0 z-[500] flex items-center justify-center pointer-events-none">
              <div className="bg-card/95 backdrop-blur border border-border px-6 py-4 rounded-2xl shadow-lg text-center max-w-xs">
                <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="font-semibold text-sm text-foreground">No listings to display</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Properties without map coordinates won't appear as pins. Adjust filters or add coordinates via the admin panel.
                </p>
              </div>
            </div>
          )}

          <MapContainer
            key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
            center={mapCenter}
            zoom={mapZoom}
            zoomControl={true}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%", zIndex: 0 }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={19}
              minZoom={2}
              tileSize={256}
              detectRetina={true}
            />
            <MapResizer />

            {filteredItems.map((item) => (
              <Marker
                key={`${item.type}-${item.id}`}
                position={[item.lat, item.lng]}
                icon={createCustomIcon(item.type)}
              >
                <Popup className="custom-popup" minWidth={260} maxWidth={280}>
                  <div className="overflow-hidden rounded-lg border border-border bg-card shadow-md -m-3">
                    {/* Property image */}
                    <div className="relative h-32 bg-muted">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                      />
                      <div className="absolute top-2 left-2">
                        <Badge
                          className={`font-bold uppercase text-[9px] ${
                            item.type === "investment"
                              ? "bg-teal-600 hover:bg-teal-700"
                              : "bg-blue-600 hover:bg-blue-700"
                          }`}
                        >
                          {item.subType || (item.type === "investment" ? "Fractional" : "Property")}
                        </Badge>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3 space-y-2">
                      <h3 className="font-serif font-bold text-sm leading-tight line-clamp-2 text-foreground">
                        {item.title}
                      </h3>

                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
                            {item.type === "investment" ? "Asset Value" : "Price"}
                          </p>
                          <p className="font-bold text-sm text-foreground">{formatMoney(item.price)}</p>
                        </div>
                        {item.yieldPct != null && item.yieldPct > 0 && (
                          <div className="text-right">
                            <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
                              Est. Yield
                            </p>
                            <p className="font-bold text-sm text-emerald-600">{item.yieldPct}%</p>
                          </div>
                        )}
                      </div>

                      {item.specs && (
                        <p className="text-[10px] text-muted-foreground font-medium bg-accent/60 px-2 py-1 rounded-md">
                          {item.specs}
                        </p>
                      )}

                      <Button asChild size="sm" className="w-full font-bold text-xs h-8">
                        <Link to={item.link}>View Details</Link>
                      </Button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </main>
    </>
  );
}

// ── Filter sidebar panel ─────────────────────────────────────────────────────
function FilterPanel({
  filterType, setFilterType,
  priceRange, setPriceRange,
  minYield, setMinYield,
}: {
  filterType: string; setFilterType: (v: string) => void;
  priceRange: [number, number]; setPriceRange: (v: [number, number]) => void;
  minYield: number; setMinYield: (v: number) => void;
}) {
  return (
    <div className="space-y-7">
      {/* Category */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" /> Property Category
        </label>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full bg-accent/30 border-border/50">
            <SelectValue placeholder="All Properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            <SelectItem value="standard">Standard Real Estate</SelectItem>
            <SelectItem value="investment">Fractional Investments</SelectItem>
            <SelectItem value="land">Land Parcels</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price range */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" /> Max Price
          </label>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
            {formatMoney(priceRange[1])}
          </span>
        </div>
        <Slider
          value={[priceRange[1]]}
          min={10_000}
          max={10_000_000}
          step={50_000}
          onValueChange={(vals) => setPriceRange([0, vals[0]])}
          className="py-1"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
          <span>$0</span><span>$10M+</span>
        </div>
      </div>

      {/* Min yield (only for investment or all) */}
      {(filterType === "investment" || filterType === "all") && (
        <div className="space-y-3 pt-4 border-t border-border/40 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5" /> Min. Projected Yield
            </label>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
              {minYield}%+
            </span>
          </div>
          <Slider
            value={[minYield]}
            min={0} max={25} step={1}
            onValueChange={(vals) => setMinYield(vals[0])}
            className="py-1"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
            <span>Any</span><span>25%</span>
          </div>
        </div>
      )}

      {/* Reset */}
      <div className="pt-2 border-t border-border/40">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-foreground text-xs"
          onClick={() => {
            setFilterType("all");
            setPriceRange([0, 10_000_000]);
            setMinYield(0);
          }}
        >
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
