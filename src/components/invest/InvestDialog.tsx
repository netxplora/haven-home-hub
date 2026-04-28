import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { availableUnits, formatMoney, unitsForAmount, type InvestmentProperty } from "@/lib/invest";
import { PaymentMethodPicker, type PaymentMethod } from "@/components/payments/PaymentMethodPicker";
import { Loader2 } from "lucide-react";

export function InvestDialog({
  open, onClose, property, initialAmount,
}: {
  open: boolean;
  onClose: () => void;
  property: InvestmentProperty;
  initialAmount: number;
}) {
  const nav = useNavigate();
  const [step, setStep] = useState<"amount" | "method" | "submitting">("amount");
  const [amount, setAmount] = useState<string>(String(initialAmount));
  const [method, setMethod] = useState<PaymentMethod>("paystack");

  useEffect(() => { if (open) { setStep("amount"); setAmount(String(initialAmount)); } }, [open, initialAmount]);

  const avail = availableUnits(property);
  const units = useMemo(() => unitsForAmount(Number(amount || 0), Number(property.unit_price)), [amount, property.unit_price]);
  const minOk = Number(amount || 0) >= Number(property.min_investment);
  const unitsOk = units > 0 && units <= avail;
  const canProceed = minOk && unitsOk;

  async function confirm() {
    setStep("submitting");
    try {
      const { data, error } = await supabase.functions.invoke("create-investment", {
        body: {
          property_id: property.id,
          amount: Number(amount),
          units,
          provider: method,
        },
      });
      if (error) throw error;
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      if (data?.payment_id) {
        toast({ title: "Investment created", description: "Complete payment to finalize your allocation." });
        nav(`/payments/${data.payment_id}`);
        return;
      }
      throw new Error("Unexpected response");
    } catch (e: any) {
      toast({ title: "Could not start investment", description: e.message ?? "Please try again", variant: "destructive" });
      setStep("method");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Invest in {property.title}</DialogTitle>
        </DialogHeader>

        {step === "amount" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="amt2">Amount ({property.currency})</Label>
              <Input
                id="amt2" type="number" min={Number(property.min_investment)} step={Number(property.unit_price)}
                value={amount} onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Minimum {formatMoney(Number(property.min_investment), property.currency)} · Unit price {formatMoney(Number(property.unit_price), property.currency)}
              </p>
            </div>
            <div className="rounded-lg bg-secondary/60 p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Units</span><span className="font-medium">{units}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-medium">{formatMoney(Number(amount || 0), property.currency)}</span></div>
            </div>
            <Button className="w-full bg-gradient-gold text-[hsl(var(--gold-foreground))] hover:opacity-95" disabled={!canProceed} onClick={() => setStep("method")}>
              Continue to payment
            </Button>
          </div>
        )}

        {step === "method" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-secondary/60 p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{property.title}</span></div>
              <Separator className="my-2" />
              <div className="flex justify-between"><span className="text-muted-foreground">Units</span><span className="font-medium">{units}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-serif text-base font-semibold">{formatMoney(Number(amount), property.currency)}</span></div>
            </div>
            <PaymentMethodPicker value={method} onChange={setMethod} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("amount")}>Back</Button>
              <Button className="flex-1 bg-gradient-gold text-[hsl(var(--gold-foreground))] hover:opacity-95" onClick={confirm}>
                Confirm
              </Button>
            </div>
          </div>
        )}

        {step === "submitting" && (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Creating your investment…</p>
          </div>
        )}

        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Returns are projections and not guaranteed. By proceeding you acknowledge the risk disclosure.
        </p>
      </DialogContent>
    </Dialog>
  );
}