import React from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Trash2, ArrowUpRight, MapPin, Landmark, Bath, BedDouble, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/invest";

export function SavedPanel({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["saved-properties", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_properties")
        .select(`
          *,
          properties (
            id,
            title,
            slug,
            price,
            currency,
            address,
            bedrooms,
            bathrooms,
            area_sqft,
            cover_image_url,
            status
          )
        `)
        .eq("user_id", userId);
      return data ?? [];
    },
  });

  async function remove(id: string) {
    const { error } = await supabase.from("saved_properties").delete().eq("id", id);
    if (error) toast({ title: "Failed to remove", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Removed from favorites" });
      qc.invalidateQueries({ queryKey: ["saved-properties", userId] });
    }
  }

  if (isLoading) return (
    <div className="grid gap-6 sm:grid-cols-2">
       {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-80 rounded-xl" />)}
    </div>
  );

  if (items.length === 0) return (
    <div className="rounded-xl border border-dashed border-border/60 p-16 text-center bg-secondary/5">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/50 mb-4">
        <Heart className="h-8 w-8 text-muted-foreground/40" />
      </div>
      <p className="font-serif text-xl font-medium text-foreground">Your watchlist is empty</p>
      <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">Found a property that catches your eye? Save it to track its status and return to it later.</p>
      <Button asChild className="mt-8 rounded-xl px-8" size="lg">
        <Link to="/properties">Explore Properties</Link>
      </Button>
    </div>
  );

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ">
      {items.map((s: any) => {
        const p = s.properties;
        if (!p) return null;
        return (
          <div key={s.id} className="group relative rounded-xl border border-border/50 bg-card overflow-hidden shadow-soft transition-all duration-300 hover:shadow-card hover:border-border">
             <div className="relative aspect-[16/10] overflow-hidden">
                <img src={p.cover_image_url || "/placeholder.svg"} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" alt={p.title} />
                <div className="absolute top-4 right-4 flex gap-2">
                   <Button 
                     variant="destructive" 
                     size="icon" 
                     className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                     onClick={() => remove(s.id)}
                   >
                      <Trash2 className="h-3.5 w-3.5" />
                   </Button>
                   <Badge className="bg-background/90 backdrop-blur-sm text-foreground font-medium text-xs rounded-md border-none">
                      {p.status}
                   </Badge>
                </div>
             </div>
             
             <div className="p-6 space-y-4">
                <div>
                   <h3 className="font-serif text-lg font-semibold text-foreground line-clamp-1">{p.title}</h3>
                   <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{p.address}</span>
                   </div>
                </div>

                <div className="flex items-center justify-between text-muted-foreground pb-4 border-b border-border/40">
                   <div className="flex items-center gap-1">
                      <BedDouble className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">{p.bedrooms}</span>
                   </div>
                   <div className="flex items-center gap-1">
                      <Bath className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">{p.bathrooms}</span>
                   </div>
                   <div className="flex items-center gap-1">
                      <Square className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">{p.area_sqft} <span className="text-[10px]">sqft</span></span>
                   </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                   <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-0.5">Asset Value</p>
                      <p className="font-serif text-xl font-bold">{formatMoney(p.price, p.currency)}</p>
                   </div>
                   <Button asChild size="sm" className="rounded-lg px-4 font-medium h-9 shadow-sm bg-primary hover:bg-primary/90">
                      <Link to={`/properties/${p.slug}`}>View Listing</Link>
                   </Button>
                </div>
             </div>
          </div>
        );
      })}
    </div>
  );
}
