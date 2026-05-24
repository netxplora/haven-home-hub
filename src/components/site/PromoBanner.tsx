import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */
interface Ad {
  id: string;
  title: string;
  description: string | null;
  ad_type: string;
  image_url: string | null;
  click_url: string | null;
  cta_label: string | null;
  priority: number;
}

interface PromoBannerProps {
  /** Which placement slot to query for (e.g. "homepage_hero", "homepage_mid") */
  placement: string;
  /** Optional additional CSS classes */
  className?: string;
}

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */
export function PromoBanner({ placement, className }: PromoBannerProps) {
  const impressionTracked = useRef<Set<string>>(new Set());
  const [imgError, setImgError] = useState(false);

  const { data: ads = [] } = useQuery({
    queryKey: ["public-ads", placement],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await (supabase as any)
        .from("advertisements")
        .select("id, title, description, ad_type, image_url, click_url, cta_label, priority")
        .eq("is_active", true)
        .eq("placement", placement)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("priority", { ascending: false })
        .limit(3);
      if (error) throw error;
      return (data ?? []) as Ad[];
    },
    refetchInterval: 60000,
  });

  // Track impression on mount for each ad (simple approach)
  useEffect(() => {
    ads.forEach((ad) => {
      if (!impressionTracked.current.has(ad.id)) {
        impressionTracked.current.add(ad.id);
        // Fire-and-forget impression increment
        ;(async () => {
          try {
            const { error } = await (supabase as any).rpc("increment_counter", { 
              table_name: "advertisements", 
              column_name: "impressions", 
              row_id: ad.id 
            });
            if (error) throw error;
          } catch {
            // Fallback: direct update if RPC not available
            await (supabase as any)
              .from("advertisements")
              .update({ impressions: (ad as any).impressions + 1 })
              .eq("id", ad.id);
          }
        })();
      }
    });
  }, [ads]);

  // Track click
  async function trackClick(adId: string) {
    try {
      await (supabase as any)
        .from("advertisements")
        .update({ clicks: (ads.find((a) => a.id === adId) as any)?.clicks + 1 || 1 })
        .eq("id", adId);
    } catch { /* ignore tracking errors */ }
  }

  if (ads.length === 0) return null;

  // Show the highest priority ad
  const ad = ads[0];

  // 1. Determine if this placement requires a container-wide wrapper
  const isWidePlacement = ["homepage_hero", "homepage_mid", "invest_page"].includes(placement);
  // 2. Determine if it's a very compact vertical placement
  const isVerticalCompact = ["sidebar", "property_detail"].includes(placement);

  const wrapperClass = cn(
    isWidePlacement ? "container-wide" : "w-full",
    className
  );

  // Render text_image_card type
  if (ad.ad_type === "text_image_card") {
    return (
      <div className={wrapperClass}>
        <div className="rounded-2xl border border-border/40 bg-card shadow-soft overflow-hidden hover:shadow-card transition-shadow duration-300">
          <div className={cn("grid items-center", isVerticalCompact ? "grid-cols-1" : "md:grid-cols-2")}>
            {/* Image */}
            {ad.image_url && !imgError ? (
              <div className={cn("overflow-hidden bg-muted", isVerticalCompact ? "h-40" : "h-48 md:h-64")}>
                <img
                  src={ad.image_url}
                  alt={ad.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={() => setImgError(true)}
                />
              </div>
            ) : (
              <div className={cn("bg-accent/30 flex items-center justify-center", isVerticalCompact ? "h-40" : "h-48 md:h-64")}>
                <ImageIcon className="h-12 w-12 text-muted-foreground/20" />
              </div>
            )}
            {/* Text */}
            <div className={cn("space-y-4", isVerticalCompact ? "p-5" : "p-6 md:p-10")}>
              <h3 className={cn("font-serif font-semibold text-foreground leading-tight", isVerticalCompact ? "text-lg" : "text-xl md:text-2xl")}>
                {ad.title}
              </h3>
              {ad.description && (
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {ad.description}
                </p>
              )}
              {ad.click_url && (
                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg w-full sm:w-auto">
                  <Link to={ad.click_url} onClick={() => trackClick(ad.id)}>
                    {ad.cta_label || "Learn More"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: image_banner / clickable_promo
  return (
    <div className={wrapperClass}>
      <div className="relative rounded-2xl overflow-hidden shadow-soft border border-border/30 group">
        {/* Image */}
        {ad.image_url && !imgError ? (
          <img
            src={ad.image_url}
            alt={ad.title}
            className={cn("w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]", isVerticalCompact ? "h-64" : "h-48 sm:h-56 md:h-64")}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={cn("w-full bg-accent/30 flex items-center justify-center", isVerticalCompact ? "h-64" : "h-48 sm:h-56 md:h-64")}>
            <ImageIcon className="h-12 w-12 text-muted-foreground/20" />
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Content */}
        <div className={cn("absolute inset-x-0 bottom-0 z-10", isVerticalCompact ? "p-5" : "p-6 sm:p-8")}>
          <h3 className={cn("font-serif font-semibold text-white leading-tight max-w-lg", isVerticalCompact ? "text-lg" : "text-xl sm:text-2xl")}>
            {ad.title}
          </h3>
          {ad.description && (
            <p className={cn("mt-2 text-white/80 max-w-md", isVerticalCompact ? "text-xs line-clamp-3" : "text-sm line-clamp-2")}>
              {ad.description}
            </p>
          )}
          {ad.click_url && (
            <Button
              asChild
              size="sm"
              className="mt-4 bg-white/95 text-foreground hover:bg-white shadow-sm rounded-lg font-medium w-full sm:w-auto"
            >
              <Link to={ad.click_url} onClick={() => trackClick(ad.id)}>
                {ad.cta_label || "View Details"} <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>

        {/* Subtle "Promoted" label */}
        <div className="absolute top-3 right-3 z-10">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-white/70 bg-black/40 backdrop-blur-sm rounded-md px-2 py-1 shadow-sm">
            Promoted
          </span>
        </div>
      </div>
    </div>
  );
}
