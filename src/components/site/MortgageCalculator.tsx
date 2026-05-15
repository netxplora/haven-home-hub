import { useState, useMemo } from "react";
import { formatMoney } from "@/lib/invest";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Calculator, PieChart as PieChartIcon } from "lucide-react";

interface MortgageCalculatorProps {
  price: number;
  currency: string;
}

export function MortgageCalculator({ price, currency }: MortgageCalculatorProps) {
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [interestRate, setInterestRate] = useState(5.5);
  const [loanTerm, setLoanTerm] = useState(30);

  const breakdown = useMemo(() => {
    const downPayment = price * (downPaymentPercent / 100);
    const principal = price - downPayment;
    const monthlyRate = (interestRate / 100) / 12;
    const numberOfPayments = loanTerm * 12;

    let monthlyPrincipalAndInterest = 0;
    if (monthlyRate > 0) {
      monthlyPrincipalAndInterest =
        principal *
        (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
        (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    } else {
      monthlyPrincipalAndInterest = principal / numberOfPayments;
    }

    // Rough estimates for taxes and insurance
    const propertyTax = (price * 0.012) / 12; // 1.2% annual
    const homeInsurance = (price * 0.005) / 12; // 0.5% annual
    
    const total = monthlyPrincipalAndInterest + propertyTax + homeInsurance;

    return {
      downPayment,
      principal,
      monthlyPrincipalAndInterest,
      propertyTax,
      homeInsurance,
      total,
    };
  }, [price, downPaymentPercent, interestRate, loanTerm]);

  return (
    <div className="bg-card border rounded-xl p-6 shadow-soft">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Calculator className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-serif text-xl font-bold">Mortgage Calculator</h3>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Controls */}
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Down Payment ({downPaymentPercent}%)</Label>
              <span className="font-bold">{formatMoney(breakdown.downPayment, currency)}</span>
            </div>
            <Slider 
              value={[downPaymentPercent]} 
              min={0} 
              max={100} 
              step={1} 
              onValueChange={([val]) => setDownPaymentPercent(val)} 
              className="py-1"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Interest Rate</Label>
              <span className="font-bold">{interestRate}%</span>
            </div>
            <Slider 
              value={[interestRate]} 
              min={0} 
              max={15} 
              step={0.1} 
              onValueChange={([val]) => setInterestRate(val)} 
              className="py-1"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Loan Term</Label>
              <span className="font-bold">{loanTerm} Years</span>
            </div>
            <Slider 
              value={[loanTerm]} 
              min={5} 
              max={30} 
              step={5} 
              onValueChange={([val]) => setLoanTerm(val)} 
              className="py-1"
            />
          </div>
        </div>

        {/* Results */}
        <div className="bg-muted/50 rounded-xl p-6 flex flex-col justify-center">
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground font-medium mb-1">Estimated Monthly Payment</p>
            <p className="text-4xl font-serif font-bold text-primary">{formatMoney(breakdown.total, currency)}</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-muted-foreground">Principal & Interest</span>
              </div>
              <span className="font-bold">{formatMoney(breakdown.monthlyPrincipalAndInterest, currency)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-secondary" />
                <span className="text-muted-foreground">Property Taxes</span>
              </div>
              <span className="font-bold">{formatMoney(breakdown.propertyTax, currency)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="text-muted-foreground">Home Insurance</span>
              </div>
              <span className="font-bold">{formatMoney(breakdown.homeInsurance, currency)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
