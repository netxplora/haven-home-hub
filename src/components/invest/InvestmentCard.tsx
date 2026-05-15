import { memo } from "react";
import { Link } from "react-router-dom";
import { Layers, MapPin, TrendingUp } from "lucide-react";
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
      className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-soft transition-all duration-300 hover:shadow-card hover:border-border"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={resolveImage(p.cover_image_url)}
          alt={p.title}
          loading="lazy"
          width={1280}
          height={960}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Return badge */}
        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm">
          <TrendingUp className="h-3 w-3 text-primary" />
          {p.projected_return_min}–{p.projected_return_max}% p.a.
        </div>
        {hasInstallment && (
          <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground shadow-sm">
            <Layers className="h-3 w-3" />
            Installments
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3 className="font-serif text-lg font-semibold leading-snug text-foreground">{p.title}</h3>
          <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> 
            {p.city && p.country 
              ? `${p.city}, ${p.country}`
              : p.location}
          </p>
        </div>

        {/* Progress and Pricing */}
        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Funded</span>
            <span className="font-medium text-foreground">{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">Min. investment</span>
            <span className="font-serif text-base font-semibold text-foreground">
              {formatMoney(Number(p.min_investment), p.currency)}
            </span>
          </div>
          {hasInstallment && estMonthly > 0 && (
            <p className="text-xs text-primary font-medium">
              or from {formatMoney(estMonthly, p.currency)}/mo
            </p>
          )}
        </div>
      </div>
    </Link>
  );
});