import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Bed, Bath, Maximize2, ChevronLeft, ChevronRight, Clock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveImage, propertyTypeLabel } from "@/lib/format";
import { useFormatPrice } from "@/hooks/useFormatPrice";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */
interface SliderProperty {
  id: string;
  slug: string;
  title: string;
  price: number;
  currency: string;
  property_type: "buy" | "rent" | "land";
  property_category: string | null;
  status: string;
  bedrooms: number | null;
  bathrooms: number | null;
  size_sqm: number | null;
  cover_image_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  created_at: string;
  locations: { name: string } | null;
  property_images: { url: string; sort_order: number }[];
}

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */
const AUTO_SCROLL_SPEED = 0.35; // px per frame (~21px/s at 60fps) – calm, readable
const SNAP_DURATION = 400; // ms for snap animation
const CARD_GAP = 24; // px gap between cards

/* ─────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────── */
export function FreshInventorySlider() {
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["fresh-inventory-slider"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select(`
          id, slug, title, price, currency, property_type, property_category,
          status, bedrooms, bathrooms, size_sqm, cover_image_url, address,
          city, state, country, created_at, locations(name),
          property_images(url, sort_order)
        `)
        .in("status", ["available"])
        .order("created_at", { ascending: false })
        .limit(16);
      if (error) throw error;
      return (data ?? []) as SliderProperty[];
    },
    refetchInterval: 30000, // live sync every 30s
  });

  if (isLoading) {
    return <SliderSkeleton />;
  }

  if (properties.length === 0) {
    return <EmptyState />;
  }

  return <PropertyRail properties={properties} />;
}

/* ─────────────────────────────────────────────
   Property Rail (Infinite Auto-Slider)
   ───────────────────────────────────────────── */
function PropertyRail({ properties }: { properties: SliderProperty[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollXRef = useRef(0);
  const rafRef = useRef<number>(0);
  const isPausedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);
  const velocityRef = useRef(0);
  const lastDragXRef = useRef(0);
  const lastDragTimeRef = useRef(0);
  const innerGalleryActiveRef = useRef(false);
  const hasMovedRef = useRef(false);
  const isPointerDownRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const [, forceRender] = useState(0);

  // We duplicate the cards for seamless infinite loop
  const duplicated = useMemo(() => [...properties, ...properties], [properties]);

  // Calculate the width of one full set
  const getSetWidth = useCallback(() => {
    if (!trackRef.current) return 0;
    const totalChildren = trackRef.current.children.length;
    if (totalChildren === 0) return 0;
    const singleChild = trackRef.current.children[0] as HTMLElement;
    const cardWidth = singleChild.offsetWidth + CARD_GAP;
    return cardWidth * properties.length;
  }, [properties.length]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (!isPausedRef.current && !isDraggingRef.current) {
        scrollXRef.current += AUTO_SCROLL_SPEED;
        const setWidth = getSetWidth();
        if (setWidth > 0 && scrollXRef.current >= setWidth) {
          scrollXRef.current -= setWidth;
        }
        applyTransform();
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [getSetWidth]);

  const applyTransform = useCallback(() => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(${-scrollXRef.current}px, 0, 0)`;
    }
  }, []);

  // Wrap position to stay within bounds
  const wrapPosition = useCallback(() => {
    const setWidth = getSetWidth();
    if (setWidth > 0) {
      while (scrollXRef.current < 0) scrollXRef.current += setWidth;
      while (scrollXRef.current >= setWidth) scrollXRef.current -= setWidth;
    }
  }, [getSetWidth]);

  // ── Mouse / Hover ──
  const handleMouseEnter = () => { isPausedRef.current = true; };
  const handleMouseLeave = () => {
    if (!isDraggingRef.current) isPausedRef.current = false;
  };

  // ── Pointer / Touch Drag ──
  const handlePointerDown = (e: React.PointerEvent) => {
    // Don't start drag if interacting with inner gallery
    const target = e.target as HTMLElement;
    if (target.closest('[data-gallery="true"]')) {
      return;
    }
    if (innerGalleryActiveRef.current) return;
    
    isPointerDownRef.current = true;
    pointerIdRef.current = e.pointerId;
    isPausedRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartScrollRef.current = scrollXRef.current;
    lastDragXRef.current = e.clientX;
    lastDragTimeRef.current = Date.now();
    velocityRef.current = 0;
    hasMovedRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    
    const deltaX = dragStartXRef.current - e.clientX;
    
    // Distinguish a true drag from a simple tap
    if (!hasMovedRef.current && Math.abs(deltaX) > 8) {
      hasMovedRef.current = true;
      isDraggingRef.current = true;
      if (pointerIdRef.current !== null) {
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(pointerIdRef.current);
        } catch (err) {
          console.error("Failed to set pointer capture:", err);
        }
      }
    }
    
    if (hasMovedRef.current) {
      scrollXRef.current = dragStartScrollRef.current + deltaX;
      wrapPosition();
      applyTransform();

      // Track velocity for momentum
      const now = Date.now();
      const dt = now - lastDragTimeRef.current;
      if (dt > 0) {
        velocityRef.current = (lastDragXRef.current - e.clientX) / dt;
      }
      lastDragXRef.current = e.clientX;
      lastDragTimeRef.current = now;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;

    if (pointerIdRef.current !== null) {
      try {
        if ((e.currentTarget as HTMLElement).hasPointerCapture(pointerIdRef.current)) {
          (e.currentTarget as HTMLElement).releasePointerCapture(pointerIdRef.current);
        }
      } catch (err) {
        console.error("Failed to release pointer capture:", err);
      }
    }
    
    if (hasMovedRef.current) {
      // Apply momentum
      const momentum = velocityRef.current * 150;
      if (Math.abs(momentum) > 5) {
        const target = scrollXRef.current + momentum;
        animateToPosition(target, 500);
      }
    }

    isPointerDownRef.current = false;
    pointerIdRef.current = null;

    // Micro-delay resetting isDragging to false so click events can see it and prevent navigation
    setTimeout(() => {
      isDraggingRef.current = false;
      hasMovedRef.current = false;
    }, 50);

    // Resume auto-scroll after a brief pause
    setTimeout(() => {
      isPausedRef.current = false;
    }, 2000);
  };

  // Smooth animated transition to a target position
  const animateToPosition = (target: number, duration: number) => {
    const start = scrollXRef.current;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      scrollXRef.current = start + (target - start) * eased;
      wrapPosition();
      applyTransform();
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // Arrow navigation
  const scrollByCards = (direction: number) => {
    if (!trackRef.current || trackRef.current.children.length === 0) return;
    const card = trackRef.current.children[0] as HTMLElement;
    const cardWidth = card.offsetWidth + CARD_GAP;
    const target = scrollXRef.current + cardWidth * direction;
    isPausedRef.current = true;
    animateToPosition(target, SNAP_DURATION);
    setTimeout(() => { isPausedRef.current = false; }, 3000);
  };

  // Signal from inner gallery that a swipe is happening
  const setInnerGalleryActive = useCallback((active: boolean) => {
    innerGalleryActiveRef.current = active;
  }, []);

  return (
    <div className="relative group/rail">
      {/* Navigation Arrows (Desktop) */}
      <button
        onClick={() => scrollByCards(-1)}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/90 dark:bg-card/90 shadow-card backdrop-blur-sm flex items-center justify-center text-foreground opacity-0 group-hover/rail:opacity-100 transition-opacity duration-300 hover:bg-white hover:scale-105 active:scale-95"
        aria-label="Previous properties"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => scrollByCards(1)}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/90 dark:bg-card/90 shadow-card backdrop-blur-sm flex items-center justify-center text-foreground opacity-0 group-hover/rail:opacity-100 transition-opacity duration-300 hover:bg-white hover:scale-105 active:scale-95"
        aria-label="Next properties"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Slider Track */}
      <div
        className="overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: "pan-y" }}
      >
        <div
          ref={trackRef}
          className="flex will-change-transform"
          style={{ gap: `${CARD_GAP}px` }}
        >
          {duplicated.map((property, idx) => (
            <SliderCard
              key={`${property.id}-${idx}`}
              property={property}
              isDragging={isDraggingRef}
              onGallerySwipe={setInnerGalleryActive}
            />
          ))}
        </div>
      </div>

      {/* Soft edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-16 bg-gradient-to-r from-accent/30 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-16 bg-gradient-to-l from-accent/30 to-transparent z-10" />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Slider Property Card
   ───────────────────────────────────────────── */
interface SliderCardProps {
  property: SliderProperty;
  isDragging: React.MutableRefObject<boolean>;
  onGallerySwipe: (active: boolean) => void;
}

function SliderCard({ property, isDragging, onGallerySwipe }: SliderCardProps) {
  const formatPrice = useFormatPrice();
  const [currentImage, setCurrentImage] = useState(0);
  const galleryTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [galleryTransition, setGalleryTransition] = useState(true);

  // Build image list: cover_image + property_images
  const images = useMemo(() => {
    const list: string[] = [];
    if (property.property_images?.length) {
      const sorted = [...property.property_images].sort((a, b) => a.sort_order - b.sort_order);
      sorted.forEach((img) => list.push(resolveImage(img.url)));
    }
    if (list.length === 0) {
      list.push(resolveImage(property.cover_image_url));
    }
    return list;
  }, [property.property_images, property.cover_image_url]);

  const isNew = property.created_at
    ? new Date(property.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    : false;

  const location = property.city && property.country
    ? `${property.city}${property.state ? `, ${property.state}` : ""}, ${property.country}`
    : property.locations?.name ?? property.address ?? "—";

  // ── Inner Gallery Touch Handling ──
  const handleGalleryTouchStart = (e: React.TouchEvent) => {
    if (images.length <= 1) return;
    galleryTouchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleGalleryTouchEnd = (e: React.TouchEvent) => {
    if (!galleryTouchStartRef.current || images.length <= 1) return;
    const dx = e.changedTouches[0].clientX - galleryTouchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - galleryTouchStartRef.current.y;

    // Only trigger gallery change for intentional horizontal swipes
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      e.stopPropagation();
      onGallerySwipe(false);
      if (dx < 0 && currentImage < images.length - 1) {
        setCurrentImage((prev) => prev + 1);
      } else if (dx > 0 && currentImage > 0) {
        setCurrentImage((prev) => prev - 1);
      }
    }
    galleryTouchStartRef.current = null;
  };

  const handleGalleryTouchMove = (e: React.TouchEvent) => {
    if (!galleryTouchStartRef.current || images.length <= 1) return;
    const dx = e.touches[0].clientX - galleryTouchStartRef.current.x;
    const dy = e.touches[0].clientY - galleryTouchStartRef.current.y;
    // If horizontal swipe is detected, signal to parent
    if (Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      onGallerySwipe(true);
    }
  };

  // Desktop gallery nav via click zones
  const handleGalleryClick = (e: React.MouseEvent) => {
    if (isDragging.current || images.length <= 1) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width / 2) {
      setCurrentImage((prev) => Math.max(0, prev - 1));
    } else {
      setCurrentImage((prev) => Math.min(images.length - 1, prev + 1));
    }
  };

  return (
    <div
      className="flex-shrink-0 w-[280px] sm:w-[320px] lg:w-[340px] rounded-xl border border-border/60 bg-card shadow-soft overflow-hidden group/card transition-shadow duration-300 hover:shadow-card select-none"
    >
      {/* ── Image Gallery ── */}
      <div
        data-gallery={images.length > 1 ? "true" : "false"}
        className="relative aspect-[4/3] overflow-hidden bg-muted"
        onTouchStart={handleGalleryTouchStart}
        onTouchMove={handleGalleryTouchMove}
        onTouchEnd={handleGalleryTouchEnd}
        onClick={handleGalleryClick}
      >
        <div
          className={cn(
            "flex h-full w-full",
            galleryTransition && "transition-transform duration-400 ease-out"
          )}
          style={{ transform: `translate3d(${-currentImage * 100}%, 0, 0)` }}
        >
          {images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`${property.title} — image ${i + 1}`}
              loading="lazy"
              draggable={false}
              className="h-full w-full flex-shrink-0 object-cover transition-transform duration-700 group-hover/card:scale-[1.03]"
            />
          ))}
        </div>

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[calc(100%-115px)] pointer-events-none">
          <Badge className="bg-white/95 text-foreground hover:bg-white border-none shadow-sm text-xs font-medium px-2.5 py-1">
            {propertyTypeLabel(property.property_type)}
          </Badge>
          {isNew && (
            <Badge className="bg-orange-500 text-white border-none shadow-sm text-xs font-medium px-2.5 py-1">
              New Listing
            </Badge>
          )}
          {property.property_category && (
            <Badge variant="secondary" className="bg-white/90 text-foreground border-none shadow-sm text-[11px] font-medium px-2 py-0.5 capitalize">
              {property.property_category}
            </Badge>
          )}
        </div>

        {/* Availability badge */}
        <div className="absolute top-3 right-3 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/90 text-white text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 shadow-sm backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Available
          </span>
        </div>

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[11px] font-medium rounded-md px-2 py-1 pointer-events-none">
            {currentImage + 1}/{images.length}
          </div>
        )}

        {/* Dot indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-none">
            {images.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === currentImage
                    ? "w-4 bg-white"
                    : "w-1.5 bg-white/50"
                )}
              />
            ))}
          </div>
        )}

        {/* Desktop hover arrows for gallery */}
        {images.length > 1 && (
          <>
            {currentImage > 0 && (
              <div className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/80 dark:bg-card/80 shadow-sm flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none">
                <ChevronLeft className="h-4 w-4 text-foreground" />
              </div>
            )}
            {currentImage < images.length - 1 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/80 dark:bg-card/80 shadow-sm flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none">
                <ChevronRight className="h-4 w-4 text-foreground" />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Card Content ── */}
      <Link
        to={`/properties/${property.slug}`}
        className="block p-4 sm:p-5 space-y-2"
        onClick={(e) => {
          // Prevent navigation if user was dragging the slider
          if (isDragging.current) {
            e.preventDefault();
          }
        }}
        draggable={false}
      >
        <p className="font-serif text-lg sm:text-xl font-semibold text-primary leading-tight">
          {formatPrice(property.price, property.currency, property.property_type)}
        </p>

        <h3 className="font-medium text-sm sm:text-[15px] text-foreground line-clamp-1 leading-snug">
          {property.title}
        </h3>

        <p className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
          <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
          <span className="line-clamp-1">{location}</span>
        </p>

        {/* Specs */}
        <div className="pt-3 border-t border-border/50 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-muted-foreground">
          {property.bedrooms != null && (
            <span className="flex items-center gap-1">
              <Bed className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {property.bedrooms} Beds
            </span>
          )}
          {property.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {property.bathrooms} Baths
            </span>
          )}
          {property.size_sqm != null && (
            <span className="flex items-center gap-1">
              <Maximize2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {Number(property.size_sqm).toLocaleString()} sqm
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Loading Skeleton
   ───────────────────────────────────────────── */
function SliderSkeleton() {
  return (
    <div className="flex gap-6 overflow-hidden px-5 sm:px-6 lg:px-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-[280px] sm:w-[320px] lg:w-[340px] rounded-xl border border-border/60 bg-card overflow-hidden animate-pulse">
          <div className="aspect-[4/3] bg-muted" />
          <div className="p-5 space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Empty State
   ───────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="container-wide">
      <div className="rounded-2xl border-2 border-dashed border-border bg-accent/30 py-16 px-8 text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-accent/50 flex items-center justify-center mb-4">
          <Clock className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <h3 className="font-serif text-lg font-medium text-foreground">
          New properties coming soon
        </h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          Our team is actively reviewing and approving new listings. Check back shortly for fresh additions.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/properties">Browse all listings <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
    </div>
  );
}
