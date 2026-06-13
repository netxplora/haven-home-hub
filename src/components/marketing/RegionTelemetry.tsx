import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { TrendingUp, Building2, Home, Briefcase, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RegionTelemetry() {
  const { data: regions = [], isLoading } = useQuery({
    queryKey: ["public-regions-featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regions")
        .select("*")
        .eq("status", "published")
        .eq("is_featured", true)
        .order("display_order", { ascending: true })
        .limit(8);
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading || regions.length === 0) return null;

  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-950 border-t border-border/40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-3">Explore Growing Regions</h2>
          <p className="font-serif text-3xl md:text-5xl font-bold leading-tight text-foreground tracking-tight mb-6">
            Discover emerging markets, infrastructure development, and investment opportunities across key locations.
          </p>
        </div>

        {/* Desktop: 4 cols, Tablet: 2 cols, Mobile: Horizontal scroll snap */}
        <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
          {regions.map((region: any) => (
            <div 
              key={region.id} 
              className="snap-center shrink-0 w-[85vw] sm:w-[60vw] md:w-auto flex flex-col group overflow-hidden rounded-3xl border border-border/50 bg-card shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="relative h-56 bg-secondary/20 overflow-hidden shrink-0">
                {region.cover_image_url ? (
                  <img 
                    src={region.cover_image_url} 
                    alt={region.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    onError={(e) => { e.currentTarget.src = "/placeholder.svg" }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary/10">
                    <MapPin className="h-12 w-12 text-muted-foreground/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5">
                  <h3 className="font-serif text-2xl font-bold text-white drop-shadow-md leading-tight">{region.name}</h3>
                </div>
              </div>
              
              <div className="p-6 flex flex-col flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-6 flex-1 font-medium">
                  {region.short_description || "Discover the investment potential of this emerging market region."}
                </p>
                
                <div className="space-y-4 mb-8">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Growth Indicators</h4>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <TrendingUp className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="text-xs font-semibold leading-tight">
                        <span className="block text-muted-foreground text-[10px] uppercase">Market Growth</span>
                        {region.population_growth || "High"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <div className="text-xs font-semibold leading-tight">
                        <span className="block text-muted-foreground text-[10px] uppercase">Infrastructure</span>
                        {region.infrastructure_score || "Expanding"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                        <Home className="h-3.5 w-3.5 text-orange-500" />
                      </div>
                      <div className="text-xs font-semibold leading-tight">
                        <span className="block text-muted-foreground text-[10px] uppercase">Housing Demand</span>
                        {region.rental_demand || "Strong"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <Briefcase className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      <div className="text-xs font-semibold leading-tight">
                        <span className="block text-muted-foreground text-[10px] uppercase">Employment</span>
                        {region.employment_growth || "Growing"}
                      </div>
                    </div>
                  </div>
                </div>

                <Button asChild variant="outline" className="w-full h-12 rounded-xl font-bold group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                  <Link to={`/properties?region=${region.slug}`}>
                    View Properties <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
