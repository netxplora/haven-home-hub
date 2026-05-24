import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { InvestmentCard } from "@/components/invest/InvestmentCard";
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
  TrendingUp,
  Percent,
  Calendar,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Building2
} from "lucide-react";
import { SEO } from "@/components/site/SEO";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import type { InvestmentProperty } from "@/lib/invest";

const INVESTMENT_CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "industrial", label: "Industrial" },
  { value: "student_housing", label: "Student Housing" },
];

export default function InvestOpportunities() {
  const [params, setParams] = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filter States from URL
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "all";
  const country = params.get("country") ?? "all";
  const city = params.get("city") ?? "all";
  const minInvest = params.get("minInvest") ?? "";
  const maxInvest = params.get("maxInvest") ?? "";
  const minROI = params.get("minROI") ?? "";
  const hasInstallment = params.get("installment") === "true";
  const status = params.get("status") ?? "open";
  const sort = params.get("sort") ?? "newest";

  const [qLocal, setQLocal] = useState(q);
  useEffect(() => setQLocal(q), [q]);

  /* ── Fetch Metadata for Filters ────────────────────────────── */
  const { data: filterMetadata } = useQuery({
    queryKey: ["invest-filter-metadata"],
    queryFn: async () => {
      const [countries, cities] = await Promise.all([
        (supabase.from("investment_properties" as any).select("country") as any).not("country", "is", null),
        (supabase.from("investment_properties" as any).select("city") as any).not("city", "is", null),
      ]);

      return {
        countries: Array.from(new Set(countries.data?.map((d: any) => d.country).filter(Boolean))) as string[],
        cities: Array.from(new Set(cities.data?.map((d: any) => d.city).filter(Boolean))) as string[],
      };
    },
  });

  /* ── Main Investment Query ─────────────────────────────────── */
  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ["invest-opportunities", q, category, country, city, minInvest, maxInvest, minROI, hasInstallment, status, sort],
    queryFn: async () => {
      let query = supabase
        .from("investment_opportunities_v" as any)
        .select("*");

      // Category & Status
      if (category !== "all") query = query.eq("property_category", category);
      if (status !== "all") query = query.eq("status", status);
      if (hasInstallment) query = query.eq("installment_available", true);

      // Search
      if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,location.ilike.%${q}%,city.ilike.%${q}%,state.ilike.%${q}%`);

      // Location
      if (country !== "all") query = query.eq("country", country);
      if (city !== "all") query = query.eq("city", city);

      // Financials
      if (minInvest) query = query.gte("min_investment", Number(minInvest));
      if (maxInvest) query = query.lte("min_investment", Number(maxInvest));
      if (minROI) query = query.gte("projected_return_min", Number(minROI));

      // Sorting
      switch (sort) {
        case "roi_desc": query = query.order("roi_avg", { ascending: false }); break;
        case "roi_asc": query = query.order("roi_avg", { ascending: true }); break;
        case "progress_desc": query = query.order("funding_progress", { ascending: false }); break;
        case "progress_asc": query = query.order("funding_progress", { ascending: true }); break;
        case "min_invest_asc": query = query.order("min_investment", { ascending: true }); break;
        case "min_invest_desc": query = query.order("min_investment", { ascending: false }); break;
        case "location_asc": query = query.order("city", { ascending: true }); break;
        case "oldest": query = query.order("created_at", { ascending: true }); break;
        default: query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as InvestmentProperty[];
    },
  });

  const currency = opportunities[0]?.currency ?? "USD";

  function update(key: string, value: string | boolean) {
    const next = new URLSearchParams(params);
    if (!value || String(value) === "any" || String(value) === "all" || String(value) === "false") next.delete(key);
    else next.set(key, value.toString());
    setParams(next);
  }

  function clearAll() {
    setParams(new URLSearchParams());
    setQLocal("");
  }

  const activeFilters = useMemo(() => {
    const list: { key: string; label: string; value: string }[] = [];
    if (category && category !== "all") {
      const catLabel = INVESTMENT_CATEGORIES.find(c => c.value === category)?.label || category;
      list.push({ key: "category", label: `Category: ${catLabel}`, value: category });
    }
    if (country && country !== "all") list.push({ key: "country", label: `Country: ${country}`, value: country });
    if (city && city !== "all") list.push({ key: "city", label: `City: ${city}`, value: city });
    if (minInvest) list.push({ key: "minInvest", label: `Min Entry: $${Number(minInvest).toLocaleString()}`, value: minInvest });
    if (maxInvest) list.push({ key: "maxInvest", label: `Max Entry: $${Number(maxInvest).toLocaleString()}`, value: maxInvest });
    if (minROI && minROI !== "any") list.push({ key: "minROI", label: `Min Return: ${minROI}%+`, value: minROI });
    if (hasInstallment) list.push({ key: "installment", label: "Installment Available", value: "true" });
    if (status && status !== "open") list.push({ key: "status", label: `Status: ${status}`, value: status });
    return list;
  }, [category, country, city, minInvest, maxInvest, minROI, hasInstallment, status]);

  const activeFilterCount = activeFilters.length;

  return (
    <SiteLayout>
      <SEO title="Investment Opportunities" description="Browse premium income-generating property investments with high returns and flexible entry." />

      {/* ── Hero Section ──────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-black min-h-[480px] sm:min-h-[520px] flex items-center">
        <img
          src="https://images.unsplash.com/photo-1560520031-3a4dc4e9de0c?auto=format&fit=crop&w=1920&q=80"
          alt="Investment Hero"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30 z-[1]" />
        <div className="absolute inset-0 bg-gradient-hero-emerald mix-blend-multiply opacity-60 z-[2]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-[3]" />

        <div className="container-wide relative z-10 flex flex-col justify-center py-16 sm:py-24 text-white">
          <div className="max-w-3xl">
            <span className="inline-block px-3 py-1 mb-5 text-xs font-semibold tracking-wider uppercase bg-primary text-primary-foreground rounded-full shadow-lg">
              Property Investment
            </span>
            <h1 className="font-serif text-4xl font-bold sm:text-6xl text-white tracking-tight leading-[1.1] mb-4">
              Invest in Global <br className="hidden sm:block" /> Real Estate.
            </h1>
            <p className="text-lg sm:text-xl text-white/90 font-medium mb-8 max-w-2xl leading-relaxed">
              Build your legacy with rental properties. Access premium homes starting from low minimums.
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
                    placeholder="Search by city, property type, or keyword..."
                    className="h-14 border-none shadow-none focus-visible:ring-0 text-foreground text-lg placeholder:text-muted-foreground/60"
                  />
                </div>
                <Button type="submit" size="lg" className="h-14 px-8 rounded-none bg-primary hover:bg-primary/90 text-white font-bold">
                  EXPLORE
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
              {/* Category */}
              <Select value={category} onValueChange={(v) => update("category", v)}>
                <SelectTrigger className="w-[160px] h-10 border-border bg-card">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-primary/60" />
                    <SelectValue placeholder="Property Category" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {INVESTMENT_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Location Selects */}
              <div className="hidden xl:flex items-center gap-2">
                <Select value={country} onValueChange={(v) => update("country", v)}>
                  <SelectTrigger className="w-[140px] h-10 border-border bg-card">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-primary/60" />
                      <SelectValue placeholder="Country" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Country</SelectItem>
                    {filterMetadata?.countries.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={city} onValueChange={(v) => update("city", v)}>
                  <SelectTrigger className="w-[140px] h-10 border-border bg-card">
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

              {/* Quick Status Filters */}
              <div className="hidden sm:flex p-1 bg-accent rounded-lg border border-border mr-2">
                {["all", "open", "funded", "closed"].map((s) => (
                  <button
                    key={s}
                    onClick={() => update("status", s)}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-tighter rounded-md transition-all ${
                      status === s ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s === "all" ? "All" : s}
                  </button>
                ))}
              </div>

              {/* Advanced Filter Sheet */}
              <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="h-10 gap-2 border-primary/20 hover:border-primary/40 bg-primary/5">
                    <SlidersHorizontal className="h-4 w-4 text-primary" />
                    <span className="hidden sm:inline">Advanced Filters</span>
                    {activeFilterCount > 0 && (
                      <Badge variant="default" className="ml-1 h-5 min-w-5 flex items-center justify-center p-0 text-[10px] bg-primary text-white">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                  <SheetHeader className="pb-6 border-b">
                    <SheetTitle className="font-serif text-2xl">Investment Filters</SheetTitle>
                  </SheetHeader>
                  
                  <div className="py-8 space-y-8">
                    {/* Financial Range */}
                    <div className="space-y-4">
                      <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Investment Range ({currency})</Label>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 space-y-1.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Min Entry</span>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            value={minInvest}
                            onChange={(e) => update("minInvest", e.target.value)}
                            className="h-11"
                          />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Max Entry</span>
                          <Input 
                            type="number" 
                            placeholder="Any" 
                            value={maxInvest}
                            onChange={(e) => update("maxInvest", e.target.value)}
                            className="h-11"
                          />
                        </div>
                      </div>
                    </div>

                    {/* ROI Section */}
                    <div className="space-y-4">
                      <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Expected Annual Return</Label>
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs font-medium">
                          <span>Minimum Return: {minROI || 'Any'}%</span>
                        </div>
                        <Select value={minROI} onValueChange={(v) => update("minROI", v)}>
                          <SelectTrigger className="h-11"><SelectValue placeholder="Select Min ROI" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any Return</SelectItem>
                            {[5, 10, 15, 20].map(r => (
                              <SelectItem key={r} value={r.toString()}>{r}%+ p.a.</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-4 pt-4 border-t">
                      <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Investment Features</Label>
                      <div 
                        className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/20 cursor-pointer"
                        onClick={() => update("installment", !hasInstallment)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${hasInstallment ? 'bg-primary border-primary' : 'bg-transparent border-muted-foreground/30'}`}>
                            {hasInstallment && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold">Installment Plans</p>
                            <p className="text-xs text-muted-foreground">Show only properties with flexible payment options</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <SheetFooter className="mt-8 pt-6 border-t gap-2 sm:flex-col">
                    <Button onClick={() => setIsFilterOpen(false)} className="w-full h-12 font-bold uppercase tracking-wider">View Opportunities</Button>
                    <Button variant="ghost" onClick={clearAll} className="w-full text-muted-foreground">Reset All</Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
            
            {/* Sorting & Results */}
            <div className="flex items-center justify-between lg:justify-end gap-4 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-border">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-bold text-primary">{opportunities.length}</span>
                <span className="text-muted-foreground font-medium">Properties Found</span>
              </div>
              <div className="flex items-center gap-3">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
                <Select value={sort} onValueChange={(v) => update("sort", v)}>
                  <SelectTrigger className="w-[180px] h-10 border-none bg-transparent hover:bg-secondary transition-colors font-medium">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Recently Added</SelectItem>
                    <SelectItem value="roi_desc">Highest Return</SelectItem>
                    <SelectItem value="progress_desc">Most Funded</SelectItem>
                    <SelectItem value="min_invest_asc">Min Entry: Low-High</SelectItem>
                    <SelectItem value="min_invest_desc">Min Entry: High-Low</SelectItem>
                    <SelectItem value="location_asc">Location: A-Z</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
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
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                <div className="space-y-3">
                  <Skeleton className="h-7 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="pt-4 space-y-2">
                    <Skeleton className="h-2 w-full" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-6 w-1/4" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : opportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="h-20 w-20 bg-secondary rounded-full flex items-center justify-center mb-6">
              <Filter className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <h2 className="font-serif text-3xl font-bold mb-4">No matching properties</h2>
            <p className="text-muted-foreground max-w-md mb-8 text-lg">
              We couldn't find any properties matching your current search criteria.
            </p>
            <Button size="lg" onClick={clearAll} className="rounded-full px-8 shadow-card">
              Reset all filters
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 animate-in fade-in duration-500">
              {opportunities.map((p) => <InvestmentCard key={p.id} p={p} />)}
            </div>
            <div className="mt-16 flex flex-col items-center gap-4">
              <div className="h-[1px] w-32 bg-border" />
              <p className="text-sm text-muted-foreground font-medium">
                End of curated list — {opportunities.length} opportunities found
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── CTA Section ───────────────────────────────────────── */}
      <section className="bg-accent/50 py-24 border-t border-border">
        <div className="container-wide text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="font-serif text-3xl font-bold mb-6">Don't see what you're looking for?</h2>
            <p className="text-muted-foreground text-lg mb-8">
              Join our private waitlist for exclusive, high-return properties before they go public.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="rounded-full px-8 h-14 font-bold shadow-card">JOIN WAITLIST</Button>
              <Button variant="outline" size="lg" className="rounded-full px-8 h-14 font-bold border-primary/20">TALK TO AN ADVISOR</Button>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}