import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useCompare } from "@/hooks/useCompare";
import { resolveImage, formatPrice } from "@/lib/format";
import { ArrowLeft, CheckCircle2, XCircle, Trash2, MapPin, Bed, Bath, Maximize2, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/site/SEO";
import { Badge } from "@/components/ui/badge";

export default function ComparePage() {
  const { compareList, removeFromCompare, clearCompare } = useCompare();
  const navigate = useNavigate();

  const propertyIds = compareList.map((p) => p.id);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["compare-properties", propertyIds],
    queryFn: async () => {
      if (propertyIds.length === 0) return [];
      const { data, error } = await supabase
        .from("properties")
        .select(`
          *,
          locations(name),
          investment_properties(expected_return, min_investment, total_units, units_sold)
        `)
        .in("id", propertyIds);

      if (error) throw error;
      return data;
    },
    enabled: propertyIds.length > 0,
  });

  // Sort properties to match compareList order
  const orderedProperties = useMemo(() => {
    return propertyIds.map(id => properties.find(p => p.id === id)).filter(Boolean);
  }, [properties, propertyIds]);

  if (compareList.length === 0) {
    return (
      <SiteLayout>
        <SEO title="Compare Properties" />
        <div className="container-wide py-32 flex flex-col items-center justify-center text-center">
          <div className="h-24 w-24 rounded-full bg-secondary/10 text-secondary flex items-center justify-center mb-6">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="font-serif text-4xl font-bold mb-4">Compare Properties</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto mb-8">
            You haven't selected any properties to compare. Browse our marketplace and click the compare icon on properties you like.
          </p>
          <Button asChild size="lg" className="rounded-full px-8 shadow-card">
            <Link to="/properties">Browse Properties</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <SEO title="Compare Properties" />
      <div className="container-wide py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <Button variant="ghost" className="mb-4 text-muted-foreground hover:text-foreground" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <h1 className="font-serif text-4xl font-bold">Compare Properties</h1>
            <p className="text-muted-foreground mt-2">Side-by-side analysis of your selected properties.</p>
          </div>
          <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20" onClick={clearCompare}>
            <Trash2 className="mr-2 h-4 w-4" /> Clear All
          </Button>
        </div>

        {isLoading ? (
          <div className="animate-pulse flex gap-6 overflow-x-auto">
            {[1, 2, 3].map(i => (
              <div key={i} className="min-w-[300px] flex-1 bg-secondary/5 rounded-xl h-[600px]" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto pb-8 hide-scrollbar">
            <table className="w-full min-w-[800px] border-collapse table-fixed">
              <thead>
                <tr>
                  <th className="w-48 p-4 align-top text-left sticky left-0 bg-background z-20 border-b border-border/50">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Property Details</span>
                  </th>
                  {orderedProperties.map((p: any) => (
                    <th key={p.id} className="p-4 align-top w-[320px] border-b border-border/50 relative group">
                      <button 
                        onClick={() => removeFromCompare(p.id)}
                        className="absolute top-6 right-6 h-8 w-8 rounded-full bg-background border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/30 z-10 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                      <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-4 bg-secondary/10">
                        <img src={resolveImage(p.cover_image_url)} alt={p.title} className="w-full h-full object-cover" />
                        <Badge className="absolute top-3 left-3 bg-background/90 text-foreground backdrop-blur font-bold">
                          {p.property_type.toUpperCase()}
                        </Badge>
                      </div>
                      <h3 className="font-serif text-xl font-bold leading-tight mb-2 text-left">{p.title}</h3>
                      <p className="text-2xl font-bold text-primary font-serif text-left">
                        {formatPrice(p.price, p.currency, p.property_type)}
                      </p>
                      <Button asChild className="w-full mt-4 rounded-xl font-bold shadow-sm">
                        <Link to={`/properties/${p.slug}`}>View Details</Link>
                      </Button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {/* Location */}
                <tr className="hover:bg-secondary/5 transition-colors">
                  <td className="p-6 sticky left-0 bg-background z-10 font-medium text-sm text-muted-foreground">Location</td>
                  {orderedProperties.map((p: any) => (
                    <td key={p.id} className="p-6 align-top">
                      <div className="flex items-start gap-2 font-medium">
                        <MapPin className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                        <span>{p.city && p.country ? `${p.city}, ${p.country}` : p.locations?.name || "—"}</span>
                      </div>
                    </td>
                  ))}
                </tr>
                {/* Specs */}
                <tr className="hover:bg-secondary/5 transition-colors">
                  <td className="p-6 sticky left-0 bg-background z-10 font-medium text-sm text-muted-foreground">Specifications</td>
                  {orderedProperties.map((p: any) => (
                    <td key={p.id} className="p-6 align-top">
                      <div className="flex flex-col gap-3 font-semibold text-sm">
                        {p.bedrooms != null && <div className="flex items-center gap-2"><Bed className="h-4 w-4 text-muted-foreground" /> {p.bedrooms} Bedrooms</div>}
                        {p.bathrooms != null && <div className="flex items-center gap-2"><Bath className="h-4 w-4 text-muted-foreground" /> {p.bathrooms} Bathrooms</div>}
                        {p.parking_spaces != null && <div className="flex items-center gap-2"><Car className="h-4 w-4 text-muted-foreground" /> {p.parking_spaces} Parking</div>}
                        {p.size_sqm != null && <div className="flex items-center gap-2"><Maximize2 className="h-4 w-4 text-muted-foreground" /> {p.size_sqm} sq ft</div>}
                        {!p.bedrooms && !p.size_sqm && <span className="text-muted-foreground italic">N/A</span>}
                      </div>
                    </td>
                  ))}
                </tr>
                {/* Status */}
                <tr className="hover:bg-secondary/5 transition-colors">
                  <td className="p-6 sticky left-0 bg-background z-10 font-medium text-sm text-muted-foreground">Status</td>
                  {orderedProperties.map((p: any) => (
                    <td key={p.id} className="p-6 align-top">
                      <Badge variant="outline" className="capitalize font-bold px-3 py-1 bg-background">
                        {p.status.replace("_", " ")}
                      </Badge>
                    </td>
                  ))}
                </tr>
                {/* Investment specific */}
                <tr className="hover:bg-secondary/5 transition-colors">
                  <td className="p-6 sticky left-0 bg-background z-10 font-medium text-sm text-muted-foreground">Investment Potential</td>
                  {orderedProperties.map((p: any) => {
                    const inv = p.investment_properties?.[0];
                    return (
                      <td key={p.id} className="p-6 align-top">
                        {p.is_investment && inv ? (
                          <div className="space-y-3">
                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                              <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">Expected Yield</p>
                              <p className="text-lg font-bold text-primary">{inv.expected_return}% / yr</p>
                            </div>
                            <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-3">
                              <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Min. Investment</p>
                              <p className="text-sm font-bold text-foreground">{formatPrice(inv.min_investment, p.currency, "buy")}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">Full Ownership</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
