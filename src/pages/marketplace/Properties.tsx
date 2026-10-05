import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PropertyCard, PropertyCardData } from "@/components/site/PropertyCard";
import { PropertyMap } from "@/components/site/PropertyMap";
import { PromoBanner } from "@/components/site/PromoBanner";
import { SaveSearchButton } from "@/components/site/SavedSearch";
import { enrichProperty } from "@/lib/format";
import { useBrand } from "@/hooks/useBrand";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SlidersHorizontal,
  Search,
  X,
  MapPin,
  Home as HomeIcon,
  ArrowUpDown,
  Map as MapIcon,
  LayoutGrid,
  ShieldCheck,
  Droplets,
  ChevronDown
} from "lucide-react";
import { SEO } from "@/components/site/SEO";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import heroBuy from "@/assets/hero.webp";
import heroRent from "@/assets/location-downtown.jpg";
import heroLand from "@/assets/location-hills.jpg";
import heroAll from "@/assets/property-1.jpg";

/* ── Hero content per property type ────────────────────────── */
const HERO_CONTENT: Record<string, { badge: string; title: string; subtitle: string; desc: string; img: string }> = {
  buy: {
    badge: "For Sale",
    title: "Buy Properties",
    subtitle: "Find your next home.",
    desc: "Browse verified homes for sale — from family houses to modern apartments. Every listing is inspected and confirmed by our agency before going live.",
    img: heroBuy,
  },
  rent: {
    badge: "For Rent",
    title: "Rent Homes",
    subtitle: "Quality rental living.",
    desc: "Explore professionally managed apartments, furnished units, and urban rental spaces. Flexible terms, verified landlords, and move-in ready options.",
    img: heroRent,
  },
  land: {
    badge: "Land Listings",
    title: "Land Listings",
    subtitle: "Secure your plot.",
    desc: "View surveyed land parcels with clear titles — residential plots, commercial sites, and development-ready acreage across all locations.",
    img: heroLand,
  },
  all: {
    badge: "All Listings",
    title: "All Properties",
    subtitle: "Every verified listing.",
    desc: "Search across homes for sale, rental properties, and land parcels. Every listing is verified and managed by our in-house agency team.",
    img: heroAll,
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
  const { brand } = useBrand();
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
  const verifiedOnly = params.get("verified") === "true";
  const minWalkScore = params.get("minWalkScore") ?? "";
  const floodSafe = params.get("floodSafe") === "true";
  const location_id = params.get("location_id") ?? "all";

  const [qLocal, setQLocal] = useState(q);
  useEffect(() => setQLocal(q), [q]);

  /* ── Hero content logic ─────────────────────────────────────── */
  const content = useMemo(() => HERO_CONTENT[type] ?? HERO_CONTENT.all, [type]);

  /* ── Fetch Metadata for Filters ────────────────────────────── */
  const { data: filterMetadata } = useQuery({
    queryKey: ["filter-metadata", country, state],
    queryFn: async () => {
      let countryQuery = supabase.from("properties" as any).select("country").not("country", "is", null);
      let stateQuery = supabase.from("properties" as any).select("state").not("state", "is", null);
      if (country && country !== "all") stateQuery = stateQuery.eq("country", country);
      let cityQuery = supabase.from("properties" as any).select("city").not("city", "is", null);
      if (state && state !== "all") cityQuery = cityQuery.eq("state", state);
      else if (country && country !== "all") cityQuery = cityQuery.eq("country", country);
      const [countries, states, cities] = await Promise.all([countryQuery, stateQuery, cityQuery]);
      return {
        countries: Array.from(new Set(countries.data?.map((d: any) => d.country).filter(Boolean))) as string[],
        states: Array.from(new Set(states.data?.map((d: any) => d.state).filter(Boolean))) as string[],
        cities: Array.from(new Set(cities.data?.map((d: any) => d.city).filter(Boolean))) as string[],
      };
    },
  });

  /* ── Main Properties Query ────────────────────────────────── */
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["properties", type, category, q, country, state, city, location_id, minPrice, maxPrice, bedrooms, bathrooms, parking, sort, status, params.get("minSize"), params.get("maxSize")],
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
      if (type !== "all") query = query.eq("property_type", type);
      if (category !== "all") query = query.eq("property_category", category);
      if (status === "all") query = query.in("status", ["available", "reserved"]);
      else query = query.eq("status", status);
      if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,address.ilike.%${q}%,city.ilike.%${q}%,state.ilike.%${q}%`);
      if (location_id !== "all") query = query.eq("location_id", location_id);
      if (country !== "all") query = query.eq("country", country);
      if (state !== "all") query = query.eq("state", state);
      if (city !== "all") query = query.eq("city", city);
      if (minPrice) query = query.gte("price", Number(minPrice));
      if (maxPrice) query = query.lte("price", Number(maxPrice));
      if (bedrooms !== "any") query = query.gte("bedrooms", Number(bedrooms));
      if (bathrooms !== "any") query = query.gte("bathrooms", Number(bathrooms));
      if (parking !== "any") query = query.gte("parking_spaces", Number(parking));
      const minSize = params.get("minSize");
      const maxSize = params.get("maxSize");
      if (minSize) query = query.gte("size_sqm", Number(minSize));
      if (maxSize) query = query.lte("size_sqm", Number(maxSize));
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

  const filteredProperties = useMemo(() => {
    let list = properties.map(p => enrichProperty(p));
    if (verifiedOnly) list = list.filter((p: any) => p.isVerified);
    if (minWalkScore) list = list.filter((p: any) => p.walkScore >= Number(minWalkScore));
    if (floodSafe) list = list.filter((p: any) => p.isFloodSafe);
    return list;
  }, [properties, verifiedOnly, minWalkScore, floodSafe]);

  const currency = properties[0]?.currency ?? "USD";

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value || String(value) === "any" || String(value) === "all") next.delete(key);
    else next.set(key, value);
    setParams(next);
  }

  function updateLocation(level: "country" | "state" | "city", value: string) {
    const next = new URLSearchParams(params);
    if (!value || String(value) === "any" || String(value) === "all") next.delete(level);
    else next.set(level, value);
    if (level === "country") { next.delete("state"); next.delete("city"); }
    else if (level === "state") next.delete("city");
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
    if (minPrice) list.push({ key: "minPrice", label: `Min: $${Number(minPrice).toLocaleString()}`, value: minPrice });
    if (maxPrice) list.push({ key: "maxPrice", label: `Max: $${Number(maxPrice).toLocaleString()}`, value: maxPrice });
    if (bedrooms && bedrooms !== "any") list.push({ key: "bedrooms", label: `${bedrooms}+ Beds`, value: bedrooms });
    if (bathrooms && bathrooms !== "any") list.push({ key: "bathrooms", label: `${bathrooms}+ Baths`, value: bathrooms });
    if (parking && parking !== "any") list.push({ key: "parking", label: `${parking}+ Parking`, value: parking });
    if (status && status !== "available") list.push({ key: "status", label: `Status: ${status.replace("_", " ")}`, value: status });
    if (verifiedOnly) list.push({ key: "verified", label: "Verified Only", value: "true" });
    if (minWalkScore) list.push({ key: "minWalkScore", label: `Walk ${minWalkScore}+`, value: minWalkScore });
    if (floodSafe) list.push({ key: "floodSafe", label: "Flood-Safe", value: "true" });
    const minSize = params.get("minSize");
    const maxSize = params.get("maxSize");
    if (minSize) list.push({ key: "minSize", label: `Min ${minSize}sqm`, value: minSize });
    if (maxSize) list.push({ key: "maxSize", label: `Max ${maxSize}sqm`, value: maxSize });
    return list;
  }, [type, category, country, state, city, minPrice, maxPrice, bedrooms, bathrooms, parking, status, verifiedOnly, minWalkScore, floodSafe, params]);

  const activeFilterCount = activeFilters.length;

  return (
    <SiteLayout transparentNav="mobile">
      <SEO
        title={`${content.title}${city && city !== "all" ? ` in ${city}` : state && state !== "all" ? ` in ${state}` : country && country !== "all" ? ` in ${country}` : ""} | ${brand.platform_name}`}
        description={content.desc}
        canonicalUrl={`${window.location.origin}/properties${window.location.search}`}
      />

      {/* ── 1. Editorial Property Hero (Type A) ──────────────────── */}
      <section className="relative overflow-hidden bg-card border-b border-border/50 pt-16 md:pt-24 pb-8 md:pb-12">
        <div className="container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Editorial Information & Search */}
            <div className="lg:col-span-6 xl:col-span-6 space-y-5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                  {content.badge}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  Verified Real Estate Catalog
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground tracking-tight leading-[1.1]">
                {content.title}
              </h1>

              <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
                {content.desc}
              </p>

              {/* Category Segment Selector */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {[
                  { id: "all", label: "All Listings" },
                  { id: "buy", label: "Buy Homes" },
                  { id: "rent", label: "Rentals" },
                  { id: "land", label: "Land & Plots" },
                ].map((tab) => {
                  const isActive = (tab.id === "all" && (!type || type === "all")) || type === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => update("type", tab.id === "all" ? "" : tab.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <form
                onSubmit={(e) => { e.preventDefault(); update("q", qLocal); }}
                className="pt-2 flex items-center gap-2 max-w-lg"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={qLocal}
                    onChange={(e) => setQLocal(e.target.value)}
                    placeholder="Search by city, address, or keyword..."
                    className="h-11 pl-10 pr-4 rounded-xl border border-border/80 bg-background text-foreground text-xs sm:text-sm font-medium focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <Button type="submit" className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shrink-0">
                  Search
                </Button>
              </form>
            </div>

            {/* Right Column: Architectural Photography Showcase */}
            <div className="lg:col-span-6 xl:col-span-6 relative">
              <div className="relative aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden border border-border/60 shadow-md group">
                <img
                  key={content.img}
                  src={content.img}
                  alt={content.title}
                  className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                  <span className="text-xs font-semibold drop-shadow-sm px-2.5 py-1 rounded-md bg-black/40 backdrop-blur-md border border-white/15">
                    {content.subtitle}
                  </span>
                  <span className="text-[11px] font-medium drop-shadow-sm text-white/80">
                    Physical Inspections Confirmed
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Sticky Filter Bar ────────────────────────────────────── */}
      <div className="sticky top-[64px] z-30 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="container-wide py-3">
          <div className="flex flex-wrap items-center gap-2">

            {/* Type pill group */}
            <div className="flex p-0.5 bg-accent rounded-lg border border-border/60 shrink-0">
              {["all", "buy", "rent", "land"].map((t) => (
                <button
                  key={t}
                  onClick={() => update("type", t)}
                  className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-md transition-all whitespace-nowrap ${
                    type === t
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "all" ? "All" : t === "buy" ? "Buy" : t === "rent" ? "Rent" : "Land"}
                </button>
              ))}
            </div>

            {/* Category quick-select */}
            <Select value={category} onValueChange={(v) => update("category", v)}>
              <SelectTrigger className="h-9 w-auto gap-1.5 border-border/60 bg-card text-xs font-medium pr-2 pl-3">
                <HomeIcon className="h-3.5 w-3.5 text-primary/60" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Location selects — desktop only */}
            <div className="hidden xl:flex items-center gap-2">
              <Select value={country} onValueChange={(v) => updateLocation("country", v)}>
                <SelectTrigger className="h-9 w-[130px] border-border/60 bg-card text-xs">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Country</SelectItem>
                  {filterMetadata?.countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={state} onValueChange={(v) => updateLocation("state", v)}>
                <SelectTrigger className="h-9 w-[130px] border-border/60 bg-card text-xs">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any State</SelectItem>
                  {filterMetadata?.states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={city} onValueChange={(v) => updateLocation("city", v)}>
                <SelectTrigger className="h-9 w-[130px] border-border/60 bg-card text-xs">
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any City</SelectItem>
                  {filterMetadata?.cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Verified toggle */}
            <button
              onClick={() => update("verified", verifiedOnly ? "" : "true")}
              className={`hidden lg:flex h-9 items-center gap-1.5 px-3 rounded-lg border text-[11px] font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                verifiedOnly
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-card text-muted-foreground border-border/60 hover:border-primary/20 hover:text-primary"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Verified
            </button>

            {/* More filters */}
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-9 gap-2 border-border/60 bg-card text-xs font-medium">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold px-1">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="pb-6 border-b">
                  <SheetTitle className="font-serif text-2xl">Search Filters</SheetTitle>
                </SheetHeader>

                <div className="py-8 space-y-8">
                  {/* Property Status */}
                  <div className="space-y-4">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {["available", "reserved", "sold", "all"].map(s => (
                        <Button
                          key={s}
                          variant={status === s ? "default" : "outline"}
                          size="sm"
                          onClick={() => update("status", s)}
                          className="capitalize font-semibold h-11"
                        >
                          {s.replace("_", " ")}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div className="space-y-4">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Price Range ({currency})</Label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-1.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Min</span>
                        <Input type="number" placeholder="0" value={minPrice} onChange={(e) => update("minPrice", e.target.value)} className="h-11" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Max</span>
                        <Input type="number" placeholder="No max" value={maxPrice} onChange={(e) => update("maxPrice", e.target.value)} className="h-11" />
                      </div>
                    </div>
                  </div>

                  {/* Rooms — hidden for land */}
                  {type !== "land" && (
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
                  )}

                  {/* Size */}
                  <div className="space-y-4 pt-4 border-t">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Property Size (sqm)</Label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-1.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Min</span>
                        <Input type="number" placeholder="0" value={params.get("minSize") ?? ""} onChange={(e) => update("minSize", e.target.value)} className="h-11" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Max</span>
                        <Input type="number" placeholder="Any" value={params.get("maxSize") ?? ""} onChange={(e) => update("maxSize", e.target.value)} className="h-11" />
                      </div>
                    </div>
                  </div>

                  {/* Location — mobile visible */}
                  <div className="space-y-4 pt-4 border-t xl:hidden">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Location</Label>
                    <div className="space-y-3">
                      <Select value={country} onValueChange={(v) => updateLocation("country", v)}>
                        <SelectTrigger className="h-11"><SelectValue placeholder="Select Country" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Country</SelectItem>
                          {filterMetadata?.countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={state} onValueChange={(v) => updateLocation("state", v)}>
                        <SelectTrigger className="h-11"><SelectValue placeholder="Select State" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any State</SelectItem>
                          {filterMetadata?.states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={city} onValueChange={(v) => updateLocation("city", v)}>
                        <SelectTrigger className="h-11"><SelectValue placeholder="Select City" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any City</SelectItem>
                          {filterMetadata?.cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Infrastructure filters */}
                  <div className="space-y-4 pt-4 border-t">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Infrastructure & Safety</Label>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-accent/50 border border-border/50">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">Verified Listings Only</span>
                      </div>
                      <button
                        onClick={() => update("verified", verifiedOnly ? "" : "true")}
                        className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${verifiedOnly ? "bg-primary" : "bg-muted"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${verifiedOnly ? "translate-x-5" : ""}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-accent/50 border border-border/50">
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-semibold">Flood-Safe Zone Only</span>
                      </div>
                      <button
                        onClick={() => update("floodSafe", floodSafe ? "" : "true")}
                        className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${floodSafe ? "bg-blue-500" : "bg-muted"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${floodSafe ? "translate-x-5" : ""}`} />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-bold text-muted-foreground">Minimum Walk Score</span>
                      <Select value={minWalkScore || "any"} onValueChange={(v) => update("minWalkScore", v === "any" ? "" : v)}>
                        <SelectTrigger className="h-11">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                            <SelectValue placeholder="Any" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="50">50+ (Somewhat Walkable)</SelectItem>
                          <SelectItem value="70">70+ (Very Walkable)</SelectItem>
                          <SelectItem value="90">90+ (Walker's Paradise)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <SheetFooter className="mt-4 pt-6 border-t gap-2 sm:flex-col">
                  <SheetClose asChild>
                    <Button className="w-full h-12 font-bold uppercase tracking-wider">Show Results ({filteredProperties.length})</Button>
                  </SheetClose>
                  <Button variant="ghost" onClick={clearAll} className="w-full text-muted-foreground">Reset All Filters</Button>
                </SheetFooter>

                <div className="mt-8">
                  <PromoBanner placement="sidebar" />
                </div>
              </SheetContent>
            </Sheet>

            {/* Clear if active */}
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="h-9 text-muted-foreground hover:text-destructive gap-1.5 text-xs">
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Result count */}
            <span className="text-sm font-semibold text-foreground tabular-nums hidden sm:block">
              {filteredProperties.length} <span className="font-normal text-muted-foreground">results</span>
            </span>

            {/* View toggle */}
            <div className="flex items-center gap-0.5 bg-accent/70 p-0.5 rounded-lg border border-border/60">
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "map" ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                title="Map view"
              >
                <MapIcon className="h-4 w-4" />
              </button>
            </div>

            <SaveSearchButton currentFilters={Object.fromEntries(params.entries())} />

            {/* Sort */}
            <Select value={sort} onValueChange={(v) => update("sort", v)}>
              <SelectTrigger className="h-9 w-[150px] border-border/60 bg-card text-xs font-medium">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="price_asc">Price: Low → High</SelectItem>
                <SelectItem value="price_desc">Price: High → Low</SelectItem>
                <SelectItem value="size_desc">Largest First</SelectItem>
                <SelectItem value="location_asc">Location: A–Z</SelectItem>
                <SelectItem value="featured">Featured First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2.5 pb-1 animate-in fade-in slide-in-from-top-1 duration-300">
              {activeFilters.map(filter => (
                <button
                  key={filter.key}
                  onClick={() => update(filter.key, "")}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/8 hover:bg-primary/15 border border-primary/20 text-primary text-[11px] font-semibold transition-all group"
                >
                  {filter.label}
                  <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                </button>
              ))}
              <button onClick={clearAll} className="text-[11px] font-semibold text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2">
                Reset all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Grid / Map ────────────────────────────────────── */}
      <div className="container-wide py-10 min-h-[60vh]">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <EmptyState
              title="No matching properties"
              description="We couldn't find any properties matching your criteria. Try adjusting your filters or search terms."
              action={{ label: "Reset all filters", onClick: clearAll }}
            />
          </div>
        ) : viewMode === "map" ? (
          <div className="animate-in fade-in duration-500">
            <PropertyMap properties={properties} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6 animate-in fade-in duration-500">
              {filteredProperties.map((p: any) => <PropertyCard key={p.id} property={p} />)}
            </div>
            <div className="mt-14 flex justify-center">
              <p className="text-xs font-medium text-muted-foreground bg-accent px-5 py-2.5 rounded-full border border-border/50">
                Showing all {filteredProperties.length} {filteredProperties.length === 1 ? "result" : "results"}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="pb-8">
        <PromoBanner placement="homepage_hero" className="container-wide" />
      </div>
    </SiteLayout>
  );
}
