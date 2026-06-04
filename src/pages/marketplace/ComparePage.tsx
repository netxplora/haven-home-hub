import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useCompare } from "@/hooks/useCompare";
import { resolveImage, formatPrice } from "@/lib/format";
import { 
  ArrowLeft, CheckCircle2, XCircle, Trash2, MapPin, 
  Bed, Bath, Maximize2, Car, Scale, Sparkles, 
  TrendingUp, Award, Layers, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/site/SEO";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ComparePage() {
  const { compareList, removeFromCompare, clearCompare } = useCompare();
  const navigate = useNavigate();
  const [highlightDiff, setHighlightDiff] = useState(false);

  // Mobile viewport benchmark indexes
  const [mobileBenchmarkIdx, setMobileBenchmarkIdx] = useState(0);
  const [mobileCompareIdx, setMobileCompareIdx] = useState(1);

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

  // Decision Advisor Calculations
  const advisors = useMemo(() => {
    if (orderedProperties.length < 2) return null;

    let lowestPriceProp = orderedProperties[0];
    let bestValueProp = orderedProperties[0];
    let largestSpaceProp = orderedProperties[0];
    let highestYieldProp = null;
    let mostAmenitiesProp = orderedProperties[0];

    let minPrice = Number(orderedProperties[0].price);
    let minPricePerSqm = orderedProperties[0].size_sqm ? Number(orderedProperties[0].price) / Number(orderedProperties[0].size_sqm) : Infinity;
    let maxSize = Number(orderedProperties[0].size_sqm || 0);
    let maxYield = -1;
    let maxAmenities = (orderedProperties[0].interior_features?.length || 0) + (orderedProperties[0].exterior_features?.length || 0);

    orderedProperties.forEach((p: any) => {
      const price = Number(p.price);
      const size = Number(p.size_sqm || 0);
      const yieldVal = Number(p.investment_properties?.[0]?.expected_return || 0);
      const amenitiesCount = (p.interior_features?.length || 0) + (p.exterior_features?.length || 0);

      // Lowest Price
      if (price < minPrice) {
        minPrice = price;
        lowestPriceProp = p;
      }

      // Best Value (Price/Sqm)
      if (size > 0) {
        const pricePerSqm = price / size;
        if (pricePerSqm < minPricePerSqm) {
          minPricePerSqm = pricePerSqm;
          bestValueProp = p;
        }
      }

      // Largest Space
      if (size > maxSize) {
        maxSize = size;
        largestSpaceProp = p;
      }

      // Highest Yield
      if (p.is_investment && yieldVal > maxYield) {
        maxYield = yieldVal;
        highestYieldProp = p;
      }

      // Most Amenities
      if (amenitiesCount > maxAmenities) {
        maxAmenities = amenitiesCount;
        mostAmenitiesProp = p;
      }
    });

    return {
      lowestPrice: lowestPriceProp,
      bestValue: minPricePerSqm !== Infinity ? bestValueProp : null,
      largestSpace: maxSize > 0 ? largestSpaceProp : null,
      highestYield: highestYieldProp,
      mostAmenities: maxAmenities > 0 ? mostAmenitiesProp : null,
    };
  }, [orderedProperties]);

  // Difference detection helpers
  const differenceCheck = useMemo(() => {
    if (orderedProperties.length < 2) return {};

    const first = orderedProperties[0] as any;
    
    const isPriceSame = orderedProperties.every((p: any) => p.price === first.price && p.currency === first.currency);
    const isLocationSame = orderedProperties.every((p: any) => p.city === first.city && p.country === first.country);
    
    const isSpecsSame = orderedProperties.every((p: any) => 
      p.bedrooms === first.bedrooms && 
      p.bathrooms === first.bathrooms && 
      p.parking_spaces === first.parking_spaces && 
      p.size_sqm === first.size_sqm
    );

    const isAmenitiesSame = orderedProperties.every((p: any) => {
      const cur = [...(p.interior_features || []), ...(p.exterior_features || [])].sort().join(",");
      const ref = [...(first.interior_features || []), ...(first.exterior_features || [])].sort().join(",");
      return cur === ref;
    });

    const isStatusSame = orderedProperties.every((p: any) => p.status === first.status);
    
    const isInvestmentSame = orderedProperties.every((p: any) => 
      p.is_investment === first.is_investment && 
      p.investment_properties?.[0]?.expected_return === first.investment_properties?.[0]?.expected_return
    );

    return {
      price: isPriceSame,
      location: isLocationSame,
      specs: isSpecsSame,
      amenities: isAmenitiesSame,
      status: isStatusSame,
      investment: isInvestmentSame
    };
  }, [orderedProperties]);

  // Safe Index Reset for Mobile View
  useEffect(() => {
    if (mobileBenchmarkIdx >= orderedProperties.length) {
      setMobileBenchmarkIdx(0);
    }
    if (mobileCompareIdx >= orderedProperties.length) {
      setMobileCompareIdx(orderedProperties.length > 1 ? 1 : 0);
    }
  }, [orderedProperties.length, mobileBenchmarkIdx, mobileCompareIdx]);

  if (compareList.length === 0) {
    return (
      <SiteLayout>
        <SEO title="Compare Properties" />
        <div className="container-wide py-32 flex flex-col items-center justify-center text-center">
          <div className="h-24 w-24 rounded-full bg-secondary/10 text-secondary flex items-center justify-center mb-6">
            <Scale className="h-10 w-10 text-secondary" />
          </div>
          <h1 className="font-serif text-4xl font-bold mb-4">Compare Properties</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto mb-8">
            You haven't selected any properties to compare. Browse our marketplace and click the compare icon on properties you like.
          </p>
          <Button asChild size="lg" className="rounded-full px-8 shadow-card bg-primary hover:bg-primary/95 text-white font-bold">
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
        
        {/* Top bar header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b border-border/60">
          <div>
            <Button variant="ghost" className="mb-4 pl-0 text-muted-foreground hover:text-foreground" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to marketplace
            </Button>
            <h1 className="font-serif text-4xl font-bold tracking-tight">Compare Properties</h1>
            <p className="text-muted-foreground mt-2">Side-by-side analysis of your selected properties.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Highlight Differences toggle */}
            {orderedProperties.length >= 2 && (
              <div className="flex items-center gap-3 bg-secondary/10 px-4 py-2.5 rounded-xl border border-secondary/20 shadow-sm">
                <button
                  onClick={() => setHighlightDiff(!highlightDiff)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    highlightDiff ? "bg-primary" : "bg-muted"
                  }`}
                  aria-label="Highlight differences"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                      highlightDiff ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-xs font-bold text-foreground font-sans">Highlight Differences</span>
              </div>
            )}

            <Button 
              variant="outline" 
              className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 rounded-xl h-11 px-5 font-bold" 
              onClick={clearCompare}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Clear All
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse flex gap-6 overflow-x-auto">
            {[1, 2, 3].map(i => (
              <div key={i} className="min-w-[300px] flex-1 bg-secondary/5 rounded-xl h-[600px]" />
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            
            {/* 1. DECISION ADVISOR (Differentiators Panel) */}
            {advisors && orderedProperties.length >= 2 && (
              <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-soft relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 bg-primary/5 rounded-full blur-2xl" />
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-bold text-foreground">Decision Advisor</h2>
                    <p className="text-xs text-muted-foreground">Automated analysis of core property metrics.</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {/* Lowest Price */}
                  <div className="bg-background border border-border/60 rounded-xl p-4 flex flex-col justify-between hover:shadow-sm transition-shadow">
                    <div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md uppercase tracking-wider mb-2">
                        <Award className="h-3 w-3" /> Lowest Cost
                      </span>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Top Budget Pick</h4>
                      <p className="text-sm font-bold text-foreground mt-2 line-clamp-1">{advisors.lowestPrice.title}</p>
                    </div>
                    <p className="text-lg font-serif font-semibold text-primary mt-4">
                      {formatPrice(advisors.lowestPrice.price, advisors.lowestPrice.currency, advisors.lowestPrice.property_type)}
                    </p>
                  </div>

                  {/* Best Value */}
                  {advisors.bestValue && (
                    <div className="bg-background border border-border/60 rounded-xl p-4 flex flex-col justify-between hover:shadow-sm transition-shadow">
                      <div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md uppercase tracking-wider mb-2">
                          <TrendingUp className="h-3 w-3" /> Best Value
                        </span>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Lowest Price / Sqm</h4>
                        <p className="text-sm font-bold text-foreground mt-2 line-clamp-1">{advisors.bestValue.title}</p>
                      </div>
                      <div className="mt-4 flex items-baseline justify-between">
                        <p className="text-lg font-serif font-semibold text-primary">
                          {formatPrice(advisors.bestValue.price, advisors.bestValue.currency, advisors.bestValue.property_type)}
                        </p>
                        <span className="text-[10px] font-bold text-muted-foreground">{Math.round(advisors.bestValue.price / advisors.bestValue.size_sqm).toLocaleString()} / sqm</span>
                      </div>
                    </div>
                  )}

                  {/* Largest Space */}
                  {advisors.largestSpace && (
                    <div className="bg-background border border-border/60 rounded-xl p-4 flex flex-col justify-between hover:shadow-sm transition-shadow">
                      <div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md uppercase tracking-wider mb-2">
                          <Layers className="h-3 w-3" /> Largest Space
                        </span>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Maximum Size</h4>
                        <p className="text-sm font-bold text-foreground mt-2 line-clamp-1">{advisors.largestSpace.title}</p>
                      </div>
                      <p className="text-lg font-serif font-semibold text-amber-600 mt-4">
                        {advisors.largestSpace.size_sqm} <span className="text-xs font-sans font-normal text-muted-foreground">sqm</span>
                      </p>
                    </div>
                  )}

                  {/* Highest Potential Yield */}
                  {advisors.highestYield && (
                    <div className="bg-background border border-border/60 rounded-xl p-4 flex flex-col justify-between hover:shadow-sm transition-shadow">
                      <div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider mb-2">
                          <TrendingUp className="h-3 w-3" /> Highest Yield
                        </span>
                        <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Investment ROI</h4>
                        <p className="text-sm font-bold text-foreground mt-2 line-clamp-1">{advisors.highestYield.title}</p>
                      </div>
                      <p className="text-lg font-serif font-semibold text-indigo-600 mt-4">
                        {advisors.highestYield.investment_properties?.[0]?.expected_return}% <span className="text-xs font-sans font-normal text-muted-foreground">/ yr</span>
                      </p>
                    </div>
                  )}

                  {/* Most Amenities */}
                  {advisors.mostAmenities && (
                    <div className="bg-background border border-border/60 rounded-xl p-4 flex flex-col justify-between hover:shadow-sm transition-shadow">
                      <div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md uppercase tracking-wider mb-2">
                          <Award className="h-3 w-3" /> Most Featured
                        </span>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Amenity Count</h4>
                        <p className="text-sm font-bold text-foreground mt-2 line-clamp-1">{advisors.mostAmenities.title}</p>
                      </div>
                      <p className="text-lg font-serif font-semibold text-primary mt-4">
                        {(advisors.mostAmenities.interior_features?.length || 0) + (advisors.mostAmenities.exterior_features?.length || 0)} <span className="text-xs font-sans font-normal text-muted-foreground">Features</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── DESKTOP COMPARISON GRID ─────────────────────── */}
            <div className="hidden md:block overflow-x-auto pb-8 hide-scrollbar">
              <div className="min-w-[800px] border border-border/60 rounded-2xl bg-card shadow-soft overflow-hidden">
                <table className="w-full border-collapse table-fixed">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="w-56 p-6 align-top text-left bg-background sticky left-0 z-20">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Overview & Pricing</span>
                      </th>
                      {orderedProperties.map((p: any) => (
                        <th key={p.id} className="p-6 align-top w-[280px] relative group hover:bg-secondary/5 transition-colors duration-300">
                          <button 
                            onClick={() => removeFromCompare(p.id)}
                            className="absolute top-6 right-6 h-7 w-7 rounded-full bg-background border border-border/80 shadow-sm flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/30 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300"
                            title="Remove from comparison"
                          >
                            <XCircle className="h-4.5 w-4.5" />
                          </button>
                          <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-4 bg-secondary/10 shadow-sm">
                            <img src={resolveImage(p.cover_image_url)} alt={p.title} className="w-full h-full object-cover" />
                            <Badge className="absolute top-3 left-3 bg-white/95 text-foreground hover:bg-white border-none shadow-sm font-bold text-[10px] uppercase">
                              {p.property_type.toUpperCase()}
                            </Badge>
                          </div>
                          <h3 className="font-serif text-lg font-bold leading-tight mb-2 text-left line-clamp-2 h-11">{p.title}</h3>
                          <p className="text-xl font-bold text-primary font-serif text-left">
                            {formatPrice(p.price, p.currency, p.property_type)}
                          </p>
                          <Button asChild className="w-full mt-4 rounded-xl font-bold shadow-sm h-10 text-xs">
                            <Link to={`/properties/${p.slug}`}>View Details</Link>
                          </Button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-border/30">
                    
                    {/* Location Row */}
                    <tr className={`transition-colors duration-300 ${highlightDiff && differenceCheck.location ? 'opacity-40 select-none bg-secondary/5' : 'hover:bg-secondary/5'}`}>
                      <td className="p-6 sticky left-0 bg-background z-10 font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> Location
                      </td>
                      {orderedProperties.map((p: any) => (
                        <td key={p.id} className="p-6 align-top">
                          <span className="font-medium text-sm text-foreground">
                            {p.city && p.country ? `${p.city}, ${p.country}` : p.locations?.name || "—"}
                          </span>
                        </td>
                      ))}
                    </tr>

                    {/* Status Row */}
                    <tr className={`transition-colors duration-300 ${highlightDiff && differenceCheck.status ? 'opacity-40 select-none bg-secondary/5' : 'hover:bg-secondary/5'}`}>
                      <td className="p-6 sticky left-0 bg-background z-10 font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        Status
                      </td>
                      {orderedProperties.map((p: any) => (
                        <td key={p.id} className="p-6 align-top">
                          <Badge variant="outline" className="capitalize font-bold px-3 py-1 bg-background text-xs">
                            {p.status.replace("_", " ")}
                          </Badge>
                        </td>
                      ))}
                    </tr>

                    {/* Core Specifications */}
                    <tr className="bg-accent/40 border-y border-border/40">
                      <td colSpan={orderedProperties.length + 1} className="p-4 px-6 text-xs font-bold uppercase tracking-widest text-primary font-sans">
                        Core Specifications
                      </td>
                    </tr>

                    <tr className={`transition-colors duration-300 ${highlightDiff && differenceCheck.specs ? 'opacity-40 select-none bg-secondary/5' : 'hover:bg-secondary/5'}`}>
                      <td className="p-6 sticky left-0 bg-background z-10 font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        Features
                      </td>
                      {orderedProperties.map((p: any) => (
                        <td key={p.id} className="p-6 align-top">
                          <div className="flex flex-col gap-2.5 font-semibold text-sm">
                            {p.bedrooms != null && <div className="flex items-center gap-2"><Bed className="h-4 w-4 text-primary/60 shrink-0" /> {p.bedrooms} Bedrooms</div>}
                            {p.bathrooms != null && <div className="flex items-center gap-2"><Bath className="h-4 w-4 text-primary/60 shrink-0" /> {p.bathrooms} Bathrooms</div>}
                            {p.parking_spaces != null && <div className="flex items-center gap-2"><Car className="h-4 w-4 text-primary/60 shrink-0" /> {p.parking_spaces} Parking</div>}
                            {!p.bedrooms && !p.bathrooms && <span className="text-muted-foreground italic font-normal">N/A</span>}
                          </div>
                        </td>
                      ))}
                    </tr>

                    <tr className={`transition-colors duration-300 ${highlightDiff && differenceCheck.specs ? 'opacity-40 select-none bg-secondary/5' : 'hover:bg-secondary/5'}`}>
                      <td className="p-6 sticky left-0 bg-background z-10 font-bold text-xs uppercase tracking-widest text-muted-foreground">
                        Total Area
                      </td>
                      {orderedProperties.map((p: any) => (
                        <td key={p.id} className="p-6 align-top">
                          {p.size_sqm != null ? (
                            <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                              <Maximize2 className="h-4 w-4 text-primary/60" />
                              {Number(p.size_sqm).toLocaleString()} sqm
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic text-sm">N/A</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Amenities & Features */}
                    <tr className="bg-accent/40 border-y border-border/40">
                      <td colSpan={orderedProperties.length + 1} className="p-4 px-6 text-xs font-bold uppercase tracking-widest text-primary font-sans">
                        Amenities & Features
                      </td>
                    </tr>

                    <tr className={`transition-colors duration-300 ${highlightDiff && differenceCheck.amenities ? 'opacity-40 select-none bg-secondary/5' : 'hover:bg-secondary/5'}`}>
                      <td className="p-6 sticky left-0 bg-background z-10 font-bold text-xs uppercase tracking-widest text-muted-foreground">
                        Included Extras
                      </td>
                      {orderedProperties.map((p: any) => {
                        const interior = Array.isArray(p.interior_features) ? p.interior_features : [];
                        const exterior = Array.isArray(p.exterior_features) ? p.exterior_features : [];
                        const allFeatures = [...interior, ...exterior];
                        
                        return (
                          <td key={p.id} className="p-6 align-top">
                            {allFeatures.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {allFeatures.map((f: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="font-normal text-[10px] bg-secondary/20 text-foreground py-0.5 px-2">
                                    {f}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic text-sm">Not specified</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Description */}
                    <tr className="hover:bg-secondary/5 transition-colors">
                      <td className="p-6 sticky left-0 bg-background z-10 font-bold text-xs uppercase tracking-widest text-muted-foreground">
                        Description
                      </td>
                      {orderedProperties.map((p: any) => (
                        <td key={p.id} className="p-6 align-top">
                          {p.description ? (
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-5">
                              {p.description}
                            </p>
                          ) : (
                            <span className="text-muted-foreground italic text-sm">Not specified</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Investment specific */}
                    <tr className="bg-accent/40 border-y border-border/40">
                      <td colSpan={orderedProperties.length + 1} className="p-4 px-6 text-xs font-bold uppercase tracking-widest text-primary font-sans">
                        Investment Potential
                      </td>
                    </tr>

                    <tr className={`transition-colors duration-300 ${highlightDiff && differenceCheck.investment ? 'opacity-40 select-none bg-secondary/5' : 'hover:bg-secondary/5'}`}>
                      <td className="p-6 sticky left-0 bg-background z-10 font-bold text-xs uppercase tracking-widest text-muted-foreground">
                        Financial Yields
                      </td>
                      {orderedProperties.map((p: any) => {
                        const inv = p.investment_properties?.[0];
                        return (
                          <td key={p.id} className="p-6 align-top">
                            {p.is_investment && inv ? (
                              <div className="space-y-3">
                                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Expected Yield</p>
                                  <p className="text-base font-serif font-bold text-primary">{inv.expected_return}% / yr</p>
                                </div>
                                <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-3">
                                  <p className="text-[9px] font-bold text-secondary uppercase tracking-widest mb-1">Min. Investment</p>
                                  <p className="text-xs font-bold text-foreground">{formatPrice(inv.min_investment, p.currency, "buy")}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-secondary/5 border border-border/50 rounded-xl p-3 text-center">
                                <span className="text-xs text-muted-foreground font-semibold">Full Ownership</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>

                  </tbody>
                </table>
              </div>
            </div>

            {/* ── MOBILE SIDE-BY-SIDE SELECT COMPARISON ───────── */}
            <div className="block md:hidden space-y-6">
              
              {/* Selectors card */}
              <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm space-y-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">Compare Side-by-Side</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Benchmark</span>
                    <Select 
                      value={mobileBenchmarkIdx.toString()} 
                      onValueChange={(val) => setMobileBenchmarkIdx(Number(val))}
                    >
                      <SelectTrigger className="h-10 text-xs font-bold bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {orderedProperties.map((p: any, idx: number) => (
                          <SelectItem key={p.id} value={idx.toString()} className="text-xs">{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-primary">Compare To</span>
                    <Select 
                      value={mobileCompareIdx.toString()} 
                      onValueChange={(val) => setMobileCompareIdx(Number(val))}
                    >
                      <SelectTrigger className="h-10 text-xs font-bold border-primary/30 bg-background text-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {orderedProperties.map((p: any, idx: number) => (
                          <SelectItem key={p.id} value={idx.toString()} className="text-xs" disabled={idx === mobileBenchmarkIdx}>
                            {p.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Comparative values columns */}
              {orderedProperties[mobileBenchmarkIdx] && orderedProperties[mobileCompareIdx] && (() => {
                const b = orderedProperties[mobileBenchmarkIdx] as any;
                const c = orderedProperties[mobileCompareIdx] as any;

                const bAmenities = [...(b.interior_features || []), ...(b.exterior_features || [])];
                const cAmenities = [...(c.interior_features || []), ...(c.exterior_features || [])];

                return (
                  <div className="bg-card border border-border/80 rounded-2xl shadow-soft overflow-hidden divide-y divide-border/40">
                    
                    {/* Header Columns */}
                    <div className="grid grid-cols-2 divide-x divide-border/40 bg-accent/20">
                      {/* Benchmark Column */}
                      <div className="p-4 flex flex-col justify-between relative">
                        <button 
                          onClick={() => removeFromCompare(b.id)}
                          className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background border border-border shadow-sm flex items-center justify-center text-muted-foreground"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                        <div className="aspect-[4/3] rounded-lg overflow-hidden mb-3 bg-secondary/15">
                          <img src={resolveImage(b.cover_image_url)} alt={b.title} className="w-full h-full object-cover" />
                        </div>
                        <h4 className="text-xs font-bold line-clamp-2 h-8 text-foreground">{b.title}</h4>
                        <p className="text-sm font-serif font-bold text-primary mt-2">
                          {formatPrice(b.price, b.currency, b.property_type)}
                        </p>
                      </div>

                      {/* Compare Column */}
                      <div className="p-4 flex flex-col justify-between relative">
                        <button 
                          onClick={() => removeFromCompare(c.id)}
                          className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background border border-border shadow-sm flex items-center justify-center text-muted-foreground"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                        <div className="aspect-[4/3] rounded-lg overflow-hidden mb-3 bg-secondary/15">
                          <img src={resolveImage(c.cover_image_url)} alt={c.title} className="w-full h-full object-cover" />
                        </div>
                        <h4 className="text-xs font-bold line-clamp-2 h-8 text-primary">{c.title}</h4>
                        <p className="text-sm font-serif font-bold text-primary mt-2">
                          {formatPrice(c.price, c.currency, c.property_type)}
                        </p>
                      </div>
                    </div>

                    {/* Attribute Category: Core Specifications */}
                    <div className="p-3 bg-accent/10 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">
                      Core Specifications
                    </div>

                    {/* Bedrooms & Bathrooms Row */}
                    <div className="grid grid-cols-2 divide-x divide-border/40 text-xs">
                      <div className="p-4 space-y-1 font-semibold">
                        <div className="text-[10px] text-muted-foreground uppercase">Bedrooms / Baths</div>
                        <div className="text-foreground">{b.bedrooms || "—"} Beds / {b.bathrooms || "—"} Baths</div>
                      </div>
                      <div className="p-4 space-y-1 font-semibold">
                        <div className="text-[10px] text-muted-foreground uppercase">Bedrooms / Baths</div>
                        <div className="text-foreground">{c.bedrooms || "—"} Beds / {c.bathrooms || "—"} Baths</div>
                      </div>
                    </div>

                    {/* Size Row */}
                    <div className="grid grid-cols-2 divide-x divide-border/40 text-xs">
                      <div className="p-4 space-y-1 font-semibold">
                        <div className="text-[10px] text-muted-foreground uppercase">Total Area</div>
                        <div className="text-foreground">{b.size_sqm ? `${Number(b.size_sqm).toLocaleString()} sqm` : "—"}</div>
                      </div>
                      <div className="p-4 space-y-1 font-semibold">
                        <div className="text-[10px] text-muted-foreground uppercase">Total Area</div>
                        <div className="text-foreground">{c.size_sqm ? `${Number(c.size_sqm).toLocaleString()} sqm` : "—"}</div>
                      </div>
                    </div>

                    {/* Attribute Category: Location & Status */}
                    <div className="p-3 bg-accent/10 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">
                      Location & Details
                    </div>

                    {/* Location Row */}
                    <div className="grid grid-cols-2 divide-x divide-border/40 text-xs">
                      <div className="p-4 space-y-1">
                        <div className="text-[10px] text-muted-foreground font-bold uppercase">City & Country</div>
                        <div className="font-semibold text-foreground">{b.city ? `${b.city}, ${b.country}` : "—"}</div>
                      </div>
                      <div className="p-4 space-y-1">
                        <div className="text-[10px] text-muted-foreground font-bold uppercase">City & Country</div>
                        <div className="font-semibold text-foreground">{c.city ? `${c.city}, ${c.country}` : "—"}</div>
                      </div>
                    </div>

                    {/* Status Row */}
                    <div className="grid grid-cols-2 divide-x divide-border/40 text-xs">
                      <div className="p-4 space-y-1">
                        <div className="text-[10px] text-muted-foreground font-bold uppercase">Status</div>
                        <Badge variant="outline" className="capitalize font-bold text-[10px]">{b.status.replace("_", " ")}</Badge>
                      </div>
                      <div className="p-4 space-y-1">
                        <div className="text-[10px] text-muted-foreground font-bold uppercase">Status</div>
                        <Badge variant="outline" className="capitalize font-bold text-[10px]">{c.status.replace("_", " ")}</Badge>
                      </div>
                    </div>

                    {/* Attribute Category: Amenities */}
                    <div className="p-3 bg-accent/10 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">
                      Amenities
                    </div>

                    <div className="grid grid-cols-2 divide-x divide-border/40 text-xs">
                      <div className="p-4">
                        <div className="text-[10px] text-muted-foreground font-bold uppercase mb-2">Features ({bAmenities.length})</div>
                        <div className="flex flex-wrap gap-1">
                          {bAmenities.slice(0, 6).map((f, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[8px] px-1.5 py-0 bg-secondary/30 text-foreground font-normal">{f}</Badge>
                          ))}
                          {bAmenities.length > 6 && <span className="text-[9px] text-muted-foreground font-bold">+{bAmenities.length - 6} more</span>}
                          {bAmenities.length === 0 && <span className="text-muted-foreground italic text-[11px]">None listed</span>}
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="text-[10px] text-muted-foreground font-bold uppercase mb-2">Features ({cAmenities.length})</div>
                        <div className="flex flex-wrap gap-1">
                          {cAmenities.slice(0, 6).map((f, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[8px] px-1.5 py-0 bg-secondary/30 text-foreground font-normal">{f}</Badge>
                          ))}
                          {cAmenities.length > 6 && <span className="text-[9px] text-muted-foreground font-bold">+{cAmenities.length - 6} more</span>}
                          {cAmenities.length === 0 && <span className="text-muted-foreground italic text-[11px]">None listed</span>}
                        </div>
                      </div>
                    </div>

                    {/* Attribute Category: Investment Analysis */}
                    <div className="p-3 bg-accent/10 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">
                      Investment Potential
                    </div>

                    <div className="grid grid-cols-2 divide-x divide-border/40 text-xs">
                      <div className="p-4 space-y-3">
                        <div className="text-[10px] text-muted-foreground font-bold uppercase">Ownership Type</div>
                        {b.is_investment ? (
                          <div className="space-y-2">
                            <span className="inline-block text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">Fractional</span>
                            <div className="font-bold text-foreground">{b.investment_properties?.[0]?.expected_return}% Yield</div>
                          </div>
                        ) : (
                          <span className="font-bold text-muted-foreground text-[11px]">Full Ownership</span>
                        )}
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="text-[10px] text-muted-foreground font-bold uppercase">Ownership Type</div>
                        {c.is_investment ? (
                          <div className="space-y-2">
                            <span className="inline-block text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">Fractional</span>
                            <div className="font-bold text-foreground">{c.investment_properties?.[0]?.expected_return}% Yield</div>
                          </div>
                        ) : (
                          <span className="font-bold text-muted-foreground text-[11px]">Full Ownership</span>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })()}
            </div>

          </div>
        )}
      </div>
    </SiteLayout>
  );
}
