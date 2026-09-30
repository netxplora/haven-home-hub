import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X, Grid3X3, Image as ImageIcon, SlidersHorizontal } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LazyImage } from "@/components/ui/LazyImage";

interface PropertyGalleryProps {
  images: string[];
  title: string;
  propertyType: string;
  status: string;
  typeLabel: string;
  statusLabel: string;
}

export function PropertyGallery({ images, title, propertyType, status, typeLabel, statusLabel }: PropertyGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [allPhotosOpen, setAllPhotosOpen] = useState(false);
  const [carouselMode, setCarouselMode] = useState(false);

  // Embla for mobile / single-image carousel
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, skipSnaps: false });
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter out any invalid / empty images and guarantee at least 1 image
  const validImages = images.length > 0 ? images : ["/placeholder.svg"];

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
    setCurrentIndex(index);
  }, [emblaApi]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const lightboxNext = useCallback(() => {
    setLightboxIndex((prev) => (prev + 1) % validImages.length);
  }, [validImages.length]);

  const lightboxPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  }, [validImages.length]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!lightboxOpen && !allPhotosOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxOpen(false);
        setAllPhotosOpen(false);
      } else if (lightboxOpen) {
        if (e.key === "ArrowRight") lightboxNext();
        if (e.key === "ArrowLeft") lightboxPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, allPhotosOpen, lightboxNext, lightboxPrev]);

  // Touch swipe support for lightbox on mobile
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) lightboxNext();
    else if (diff < -50) lightboxPrev();
    touchStartX.current = null;
  };

  const formattedIndex = String(currentIndex + 1).padStart(2, "0");
  const formattedTotal = String(validImages.length).padStart(2, "0");

  const hasMultiplePhotos = validImages.length >= 4;

  return (
    <div className="space-y-3">
      {/* ── Mobile Gallery (Swipeable Viewport) ── */}
      <div className="block md:hidden relative rounded-2xl overflow-hidden border border-border/40 bg-muted/20 shadow-sm">
        <div className="relative aspect-[4/3] w-full overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y h-full">
            {validImages.map((img, i) => (
              <div 
                key={i} 
                className="relative min-w-0 shrink-0 basis-full h-full cursor-pointer"
                onClick={() => openLightbox(i)}
              >
                <LazyImage
                  src={img}
                  alt={`${title} — Photo ${i + 1}`}
                  aspectClass="aspect-[4/3]"
                  wrapperClassName="h-full w-full"
                  className="h-full w-full object-cover select-none"
                />
              </div>
            ))}
          </div>

          {/* Minimal Translucent Status Badges (Top-Left) */}
          <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 pointer-events-none">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide bg-background/85 text-foreground backdrop-blur-md shadow-xs border border-border/30">
              {typeLabel}
            </span>
            <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide backdrop-blur-md shadow-xs ${
              status === "available" 
                ? "bg-primary/90 text-primary-foreground" 
                : "bg-secondary/90 text-secondary-foreground"
            }`}>
              {statusLabel}
            </span>
          </div>

          {/* Minimal Floating Counter (Bottom-Right) */}
          <div className="absolute right-3 bottom-3 z-10 pointer-events-none">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold font-mono tracking-wider bg-black/60 text-white backdrop-blur-md shadow-xs border border-white/10">
              {formattedIndex} / {formattedTotal}
            </span>
          </div>

          {/* Minimal Expand Button (Bottom-Left) */}
          <button
            onClick={() => setAllPhotosOpen(true)}
            className="absolute left-3 bottom-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-black/60 text-white backdrop-blur-md shadow-xs border border-white/10 active:scale-95 transition-transform"
            aria-label="View all photos"
          >
            <Grid3X3 className="h-3.5 w-3.5" />
            <span>Photos</span>
          </button>
        </div>
      </div>

      {/* ── Desktop Gallery (Editorial Grid / Hero Showcase) ── */}
      <div className="hidden md:block">
        {hasMultiplePhotos && !carouselMode ? (
          /* Editorial 5-Photo Bento Grid */
          <div className="grid grid-cols-4 grid-rows-2 gap-2.5 h-[480px] lg:h-[540px] xl:h-[580px] rounded-2xl overflow-hidden border border-border/50 bg-muted/20 relative group">
            {/* Primary Large Image */}
            <div 
              className="col-span-2 row-span-2 relative overflow-hidden cursor-pointer"
              onClick={() => openLightbox(0)}
            >
              <LazyImage
                src={validImages[0]}
                alt={`${title} — Featured Photo`}
                aspectClass=""
                wrapperClassName="h-full w-full"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.01] hover:brightness-[1.02]"
              />
              {/* Type / Status badges top-left */}
              <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide bg-background/90 text-foreground backdrop-blur-md shadow-xs border border-border/40">
                  {typeLabel}
                </span>
                <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide backdrop-blur-md shadow-xs ${
                  status === "available" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-secondary text-secondary-foreground"
                }`}>
                  {statusLabel}
                </span>
              </div>
            </div>

            {/* 4 Secondary Grid Images */}
            {validImages.slice(1, 5).map((img, i) => (
              <div
                key={i}
                className="relative overflow-hidden cursor-pointer bg-muted"
                onClick={() => openLightbox(i + 1)}
              >
                <LazyImage
                  src={img}
                  alt={`${title} — Photo ${i + 2}`}
                  aspectClass=""
                  wrapperClassName="h-full w-full"
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-105 hover:brightness-[1.03]"
                />
              </div>
            ))}

            {/* Bottom-Right "Show All Photos" Button */}
            <div className="absolute right-4 bottom-4 z-10 flex items-center gap-2">
              <button
                onClick={() => setCarouselMode(true)}
                title="Switch to Carousel View"
                className="flex items-center justify-center h-9 w-9 rounded-xl bg-background/90 hover:bg-background text-foreground backdrop-blur-md shadow-sm border border-border/50 transition-all hover:scale-105 active:scale-95"
                aria-label="Carousel mode"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
              <button
                onClick={() => setAllPhotosOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-background/90 hover:bg-background text-foreground backdrop-blur-md shadow-sm border border-border/50 transition-all hover:scale-105 active:scale-95"
              >
                <Grid3X3 className="h-3.5 w-3.5 text-primary" />
                <span>Show all {validImages.length} photos</span>
              </button>
            </div>
          </div>
        ) : (
          /* Desktop Panoramic Carousel Showcase */
          <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-muted/20 shadow-sm group">
            <div className="relative aspect-[21/9] lg:aspect-[24/9] w-full overflow-hidden" ref={emblaRef}>
              <div className="flex touch-pan-y h-full">
                {validImages.map((img, i) => (
                  <div 
                    key={i} 
                    className="relative min-w-0 shrink-0 basis-full h-full cursor-pointer"
                    onClick={() => openLightbox(i)}
                  >
                    <LazyImage
                      src={img}
                      alt={`${title} — Photo ${i + 1}`}
                      aspectClass=""
                      wrapperClassName="h-full w-full"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>

              {/* Status Badges */}
              <div className="absolute left-6 top-6 z-10 flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide bg-background/90 text-foreground backdrop-blur-md shadow-xs border border-border/40">
                  {typeLabel}
                </span>
                <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide backdrop-blur-md shadow-xs ${
                  status === "available" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-secondary text-secondary-foreground"
                }`}>
                  {statusLabel}
                </span>
              </div>

              {/* Desktop Nav Arrows */}
              <button
                onClick={scrollPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full bg-background/85 text-foreground hover:bg-background backdrop-blur-md shadow-md border border-border/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-105 active:scale-95"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={scrollNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full bg-background/85 text-foreground hover:bg-background backdrop-blur-md shadow-md border border-border/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-105 active:scale-95"
                aria-label="Next photo"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Bottom Actions */}
              <div className="absolute right-6 bottom-6 z-10 flex items-center gap-2">
                {hasMultiplePhotos && (
                  <button
                    onClick={() => setCarouselMode(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-background/90 hover:bg-background text-foreground backdrop-blur-md shadow-sm border border-border/50 transition-all"
                  >
                    <Grid3X3 className="h-3.5 w-3.5 text-primary" />
                    <span>Grid View</span>
                  </button>
                )}
                <span className="px-3 py-1.5 rounded-xl text-xs font-semibold font-mono bg-background/90 text-foreground backdrop-blur-md shadow-sm border border-border/50">
                  {formattedIndex} / {formattedTotal}
                </span>
                <button
                  onClick={() => setAllPhotosOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>All Photos</span>
                </button>
              </div>
            </div>

            {/* Desktop Thumbnail Ribbon */}
            {validImages.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar border-t border-border/30 bg-background/50">
                {validImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => scrollTo(i)}
                    className={`relative shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      currentIndex === i 
                        ? "border-primary shadow-xs ring-2 ring-primary/20 scale-100" 
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <LazyImage src={img} alt="" aspectClass="" wrapperClassName="h-full w-full" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 1. Fullscreen Lightbox Modal (Keyboard + Touch gestures) ── */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 text-white">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-semibold tracking-wider text-white/90">
                {String(lightboxIndex + 1).padStart(2, "0")} / {formattedTotal}
              </span>
              <span className="text-white/40 hidden sm:inline">|</span>
              <span className="text-sm font-medium text-white/80 truncate max-w-md hidden sm:inline">
                {title}
              </span>
            </div>
            <button
              onClick={() => setLightboxOpen(false)}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="Close fullscreen gallery"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Main Photo Area */}
          <div className="relative flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden">
            <img
              src={validImages[lightboxIndex]}
              alt={`${title} — Photo ${lightboxIndex + 1}`}
              onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-all duration-300"
            />

            {/* Left / Right Nav Buttons */}
            {validImages.length > 1 && (
              <>
                <button
                  onClick={lightboxPrev}
                  className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all backdrop-blur-sm"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={lightboxNext}
                  className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all backdrop-blur-sm"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnail Strip */}
          {validImages.length > 1 && (
            <div className="p-4 border-t border-white/10 flex justify-center">
              <div className="flex gap-2 overflow-x-auto max-w-3xl no-scrollbar px-2 py-1">
                {validImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxIndex(i)}
                    className={`relative shrink-0 w-16 h-12 rounded-md overflow-hidden border transition-all ${
                      lightboxIndex === i 
                        ? "border-primary ring-2 ring-primary/40 opacity-100 scale-105" 
                        : "border-transparent opacity-40 hover:opacity-80"
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 2. All Photos Grid Overview Modal ── */}
      {allPhotosOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
            <div>
              <h3 className="font-serif text-xl font-bold text-foreground">Property Gallery</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{title} — {validImages.length} High-Resolution Photographs</p>
            </div>
            <button
              onClick={() => setAllPhotosOpen(false)}
              className="h-10 w-10 rounded-full bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center transition-colors"
              aria-label="Close gallery"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Photos Grid */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {validImages.map((img, i) => (
                <div
                  key={i}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-border/60 bg-muted cursor-pointer shadow-xs hover:shadow-md transition-all"
                  onClick={() => {
                    setAllPhotosOpen(false);
                    openLightbox(i);
                  }}
                >
                  <LazyImage
                    src={img}
                    alt={`${title} — Photo ${i + 1}`}
                    aspectClass="aspect-[4/3]"
                    wrapperClassName="h-full w-full"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/90 text-black backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                      <Maximize2 className="h-3.5 w-3.5" /> View Photo
                    </span>
                  </div>
                  <div className="absolute left-2.5 top-2.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-black/60 text-white backdrop-blur-sm">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
