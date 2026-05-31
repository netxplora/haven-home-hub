import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Key, Building2, MapPin, BadgePercent, Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface ActivityToast {
  id: string;
  type: string;
  message: string;
  property_id: string | null;
  created_at: string;
  investment_properties?: {
    slug: string;
    cover_image_url: string;
    title: string;
  } | null;
}

export function ActivityToasts() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Fetch settings
  const { data: config } = useQuery({
    queryKey: ["activity-toast-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("system_configs")
        .select("value")
        .eq("key", "activity_toasts")
        .single();
      
      if (error || !data) return { enabled: false, interval_seconds: 15, display_count: 20 };
      return data.value;
    }
  });

  // Fetch toasts
  const { data: toasts = [] } = useQuery({
    queryKey: ["recent-activity-toasts", config?.display_count],
    queryFn: async () => {
      if (!config?.enabled) return [];
      
      const { data, error } = await (supabase as any)
        .from("activity_toasts")
        .select("*, investment_properties(slug, cover_image_url, title)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(config?.display_count || 20);

      if (error) return [];
      return data as ActivityToast[];
    },
    enabled: !!config && config.enabled,
    refetchInterval: 60000, // Refresh list every minute
  });

  // Cycle logic
  useEffect(() => {
    if (!config?.enabled || toasts.length === 0 || isPaused) return;

    // Show current toast
    setIsVisible(true);

    // Hide it 3 seconds before the interval ends so it can fade out smoothly
    const intervalMs = (config.interval_seconds || 15) * 1000;
    const hideTimeMs = Math.max(3000, intervalMs - 2000); // Wait at least 3s

    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, hideTimeMs);

    // Move to next toast
    const nextTimer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % toasts.length);
    }, intervalMs);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(nextTimer);
    };
  }, [currentIndex, toasts, config, isPaused]);

  if (!config?.enabled || toasts.length === 0) return null;

  const currentToast = toasts[currentIndex];
  if (!currentToast) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'purchase': return <Key className="h-4 w-4 text-emerald-500" />;
      case 'rent': return <MapPin className="h-4 w-4 text-blue-500" />;
      case 'fractional': return <TrendingUp className="h-4 w-4 text-primary" />;
      case 'reservation': return <Star className="h-4 w-4 text-yellow-500" />;
      case 'listing': return <Building2 className="h-4 w-4 text-indigo-500" />;
      case 'milestone': return <BadgePercent className="h-4 w-4 text-purple-500" />;
      default: return <TrendingUp className="h-4 w-4 text-primary" />;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 60000); // mins
    if (diff < 60) return `${Math.max(1, diff)}m ago`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const Content = (
    <div 
      className={cn(
        "fixed bottom-6 left-6 z-50 transition-all duration-700 ease-out sm:max-w-sm w-full max-w-[calc(100vw-3rem)]",
        isVisible 
          ? "translate-y-0 opacity-100 scale-100" 
          : "translate-y-8 opacity-0 scale-95 pointer-events-none"
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="surface-glass rounded-xl p-3 border border-border/50 shadow-lux flex items-center gap-4 cursor-pointer hover:bg-card/40 transition-colors">
        {currentToast.investment_properties?.cover_image_url ? (
          <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden shrink-0 border border-border/50 relative">
            <img 
              src={currentToast.investment_properties.cover_image_url} 
              alt={currentToast.investment_properties.title || "Property"} 
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-1 right-1 bg-background/90 rounded p-0.5 backdrop-blur-sm">
              {getIcon(currentToast.type)}
            </div>
          </div>
        ) : (
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
            {getIcon(currentToast.type)}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider mb-0.5">
            Real-Time Activity <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
          </p>
          <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
            {currentToast.message}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {getTimeAgo(currentToast.created_at)}
          </p>
        </div>
      </div>
    </div>
  );

  // Link to property if attached
  if (currentToast.property_id && currentToast.investment_properties?.slug) {
    return (
      <Link to={`/invest/${currentToast.investment_properties.slug}`}>
        {Content}
      </Link>
    );
  }

  return Content;
}
