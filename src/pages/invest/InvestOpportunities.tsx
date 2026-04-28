import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { InvestmentCard } from "@/components/invest/InvestmentCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { InvestmentProperty } from "@/lib/invest";

export default function InvestOpportunities() {
  const [location, setLocation] = useState("all");
  const [type, setType] = useState("all");
  const [minAmt, setMinAmt] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["invest-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("investment_properties")
        .select("*")
        .in("status", ["open", "funded"])
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });
      return (data ?? []) as InvestmentProperty[];
    },
  });

  const locations = useMemo(() => Array.from(new Set(data.map((d) => d.location))), [data]);
  const types = useMemo(() => Array.from(new Set(data.map((d) => d.property_type))), [data]);

  const filtered = data.filter((p) => {
    if (location !== "all" && p.location !== location) return false;
    if (type !== "all" && p.property_type !== type) return false;
    if (minAmt && Number(p.min_investment) > Number(minAmt)) return false;
    return true;
  });

  return (
    <SiteLayout>
      <div className="border-b border-border bg-secondary/40">
        <div className="container-wide py-12">
          <p className="text-xs font-medium tracking-wider text-[hsl(var(--gold))] uppercase">Invest</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">Investment opportunities</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Curated, income-generating properties open for co-investment. Projections are estimates; returns and capital are not guaranteed.
          </p>
        </div>
      </div>

      <div className="container-wide py-8">
        <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Location</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Property type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Max. minimum investment</Label>
            <Input type="number" inputMode="numeric" placeholder="Any" value={minAmt} onChange={(e) => setMinAmt(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="container-wide pb-24">
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map((i) => <Skeleton key={i} className="h-[380px] rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-14 text-center">
            <p className="font-serif text-xl">No opportunities match your filters</p>
            <p className="mt-2 text-sm text-muted-foreground">Try widening your criteria.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => <InvestmentCard key={p.id} p={p} />)}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}