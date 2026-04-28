import { Link } from "react-router-dom";
import { MapPin, TrendingUp } from "lucide-react";
import { resolveImage } from "@/lib/format";
import { formatMoney, fundingPercent, type InvestmentProperty } from "@/lib/invest";

export function InvestmentCard({ p }: { p: InvestmentProperty }) {
  const pct = fundingPercent(p);
  return (
    <Link
      to={`/invest/${p.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:shadow-lux"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={resolveImage(p.cover_image_url)}
          alt={p.title}
          loading="lazy"
          width={1280}
          height={960}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground backdrop-blur">
          <TrendingUp className="h-3 w-3 text-[hsl(var(--gold))]" />
          {p.projected_return_min}–{p.projected_return_max}% p.a. projected
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3 className="font-serif text-xl font-semibold leading-tight">{p.title}</h3>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {p.location}
          </p>
        </div>
        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Funded</span>
            <span className="font-medium">{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-gold"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-muted-foreground">Min. investment</span>
            <span className="font-serif text-base font-semibold text-foreground">
              {formatMoney(Number(p.min_investment), p.currency)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}