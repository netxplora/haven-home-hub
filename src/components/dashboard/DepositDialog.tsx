import { useState, useRef, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogBody, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Wallet, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  Copy, 
  Upload, 
  Building2, 
  ShieldCheck, 
  AlertTriangle 
} from "lucide-react";
import { PaymentMethodPicker, type PaymentMethod } from "@/components/payments/PaymentMethodPicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";

interface DepositDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialAmount?: number;
}

type Step = "amount" | "method" | "instructions" | "proof" | "success";

export function DepositDialog({
  open,
  onClose,
  onSuccess,
  initialAmount,
}: DepositDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState<string>(initialAmount ? String(initialAmount) : "");
  const [method, setMethod] = useState<PaymentMethod>("digital_currency");
  const [loading, setLoading] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [reference, setReference] = useState<string>("");
  const [hash, setHash] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: methods = [] } = useQuery({
    queryKey: ["all-payment-methods"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("payment_methods")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      return data || [];
    },
  });

  const paymentMethodData = methods.find((m: any) => m.payment_category === method);
  const paymentConfigs = paymentMethodData?.configuration || {};
  const isCrypto = method === "digital_currency";
  const isBank = method === "bank_transfer";

  useEffect(() => {
    if (open) {
      setStep("amount");
      setAmount(initialAmount ? String(initialAmount) : "");
      setMethod("digital_currency");
      setPaymentId(null);
      setReference("");
      setHash("");
      setProofUrl("");
      setCopyStates({});
    }
  }, [open, initialAmount]);

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopyStates((prev) => ({ ...prev, [key]: true }));
    toast({ title: "Copied to clipboard", description: "Value copied successfully." });
    setTimeout(() => {
      setCopyStates((prev) => ({ ...prev, [key]: false }));
    }, 1500);
  };

  const handleInitiateDeposit = async () => {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid deposit amount.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const ref = `DEP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
      setReference(ref);

      const { data, error } = await supabase.from("payments").insert({
        user_id: user?.id,
        amount: numAmount,
        currency: "USD",
        payment_type: "deposit",
        provider: method,
        reference: ref,
        status: "pending",
      } as any).select().single();

      if (error) throw error;
      setPaymentId(data.id);
      setStep("instructions");
    } catch (err: any) {
      toast({
        title: "Deposit initiation failed",
        description: err.message || "Failed to initiate deposit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5MB.", variant: "destructive" });
      return;
    }

    setUploadingProof(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}/deposit_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage.from("receipts").upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(fileName);
      setProofUrl(urlData.publicUrl);
      toast({ title: "Proof uploaded", description: "Payment receipt attached successfully." });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message || "Could not upload receipt image.",
        variant: "destructive",
      });
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!paymentId) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("payments").update({
        proof_url: proofUrl || null,
        transaction_hash: hash || null,
        status: "submitted",
        updated_at: new Date().toISOString(),
      } as any).eq("id", paymentId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["user-available-balance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview-stats"] });
      queryClient.invalidateQueries({ queryKey: ["unified-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawals_data"] });

      setStep("success");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast({
        title: "Submission failed",
        description: err.message || "Could not submit deposit proof.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden sm:rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold font-serif">Deposit Funds</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Add money to your Haven Homes balance securely.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="p-6 space-y-5">
          {step === "amount" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deposit-amount" className="text-sm font-medium">Deposit Amount (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                  <Input
                    id="deposit-amount"
                    type="number"
                    min="10"
                    placeholder="500.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8 text-lg font-semibold"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Minimum deposit amount is $10.00.</p>
              </div>

              <div className="flex gap-2 pt-2">
                {[100, 500, 1000, 5000].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setAmount(String(preset))}
                  >
                    ${preset.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {step === "method" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/40 p-3.5 border border-border flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Selected Deposit</p>
                  <p className="text-lg font-bold text-foreground">${Number(amount).toLocaleString()}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep("amount")} className="text-xs h-8">
                  Change
                </Button>
              </div>

              <PaymentMethodPicker value={method} onChange={setMethod} />
            </div>
          )}

          {step === "instructions" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-primary/5 p-4 border border-primary/20 space-y-1">
                <p className="text-xs text-primary font-medium">Deposit Reference Code</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-bold text-foreground">{reference}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyText(reference, "ref")}
                    className="h-8 gap-1.5 text-xs text-primary"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copyStates["ref"] ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              {isBank && (
                <div className="space-y-3 rounded-xl border border-border p-4 bg-card text-sm">
                  <p className="font-semibold text-foreground text-xs uppercase tracking-wider">Bank Transfer Details</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Bank Name</span>
                      <span className="font-medium text-foreground">{paymentConfigs.bank_name || "Official Bank"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Account Name</span>
                      <span className="font-medium text-foreground">{paymentConfigs.account_name || "Haven Homes Real Estate"}</span>
                    </div>
                    <div className="flex justify-between py-1 items-center">
                      <span className="text-muted-foreground">Account Number</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-medium text-foreground">{paymentConfigs.account_number || "Contact Support"}</span>
                        {paymentConfigs.account_number && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopyText(paymentConfigs.account_number, "acc")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isCrypto && (
                <div className="space-y-3 rounded-xl border border-border p-4 bg-card text-sm">
                  <p className="font-semibold text-foreground text-xs uppercase tracking-wider">Digital Currency Payment</p>
                  {paymentConfigs.wallet_address && (
                    <div className="flex flex-col items-center gap-3 py-2">
                      <div className="p-2 bg-white rounded-lg border border-border shadow-sm">
                        <QRCodeSVG value={paymentConfigs.wallet_address} size={130} />
                      </div>
                      <div className="w-full">
                        <p className="text-[11px] text-muted-foreground mb-1 text-center">Wallet Address ({paymentConfigs.network || "USDT TRC20"})</p>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-muted text-xs font-mono break-all">
                          <span className="truncate mr-2">{paymentConfigs.wallet_address}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => handleCopyText(paymentConfigs.wallet_address, "addr")}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Please transfer exactly <strong className="text-foreground">${Number(amount).toLocaleString()} USD</strong> and include the reference code in your transaction notes.
              </p>
            </div>
          )}

          {step === "proof" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tx-hash" className="text-xs font-medium">Transaction Reference / Hash (Optional)</Label>
                <Input
                  id="tx-hash"
                  placeholder="e.g. TXN-9482749 or 0x82f..."
                  value={hash}
                  onChange={(e) => setHash(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Upload Payment Receipt</Label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*,application/pdf"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition bg-muted/10 hover:bg-muted/30"
                >
                  {uploadingProof ? (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  ) : proofUrl ? (
                    <div className="flex items-center gap-2 text-primary text-xs font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      Receipt Attached (Click to change)
                    </div>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <p className="text-xs font-medium text-foreground">Click to upload payment screenshot or receipt</p>
                      <p className="text-[11px] text-muted-foreground">PNG, JPG, PDF up to 5MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="py-6 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold font-serif text-foreground">Deposit Submitted</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Your deposit of <strong className="text-foreground">${Number(amount).toLocaleString()} USD</strong> has been received. Your balance will be updated automatically once verified.
              </p>
            </div>
          )}
        </DialogBody>

        <DialogFooter className="p-4 border-t border-border bg-muted/10 flex justify-between gap-2">
          {step === "amount" && (
            <>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={() => setStep("method")} disabled={!amount || Number(amount) <= 0}>
                Continue <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}

          {step === "method" && (
            <>
              <Button variant="outline" onClick={() => setStep("amount")}>Back</Button>
              <Button onClick={handleInitiateDeposit} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Proceed to Payment"}
              </Button>
            </>
          )}

          {step === "instructions" && (
            <>
              <Button variant="outline" onClick={() => setStep("method")}>Back</Button>
              <Button onClick={() => setStep("proof")}>
                I Have Sent the Funds <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}

          {step === "proof" && (
            <>
              <Button variant="outline" onClick={() => setStep("instructions")}>Back</Button>
              <Button onClick={handleSubmitProof} disabled={loading || uploadingProof}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete Deposit"}
              </Button>
            </>
          )}

          {step === "success" && (
            <Button className="w-full" onClick={onClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
