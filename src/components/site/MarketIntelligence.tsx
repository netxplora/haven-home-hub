import React, { useState } from "react";
import { TrendingUp, Activity, BarChart3, MapPin, Building2, Percent } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LocationStats {
  area: string;
  avgRent: string;
  appreciation: string;
  occupancy: string;
  shortletYield: string;
  hotspotScore: string;
  trend: "up" | "stable";
}

const US_MARKET_DATA: LocationStats[] = [
  {
    area: "Austin, TX",
    avgRent: "$42,000 / yr",
    appreciation: "+8.4% / yr",
    occupancy: "94%",
    shortletYield: "7.2% ROI",
    hotspotScore: "9.4/10",
    trend: "up"
  },
  {
    area: "Miami, FL",
    avgRent: "$54,000 / yr",
    appreciation: "+10.1% / yr",
    occupancy: "91%",
    shortletYield: "8.5% ROI",
    hotspotScore: "9.1/10",
    trend: "up"
  },
  {
    area: "Brooklyn, NY",
    avgRent: "$48,000 / yr",
    appreciation: "+6.8% / yr",
    occupancy: "96%",
    shortletYield: "5.9% ROI",
    hotspotScore: "8.9/10",
    trend: "stable"
  },
  {
    area: "Seattle, WA",
    avgRent: "$39,600 / yr",
    appreciation: "+7.5% / yr",
    occupancy: "93%",
    shortletYield: "6.4% ROI",
    hotspotScore: "9.2/10",
    trend: "up"
  },
  {
    area: "Denver, CO",
    avgRent: "$36,000 / yr",
    appreciation: "+9.2% / yr",
    occupancy: "92%",
    shortletYield: "7.8% ROI",
    hotspotScore: "9.3/10",
    trend: "up"
  },
  {
    area: "Nashville, TN",
    avgRent: "$33,600 / yr",
    appreciation: "+11.3% / yr",
    occupancy: "89%",
    shortletYield: "8.1% ROI",
    hotspotScore: "8.7/10",
    trend: "up"
  }
];

export function MarketIntelligence() {
  const [selectedArea, setSelectedArea] = useState<string>(US_MARKET_DATA[0].area);
  const activeData = US_MARKET_DATA.find((d) => d.area === selectedArea) || US_MARKET_DATA[0];

  return (
    <div className="w-full bg-card border border-border/50 rounded-2xl p-6 md:p-8 shadow-sm">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h3 className="font-serif text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Live Market Intelligence
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time transaction benchmarks and appreciation logs for premium U.S. residential zones.
          </p>
        </div>

        {/* Location selector pills */}
        <div className="flex flex-wrap gap-2 max-w-full overflow-x-auto no-scrollbar py-1">
          {US_MARKET_DATA.map((data) => (
            <button
              key={data.area}
              onClick={() => setSelectedArea(data.area)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium whitespace-nowrap ${
                selectedArea === data.area
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-border hover:border-primary/30"
              }`}
            >
              {data.area}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {/* Metric Card 1 */}
        <div className="bg-secondary/10 border border-border/40 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5 mb-2">
              <Building2 className="h-3.5 w-3.5 text-primary/60" /> Avg Rental Value
            </span>
            <p className="text-lg md:text-xl font-bold text-foreground font-mono">{activeData.avgRent}</p>
          </div>
          <Badge className="w-fit mt-3 bg-green-500/10 text-green-600 border-none hover:bg-green-500/15">
            Verified Rate
          </Badge>
        </div>

        {/* Metric Card 2 */}
        <div className="bg-secondary/10 border border-border/40 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-primary/60" /> Home Appreciation
            </span>
            <p className="text-lg md:text-xl font-bold text-foreground font-mono">{activeData.appreciation}</p>
          </div>
          <span className="text-[10px] text-green-600 font-semibold mt-3 flex items-center gap-1">
            ↑ Consistent growth
          </span>
        </div>

        {/* Metric Card 3 */}
        <div className="bg-secondary/10 border border-border/40 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5 mb-2">
              <Percent className="h-3.5 w-3.5 text-primary/60" /> Avg Occupancy
            </span>
            <p className="text-lg md:text-xl font-bold text-foreground font-mono">{activeData.occupancy}</p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">Based on last 180 days</p>
        </div>

        {/* Metric Card 4 */}
        <div className="bg-secondary/10 border border-border/40 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5 mb-2">
              <BarChart3 className="h-3.5 w-3.5 text-primary/60" /> Short-term Yield
            </span>
            <p className="text-lg md:text-xl font-bold text-foreground font-mono">{activeData.shortletYield}</p>
          </div>
          <span className="text-[10px] text-primary font-semibold mt-3">
            Demand Index: {activeData.hotspotScore}
          </span>
        </div>
      </div>
    </div>
  );
}
