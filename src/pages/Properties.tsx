import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PropertyCard, PropertyCardData } from "@/components/site/PropertyCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SlidersHorizontal } from "lucide-react";

export default function Properties() {
  const [params, setParams] = useSearchParams();

  const type = params.get("type") ?? "all";
  const q = params.get("q") ?? "";
  const locationSlug = params.get("location") ?? "";
  const minPrice = params.get("minPrice") ?? "";
  const maxPrice = params.get("maxPrice") ?? "";
  const bedrooms = params.get("bedrooms") ?? "any";
  const sort = params.get("sort") ?? "newest";

  const [qLocal, setQLocal] = useState(q);
  useEffect(() => setQLocal(q), [q]);

  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data } = await supabase.from("locations").select("id, name, slug").order("name");
      return data ?? [];
    },
  });

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["properties", type, q, locationSlug, minPrice, maxPrice, bedrooms, sort],
    queryFn: async () => {
      let query = supabase
        .from("properties")
        .select("id, slug, title, price, currency, property_type, status, bedrooms, bathrooms, size_sqm, cover_image_url, address, featured, created_at, locations!inner(name, slug)");

      if (type !== "all") query = query.eq("property_type", type as any);
      if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,address.ilike.%${q}%`);
      if (locationSlug) query = query.eq("locations.slug", locationSlug);
      if (minPrice) query = query.gte("price", Number(minPrice));
      if (maxPrice) query = query.lte("price", Number(maxPrice));
      if (bedrooms !== "any") query = query.gte("bedrooms", Number(bedrooms));

      switch (sort) {
        case "price_asc": query = query.order("price", { ascending: true }); break;
        case "price_desc": query = query.order("price", { ascending: false }); break;
        case "featured": query = query.order("featured", { ascending: false }).order("created_at", { ascending: false }); break;
        default: query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PropertyCardData[];
    },
  });

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value || value === "any" || value === "all") next.delete(key);
    else next.set(key, value);
    setParams(next);
  }

  function clearAll() {
    setParams(new URLSearchParams());
  }

  return (
    <SiteLayout>
      <div className="bg-secondary/40">
        <div className="container-wide py-10">
          <h1 className="font-serif text-3xl font-semibold sm:text-4xl">All properties</h1>
          <p className="mt-2 text-muted-foreground">Browse our full curated collection — homes for sale, rent, and land.</p>
        </div>
      </div>

      <div className="container-wide grid gap-8 py-10 lg:grid-cols-[280px_1fr]">
        {/* Filters */}
        <aside className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-soft lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <h2 className="font-serif text-lg font-semibold">Filters</h2>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); update("q", qLocal); }} className="space-y-2">
            <Label>Search</Label>
            <Input value={qLocal} onChange={(e) => setQLocal(e.target.value)} placeholder="Title, area..." />
          </form>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => update("type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="buy">For sale</SelectItem>
                <SelectItem value="rent">For rent</SelectItem>
                <SelectItem value="land">Land</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Select value={locationSlug || "all"} onValueChange={(v) => update("location", v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any location</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.slug}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Min price</Label>
              <Input type="number" defaultValue={minPrice}
                onBlur={(e) => update("minPrice", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Max price</Label>
              <Input type="number" defaultValue={maxPrice}
                onBlur={(e) => update("maxPrice", e.target.value)} />
            </div>
          </div>

          {type !== "land" && (
            <div className="space-y-2">
              <Label>Bedrooms</Label>
              <Select value={bedrooms} onValueChange={(v) => update("bedrooms", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="1">1+</SelectItem>
                  <SelectItem value="2">2+</SelectItem>
                  <SelectItem value="3">3+</SelectItem>
                  <SelectItem value="4">4+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button variant="outline" onClick={clearAll} className="w-full">Clear filters</Button>
        </aside>

        {/* Results */}
        <div>
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{properties.length} {properties.length === 1 ? "result" : "results"}</p>
            <Select value={sort} onValueChange={(v) => update("sort", v)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="price_asc">Price: low to high</SelectItem>
                <SelectItem value="price_desc">Price: high to low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-2xl" />
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-16 text-center">
              <p className="font-serif text-xl font-medium">No properties match your filters.</p>
              <p className="mt-2 text-sm text-muted-foreground">Try widening your search or clearing some filters.</p>
              <Button onClick={clearAll} className="mt-6">Clear all</Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {properties.map((p) => <PropertyCard key={p.id} property={p} />)}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}