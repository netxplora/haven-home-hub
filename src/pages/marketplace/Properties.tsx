import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PropertyCard, PropertyCardData } from "@/components/site/PropertyCard";
import { PropertyMap } from "@/components/site/PropertyMap";
import { PromoBanner } from "@/components/site/PromoBanner";
import { SaveSearchButton } from "@/components/site/SavedSearch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  SlidersHorizontal, 
  Search, 
  X, 
  ChevronDown, 
  MapPin, 
  Home as HomeIcon, 
  Tag,
  ArrowUpDown,
  Filter,
  Map as MapIcon,
  LayoutGrid
} from "lucide-react";
import { SEO } from "@/components/site/SEO";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

/* ── Hero content per property type ────────────────────────── */
const HERO_CONTENT: Record<string, { badge: string; title: string; subtitle: string; desc: string; img: string }> = {
  buy: {
    badge: "For Sale",
    title: "Buy Properties",
    subtitle: "Find your next home",
    desc: "Browse verified homes for sale — from family houses to modern apartments. Every listing is inspected and confirmed by our agency before going live.",
    img: "/hero_buy_properties.png",
  },
  rent: {
    badge: "For Rent",
    title: "Rent Homes",
    subtitle: "Quality rental living",
    desc: "Explore professionally managed apartments, furnished units, and urban rental spaces. Flexible terms, verified landlords, and move-in ready options.",
    img: "/hero_rent_properties.png",
  },
  land: {
    badge: "Land Listings",
    title: "Land Listings",
    subtitle: "Secure your plot",
    desc: "View surveyed land parcels with clear titles — residential plots, commercial sites, and development-ready acreage across all locations.",
    img: "/hero_land_listings.png",
  },
  all: {
    badge: "All Listings",
    title: "All Properties",
    subtitle: "View all available properties",
    desc: "Search across homes for sale, rental properties, and land parcels. Every listing is verified and managed by our in-house agency team.",
    img: "/hero_all_properties.png",
  },
};

const PROPERTY_CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "commercial", label: "Commercial" },
  { value: "land", label: "Land" },
  { value: "penthouse", label: "Penthouse" },
];

export default function Properties() {
  const [params, setParams] = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  // Filter States from URL
  const type = params.get("type") ?? "all";
  const category = params.get("category") ?? "all";
  const q = params.get("q") ?? "";
  const country = params.get("country") ?? "all";
  const state = params.get("state") ?? "all";
  const city = params.get("city") ?? "all";
  const minPrice = params.get("minPrice") ?? "";
  const maxPrice = params.get("maxPrice") ?? "";
  const bedrooms = params.get("bedrooms") ?? "any";
  const bathrooms = params.get("bathrooms") ?? "any";
  const parking = params.get("parking") ?? "any";
  const sort = params.get("sort") ?? "newest";
  const status = params.get("status") ?? "available";

  const [qLocal, setQLocal] = useState(q);
  useEffect(() => setQLocal(q), [q]);

  /* ── Hero content logic ─────────────────────────────────────── */
  const content = useMemo(() => HERO_CONTENT[type] ?? HERO_CONTENT.all, [type]);

  /* ── Fetch Metadata for Filters ────────────────────────────── */
  const { data: filterMetadata } = useQuery({
    queryKey: ["filter-metadata"],
    queryFn: async () => {
      const [countries, states, cities] = await Promise.all([
        (supabase.from("properties" as any).select("country") as any).not("country", "is", null),
        (supabase.from("properties" as any).select("state") as any).not("state", "is", null),
        (supabase.from("properties" as any).select("city") as any).not("city", "is", null),
      ]);

      return {
        countries: Array.from(new Set(countries.data?.map((d: any) => d.country).filter(Boolean))) as string[],
        states: Array.from(new Set(states.data?.map((d: any) => d.state).filter(Boolean))) as string[],
        cities: Array.from(new Set(cities.data?.map((d: any) => d.city).filter(Boolean))) as string[],
      };
    },
  });

  /* ── Main Properties Query ────────────────────────────────── */
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["properties", type, category, q, country, state, city, minPrice, maxPrice, bedrooms, bathrooms, parking, sort, status, params.get("minSize"), params.get("maxSize")],
    queryFn: async () => {
      let query = supabase
        .from("properties" as any)
        .select(`
          id, slug, title, price, currency, property_type, status, 
          bedrooms, bathrooms, size_sqm, cover_image_url, address, 
          featured, created_at, property_category, city, state, country,
          latitude, longitude,
          locations(name, slug)
        `);

      // Type & Category
      if (type !== "all") query = query.eq("property_type", type);
      if (category !== "all") query = query.eq("property_category", category);
      
      if (status === "all") {
        query = query.in("status", ["available", "reserved"]);
      } else {
        query = query.eq("status", status);
      }

      // Search
      if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,address.ilike.%${q}%,city.ilike.%${q}%,state.ilike.%${q}%`);

      // Location
      if (country !== "all") query = query.eq("country", country);
      if (state !== "all") query = query.eq("state", state);
      if (city !== "all") query = query.eq("city", city);

      // Specs
      if (minPrice) query = query.gte("price", Number(minPrice));
      if (maxPrice) query = query.lte("price", Number(maxPrice));
      if (bedrooms !== "any") query = query.gte("bedrooms", Number(bedrooms));
      if (bathrooms !== "any") query = query.gte("bathrooms", Number(bathrooms));
      if (parking !== "any") query = query.gte("parking_spaces", Number(parking));
      
      const minSize = params.get("minSize");
      const maxSize = params.get("maxSize");
      if (minSize) query = query.gte("size_sqm", Number(minSize));
      if (maxSize) query = query.lte("size_sqm", Number(maxSize));

      // Sorting
      switch (sort) {
        case "price_asc": query = query.order("price", { ascending: true }); break;
        case "price_desc": query = query.order("price", { ascending: false }); break;
        case "featured": query = query.order("featured", { ascending: false }).order("created_at", { ascending: false }); break;
        case "oldest": query = query.order("created_at", { ascending: true }); break;
        case "size_desc": query = query.order("size_sqm", { ascending: false }); break;
        case "location_asc": query = query.order("city", { ascending: true }); break;
        default: query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as PropertyCardData[];
    },
  });

  const currency = properties[0]?.currency ?? "USD";

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value || String(value) === "any" || String(value) === "all") next.delete(key);
    else next.set(key, value);
    setParams(next);
  }

  function clearAll() {
    setParams(new URLSearchParams());
    setQLocal("");
  }

  const activeFilters = useMemo(() => {
    const list: { key: string; label: string; value: string }[] = [];
    if (type && type !== "all") list.push({ key: "type", label: `Type: ${type}`, value: type });
    if (category && category !== "all") {
      const catLabel = PROPERTY_CATEGORIES.find(c => c.value === category)?.label || category;
      list.push({ key: "category", label: `Category: ${catLabel}`, value: category });
    }
    if (country && country !== "all") list.push({ key: "country", label: `Country: ${country}`, value: country });
    if (state && state !== "all") list.push({ key: "state", label: `State: ${state}`, value: state });
    if (city && city !== "all") list.push({ key: "city", label: `City: ${city}`, value: city });
    if (minPrice) list.push({ key: "minPrice", label: `Min Price: $${Number(minPrice).toLocaleString()}`, value: minPrice });
    if (maxPrice) list.push({ key: "maxPrice", label: `Max Price: $${Number(maxPrice).toLocaleString()}`, value: maxPrice });
    if (bedrooms && bedrooms !== "any") list.push({ key: "bedrooms", label: `Bedrooms: ${bedrooms}+`, value: bedrooms });
    if (bathrooms && bathrooms !== "any") list.push({ key: "bathrooms", label: `Bathrooms: ${bathrooms}+`, value: bathrooms });
    if (parking && parking !== "any") list.push({ key: "parking", label: `Parking: ${parking}+`, value: parking });
    if (status && status !== "available") list.push({ key: "status", label: `Status: ${status}`, value: status });
    
    const minSize = params.get("minSize");
    const maxSize = params.get("maxSize");
    if (minSize) list.push({ key: "minSize", label: `Min Size: ${minSize} sqm`, value: minSize });
    if (maxSize) list.push({ key: "maxSize", label: `Max Size: ${maxSize} sqm`, value: maxSize });
    return list;
  }, [type, category, country, state, city, minPrice, maxPrice, bedrooms, bathrooms, parking, status, params]);

  const activeFilterCount = activeFilters.length;

  return (
    <SiteLayout>
      <SEO title={content.title} description={content.desc} />

      {/* ── Hero Section ──────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-black min-h-[480px] sm:min-h-[560px] flex items-center">
        <img
          key={content.img}
          src={content.img}
          alt={content.title}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000"
        />
        <div className="absolute inset-0 bg-black/30 z-[1]" />
        <div className="absolute inset-0 bg-gradient-hero-emerald mix-blend-multiply opacity-60 z-[2]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-[3]" />

        <div className="container-wide relative z-10 flex flex-col justify-center py-16 sm:py-24 text-white">
          <div className="max-w-3xl">
            <span className="inline-block px-3 py-1 mb-5 text-xs font-semibold tracking-wider uppercase bg-primary text-primary-foreground rounded-full shadow-lg">
              {content.badge}
            </span>
            <h1 className="font-serif text-4xl font-bold sm:text-6xl text-white tracking-tight leading-[1.1] mb-4">
              {content.title}
            </h1>
            <p className="text-lg sm:text-xl text-white/90 font-medium mb-6">
              {content.subtitle}
            </p>
            <div className="relative max-w-xl group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-emerald-500/50 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <form
                onSubmit={(e) => { e.preventDefault(); update("q", qLocal); }}
                className="relative flex items-center bg-white rounded-xl shadow-xl overflow-hidden"
              >
                <div className="flex-1 flex items-center px-4">
                  <Search className="h-5 w-5 text-muted-foreground mr-3" />
                  <Input
                    value={qLocal}
                    onChange={(e) => setQLocal(e.target.value)}
                    placeholder="Search city, neighborhood, or ZIP..."
                    className="h-14 border-none shadow-none focus-visible:ring-0 text-foreground text-lg placeholder:text-muted-foreground/60"
                  />
                </div>
                <Button type="submit" size="lg" className="h-14 px-8 rounded-none bg-primary hover:bg-primary/90 text-white font-bold">
                  Search
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ── Filter Bar ────────────────────────────────────────── */}
      <div className="sticky top-[64px] z-30 bg-background/95 backdrop-blur-md border-b border-border py-4 transition-all">
        <div className="container-wide">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            
            {/* Desktop Filter Row */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Type Switcher */}
              <div className="flex p-1 bg-accent rounded-lg border border-border mr-2">
                {["all", "buy", "rent", "land"].map((t) => (
                  <button
                    key={t}
                    onClick={() => update("type", t)}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-tighter rounded-md transition-all ${
                      type === t ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "all" ? "All" : t === "buy" ? "Buy" : t === "rent" ? "Rent" : "Land"}
                  </button>
                ))}
              </div>

              {/* Category */}
              <Select value={category} onValueChange={(v) => update("category", v)}>
                <SelectTrigger className="w-[140px] h-10 border-border bg-card">
                  <div className="flex items-center gap-2">
                    <HomeIcon className="h-3.5 w-3.5 text-primary/60" />
                    <SelectValue placeholder="Category" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Location Selects */}
              <div className="hidden xl:flex items-center gap-2">
                <Select value={country} onValueChange={(v) => update("country", v)}>
                  <SelectTrigger className="w-[130px] h-10 border-border bg-card">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Country</SelectItem>
                    {filterMetadata?.countries.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={city} onValueChange={(v) => update("city", v)}>
                  <SelectTrigger className="w-[130px] h-10 border-border bg-card">
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any City</SelectItem>
                    {filterMetadata?.cities.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* More Filters Toggle (Mobile & Desktop) */}
              <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="h-10 gap-2 border-primary/20 hover:border-primary/40 bg-primary/5">
                    <SlidersHorizontal className="h-4 w-4 text-primary" />
                    <span className="hidden sm:inline">Search Filters</span>
                    {activeFilterCount > 0 && (
                      <Badge variant="default" className="ml-1 h-5 min-w-5 flex items-center justify-center p-0 text-[10px] bg-primary text-white">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                  <SheetHeader className="pb-6 border-b">
                    <SheetTitle className="font-serif text-2xl">Property Filters</SheetTitle>
                  </SheetHeader>
                  
                  <div className="py-8 space-y-8">
                    {/* Status Section */}
                    <div className="space-y-4">
                      <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Property Status</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {["available", "reserved", "sold", "all"].map(s => (
                          <Button 
                            key={s}
                            variant={status === s ? "default" : "outline"}
                            size="sm"
                            onClick={() => update("status", s)}
                            className="capitalize font-semibold"
                          >
                            {s.replace("_", " ")}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Price Range */}
                    <div className="space-y-4">
                      <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Price Range ({currency})</Label>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 space-y-1.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Min</span>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            value={minPrice}
                            onChange={(e) => update("minPrice", e.target.value)}
                            className="h-11"
                          />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Max</span>
                          <Input 
                            type="number" 
                            placeholder="No max" 
                            value={maxPrice}
                            onChange={(e) => update("maxPrice", e.target.value)}
                            className="h-11"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Rooms & Features */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-sm font-bold">Bedrooms</Label>
                        <Select value={bedrooms} onValueChange={(v) => update("bedrooms", v)}>
                          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            {[1,2,3,4,5].map(n => <SelectItem key={n} value={n.toString()}>{n}+ Beds</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-bold">Bathrooms</Label>
                        <Select value={bathrooms} onValueChange={(v) => update("bathrooms", v)}>
                          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            {[1,2,3,4].map(n => <SelectItem key={n} value={n.toString()}>{n}+ Baths</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Property Size */}
                    <div className="space-y-4 pt-4 border-t">
                      <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Property Size (sqm)</Label>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 space-y-1.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Min Size</span>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            value={params.get("minSize") ?? ""}
                            onChange={(e) => update("minSize", e.target.value)}
                            className="h-11"
                          />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Max Size</span>
                          <Input 
                            type="number" 
                            placeholder="Any" 
                            value={params.get("maxSize") ?? ""}
                            onChange={(e) => update("maxSize", e.target.value)}
                            className="h-11"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Location (Mobile Visible) */}
                    <div className="space-y-4 pt-4 border-t lg:hidden">
                      <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Location</Label>
                      <div className="space-y-4">
                        <Select value={country} onValueChange={(v) => update("country", v)}>
                          <SelectTrigger className="h-11"><SelectValue placeholder="Select Country" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any Country</SelectItem>
                            {filterMetadata?.countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={city} onValueChange={(v) => update("city", v)}>
                          <SelectTrigger className="h-11"><SelectValue placeholder="Select City" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any City</SelectItem>
                            {filterMetadata?.cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <SheetFooter className="mt-8 pt-6 border-t gap-2 sm:flex-col">
                    <Button onClick={() => setIsFilterOpen(false)} className="w-full h-12 font-bold uppercase tracking-wider">Show Results</Button>
                    <Button variant="ghost" onClick={clearAll} className="w-full text-muted-foreground">Reset All</Button>
                  </SheetFooter>

                  <div className="mt-8">
                    <PromoBanner placement="sidebar" />
                  </div>
                </SheetContent>
              </Sheet>

              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAll} className="h-10 text-muted-foreground hover:text-destructive gap-2">
                  <X className="h-4 w-4" /> Clear
                </Button>
              )}
            </div>
            
            {/* Sorting & Results */}
            <div className="flex items-center justify-between lg:justify-end gap-4 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-border">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-bold text-primary">{properties.length}</span>
                <span className="text-muted-foreground font-medium">Properties</span>
              </div>

              <div className="flex items-center gap-1 bg-accent/50 p-1 rounded-lg border border-border">
                <button 
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setViewMode("map")}
                  className={`p-1.5 rounded-md transition-all ${viewMode === "map" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <MapIcon className="h-4 w-4" />
                </button>
              </div>

              <SaveSearchButton currentFilters={Object.fromEntries(params.entries())} />

              <div className="flex items-center gap-3">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
                <Select value={sort} onValueChange={(v) => update("sort", v)}>
                  <SelectTrigger className="w-[160px] h-10 border-none bg-transparent hover:bg-secondary transition-colors font-medium">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                    <SelectItem value="size_desc">Size</SelectItem>
                    <SelectItem value="location_asc">Location: A-Z</SelectItem>
                    <SelectItem value="featured">Featured First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Active Filters Row ── */}
      {activeFilters.length > 0 && (
        <div className="bg-secondary/15 py-3 border-b border-border/40 animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="container-wide flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mr-2">Active Filters:</span>
            {activeFilters.map(filter => (
              <Badge 
                key={filter.key} 
                variant="secondary" 
                className="rounded-lg bg-background hover:bg-accent border border-border/40 pl-3.5 pr-2.5 py-1.5 text-xs font-semibold text-foreground flex items-center gap-2 cursor-pointer shadow-sm group hover:border-primary/20 transition-all"
                onClick={() => update(filter.key, "")}
              >
                <span>{filter.label}</span>
                <X className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 text-xs font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg px-3">
              Reset All
            </Button>
          </div>
        </div>
      )}

      {/* ── Main Grid ─────────────────────────────────────────── */}
      <div className="container-wide py-12 min-h-[60vh]">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="h-20 w-20 bg-secondary rounded-full flex items-center justify-center mb-6">
              <Filter className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <h2 className="font-serif text-3xl font-bold mb-4">No matching properties</h2>
            <p className="text-muted-foreground max-w-md mb-8 text-lg">
              We couldn't find any properties matching your current criteria. Try adjusting your filters or search terms.
            </p>
            <Button size="lg" onClick={clearAll} className="rounded-full px-8 shadow-card">
              Reset all filters
            </Button>
          </div>
        ) : viewMode === "map" ? (
          <div className="animate-in fade-in duration-500">
            <PropertyMap properties={properties} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 animate-in fade-in duration-500">
              {properties.map((p) => <PropertyCard key={p.id} property={p} />)}
            </div>
            <div className="mt-16 flex justify-center">
              <p className="text-sm text-muted-foreground bg-accent px-4 py-2 rounded-full border border-border">
                Showing all {properties.length} results
              </p>
            </div>
          </>
        )}
      </div>
    </SiteLayout>
  );
}
