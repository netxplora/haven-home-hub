import { useState } from "react";
import { Calculator, TrendingUp } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { formatMoney } from "@/lib/invest";

interface InvestmentCalculatorProps {
  minInvestment: number;
  maxInvestment: number;
  projectedReturnMin: number;
  projectedReturnMax: number;
  currency: string;
}

export function InvestmentCalculator({
  minInvestment,
  maxInvestment,
  projectedReturnMin,
  projectedReturnMax,
  currency,
}: InvestmentCalculatorProps) {
  // Determine a reasonable default step and max
  const step = Math.max(100, Math.floor(minInvestment / 10));
  const calcMax = Math.max(minInvestment * 10, maxInvestment > 0 ? maxInvestment : minInvestment * 20);
  
  const [amount, setAmount] = useState<number[]>([minInvestment * 2]);

  const currentAmount = amount[0];
  
  // Calculate projections (annualized)
  const minAnnual = currentAmount * (projectedReturnMin / 100);
  const maxAnnual = currentAmount * (projectedReturnMax / 100);

  // Calculate 5-year projection (compounded simply for illustration)
  const avgReturn = (projectedReturnMin + projectedReturnMax) / 2;
  const fiveYearValue = currentAmount * Math.pow(1 + avgReturn / 100, 5);

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Calculator className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-serif text-xl font-bold text-foreground">Investment Calculator</h2>
          <p className="text-sm text-muted-foreground">Project your potential returns</p>
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Investment Amount</span>
            <span className="text-2xl font-serif font-bold text-primary">{formatMoney(currentAmount, currency)}</span>
          </div>
          <Slider
            value={amount}
            onValueChange={setAmount}
            max={calcMax}
            min={minInvestment}
            step={step}
            className="my-6"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>{formatMoney(minInvestment, currency)}</span>
            <span>{formatMoney(calcMax, currency)}</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 pt-6 border-t border-border/50">
          <div className="rounded-xl bg-secondary/10 p-5 border border-secondary/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Est. Annual Return</p>
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatMoney(minAnnual, currency)} – {formatMoney(maxAnnual, currency)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">Based on {projectedReturnMin}% - {projectedReturnMax}% target</p>
          </div>
          
          <div className="rounded-xl bg-primary/5 p-5 border border-primary/10 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="h-24 w-24 text-primary" />
            </div>
            <div className="relative z-10">
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Projected 5-Year Value</p>
              <p className="text-2xl font-serif font-bold text-primary">
                {formatMoney(fiveYearValue, currency)}
              </p>
              <p className="text-[10px] text-primary/70 mt-1 font-medium">Assumes {avgReturn.toFixed(1)}% average annual compounding</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
