import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogBody } from "@/components/ui/dialog";

interface PropertyGalleryProps {
  images: string[];
  title: string;
  propertyType: string;
  status: string;
  typeLabel: string;
  statusLabel: string;
}

export function PropertyGallery({ images, title, propertyType, status, typeLabel, statusLabel }: PropertyGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [gridOpen, setGridOpen] = useState(false);
  const [dayNightMode, setDayNightMode] = useState<"day" | "night">("day");

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!isAutoPlaying || gridOpen) return;
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, next, gridOpen]);

  return (
    <div className="space-y-4">
      <div 
        className="relative group overflow-hidden rounded-xl bg-muted shadow-lux border border-border/50" 
        onMouseEnter={() => setIsAutoPlaying(false)} 
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        {/* Main Image */}
        <div className="relative aspect-[16/10] sm:aspect-[16/9] md:aspect-[21/9] lg:aspect-[24/10] overflow-hidden">
          {images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt={`${title} - View ${i + 1}`}
              onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
              className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ease-in-out ${
                dayNightMode === "night" ? "brightness-[0.4] contrast-[1.2] saturate-[0.7] hue-rotate-[20deg]" : ""
              } ${
                currentIndex === i ? "opacity-100 scale-100 z-10" : "opacity-0 scale-110 z-0"
              }`}
            />
          ))}
          
          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 z-20 pointer-events-none" />
          
          {/* Night Mode Window Glow Indicator Overlay */}
          {dayNightMode === "night" && (
            <div className="absolute inset-0 bg-yellow-500/5 mix-blend-color-dodge pointer-events-none z-15" />
          )}

          <div className="absolute left-8 top-8 z-30 flex gap-3">
            <Badge className="bg-background/95 text-foreground shadow-xl px-4 py-1.5 text-xs font-bold rounded-xl backdrop-blur-md border-none">{typeLabel}</Badge>
            <Badge variant={status === "available" ? "default" : "secondary"} className="shadow-xl px-4 py-1.5 text-xs font-bold rounded-xl backdrop-blur-md border-none">{statusLabel}</Badge>
          </div>

          {/* Navigation Arrows */}
          <div className="absolute inset-y-0 left-6 z-30 flex items-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[ -10px] group-hover:translate-x-0">
            <Button size="icon" variant="secondary" onClick={prev} className="h-14 w-14 rounded-full bg-background/90 backdrop-blur-md shadow-2xl hover:bg-primary hover:text-white transition-all border-none">
              <ChevronLeft className="h-7 w-7" />
            </Button>
          </div>
          <div className="absolute inset-y-0 right-6 z-30 flex items-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[10px] group-hover:translate-x-0">
            <Button size="icon" variant="secondary" onClick={next} className="h-14 w-14 rounded-full bg-background/90 backdrop-blur-md shadow-2xl hover:bg-primary hover:text-white transition-all border-none">
              <ChevronRight className="h-7 w-7" />
            </Button>
          </div>

          {/* Controls */}
          <div className="absolute bottom-6 left-8 right-8 z-30 flex items-center justify-between pointer-events-none">
            {/* Left: Pagination Dots */}
            <div className="flex gap-2 pointer-events-auto">
              {images.slice(0, 5).map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-500 ${currentIndex === i ? "w-8 bg-primary" : "w-1.5 bg-white/40"}`}
                />
              ))}
              {images.length > 5 && <div className="h-1.5 w-1.5 rounded-full bg-white/40" />}
            </div>

            {/* Center: Action Buttons */}
            <div className="absolute left-1/2 -translate-x-1/2 flex gap-3 pointer-events-auto">
              <Button 
                variant="secondary" 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDayNightMode(prev => prev === "day" ? "night" : "day"); }}
                className="rounded-xl bg-black/40 backdrop-blur-md text-white border border-white/20 hover:bg-black/60 font-bold px-4 flex items-center gap-1.5 z-40"
              >
                {dayNightMode === "day" ? "🌙 Night Preview" : "☀️ Day Preview"}
              </Button>

              <Dialog open={gridOpen} onOpenChange={setGridOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="rounded-xl bg-black/40 backdrop-blur-md text-white border border-white/20 hover:bg-black/60 font-bold px-5">
                    <Grid3X3 className="mr-2 h-4 w-4" /> Show all photos
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl">
                  <DialogHeader className="mb-6 flex flex-row items-center justify-between border-b pb-4">
                    <div>
                      <DialogTitle className="font-serif text-3xl font-bold">Property Gallery</DialogTitle>
                      <p className="text-muted-foreground mt-1 font-medium">{title} — {images.length} Professional Photographs</p>
                    </div>
                  </DialogHeader>
                  <DialogBody className="pb-10">
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {images.map((img, i) => (
                        <div 
                          key={i} 
                          className="group relative aspect-[4/3] rounded-[1.5rem] overflow-hidden cursor-pointer bg-muted border border-border/50 shadow-soft transition-all hover:shadow-card"
                          onClick={() => {
                            setCurrentIndex(i);
                            setGridOpen(false);
                          }}
                        >
                          <img src={img} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }} />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="bg-white/20 backdrop-blur-md p-4 rounded-full border border-white/30">
                              <Maximize2 className="h-8 w-8 text-white" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DialogBody>
                </DialogContent>
              </Dialog>
            </div>

            {/* Right: Counter */}
            <div className="rounded-xl bg-black/40 backdrop-blur-md px-5 py-2 text-sm font-bold text-white border border-white/20 pointer-events-auto">
              {currentIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      </div>

      {/* Thumbnails Bar */}
      <div className="flex gap-4 p-2 overflow-x-auto scrollbar-hide pb-2">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`relative flex-shrink-0 w-32 h-20 rounded-xl overflow-hidden transition-all duration-500 border-2 ${
              currentIndex === i 
                ? "border-primary scale-105 shadow-sm z-10" 
                : "border-transparent opacity-50 hover:opacity-100 grayscale hover:grayscale-0"
            }`}
          >
            <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }} />
            {currentIndex === i && (
              <div className="absolute inset-0 bg-primary/10" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
