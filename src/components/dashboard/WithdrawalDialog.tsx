import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/invest";

export function WithdrawalDialog({
  open,
  onClose,
  available,
}: {
  open: boolean;
  onClose: () => void;
  available: number;
}) {
  const qc = useQueryClient();
  const [method, setMethod] = useState<"bank_transfer" | "digital_currency">("bank_transfer");
  const [amount, setAmount] = useState("");
  const [bank, setBank] = useState({ bank_name: "", bank_account_name: "", bank_account_number: "" });
  const [crypto, setCrypto] = useState({ crypto_currency: "USDT", crypto_address: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount("");
      setBank({ bank_name: "", bank_account_name: "", bank_account_number: "" });
      setCrypto({ crypto_currency: "USDT", crypto_address: "" });
      setMethod("bank_transfer");
    }
  }, [open]);

  const amt = Number(amount || 0);
  const validAmount = amt > 0 && amt <= available;
  const validDetails = method === "bank_transfer"
    ? bank.bank_name.trim() && bank.bank_account_name.trim() && bank.bank_account_number.trim()
    : crypto.crypto_currency.trim() && crypto.crypto_address.trim().length >= 10;
  const canSubmit = validAmount && validDetails && !submitting;

  async function submit() {
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      toast({ title: "Sign in required", variant: "destructive" });
      return;
    }
    const payload =
      method === "bank_transfer"
        ? { user_id: user.id, amount: amt, method, ...bank }
        : { user_id: user.id, amount: amt, method, ...crypto };
    const { error } = await supabase.from("withdrawal_requests").insert(payload as any);
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not submit", description: error.message, variant: "destructive" });
      return;
    }
    // Create notification for the user
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "withdrawal_submitted",
      title: "Withdrawal request submitted",
      body: `Your withdrawal of ${formatMoney(amt)} is pending review.`,
      link: "/dashboard?tab=withdrawals",
    });
    qc.invalidateQueries({ queryKey: ["withdrawals"] });
    qc.invalidateQueries({ queryKey: ["available-balance"] });
    toast({ title: "Withdrawal requested", description: "We'll review and process it shortly." });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 border border-border">
        <DialogHeader className="p-6 sm:p-10 bg-accent/40 border-b border-border/40 shrink-0">
          <DialogTitle className="font-serif text-2xl sm:text-3xl font-bold text-foreground">Withdraw Funds</DialogTitle>
          <div className="flex items-center gap-2 mt-3">
             <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary">Available for Payout</p>
             <Badge className="bg-primary text-primary-foreground font-bold rounded-lg border-none">{formatMoney(available)}</Badge>
          </div>
        </DialogHeader>
        
        <DialogBody className="space-y-6 py-6 px-6 sm:px-10">
          <div className="space-y-2">
            <Label htmlFor="wamt" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Amount (USD)</Label>
            <Input
              id="wamt"
              type="number"
              min={1}
              max={available}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-12 rounded-xl bg-accent/50 focus:bg-background transition-all font-bold text-lg"
              placeholder="0.00"
            />
            {amt > available && <p className="text-xs text-destructive mt-1 ml-1">Amount exceeds your available balance.</p>}
          </div>

          <Tabs value={method} onValueChange={(v) => setMethod(v as "bank_transfer" | "digital_currency")} className="w-full">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 p-1 bg-accent rounded-xl mb-4">
              <TabsTrigger value="bank_transfer" className="rounded-lg data-[state=active]:bg-background">Bank transfer</TabsTrigger>
              <TabsTrigger value="digital_currency" className="rounded-lg data-[state=active]:bg-background">Digital Currency</TabsTrigger>
            </TabsList>
            <TabsContent value="bank_transfer" className="space-y-5 animate-in fade-in slide-in-from-top-1">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Bank name</Label>
                <Input value={bank.bank_name} onChange={(e) => setBank({ ...bank, bank_name: e.target.value })} maxLength={120} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Account holder name</Label>
                <Input value={bank.bank_account_name} onChange={(e) => setBank({ ...bank, bank_account_name: e.target.value })} maxLength={120} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Account number / IBAN</Label>
                <Input value={bank.bank_account_number} onChange={(e) => setBank({ ...bank, bank_account_number: e.target.value })} maxLength={64} className="h-11 rounded-xl" />
              </div>
            </TabsContent>
            <TabsContent value="digital_currency" className="space-y-5 animate-in fade-in slide-in-from-top-1">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Currency / network</Label>
                <Input value={crypto.crypto_currency} onChange={(e) => setCrypto({ ...crypto, crypto_currency: e.target.value })} placeholder="USDT-TRC20, BTC, ETH..." maxLength={32} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Wallet address</Label>
                <Input value={crypto.crypto_address} onChange={(e) => setCrypto({ ...crypto, crypto_address: e.target.value })} maxLength={120} className="h-11 rounded-xl font-mono text-[10px]" />
              </div>
              <p className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-[10px] text-amber-700 font-medium">
                Double-check the address. Withdrawals sent to incorrect addresses cannot be reversed.
              </p>
            </TabsContent>
          </Tabs>

          <p className="text-[10px] text-muted-foreground text-center px-4 italic">
            Withdrawals are processed by our team within 1–3 business days.
          </p>
        </DialogBody>

        <DialogFooter className="bg-accent/20 pt-8 pb-8 px-10 border-t border-border/40">
          <Button 
            className="w-full h-14 bg-primary text-primary-foreground hover:opacity-90 rounded-xl font-bold shadow-sm transition-all active:scale-[0.98]" 
            disabled={!canSubmit} 
            onClick={submit}
          >
            {submitting ? "Processing Request…" : "Confirm Withdrawal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
