import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, Megaphone, ArrowRight, ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function PopupManager() {
  const [open, setOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<any>(null);

  // Use a combined query or two separate queries
  const { data: popups = [] } = useQuery({
    queryKey: ["public-popups"],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      // 1. Fetch Broadcasts with 'popup' visibility
      const { data: broadcasts, error: bError } = await (supabase as any)
        .from("broadcasts")
        .select("id, title, body, broadcast_type, link_url, link_label, image_url, priority")
        .eq("is_active", true)
        .or(`published_at.is.null,published_at.lte.${now}`)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .overlaps("visibility", ["popup"])
        .order("priority", { ascending: false });
        
      if (bError) throw bError;

      // 2. Fetch Advertisements with 'popup' placement
      const { data: ads, error: aError } = await (supabase as any)
        .from("advertisements")
        .select("id, title, description, ad_type, image_url, click_url, cta_label, priority")
        .eq("is_active", true)
        .eq("placement", "popup")
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("priority", { ascending: false });

      if (aError) throw aError;

      // Combine and format
      const combined = [
        ...(broadcasts || []).map((b: any) => ({
          id: `broadcast_${b.id}`,
          type: "broadcast",
          title: b.title,
          description: b.body,
          image_url: b.image_url,
          link_url: b.link_url,
          link_label: b.link_label,
          priority: b.priority
        })),
        ...(ads || []).map((a: any) => ({
          id: `ad_${a.id}`,
          type: "ad",
          title: a.title,
          description: a.description,
          image_url: a.image_url,
          link_url: a.click_url,
          link_label: a.cta_label,
          priority: a.priority
        }))
      ];

      // Sort by priority highest first
      return combined.sort((a, b) => b.priority - a.priority);
    },
    staleTime: 5 * 60 * 1000, // 5 mins
  });

  useEffect(() => {
    if (popups.length > 0 && !activeItem) {
      // Find the first one not dismissed
      let dismissed: string[] = [];
      try {
        const stored = sessionStorage.getItem("dismissed-popups");
        if (stored) dismissed = JSON.parse(stored);
      } catch { /* ignore */ }

      const next = popups.find(p => !dismissed.includes(p.id));
      if (next) {
        setActiveItem(next);
        // Add a slight delay before showing so it doesn't jar the user immediately on page load
        const timer = setTimeout(() => setOpen(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [popups, activeItem]);

  const handleDismiss = () => {
    setOpen(false);
    if (activeItem) {
      try {
        const stored = sessionStorage.getItem("dismissed-popups");
        const dismissed = stored ? JSON.parse(stored) : [];
        dismissed.push(activeItem.id);
        sessionStorage.setItem("dismissed-popups", JSON.stringify(dismissed));
      } catch { /* ignore */ }
    }
  };

  if (!activeItem) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleDismiss(); }}>
      <DialogContent className="sm:max-w-[425px] md:max-w-[600px] p-0 overflow-hidden border-border/40 shadow-2xl rounded-2xl bg-card">
        {/* Visually Hidden Title for Accessibility */}
        <DialogTitle className="sr-only">{activeItem.title}</DialogTitle>
        <DialogDescription className="sr-only">{activeItem.description}</DialogDescription>

        <div className="relative">
          <button 
            onClick={handleDismiss}
            className="absolute top-4 right-4 z-20 h-8 w-8 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>

          {activeItem.image_url ? (
            <div className="h-48 sm:h-64 md:h-72 w-full overflow-hidden bg-muted relative">
              <img 
                src={activeItem.image_url} 
                alt={activeItem.title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            </div>
          ) : (
            <div className="h-32 sm:h-40 w-full bg-primary/10 flex items-center justify-center relative">
              <Megaphone className="h-12 w-12 text-primary/40" />
            </div>
          )}

          <div className="p-6 sm:p-8 relative z-10 -mt-16 sm:-mt-20">
            <div className="bg-card rounded-xl p-6 sm:p-8 shadow-soft border border-border/50 text-center">
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground mb-3">
                {activeItem.title}
              </h2>
              {activeItem.description && (
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6">
                  {activeItem.description}
                </p>
              )}
              
              <div className="flex flex-col gap-3 sm:flex-row justify-center mt-6">
                {activeItem.link_url && (
                  <Button asChild size="lg" className="w-full sm:w-auto px-8 rounded-full">
                    <Link to={activeItem.link_url} onClick={handleDismiss}>
                      {activeItem.link_label || "Learn More"} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" size="lg" onClick={handleDismiss} className="w-full sm:w-auto rounded-full text-muted-foreground hover:text-foreground">
                  No thanks
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
