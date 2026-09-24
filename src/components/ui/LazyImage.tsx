import { useState, useRef, useEffect, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  aspectClass?: string;
  wrapperClassName?: string;
  rootMargin?: string;
  fallbackSrc?: string;
}

/**
 * LazyImage - smart lazy-loaded image component.
 * - Reserves layout space via aspect-ratio (prevents CLS)
 * - Shows neutral skeleton while loading
 * - Uses IntersectionObserver to begin loading 300px before viewport
 * - Decodes image before fade-in for clean first paint
 * - Fades in smoothly (300ms) once decoded
 * - Handles errors with optional fallback src
 */
export function LazyImage({
  src,
  alt,
  aspectClass = "aspect-[4/3]",
  wrapperClassName,
  className,
  rootMargin = "300px 0px",
  fallbackSrc,
  ...rest
}: LazyImageProps) {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setIsInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  useEffect(() => {
    if (!isInView || !imgRef.current) return;
    const img = imgRef.current;
    const activeSrc = hasError ? (fallbackSrc ?? src) : src;
    if (!activeSrc) return;
    img.src = activeSrc;
    if (img.complete && img.naturalWidth > 0) {
      setIsLoaded(true);
      return;
    }
    img
      .decode()
      .then(() => setIsLoaded(true))
      .catch(() => {
        if (fallbackSrc && !hasError) {
          setHasError(true);
        } else {
          setIsLoaded(true);
        }
      });
  }, [isInView, src, hasError, fallbackSrc]);

  const finalSrc = hasError ? (fallbackSrc ?? src) : src;

  return (
    <div
      ref={wrapperRef}
      className={cn("relative overflow-hidden bg-muted", aspectClass, wrapperClassName)}
    >
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden="true" />
      )}
      {isInView && (
        <img
          ref={imgRef}
          src={finalSrc}
          alt={alt}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ease-in",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            if (fallbackSrc && !hasError) {
              setHasError(true);
            } else {
              setIsLoaded(true);
            }
          }}
          {...rest}
        />
      )}
    </div>
  );
}
