import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/invest";
import { Loader2, Tag, Layers, Wallet, Info, CheckCircle2, FileText } from "lucide-react";

interface SellUnitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment: any;
}

export function SellUnitsDialog({ open, onOpenChange, investment }: SellUnitsDialogProps) {
  const qc = useQueryClient();
  const [unitsToSell, setUnitsToSell] = useState<number>(1);
  const [pricePerUnit, setPricePerUnit] = useState<string>("");
  const [listingNotes, setListingNotes] = useState<string>("");
  const [agreeToTerms, setAgreeToTerms] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);

  if (!investment) return null;

  const unitsOwned = Number(investment.units_owned ?? investment.units ?? 0);
  const currency = investment.investment_properties?.currency ?? "USD";
  const propertyTitle = investment.investment_properties?.title ?? "Property";
  const originalUnitPrice = Number(investment.amount_invested ?? 0) / Math.max(unitsOwned, 1);

  const parsedPrice = parseFloat(pricePerUnit);
  const validPrice = !isNaN(parsedPrice) && parsedPrice > 0;
  const validUnits = unitsToSell >= 1 && unitsToSell <= unitsOwned && Number.isInteger(unitsToSell);
  const totalListingValue = validPrice && validUnits ? unitsToSell * parsedPrice : 0;
  const canSubmit = validPrice && validUnits && agreeToTerms && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      const { data, error } = await (supabase.rpc as any)("create_secondary_market_listing", {
        p_investment_id: investment.id,
        p_units_to_sell: unitsToSell,
        p_price_per_unit: parsedPrice,
      });

      if (error) throw error;

      toast({
        title: "Listing Created",
        description: `${unitsToSell} unit${unitsToSell > 1 ? "s" : ""} of "${propertyTitle}" listed at ${formatMoney(parsedPrice, currency)} per unit.`,
      });

      qc.invalidateQueries({ queryKey: ["my-investments"] });
      qc.invalidateQueries({ queryKey: ["my-secondary-listings"] });
      onOpenChange(false);
      setUnitsToSell(1);
      setPricePerUnit("");
      setListingNotes("");
      setAgreeToTerms(false);
    } catch (err: any) {
      console.error("Listing error:", err);
      toast({
        title: "Listing Failed",
        description: err.message || "Could not create the listing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border border-border bg-background shadow-lux">
        <DialogHeader className="p-6 border-b border-border/40 shrink-0">
          <DialogTitle className="font-serif text-xl font-semibold">List Units for Sale</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Set the number of units and your asking price to list on the secondary marketplace.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="py-4 space-y-6">
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" /> 1. Unit Information
            </h4>
            
            <div className="flex items-center gap-3 rounded-xl border border-border bg-accent/20 p-4">
              <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0">
                <img
                  src={investment.investment_properties?.cover_image_url || "/placeholder.svg"}
                  className="h-full w-full object-cover"
                  alt={propertyTitle}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-foreground line-clamp-1">{propertyTitle}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {unitsOwned} unit{unitsOwned !== 1 ? "s" : ""} owned · Avg. cost {formatMoney(originalUnitPrice, currency)}/unit
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sell-units" className="text-xs font-semibold text-foreground">
                Units to Sell
              </Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-xl shrink-0"
                  disabled={unitsToSell <= 1}
                  onClick={() => setUnitsToSell(Math.max(1, unitsToSell - 1))}
                >
                  −
                </Button>
                <Input
                  id="sell-units"
                  type="number"
                  min={1}
                  max={unitsOwned}
                  value={unitsToSell}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (isNaN(val)) setUnitsToSell(1);
                    else if (val > unitsOwned) setUnitsToSell(unitsOwned);
                    else setUnitsToSell(Math.max(1, val));
                  }}
                  className="h-11 flex-1 rounded-xl border-border bg-accent/30 text-center font-bold text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-xl shrink-0"
                  disabled={unitsToSell >= unitsOwned}
                  onClick={() => setUnitsToSell(Math.min(unitsOwned, unitsToSell + 1))}
                >
                  +
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-right">Max: {unitsOwned} unit{unitsOwned !== 1 ? "s" : ""}</p>
            </div>
          </div>

          <Separator className="border-border/40" />

          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" /> 2. Pricing & Valuation
            </h4>

            <div className="space-y-2">
              <Label htmlFor="sell-price" className="text-xs font-semibold text-foreground">
                Price per Unit ({currency})
              </Label>
              <Input
                id="sell-price"
                type="number"
                min={0.01}
                step="0.01"
                placeholder={`e.g. ${Math.round(originalUnitPrice)}`}
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                className="h-11 rounded-xl border-border bg-accent/30 font-bold text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {validPrice && parsedPrice < originalUnitPrice && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700 leading-tight">
                    This price is below your average purchase cost of {formatMoney(originalUnitPrice, currency)}/unit.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-primary" /> Total listing value
              </span>
              <span className="font-serif font-bold text-lg text-primary">
                {totalListingValue > 0 ? formatMoney(totalListingValue, currency) : "—"}
              </span>
            </div>
          </div>

          <Separator className="border-border/40" />

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> 3. Ownership Details
            </h4>
            
            <div className="rounded-xl border border-border bg-accent/10 p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Currently Owned</span>
                <span className="font-semibold text-foreground">{unitsOwned} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Units to List</span>
                <span className="font-semibold text-foreground">{validUnits ? unitsToSell : 0} units</span>
              </div>
              <Separator className="bg-border/55 my-1" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining Units</span>
                <span className="font-bold text-foreground">
                  {validUnits ? unitsOwned - unitsToSell : unitsOwned} units
                </span>
              </div>
            </div>
          </div>

          <Separator className="border-border/40" />

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> 4. Payment Preferences
            </h4>
            
            <div className="rounded-xl border border-border bg-accent/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Platform Wallet Balance</p>
                    <p className="text-[10px] text-muted-foreground">Proceeds automatically added to balance</p>
                  </div>
                </div>
                <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                  <span className="block h-1.5 w-1.5 rounded-full bg-white" />
                </div>
              </div>
            </div>
          </div>

          <Separator className="border-border/40" />

          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> 5. Additional Notes & Terms
            </h4>

            <div className="space-y-2">
              <Label htmlFor="listing-notes" className="text-xs font-semibold text-foreground">
                Additional Notes (Optional)
              </Label>
              <Textarea
                id="listing-notes"
                placeholder="Include details about this listing for prospective buyers..."
                value={listingNotes}
                onChange={(e) => setListingNotes(e.target.value)}
                className="min-h-[70px] rounded-xl border-border bg-accent/30 text-xs"
                maxLength={250}
              />
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-border bg-accent/15 p-3.5">
              <Checkbox
                id="listing-terms"
                checked={agreeToTerms}
                onCheckedChange={(checked) => setAgreeToTerms(!!checked)}
                className="mt-0.5 rounded border-border"
              />
              <label htmlFor="listing-terms" className="text-[10px] text-muted-foreground leading-normal cursor-pointer select-none">
                I agree to list these units on the secondary marketplace under the platform's trading regulations. I verify that I own these units free of any liens.
              </label>
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="p-6 border-t border-border/40 bg-accent/20 shrink-0 flex flex-col sm:flex-col gap-2">
          <Button
            className="w-full h-12 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating Listing...
              </>
            ) : (
              "List Units for Sale"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full h-10 text-sm rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
