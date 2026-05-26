import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props { compact?: boolean }

export function SearchBar({ compact = false }: Props) {
  const navigate = useNavigate();
    const [type, setType] = useState("buy");
  const [locationSlug, setLocationSlug] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data } = await supabase.from("locations").select("id, name, slug").order("name");
      return data ?? [];
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (locationSlug && locationSlug !== "all") params.set("location", locationSlug);
    if (maxPrice) params.set("maxPrice", maxPrice);
    navigate(`/properties?${params.toString()}`);
  };

  return (
    <div className={compact ? "" : "w-full"}>
      {!compact && (
        <div className="flex items-center gap-6 mb-4 px-2">
          {[
            { id: "buy", label: "Buy" },
            { id: "rent", label: "Rent" },
            { id: "land", label: "Land" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              className={`relative pb-2 text-sm sm:text-base font-medium transition-all duration-300 ${
                type === t.id ? "text-white" : "text-white/60 hover:text-white/80"
              }`}
            >
              {t.label}
              {type === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-t-sm" />
              )}
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={submit}
        className={`grid gap-2.5 rounded-xl border border-white/15 bg-white/10 p-2.5 shadow-lux backdrop-blur-md ${
          compact ? "sm:grid-cols-[140px_1fr_140px_auto]" : "sm:grid-cols-[1fr_140px_auto]"
        }`}
      >
        {compact && (
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-11 rounded-lg border-0 bg-white text-foreground font-medium text-sm">
              <SelectValue placeholder={"Type"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buy">{"For sale"}</SelectItem>
              <SelectItem value="rent">{"For rent"}</SelectItem>
              <SelectItem value="land">{"Land"}</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Select value={locationSlug || "all"} onValueChange={(v) => setLocationSlug(v)}>
          <SelectTrigger className="h-11 rounded-lg border-0 bg-white text-foreground font-medium text-sm">
            <SelectValue placeholder={"Select Location"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{"Any location"}</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.slug}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          placeholder={"Max price"}
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="h-11 rounded-lg border-0 bg-white text-foreground font-medium text-sm"
        />
        <Button type="submit" size="lg" className="h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-sm">
          <Search className="mr-2 h-4 w-4" /> {"Search"}
        </Button>
      </form>
    </div>
  );
}