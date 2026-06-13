import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Link } from "react-router-dom";
import { 
  Map as MapIcon, Filter, Layers, DollarSign, Percent, 
  MapPin, Maximize2, Search, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/invest";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEO } from "@/components/site/SEO";
import { Header } from "@/components/site/Header";

// Fix leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom Icon for properties
const createCustomIcon = (type: string) => {
  const isInvestment = type === "fractional_investment" || type === "investment";
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${isInvestment ? '#0f766e' : '#2563eb'}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

function MapResizer() {
  const map = useMap();
  React.useEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
}

export default function PropertyMapExplorer() {
  const [filterType, setFilterType] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000000]);
  const [minYield, setMinYield] = useState<number>(0);
  
  // Fetch properties (both traditional and investments)
  const { data: standardProperties = [], isLoading: isLoadingStandard } = useQuery({
    queryKey: ["map-standard-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, slug, price, cover_image_url, property_type, bedrooms, bathrooms, size_sqm, map_coordinates")
        .eq("status", "available");
      if (error) throw error;
      return data || [];
    }
  });

  const { data: investmentProperties = [], isLoading: isLoadingInvestments } = useQuery({
    queryKey: ["map-investment-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investment_properties")
        .select("id, title, slug, total_value, min_investment, projected_return_min, cover_image_url, property_type, map_coordinates")
        .in("status", ["open", "funded"]);
      if (error) throw error;
      return data || [];
    }
  });

  // Combine and format properties
  const allMapItems = useMemo(() => {
    const items: any[] = [];
    
    standardProperties.forEach((p: any) => {
      if (p.map_coordinates && p.map_coordinates.lat && p.map_coordinates.lng) {
        items.push({
          id: p.id,
          type: 'standard',
          subType: p.property_type,
          title: p.title,
          slug: p.slug,
          price: p.price,
          image: p.cover_image_url,
          lat: p.map_coordinates.lat,
          lng: p.map_coordinates.lng,
          link: `/properties/${p.slug}`,
          specs: `${p.bedrooms || 0} Beds • ${p.bathrooms || 0} Baths • ${p.size_sqm || 0} SQM`
        });
      }
    });

    investmentProperties.forEach((p: any) => {
      if (p.map_coordinates && p.map_coordinates.lat && p.map_coordinates.lng) {
        items.push({
          id: p.id,
          type: 'investment',
          subType: p.property_type,
          title: p.title,
          slug: p.slug,
          price: p.total_value,
          yield: p.projected_return_min,
          min_investment: p.min_investment,
          image: p.cover_image_url,
          lat: p.map_coordinates.lat,
          lng: p.map_coordinates.lng,
          link: `/invest/${p.slug}`,
          specs: `Min Invest: ${formatMoney(p.min_investment)}`
        });
      }
    });

    return items;
  }, [standardProperties, investmentProperties]);

  // Apply filters
  const filteredItems = useMemo(() => {
    return allMapItems.filter(item => {
      if (filterType !== 'all' && item.type !== filterType && item.subType !== filterType) return false;
      if (item.price < priceRange[0] || item.price > priceRange[1]) return false;
      if (item.type === 'investment' && item.yield && item.yield < minYield) return false;
      return true;
    });
  }, [allMapItems, filterType, priceRange, minYield]);

  return (
    <>
      <SEO 
        title="Interactive Property Map Explorer | Haven Home Hub" 
        description="Discover premium real estate and fractional investment opportunities on our advanced interactive map."
      />
      
      <Header />
      
      <main className="flex h-screen pt-[64px] flex-col md:flex-row overflow-hidden bg-background">
        {/* Mobile Filter Sheet */}
        <div className="md:hidden p-4 border-b border-border/40 bg-card z-10 shadow-sm flex items-center justify-between">
          <h1 className="font-serif font-bold text-lg flex items-center gap-2">
            <MapIcon className="h-5 w-5 text-primary" /> Map Explorer
          </h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" /> Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Filter Properties</SheetTitle>
              </SheetHeader>
              <FilterPanel 
                filterType={filterType} setFilterType={setFilterType}
                priceRange={priceRange} setPriceRange={setPriceRange}
                minYield={minYield} setMinYield={setMinYield}
              />
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-80 lg:w-96 border-r border-border/50 bg-card z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-full overflow-y-auto">
          <div className="p-6 border-b border-border/40 sticky top-0 bg-card/95 backdrop-blur z-20">
            <h1 className="font-serif text-2xl font-bold flex items-center gap-2 mb-2 text-foreground">
              <MapIcon className="h-6 w-6 text-primary" /> Map Explorer
            </h1>
            <p className="text-sm text-muted-foreground">Discover premium real estate across the globe.</p>
          </div>
          
          <div className="p-6">
            <FilterPanel 
              filterType={filterType} setFilterType={setFilterType}
              priceRange={priceRange} setPriceRange={setPriceRange}
              minYield={minYield} setMinYield={setMinYield}
            />
          </div>

          <div className="mt-auto p-6 bg-accent/30 border-t border-border/40">
            <div className="flex justify-between items-center text-sm font-medium">
              <span>Properties Found</span>
              <Badge variant="secondary" className="font-bold text-primary">{filteredItems.length}</Badge>
            </div>
          </div>
        </aside>

        {/* Map Area */}
        <div className="flex-1 relative h-full w-full bg-muted/20">
          {(isLoadingStandard || isLoadingInvestments) && (
            <div className="absolute inset-0 z-[1000] bg-background/50 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-card p-4 rounded-xl shadow-lg flex items-center gap-3">
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="font-medium text-sm">Loading map data...</span>
              </div>
            </div>
          )}
          
          <MapContainer 
            center={[20, 0]} 
            zoom={3} 
            style={{ height: '100%', width: '100%', zIndex: 0 }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <MapResizer />
            
            {filteredItems.map(item => (
              <Marker 
                key={`${item.type}-${item.id}`}
                position={[item.lat, item.lng]}
                icon={createCustomIcon(item.type)}
              >
                <Popup className="custom-popup" minWidth={280}>
                  <div className="p-0 -m-3 overflow-hidden rounded-xl border border-border/40 bg-card shadow-lg">
                    <div className="relative h-36 bg-accent">
                      <img src={item.image || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2">
                        <Badge className={`font-bold uppercase text-[9px] ${item.type === 'investment' ? 'bg-teal-500 hover:bg-teal-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                          {item.type === 'investment' ? 'Fractional' : item.subType || 'Property'}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <h3 className="font-serif font-bold text-base leading-tight line-clamp-1">{item.title}</h3>
                      
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
                            {item.type === 'investment' ? 'Asset Value' : 'Price'}
                          </p>
                          <p className="font-bold text-foreground">{formatMoney(item.price)}</p>
                        </div>
                        {item.type === 'investment' && item.yield && (
                          <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Est. Yield</p>
                            <p className="font-bold text-emerald-600">{item.yield}%</p>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground font-medium bg-accent/50 p-1.5 rounded-md inline-block">
                        {item.specs}
                      </p>
                      
                      <Button asChild size="sm" className="w-full font-bold mt-2">
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

function FilterPanel({ filterType, setFilterType, priceRange, setPriceRange, minYield, setMinYield }: any) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
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

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" /> Price Range
          </label>
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md">
            Up to {formatMoney(priceRange[1])}
          </span>
        </div>
        <Slider 
          value={[priceRange[1]]} 
          min={10000} 
          max={10000000} 
          step={50000}
          onValueChange={(vals) => setPriceRange([0, vals[0]])}
          className="py-2"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
          <span>$0</span>
          <span>$10M+</span>
        </div>
      </div>

      {filterType === 'investment' || filterType === 'all' ? (
        <div className="space-y-4 pt-4 border-t border-border/40 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5" /> Min. Projected Yield
            </label>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
              {minYield}%+
            </span>
          </div>
          <Slider 
            value={[minYield]} 
            min={0} 
            max={25} 
            step={1}
            onValueChange={(vals) => setMinYield(vals[0])}
            className="py-2"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
            <span>Any</span>
            <span>25%+</span>
          </div>
        </div>
      ) : null}
      
      <div className="pt-4 border-t border-border/40">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-muted-foreground hover:text-foreground"
          onClick={() => {
            setFilterType('all');
            setPriceRange([0, 5000000]);
            setMinYield(0);
          }}
        >
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
