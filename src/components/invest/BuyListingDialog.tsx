import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/invest";
import { Loader2, Wallet, ShieldCheck, ArrowRight } from "lucide-react";

interface SecondaryListing {
  id: string;
  seller_id: string;
  property_id: string;
  units_to_sell: number;
  price_per_unit: number;
  status: string;
  created_at: string;
  seller_profile?: { full_name: string | null } | null;
}

interface BuyListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: SecondaryListing | null;
  propertyTitle: string;
  currency: string;
  walletBalance: number;
}

export function BuyListingDialog({
  open,
  onOpenChange,
  listing,
  propertyTitle,
  currency,
  walletBalance,
}: BuyListingDialogProps) {
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  if (!listing) return null;

  const totalPrice = listing.units_to_sell * Number(listing.price_per_unit);
  const hasEnoughBalance = walletBalance >= totalPrice;

  async function handlePurchase() {
    if (!listing || !hasEnoughBalance) return;
    setSubmitting(true);

    try {
      const { data, error } = await (supabase.rpc as any)("purchase_listing_with_wallet", {
        p_listing_id: listing.id,
      });

      if (error) throw error;

      toast({
        title: "Purchase Successful",
        description: `You purchased ${listing.units_to_sell} unit${listing.units_to_sell > 1 ? "s" : ""} of "${propertyTitle}". Check your investments dashboard for details.`,
      });

      qc.invalidateQueries({ queryKey: ["secondary-listings"] });
      qc.invalidateQueries({ queryKey: ["my-investments"] });
      qc.invalidateQueries({ queryKey: ["wallet-balance"] });
      qc.invalidateQueries({ queryKey: ["my-secondary-listings"] });
      onOpenChange(false);
    } catch (err: any) {
      console.error("Purchase error:", err);
      toast({
        title: "Purchase Failed",
        description: err.message || "Could not complete the purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border border-border rounded-2xl bg-background shadow-lux">
        <DialogHeader className="p-6 border-b border-border/40 shrink-0">
          <DialogTitle className="font-serif text-xl font-semibold">Confirm Purchase</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Review the details below and confirm your secondary market purchase.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="py-4 space-y-5">
          {/* Listing Summary */}
          <div className="rounded-xl border border-border/50 bg-accent/30 p-5 space-y-3">
            <p className="font-semibold text-foreground">{propertyTitle}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Units</p>
                <p className="font-bold mt-0.5">{listing.units_to_sell}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Price / Unit</p>
                <p className="font-bold mt-0.5">{formatMoney(Number(listing.price_per_unit), currency)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Summary */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">Total Cost</span>
              <span className="font-serif font-bold text-xl text-primary">
                {formatMoney(totalPrice, currency)}
              </span>
            </div>

            <Separator className="bg-primary/10" />

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-primary" /> Your Wallet Balance
              </span>
              <span className={`font-bold ${hasEnoughBalance ? "text-emerald-600" : "text-red-500"}`}>
                {formatMoney(walletBalance, currency)}
              </span>
            </div>

            {hasEnoughBalance && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Balance After Purchase</span>
                <span className="font-bold text-foreground">
                  {formatMoney(walletBalance - totalPrice, currency)}
                </span>
              </div>
            )}
          </div>

          {!hasEnoughBalance && (
            <div className="rounded-xl border border-red-200/50 bg-red-500/5 p-4 flex items-start gap-3">
              <Wallet className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-700">Insufficient Balance</p>
                <p className="text-[10px] text-red-600/80 mt-0.5">
                  You need {formatMoney(totalPrice - walletBalance, currency)} more to complete this purchase.
                  Earn more through dividend payouts or sell existing units.
                </p>
              </div>
            </div>
          )}

          {/* Security Note */}
          <div className="flex items-start gap-2.5 text-[10px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
            <span>
              This transaction settles instantly. Units and certificates are transferred immediately upon confirmation.
            </span>
          </div>
        </DialogBody>

        <DialogFooter className="p-6 pt-4 bg-accent/20 border-t border-border/40 flex flex-col sm:flex-col gap-3">
          <Button
            className="w-full h-12 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={!hasEnoughBalance || submitting}
            onClick={handlePurchase}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...
              </>
            ) : (
              <>
                Confirm Purchase
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
          <Button
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
