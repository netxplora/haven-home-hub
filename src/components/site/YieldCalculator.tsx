import { useState, useMemo } from "react";
import { formatMoney } from "@/lib/invest";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface YieldCalculatorProps {
  unitPrice: number;
  currency: string;
  expectedYield?: number; // Annual rental yield percentage
  appreciation?: number; // Annual appreciation percentage
}

export function YieldCalculator({ unitPrice, currency, expectedYield = 5.5, appreciation = 4.0 }: YieldCalculatorProps) {
  const [units, setUnits] = useState(10);
  const [years, setYears] = useState(5);

  const initialInvestment = unitPrice * units;

  const chartData = useMemo(() => {
    const data = [];
    let currentAssetValue = initialInvestment;
    let totalDividends = 0;

    for (let i = 0; i <= 10; i++) {
      if (i > 0) {
        const yearDividend = currentAssetValue * (expectedYield / 100);
        totalDividends += yearDividend;
        currentAssetValue *= (1 + appreciation / 100);
      }
      
      data.push({
        year: `Year ${i}`,
        Principal: initialInvestment,
        Dividends: totalDividends,
        Appreciation: currentAssetValue - initialInvestment,
        Total: currentAssetValue + totalDividends
      });
    }
    return data;
  }, [initialInvestment, expectedYield, appreciation]);

  const projectedData = chartData[years];

  return (
    <div className="bg-card border rounded-xl p-6 shadow-soft">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-serif text-xl font-bold">Investment Projection</h3>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Expected ROI Calculator</p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_1.5fr]">
        {/* Controls */}
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Number of Units</Label>
              <span className="font-bold">{units}</span>
            </div>
            <Slider 
              value={[units]} 
              min={1} 
              max={100} 
              step={1} 
              onValueChange={([val]) => setUnits(val)} 
              className="py-1"
            />
            <p className="text-right text-[10px] text-primary font-bold">
              Initial: {formatMoney(initialInvestment, currency)}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Holding Period</Label>
              <span className="font-bold">{years} Years</span>
            </div>
            <Slider 
              value={[years]} 
              min={1} 
              max={10} 
              step={1} 
              onValueChange={([val]) => setYears(val)} 
              className="py-1"
            />
          </div>

          <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Expected Yield</span>
              <span className="font-bold text-secondary">{expectedYield.toFixed(1)}% / yr</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Est. Appreciation</span>
              <span className="font-bold text-secondary">{appreciation.toFixed(1)}% / yr</span>
            </div>
          </div>
        </div>

        {/* Results & Chart */}
        <div className="flex flex-col">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Projected Value</p>
              <p className="text-2xl font-serif font-bold text-foreground">
                {formatMoney(projectedData.Total, currency)}
              </p>
              <p className="text-xs text-primary font-bold mt-1">
                +{(((projectedData.Total - initialInvestment) / initialInvestment) * 100).toFixed(1)}% Total Return
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Total Dividends</p>
              <p className="text-2xl font-serif font-bold text-foreground">
                {formatMoney(projectedData.Dividends, currency)}
              </p>
              <p className="text-xs text-secondary font-bold mt-1">Passive Income</p>
            </div>
          </div>

          <div className="flex-1 min-h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.slice(0, years + 1)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="year" fontSize={10} fontWeight="600" tickLine={false} axisLine={false} tick={{fill: 'hsl(var(--muted-foreground))'}} dy={10} />
                <YAxis fontSize={10} fontWeight="600" tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} tick={{fill: 'hsl(var(--muted-foreground))'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'hsl(var(--card))', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  formatter={(value: number) => formatMoney(value, currency)}
                />
                <Area type="monotone" dataKey="Total" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
