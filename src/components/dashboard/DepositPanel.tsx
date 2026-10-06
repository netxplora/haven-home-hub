import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserBalance } from "@/hooks/useUserBalance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/invest";
import { QRCodeSVG } from "qrcode.react";
import { 
  Wallet, 
  Copy, 
  Upload, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Info, 
  Loader2, 
  ArrowRight, 
  AlertCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  network: string;
  wallet_address: string;
  instructions: string | null;
  is_active: boolean;
  logo_url: string | null;
}

export function DepositPanel({ userId, onNavigate }: { userId: string; onNavigate?: (tab: string) => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { balance } = useUserBalance();

  const [amount, setAmount] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [txHash, setTxHash] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [copyState, setCopyState] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch active Global Wallets dynamically
  const { data: globalWallets = [], isLoading: isLoadingWallets } = useQuery({
    queryKey: ["global-wallets-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crypto_assets")
        .select("*")
        .eq("is_active", true)
        .order("symbol", { ascending: true });
      if (error) throw error;
      return (data || []) as CryptoAsset[];
    },
  });

  // Default to first active wallet
  const activeAsset = globalWallets.find((w) => w.id === selectedAssetId) || globalWallets[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyState(true);
    toast({ title: "Copied to clipboard", description: "Wallet address copied successfully." });
    setTimeout(() => setCopyState(false), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum proof file size is 5MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user?.id}/deposit_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("receipts").upload(path, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
      setProofUrl(urlData.publicUrl);
      toast({ title: "Receipt uploaded", description: "Payment proof attached successfully." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Failed to upload receipt.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid deposit amount.", variant: "destructive" });
      return;
    }

    if (numAmount < 10) {
      toast({ title: "Minimum deposit", description: "The minimum deposit amount is $10.00.", variant: "destructive" });
      return;
    }

    if (!activeAsset) {
      toast({ title: "No wallet available", description: "Please select a deposit wallet.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const ref = `DEP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();

      const { data, error } = await supabase.from("payments").insert({
        user_id: user?.id,
        amount: numAmount,
        currency: "USD",
        payment_type: "deposit",
        provider: "crypto",
        reference: ref,
        status: "pending",
        crypto_currency: activeAsset.symbol,
        crypto_address: activeAsset.wallet_address,
        transaction_hash: txHash.trim() || null,
        proof_url: proofUrl || null,
        metadata: {
          asset_id: activeAsset.id,
          asset_name: activeAsset.name,
          network: activeAsset.network,
          destination_wallet: activeAsset.wallet_address,
          proof_url: proofUrl || null,
        },
      } as any).select().single();

      if (error) throw error;

      setSubmittedRef(ref);
      queryClient.invalidateQueries({ queryKey: ["unified-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({
        title: "Deposit Submitted",
        description: "Your deposit request has been submitted for verification.",
      });
    } catch (err: any) {
      toast({
        title: "Submission failed",
        description: err.message || "Could not submit deposit request.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedRef) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-5 shadow-sm">
          <div className="h-16 w-16 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <Clock className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              Status: Pending Review
            </span>
            <h2 className="font-serif text-2xl font-bold text-foreground mt-3">Deposit Request Submitted</h2>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
              Your deposit of <strong className="text-foreground">${Number(amount).toLocaleString()} USD</strong> has been received with reference code <span className="font-mono font-semibold text-foreground">{submittedRef}</span>.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-xs text-left space-y-2 text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Verification Process</span>
            </div>
            <p>
              Our finance team reviews deposits to confirm blockchain clearance. Once verified, your available balance will be credited automatically.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              className="rounded-xl h-11"
              onClick={() => {
                setSubmittedRef(null);
                setAmount("");
                setTxHash("");
                setProofUrl("");
              }}
            >
              Make Another Deposit
            </Button>
            <Button
              className="rounded-xl h-11 font-semibold"
              onClick={() => onNavigate && onNavigate("transactions")}
            >
              View Transaction History <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between p-6 rounded-2xl border border-border/70 bg-card shadow-sm">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">Deposit Funds</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Add money to your Haven Homes balance securely using our verified Global Wallet channels.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0 px-3.5 py-2 rounded-xl bg-primary/5 border border-primary/15 w-fit">
          <Wallet className="h-4 w-4 text-primary" />
          <div className="text-xs">
            <span className="text-muted-foreground block text-[10px]">Current Available</span>
            <span className="font-bold text-foreground">{formatMoney(balance)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Global Wallet Details & QR */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm space-y-5">
            <div>
              <h3 className="font-serif text-base font-semibold text-foreground">Destination Wallet</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Official platform receiving address</p>
            </div>

            {isLoadingWallets ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-40 w-40 mx-auto rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : globalWallets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm font-semibold text-foreground">No Active Wallets</p>
                <p className="text-xs text-muted-foreground">Please contact support or check back shortly.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Asset Selector */}
                {globalWallets.length > 1 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Currency</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {globalWallets.map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => setSelectedAssetId(w.id)}
                          className={cn(
                            "flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition text-left",
                            (activeAsset?.id === w.id)
                              ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                              : "border-border hover:bg-muted/50 text-foreground"
                          )}
                        >
                          <span className="h-2 w-2 rounded-full bg-primary" />
                          <span className="truncate">{w.symbol} {w.network}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* QR Code */}
                {activeAsset && activeAsset.wallet_address && (
                  <div className="flex flex-col items-center gap-4 py-2">
                    <div className="p-3 bg-white rounded-2xl border border-border shadow-sm">
                      <QRCodeSVG value={activeAsset.wallet_address} size={150} />
                    </div>

                    <div className="w-full space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Network: <strong className="text-foreground">{activeAsset.network}</strong></span>
                        <span className="text-muted-foreground">Asset: <strong className="text-foreground">{activeAsset.name} ({activeAsset.symbol})</strong></span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/60 border border-border/60 text-xs font-mono break-all">
                        <span className="truncate mr-2 font-medium text-foreground">{activeAsset.wallet_address}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-primary shrink-0 gap-1"
                          onClick={() => handleCopy(activeAsset.wallet_address)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {copyState ? "Copied" : "Copy"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {activeAsset?.instructions && (
                  <div className="rounded-xl bg-muted/30 p-3.5 border border-border text-xs text-muted-foreground leading-relaxed">
                    <p className="font-semibold text-foreground mb-1">Instructions:</p>
                    <p>{activeAsset.instructions}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Deposit Submission Form */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
            <div className="mb-5">
              <h3 className="font-serif text-base font-semibold text-foreground">Submit Deposit Request</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send funds to the address on the left, then enter your transaction details below.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="dep-amount" className="text-xs font-semibold text-foreground">Deposit Amount (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">$</span>
                  <Input
                    id="dep-amount"
                    type="number"
                    min="10"
                    step="any"
                    placeholder="1,000.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8 h-12 text-base font-semibold rounded-xl border-border bg-background"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[250, 500, 1000, 5000].map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-9 rounded-xl font-semibold border-border/70 hover:bg-primary/5 hover:border-primary/30"
                      onClick={() => setAmount(String(preset))}
                    >
                      ${preset.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Transaction Hash */}
              <div className="space-y-1.5">
                <Label htmlFor="tx-hash" className="text-xs font-semibold text-foreground">Transaction Hash / Transfer Reference</Label>
                <Input
                  id="tx-hash"
                  placeholder="e.g. 0x8f2d... or Bank Reference ID"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  className="h-11 text-xs font-mono rounded-xl border-border bg-background"
                />
                <p className="text-[11px] text-muted-foreground">
                  The blockchain transaction hash or payment reference from your sender wallet.
                </p>
              </div>

              {/* Receipt Upload */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Payment Receipt / Screenshot (Optional)</Label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*,application/pdf"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border/80 hover:border-primary/50 rounded-xl p-5 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition bg-muted/10 hover:bg-muted/30"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : proofUrl ? (
                    <div className="flex items-center gap-2 text-primary text-xs font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Receipt Attached (Click to replace)</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <p className="text-xs font-semibold text-foreground">Upload payment proof</p>
                      <p className="text-[10px] text-muted-foreground">PNG, JPG, or PDF up to 5MB</p>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
                <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <p>
                  Deposits are verified manually by administrators. Your balance will be credited as soon as transaction confirmation is approved.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-sm font-semibold rounded-xl shadow-sm"
                disabled={submitting || !amount || Number(amount) < 10 || !activeAsset}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting Request...
                  </>
                ) : (
                  <>Submit Deposit Request ({amount ? formatMoney(Number(amount)) : "$0.00"})</>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
