import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props { compact?: boolean }

export function SearchBar({ compact = false }: Props) {
  const navigate = useNavigate();
  const [type, setType] = useState("buy");
  const [q, setQ] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (q) params.set("q", q);
    if (maxPrice) params.set("maxPrice", maxPrice);
    navigate(`/properties?${params.toString()}`);
  };

  return (
    <form
      onSubmit={submit}
      className={`grid gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-card backdrop-blur sm:grid-cols-[140px_1fr_140px_auto] ${compact ? "" : ""}`}
    >
      <Select value={type} onValueChange={setType}>
        <SelectTrigger className="h-12 border-border bg-background">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="buy">For sale</SelectItem>
          <SelectItem value="rent">For rent</SelectItem>
          <SelectItem value="land">Land</SelectItem>
        </SelectContent>
      </Select>
      <Input
        placeholder="Location, neighborhood, or keyword"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="h-12 bg-background"
      />
      <Input
        type="number"
        placeholder="Max price"
        value={maxPrice}
        onChange={(e) => setMaxPrice(e.target.value)}
        className="h-12 bg-background"
      />
      <Button type="submit" size="lg" className="h-12 bg-gradient-warm hover:opacity-95">
        <Search className="mr-2 h-4 w-4" /> Search
      </Button>
    </form>
  );
}