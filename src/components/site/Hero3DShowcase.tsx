import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, TrendingUp, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATS = [
  { icon: Building2,   value: "1,240+", label: "Verified Listings" },
  { icon: TrendingUp,  value: "12.4%",  label: "Avg. Target Yield" },
  { icon: ShieldCheck, value: "100%",   label: "Title Cleared" },
];

export function Hero3DShowcase() {
  const [visible, setVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const h = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  const handleScroll = useCallback(() => {
    if (prefersReducedMotion) return;
    setScrollY(window.scrollY);
  }, [prefersReducedMotion]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let fallbackId: ReturnType<typeof setTimeout>;
    let isRemoved = false;
    const startTime = performance.now();

    const removeSplash = () => {
      if (isRemoved) return;
      isRemoved = true;
      const splash = document.getElementById("app-splash");
      if (splash) {
        splash.style.pointerEvents = "none";
        splash.style.animation = "splashFadeOut 0.5s ease-out forwards";
        setTimeout(() => splash.remove(), 500);
      }
      // slight delay before starting inner animations
      setTimeout(() => setVisible(true), 100);
    };

    const handleReady = () => {
      const elapsed = performance.now() - startTime;
      const minWait = Math.max(0, 800 - elapsed);
      timeoutId = setTimeout(removeSplash, minWait);
    };

    const video = document.getElementById("hero-video") as HTMLVideoElement | null;
    
    if (video) {
      if (video.readyState >= 3) {
        handleReady();
      } else {
        video.addEventListener("canplay", handleReady, { once: true });
        // Also listen to error to not hang
        video.addEventListener("error", handleReady, { once: true });
      }
    } else {
      handleReady();
    }

    fallbackId = setTimeout(() => {
      removeSplash();
    }, 4500);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(fallbackId);
      if (video) {
        video.removeEventListener("canplay", handleReady);
        video.removeEventListener("error", handleReady);
      }
    };
  }, []);

  const bgY = prefersReducedMotion ? 0 : scrollY * 0.28;

  return (
    <section
      ref={heroRef}
      aria-label="Haven Home Hub — Premium Real Estate"
      className="relative overflow-hidden min-h-[88vh] sm:min-h-[90vh] flex flex-col items-center justify-center bg-[#0a0d0b] text-white"
    >
      {/* Background Image with gentle scroll parallax */}
      <div
        className="absolute inset-0 z-0 pointer-events-none will-change-transform"
        style={{ transform: `translate3d(0, ${bgY}px, 0) scale(1.08)` }}
      >
        <video
          id="hero-video"
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover object-center"
        >
          <source src="/images/hero/herovid.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Layered overlays */}
      <div className="absolute inset-0 z-10 bg-[#0a0d0b]/52 pointer-events-none" />
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#0a0d0b]/20 via-transparent to-[#0a0d0b]/85 pointer-events-none" />
      <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_80%_70%_at_50%_50%,transparent_50%,rgba(10,13,11,0.5)_100%)] pointer-events-none" />

      {/* Content */}
      <div className="relative z-20 w-full container-wide flex flex-col items-center text-center px-4 sm:px-6 pt-32 pb-28 sm:pt-36 sm:pb-32">

        {/* Eyebrow */}
        <div
          className="flex items-center gap-3 mb-7 sm:mb-9 transition-all duration-700 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(12px)",
            transitionDelay: "0ms",
          }}
        >
          <span className="block w-8 h-px bg-white/30" />
          <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-white/55 select-none">
            Premium Real Estate &amp; Investment Platform
          </span>
          <span className="block w-8 h-px bg-white/30" />
        </div>

        {/* Headline */}
        <h1
          className="font-serif text-[2.6rem] sm:text-5xl md:text-6xl lg:text-[68px] xl:text-[76px] font-semibold leading-[1.07] tracking-tight text-white max-w-4xl transition-all duration-700 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(18px)",
            transitionDelay: "110ms",
          }}
        >
          Find a Home You&apos;ll{" "}
          <em className="not-italic font-light text-white/80">Love Coming Back To</em>
        </h1>

        {/* Subheadline */}
        <p
          className="mt-6 sm:mt-7 text-base sm:text-lg text-white/60 font-normal leading-relaxed max-w-xl transition-all duration-700 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(16px)",
            transitionDelay: "210ms",
          }}
        >
          Curated homes, verified land, and fractional property investments — managed by trusted agents.
        </p>

        {/* CTAs */}
        <div
          className="mt-10 sm:mt-11 flex flex-col sm:flex-row items-center gap-3 transition-all duration-700 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(14px)",
            transitionDelay: "320ms",
          }}
        >
          <Button
            asChild
            size="lg"
            className="h-12 px-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm shadow-emerald transition-all"
          >
            <Link to="/properties" className="flex items-center gap-2">
              Browse Properties
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            asChild
            size="lg"
            className="h-12 px-9 rounded-xl bg-transparent text-white border border-white/25 hover:bg-white/10 hover:border-white/40 font-medium text-sm transition-all"
          >
            <Link to="/invest">Explore Investments</Link>
          </Button>
        </div>

        {/* Stats strip */}
        <div
          className="mt-20 sm:mt-24 w-full max-w-lg mx-auto transition-all duration-700 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(10px)",
            transitionDelay: "430ms",
          }}
        >
          <div className="grid grid-cols-3 divide-x divide-white/[0.08] rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md overflow-hidden">
            {STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center justify-center py-5 px-3 gap-1.5">
                <Icon className="h-4 w-4 text-primary/70 mb-0.5" strokeWidth={1.5} />
                <p className="font-serif text-xl sm:text-2xl font-semibold text-white">{value}</p>
                <p className="text-[9px] sm:text-[10px] font-semibold tracking-widest uppercase text-white/40 text-center leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll line indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center transition-all duration-700 ease-out"
        style={{ opacity: visible ? 0.5 : 0, transitionDelay: "600ms" }}
        aria-hidden="true"
      >
        <div className="w-px h-12 overflow-hidden">
          <div
            className="w-full h-full bg-gradient-to-b from-transparent via-white to-transparent"
            style={{ animation: prefersReducedMotion ? "none" : "scrollLine 2s ease-in-out infinite" }}
          />
        </div>
      </div>

      <style>{`
        @keyframes scrollLine {
          0%   { transform: translateY(-100%); opacity: 0; }
          30%  { opacity: 1; }
          70%  { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
      `}</style>
    </section>
  );
}
