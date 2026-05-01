import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  const [method, setMethod] = useState<"bank_transfer" | "crypto">("bank_transfer");
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
    const { error } = await supabase.from("withdrawal_requests").insert(payload);
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Request a withdrawal</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Available balance: <span className="font-semibold text-foreground">{formatMoney(available)}</span>
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="wamt">Amount (USD)</Label>
          <Input
            id="wamt"
            type="number"
            min={1}
            max={available}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {amt > available && <p className="text-xs text-destructive">Amount exceeds your available balance.</p>}
        </div>

        <Tabs value={method} onValueChange={(v) => setMethod(v as "bank_transfer" | "crypto")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bank_transfer">Bank transfer</TabsTrigger>
            <TabsTrigger value="crypto">Crypto</TabsTrigger>
          </TabsList>
          <TabsContent value="bank_transfer" className="space-y-3 pt-3">
            <div className="space-y-1.5"><Label>Bank name</Label><Input value={bank.bank_name} onChange={(e) => setBank({ ...bank, bank_name: e.target.value })} maxLength={120} /></div>
            <div className="space-y-1.5"><Label>Account holder name</Label><Input value={bank.bank_account_name} onChange={(e) => setBank({ ...bank, bank_account_name: e.target.value })} maxLength={120} /></div>
            <div className="space-y-1.5"><Label>Account number / IBAN</Label><Input value={bank.bank_account_number} onChange={(e) => setBank({ ...bank, bank_account_number: e.target.value })} maxLength={64} /></div>
          </TabsContent>
          <TabsContent value="crypto" className="space-y-3 pt-3">
            <div className="space-y-1.5"><Label>Currency / network</Label><Input value={crypto.crypto_currency} onChange={(e) => setCrypto({ ...crypto, crypto_currency: e.target.value })} placeholder="USDT-TRC20, BTC, ETH..." maxLength={32} /></div>
            <div className="space-y-1.5"><Label>Wallet address</Label><Input value={crypto.crypto_address} onChange={(e) => setCrypto({ ...crypto, crypto_address: e.target.value })} maxLength={120} className="font-mono text-xs" /></div>
            <p className="rounded-md bg-secondary/60 p-2 text-xs text-muted-foreground">
              Double-check the address. Withdrawals sent to incorrect addresses cannot be recovered.
            </p>
          </TabsContent>
        </Tabs>

        <Button className="w-full bg-gradient-warm hover:opacity-95" disabled={!canSubmit} onClick={submit}>
          {submitting ? "Submitting…" : "Submit request"}
        </Button>
        <p className="text-[10px] text-muted-foreground">
          Withdrawals are reviewed manually and typically processed within 1–3 business days.
        </p>
      </DialogContent>
    </Dialog>
  );
}