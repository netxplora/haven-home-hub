import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  X,
  ArrowRight,
  Info,
  Megaphone,
  Wrench,
  Tag,
  Star,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */
interface Broadcast {
  id: string;
  title: string;
  body: string | null;
  broadcast_type: string;
  link_url: string | null;
  link_label: string | null;
  priority: number;
}

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */
const TYPE_ICONS: Record<string, typeof Info> = {
  general: Info,
  investor_update: Megaphone,
  maintenance: Wrench,
  promotion: Tag,
  featured_property: Star,
  emergency: AlertTriangle,
};

const TYPE_COLORS: Record<string, string> = {
  general: "bg-primary/90 text-primary-foreground",
  investor_update: "bg-blue-600 text-white",
  maintenance: "bg-amber-500 text-white",
  promotion: "bg-emerald-600 text-white",
  featured_property: "bg-primary text-primary-foreground",
  emergency: "bg-red-600 text-white",
};

const CYCLE_INTERVAL = 6000; // 6 seconds per broadcast

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */
export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem("dismissed-broadcasts");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
      return new Set();
    } catch {
      return new Set();
    }
  });

  const [activeIndex, setActiveIndex] = useState(0);

  const { data: broadcasts = [] } = useQuery({
    queryKey: ["public-broadcasts-bar"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await (supabase as any)
        .from("broadcasts")
        .select("id, title, body, broadcast_type, link_url, link_label, priority")
        .eq("is_active", true)
        .or(`published_at.is.null,published_at.lte.${now}`)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .overlaps("visibility", ["homepage", "platform_wide"])
        .order("priority", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as Broadcast[];
    },
    refetchInterval: 60000, // re-check every 60 seconds
  });

  // Filter out dismissed
  const visible = useMemo(
    () => broadcasts.filter((b) => !dismissed.has(b.id)),
    [broadcasts, dismissed]
  );

  // Cycle through multiple broadcasts
  useEffect(() => {
    if (visible.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % visible.length);
    }, CYCLE_INTERVAL);
    return () => clearInterval(timer);
  }, [visible.length]);

  // Keep activeIndex in range
  useEffect(() => {
    if (activeIndex >= visible.length) setActiveIndex(0);
  }, [visible.length, activeIndex]);

  if (visible.length === 0) return null;

  const current = visible[activeIndex] ?? visible[0];
  if (!current) return null; // Safe guard
  
  const Icon = TYPE_ICONS[current.broadcast_type] ?? Info;
  const colorClass = TYPE_COLORS[current.broadcast_type] ?? TYPE_COLORS.general;

  function dismiss() {
    const next = new Set(dismissed);
    next.add(current.id);
    setDismissed(next);
    try {
      sessionStorage.setItem("dismissed-broadcasts", JSON.stringify([...next]));
    } catch { /* ignore storage errors */ }
  }

  return (
    <div className={cn("relative z-50", colorClass)}>
      <div className="container-wide flex items-center justify-between gap-3 py-2.5 px-4 sm:px-6">
        {/* Left: Icon + Text */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Icon className="h-4 w-4 shrink-0 opacity-90" />
          <p className="text-sm font-medium truncate">
            {current.title}
            {current.body && (
              <span className="hidden sm:inline font-normal opacity-80 ml-1.5">
                — {current.body}
              </span>
            )}
          </p>
        </div>

        {/* Center: CTA link */}
        {current.link_url && (
          <Link
            to={current.link_url}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider opacity-90 hover:opacity-100 shrink-0 transition-opacity"
          >
            {current.link_label || "Learn More"}
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}

        {/* Right: Count + Dismiss */}
        <div className="flex items-center gap-2 shrink-0">
          {visible.length > 1 && (
            <span className="text-[10px] font-medium opacity-60">
              {activeIndex + 1}/{visible.length}
            </span>
          )}
          <button
            onClick={dismiss}
            className="p-1 rounded-md hover:bg-white/15 transition-colors"
            aria-label="Dismiss announcement"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
