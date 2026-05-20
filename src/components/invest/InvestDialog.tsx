import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { availableUnits, formatMoney, unitsForAmount, type InvestmentProperty } from "@/lib/invest";
import { PaymentMethodPicker, type PaymentMethod } from "@/components/payments/PaymentMethodPicker";
import { Loader2, Calendar, CreditCard, Layers, AlertCircle } from "lucide-react";
import { ManualPaymentModal } from "@/components/dashboard/ManualPaymentModal";
import { SignaturePad } from "@/components/invest/SignaturePad";
import { cn } from "@/lib/utils";

type InvestMode = "full" | "installment";
type Step = "amount" | "mode" | "installment_config" | "signature" | "payment_method" | "submitting" | "success";

export function InvestDialog({
  open, onClose, property, initialAmount,
}: {
  open: boolean;
  onClose: () => void;
  property: InvestmentProperty & { installment_available?: boolean; min_down_payment_pct?: number; max_installment_months?: number };
  initialAmount: number;
}) {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>("amount");
  const [method, setMethod] = useState<PaymentMethod>("digital_currency");
  const [cryptoOpen, setCryptoOpen] = useState(false);
  const [createdInvestmentId, setCreatedInvestmentId] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Installment config
  const [investMode, setInvestMode] = useState<InvestMode>("full");
  const [downPaymentPct, setDownPaymentPct] = useState(property.min_down_payment_pct ?? 20);
  const [durationMonths, setDurationMonths] = useState(12);

  const installmentEnabled = !!(property as any).installment_available;
  const minDownPct = Number((property as any).min_down_payment_pct ?? 20);
  const maxMonths = Number((property as any).max_installment_months ?? 24);

  const minUnits = 1;
  const avail = availableUnits(property);

  const [units, setUnits] = useState<number>(() => {
    const initialUnits = Math.max(1, Math.floor(initialAmount / Number(property.unit_price)));
    return Math.max(minUnits, Math.min(avail, initialUnits));
  });

  const totalAmount = units * Number(property.unit_price);
  const canProceed = units >= minUnits && units <= avail;

  // Installment calculations
  const downPaymentAmount = Math.round((totalAmount * downPaymentPct) / 100);
  const remainingBalance = totalAmount - downPaymentAmount;
  const monthlyInstallment = durationMonths > 0 ? Math.round((remainingBalance / durationMonths) * 100) / 100 : 0;

  // Duration options
  const durationOptions = [3, 6, 9, 12, 18, 24].filter(m => m <= maxMonths);

  useEffect(() => {
    if (open) {
      setStep("amount");
      const initialUnits = Math.max(1, Math.floor(initialAmount / Number(property.unit_price)));
      setUnits(Math.max(minUnits, Math.min(avail, initialUnits)));
      setInvestMode("full");
      setDownPaymentPct(minDownPct);
      setDurationMonths(12);
      setCreatedInvestmentId(null);
    }
  }, [open, initialAmount, minDownPct, minUnits, avail, property.unit_price]);

  const { data: balance = 0 } = useQuery({
    queryKey: ["user-balance"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("user_available_balance");
      if (error) throw error;
      return Number(data || 0);
    },
    enabled: open,
  });

  async function confirm() {
    setStep("submitting");
    try {
      const body: Record<string, any> = {
        property_id: property.id,
        amount: investMode === "installment" ? downPaymentAmount : totalAmount,
        units,
        provider: "paystack",
        investment_type: investMode,
      };

      if (investMode === "installment") {
        body.total_amount = totalAmount;
        body.down_payment_amount = downPaymentAmount;
        body.duration_months = durationMonths;
        body.monthly_installment_amount = monthlyInstallment;
      }
      
      // Pass signature
      if (signatureData) {
        body.signature_data = signatureData;
      }

      // Use direct fetch instead of supabase.functions.invoke to properly extract error details
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error("You must be logged in to invest. Please sign in and try again.");
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/create-investment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json().catch(() => ({ error: "Unknown error" }));

      if (!response.ok) {
        const detail = result?.error || `Server returned ${response.status}`;
        throw new Error(detail);
      }

      if (result?.error) {
        throw new Error(result.error);
      }
      
      if (result?.investment_id) {
        setCreatedInvestmentId(result.investment_id);
      }
      
      toast({
        title: "Investment Reserved",
        description: "Please complete your payment to activate this investment.",
      });
      // Launch payment modal directly
      setCryptoOpen(true);
      setStep("amount"); // Reset the background step
    } catch (e: any) {
      console.error("Investment submission error:", e);
      toast({ title: "Could not submit request", description: e.message ?? "Please try again", variant: "destructive" });
      setStep("amount");
    }
  }

  function handleNext() {
    if (step === "amount") {
      if (installmentEnabled) {
        setStep("mode");
      } else {
        setStep("payment_method");
      }
    } else if (step === "mode") {
      if (investMode === "installment") {
        setStep("installment_config");
      } else {
        setStep("signature");
      }
    } else if (step === "installment_config") {
      setStep("signature");
    } else if (step === "signature") {
      setStep("payment_method");
    } else if (step === "payment_method") {
      confirm();
    }
  }

  function handleBack() {
    if (step === "payment_method") {
      setStep("signature");
    } else if (step === "signature") {
      if (investMode === "installment") {
        setStep("installment_config");
      } else if (installmentEnabled) {
        setStep("mode");
      } else {
        setStep("amount");
      }
    } else if (step === "installment_config") {
      setStep("mode");
    } else if (step === "mode") {
      setStep("amount");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="bg-primary pb-6">
          <DialogTitle className="font-serif text-2xl text-white">Invest in {property.title}</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-6 py-6">
          {/* Step: Amount */}
          {step === "amount" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-1">
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Number of Units</Label>
                
                <div className="flex items-center justify-between p-2 rounded-xl bg-accent/50 border border-border/40">
                  <Button 
                    type="button"
                    variant="outline" 
                    size="icon" 
                    className="h-10 w-10 shrink-0 rounded-lg text-lg font-bold"
                    disabled={units <= minUnits}
                    onClick={() => setUnits(u => Math.max(minUnits, u - 1))}
                  >-</Button>
                  <div className="flex-1 text-center font-bold text-2xl px-4 select-none">
                    {units}
                  </div>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="icon" 
                    className="h-10 w-10 shrink-0 rounded-lg text-lg font-bold"
                    disabled={units >= avail}
                    onClick={() => setUnits(u => Math.min(avail, u + 1))}
                  >+</Button>
                </div>
                
                <div className="flex justify-between items-center text-[10px] text-muted-foreground ml-1 italic px-1">
                  <span>Minimum {minUnits} unit{minUnits > 1 ? 's' : ''}</span>
                  <span className={avail < 10 ? "text-amber-600 font-bold" : ""}>{avail} available</span>
                </div>
              </div>
              <div className="rounded-xl bg-accent/40 border border-border/40 p-6 shadow-inner space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Estimated ROI</span>
                  <span className="font-bold text-green-600 text-lg">
                    {formatMoney(totalAmount * (Number(property.expected_return_pct_min || 5) / 100), property.currency)} / yr
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Total Investment Amount</span>
                  <span className="font-serif font-semibold text-primary text-2xl tracking-tight">{formatMoney(totalAmount, property.currency)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step: Choose Mode */}
          {step === "mode" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-top-1">
              <div>
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Choose payment option</Label>
                <p className="text-[10px] text-muted-foreground ml-1 mt-1">Select how you'd like to pay for this investment.</p>
              </div>
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => setInvestMode("full")}
                  className={cn(
                    "flex items-start gap-4 rounded-xl border p-4 text-left transition-all",
                    investMode === "full"
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                      : "border-border hover:bg-accent/50"
                  )}
                >
                  <span className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                    investMode === "full" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  )}>
                    <CreditCard className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-sm">Full Payment</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Pay the full amount now and complete your investment immediately.</p>
                    <p className="text-sm font-bold text-primary mt-2">{formatMoney(totalAmount, property.currency)}</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setInvestMode("installment")}
                  className={cn(
                    "flex items-start gap-4 rounded-xl border p-4 text-left transition-all",
                    investMode === "installment"
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                      : "border-border hover:bg-accent/50"
                  )}
                >
                  <span className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                    investMode === "installment" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  )}>
                    <Layers className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-sm">Pay in Installments</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Pay an Initial Payment now, then monthly installments over time.</p>
                    <p className="text-sm font-bold text-primary mt-2">
                      From {formatMoney(Math.round(totalAmount * minDownPct / 100), property.currency)} Initial Payment
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step: Installment Configuration */}
          {step === "installment_config" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-1">
              <div>
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Configure your installment plan</Label>
              </div>

              {/* Down Payment */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Initial Payment ({downPaymentPct}%)</Label>
                  <span className="font-bold text-primary">{formatMoney(downPaymentAmount, property.currency)}</span>
                </div>
                <input
                  type="range"
                  min={minDownPct}
                  max={80}
                  step={5}
                  value={downPaymentPct}
                  onChange={(e) => setDownPaymentPct(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-secondary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Min {minDownPct}%</span>
                  <span>80%</span>
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-3">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Payment Duration</Label>
                <div className="grid grid-cols-3 gap-2">
                  {durationOptions.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDurationMonths(m)}
                      className={cn(
                        "rounded-xl border p-3 text-center transition-all",
                        durationMonths === m
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border hover:bg-accent/50"
                      )}
                    >
                      <p className="font-bold text-sm">{m}</p>
                      <p className="text-[10px] text-muted-foreground">months</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-xl bg-accent border border-border/50 p-5 shadow-inner space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Summary</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Total Investment</span>
                    <span className="font-semibold">{formatMoney(totalAmount, property.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Initial Payment ({downPaymentPct}%)</span>
                    <span className="font-semibold text-primary">{formatMoney(downPaymentAmount, property.currency)}</span>
                  </div>
                  <Separator className="bg-border/50" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Remaining Balance</span>
                    <span className="font-semibold">{formatMoney(remainingBalance, property.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Monthly Installment</span>
                    <span className="font-serif text-xl font-bold text-primary">{formatMoney(monthlyInstallment, property.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Duration</span>
                    <span>{durationMonths} months</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 p-3">
                <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Your first monthly payment of {formatMoney(monthlyInstallment, property.currency)} will be due 30 days after your initial payment is confirmed.
                </p>
              </div>
            </div>
          )}

          {/* Step: Signature */}
          {step === "signature" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-1">
              <SignaturePad 
                onSign={(data) => {
                  setSignatureData(data);
                  setStep("payment_method");
                }} 
                onCancel={handleBack} 
              />
            </div>
          )}

          {/* Step: Payment Method */}
          {step === "payment_method" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-1">
              <div>
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Select Payment Method</Label>
                <p className="text-[10px] text-muted-foreground ml-1 mt-1">Choose how you want to pay for this investment.</p>
              </div>
              <PaymentMethodPicker
                value={method}
                onChange={setMethod}
              />
            </div>
          )}


          {/* Step: Success */}
          {step === "success" && (
            <div className="flex flex-col items-center justify-center gap-6 py-12 animate-in fade-in zoom-in duration-500">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-primary animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-bold text-2xl text-foreground">Request Received</p>
                <p className="text-sm text-muted-foreground max-w-[240px]">
                  Your investment application for {property.title} has been submitted for admin review.
                </p>
              </div>
            </div>
          )}

          <p className="text-[10px] leading-relaxed text-muted-foreground text-center px-4 italic">
            Returns are projections and not guaranteed. By proceeding you acknowledge the risk disclosure.
          </p>
        </DialogBody>

        <DialogFooter className="bg-accent/20 pt-8 pb-8 px-10 border-t border-border/40">
          {step === "amount" && (
            <Button
              className="w-full h-14 bg-primary text-primary-foreground hover:opacity-90 rounded-xl font-bold shadow-sm transition-all active:scale-[0.98]"
              disabled={!canProceed}
              onClick={handleNext}
            >
              Confirm Amount
            </Button>
          )}
          {step === "mode" && (
            <div className="flex gap-4 w-full">
              <Button variant="outline" className="flex-1 h-14 rounded-xl font-bold border-border/60 hover:bg-accent/50" onClick={() => setStep("amount")}>Back</Button>
              <Button
                className="flex-[2] h-14 bg-primary text-primary-foreground hover:opacity-90 rounded-xl font-bold shadow-sm transition-all active:scale-[0.98]"
                onClick={handleNext}
              >
                Continue
              </Button>
            </div>
          )}
          {step === "installment_config" && (
            <div className="flex gap-4 w-full">
              <Button variant="outline" className="flex-1 h-14 rounded-xl font-bold border-border/60 hover:bg-accent/50" onClick={handleBack}>Back</Button>
              <Button
                className="flex-[2] h-14 bg-secondary text-secondary-foreground hover:opacity-90 rounded-xl font-bold shadow-sm transition-all active:scale-[0.98]"
                onClick={handleNext}
              >
                Sign Agreement
              </Button>
            </div>
          )}
          {step === "signature" && null /* Footer is handled inside SignaturePad */}
          {step === "payment_method" && (
            <div className="flex gap-4 w-full">
              <Button variant="outline" className="flex-1 h-14 rounded-xl font-bold border-border/60 hover:bg-accent/50" onClick={handleBack}>Back</Button>
              <Button
                className="flex-[2] h-14 bg-primary text-primary-foreground hover:opacity-90 rounded-xl font-bold shadow-sm transition-all active:scale-[0.98]"
                onClick={handleNext}
              >
                Confirm Investment
              </Button>
            </div>
          )}
          {step === "success" && (
            <Button
              className="w-full h-14 bg-primary text-primary-foreground hover:opacity-90 rounded-xl font-bold shadow-sm transition-all active:scale-[0.98]"
              onClick={onClose}
            >
              Go to Dashboard
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      <ManualPaymentModal
        open={cryptoOpen}
        method={method as any}
        onClose={() => {
          setCryptoOpen(false);
          onClose();
        }}
        amount={investMode === "installment" ? downPaymentAmount : totalAmount}
        currency={property.currency}
        paymentType="investment"
        targetId={createdInvestmentId || property.id}
        metadata={{
          units,
          investment_type: investMode,
          ...(investMode === "installment" && {
            total_amount: totalAmount,
            down_payment_amount: downPaymentAmount,
            duration_months: durationMonths,
            monthly_installment_amount: monthlyInstallment,
          }),
        }}
      />
    </Dialog>
  );
}