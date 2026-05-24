import { memo } from "react";
import { Link } from "react-router-dom";
import { Layers, MapPin, TrendingUp, ArrowUpRight } from "lucide-react";
import { resolveImage } from "@/lib/format";
import { formatMoney, fundingPercent, type InvestmentProperty } from "@/lib/invest";

export const InvestmentCard = memo(function InvestmentCard({ p }: { p: InvestmentProperty }) {
  const pct = fundingPercent(p);
  const hasInstallment = !!p.installment_available;
  const minDownPct = Number(p.min_down_payment_pct ?? 20);
  const estMonthly = hasInstallment
    ? Math.round((Number(p.min_investment) * (1 - minDownPct / 100)) / 12)
    : 0;

  return (
    <Link
      to={`/invest/${p.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/40 bg-card shadow-soft transition-all duration-550 ease-out hover:shadow-card hover:border-primary/30 hover:-translate-y-1.5"
    >
      {/* Image with Gradient & Overlay */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={resolveImage(p.cover_image_url)}
          alt={p.title}
          loading="lazy"
          width={1280}
          height={960}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-550" />
        
        {/* Elite Glassmorphic Return badge */}
        <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-xl bg-background/80 backdrop-blur-md border border-white/20 px-3 py-1.7 text-xs font-semibold text-foreground shadow-sm">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <span>{p.projected_return_min}–{p.projected_return_max}% p.a.</span>
        </div>

        {hasInstallment && (
          <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-xl bg-primary/90 backdrop-blur-sm border border-primary-foreground/10 px-3 py-1.7 text-xs font-semibold text-primary-foreground shadow-sm">
            <Layers className="h-3.5 w-3.5" />
            <span>Installments</span>
          </div>
        )}

        {/* Dynamic Detail Overlay Button */}
        <div className="absolute bottom-4 right-4 translate-y-8 opacity-0 scale-90 group-hover:translate-y-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-400 ease-out z-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-primary shadow-lg border border-primary/10">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Content Area with Premium Typography */}
      <div className="flex flex-1 flex-col justify-between gap-4 p-5 sm:p-6 bg-gradient-to-b from-card to-background/50">
        <div className="space-y-2">
          <h3 className="font-serif text-base sm:text-lg font-bold leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-300">
            {p.title}
          </h3>
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <MapPin className="h-3.5 w-3.5 text-primary/60 shrink-0" /> 
            <span className="truncate">
              {p.city && p.country 
                ? `${p.city}, ${p.country}`
                : p.location}
            </span>
          </p>
        </div>

        {/* Progress and Pricing Layout */}
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Funded</span>
              <span className="text-primary font-mono">{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-accent/60 p-[1.5px] border border-border/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-1000 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border/30">
            <div className="space-y-0.5">
              <span className="block text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Min. Investment</span>
              <span className="block font-serif text-base font-bold text-foreground">
                {formatMoney(Number(p.min_investment), p.currency)}
              </span>
            </div>
            {hasInstallment && estMonthly > 0 && (
              <div className="text-right space-y-0.5">
                <span className="block text-[10px] text-primary uppercase tracking-wider font-bold">Installment Plan</span>
                <span className="block text-xs font-bold text-primary/95">
                  from {formatMoney(estMonthly, p.currency)}/mo
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
});