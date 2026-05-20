import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Copy, Loader2, AlertCircle, ChevronRight, Wallet, Clock, Upload, ShieldCheck, Building2, ChevronLeft, Globe, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/invest";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

interface ManualPaymentModalProps {
  open: boolean;
  onClose: () => void;
  method?: "digital_currency" | "bank_transfer" | "third_party_provider" | string;
  amount: number;
  currency: string;
  paymentType: "investment" | "booking" | "reservation" | "installment" | "property";
  targetId: string;
  bookingId?: string;
  metadata?: Record<string, any>;
  holdHours?: number;
  isInvestmentProperty?: boolean;
  onSuccess?: () => void | Promise<void>;
}

interface CryptoAsset {
  symbol: string;
  name: string;
  network: string;
  wallet_address: string;
}

type Step = "asset" | "buy_crypto" | "pay_manual" | "pay_bank" | "proof" | "confirm";

export function ManualPaymentModal({ 
  open, onClose, method = "digital_currency", amount, currency, paymentType, targetId, bookingId, metadata = {}, holdHours, isInvestmentProperty = false, onSuccess
}: ManualPaymentModalProps) {
  const { user } = useAuth();
  
  // Start step depends on method. 
  const [step, setStep] = useState<Step>(method === "digital_currency" || method === "third_party_provider" ? "asset" : "pay_bank");

  const [selectedAsset, setSelectedAsset] = useState<CryptoAsset | null>(null);
  const [paymentData, setPaymentData] = useState<{
    address?: string;
    cryptoAmount?: number;
    reference: string;
  } | null>(null);
  
  const [status, setStatus] = useState<"pending" | "processing" | "success" | "failed" | "refunded">("pending");
  const [hash, setHash] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch unified payment methods
  const { data: methods = [] } = useQuery({
    queryKey: ["all-payment-methods"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("payment_methods").select("*").eq("is_active", true).order("display_order", { ascending: true });
      return data || [];
    }
  });

  const assets: CryptoAsset[] = methods.filter((m: any) => m.payment_category === "digital_currency").map((m: any) => ({
    symbol: m.configuration.supported_currency || m.configuration.wallet_label,
    name: m.method_name,
    network: m.configuration.wallet_network,
    wallet_address: m.configuration.wallet_address
  }));

  const providers = methods.filter((m: any) => m.payment_category === "third_party_provider").map((m: any) => ({
    id: m.id,
    name: m.method_name,
    description: m.description,
    url_template: m.configuration.provider_url,
    supported_assets: m.configuration.supported_methods ? m.configuration.supported_methods.split(",").map((s: string) => s.trim()) : []
  }));

  const bankMethod = methods.find((m: any) => m.payment_category === "bank_transfer" && m.is_default) || methods.find((m: any) => m.payment_category === "bank_transfer");
  const configs = bankMethod?.configuration || {};

  useEffect(() => {
    if (open) {
      setStep(method === "digital_currency" || method === "third_party_provider" ? "asset" : "pay_bank");
      setSelectedAsset(null);
      setPaymentData(null);
      setHash("");
      setProofUrl("");
      setUploadingProof(false);
      
      // If it's a bank transfer, we can just generate a reference immediately
      if (method === "bank_transfer") {
        initBankPayment();
      }
    }
  }, [open, method]);

  // Real-time status tracking
  useEffect(() => {
    if (!paymentData?.reference) return;
    const channel = supabase.channel(`payment-status-${paymentData.reference}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payments', filter: `reference=eq.${paymentData.reference}` }, (payload) => {
          const newStatus = payload.new.status;
          if (newStatus === 'success') {
            setStatus('success');
            setStep('confirm');
          } else if (newStatus === 'failed') {
            setStatus('failed');
          }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [paymentData?.reference]);

  const insertPaymentRecord = async (provider: string, cryptoDetails?: { symbol: string, address: string, amount: number }) => {
    const reference = `${provider === "crypto" ? "CRYP" : "BANK"}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const { error } = await (supabase as any).from("payments").insert({
      user_id: user?.id || null,
      amount,
      currency,
      ...(cryptoDetails ? {
        crypto_amount: cryptoDetails.amount,
        crypto_currency: cryptoDetails.symbol,
        crypto_address: cryptoDetails.address,
      } : {}),
      payment_type: paymentType,
      provider,
      reference,
      status: "pending",
      property_id: !isInvestmentProperty && paymentType !== 'investment' && paymentType !== 'booking' ? targetId : null,
      investment_property_id: isInvestmentProperty && paymentType !== 'investment' ? targetId : null,
      investment_id: paymentType === 'investment' ? targetId : null,
      booking_id: paymentType === 'booking' ? bookingId : null,
      reservation_id: paymentType === 'reservation' ? bookingId : null,
      hold_hours: holdHours || (paymentType === 'reservation' ? 168 : null),
      metadata: { manual: true, method, ...metadata }
    });
    if (error) throw error;
    return reference;
  };

  const initBankPayment = async () => {
    try {
      const ref = await insertPaymentRecord("manual_bank");
      setPaymentData({ reference: ref });
    } catch (err: any) {
      toast({ title: "Payment Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSelectAsset = async (asset: CryptoAsset) => {
    setLoading(true);
    setSelectedAsset(asset);
    try {
      let rate = 1;
      if (asset.symbol === 'BTC') rate = 0.00002;
      else if (asset.symbol === 'ETH') rate = 0.0004;
      const cryptoAmount = amount * rate;
      const ref = await insertPaymentRecord("digital_currency", { symbol: asset.symbol, address: asset.wallet_address, amount: cryptoAmount });
      setPaymentData({ address: asset.wallet_address, cryptoAmount, reference: ref });
      setStep("pay_manual");
    } catch (err: any) {
      toast({ title: "Payment Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!hash || !proofUrl) {
      toast({ title: "Verification required", description: "Please enter a transaction hash/reference and upload a confirmation screenshot." });
      return;
    }
    setLoading(true);
    try {
      const { data: currentPayment } = await supabase.from("payments").select("metadata").eq("reference", paymentData?.reference).single();
      const currentMetadata = (currentPayment?.metadata as any) || {};
      const { error } = await supabase.from("payments").update({ 
        transaction_hash: hash || null, 
        status: "processing",
        metadata: { ...currentMetadata, proof_url: proofUrl || currentMetadata.proof_url || null }
      } as any).eq("reference", paymentData?.reference);
      if (error) throw error;
      setStatus("processing");
      setStep("confirm");
      toast({ title: "Payment processing", description: "An admin will review your payment shortly." });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast({ title: "Submission error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Image exceeds 10MB limit.", variant: "destructive" });
      return;
    }
    setUploadingProof(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `proofs/${paymentData?.reference || crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("property-media").upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("property-media").getPublicUrl(path);
      setProofUrl(pub.publicUrl);
      toast({ title: "Screenshot uploaded successfully" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingProof(false);
      if (e.target) e.target.value = '';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const goBack = () => {
    if (step === "pay_manual") setStep("asset");
    else if (step === "buy_crypto") setStep("asset");
    else if (step === "proof") setStep(method === "digital_currency" ? "pay_manual" : "pay_bank");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-xl border-none shadow-2xl">
        <DialogHeader className="bg-gradient-to-br from-secondary/50 to-background border-b border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                {method === "bank_transfer" ? <Building2 className="h-6 w-6" /> : <Wallet className="h-6 w-6" />}
              </div>
              <div>
                <DialogTitle className="font-serif text-2xl font-bold">
                  {method === "bank_transfer" ? "Bank Transfer" : "Digital Currency"}
                </DialogTitle>
                <DialogDescription>Secure payment for {paymentType}</DialogDescription>
              </div>
            </div>
            {step !== "asset" && step !== "pay_bank" && step !== "confirm" && step !== "buy_crypto" && (
              <Button variant="ghost" size="icon" className="rounded-full" onClick={goBack}><ChevronLeft className="h-5 w-5" /></Button>
            )}
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Amount to Pay</div>
            <div className="text-2xl font-serif font-bold text-foreground">{formatMoney(amount, currency)}</div>
          </div>
        </DialogHeader>

        <DialogBody className="py-8">
          {step === "asset" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <p className="text-sm font-medium text-muted-foreground mb-3">Select Digital Currency</p>
                <div className="grid gap-3">
                  {assets.map((asset) => (
                    <button key={`${asset.symbol}-${asset.network}`} onClick={() => handleSelectAsset(asset)} disabled={loading} className="flex items-center justify-between p-4 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all group text-left">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-sm">{asset.symbol.charAt(0)}</div>
                        <div>
                          <p className="font-semibold text-foreground">{asset.name}</p>
                          <p className="text-xs text-muted-foreground uppercase tracking-tight">{asset.network}</p>
                        </div>
                      </div>
                      {loading && selectedAsset?.symbol === asset.symbol ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />}
                    </button>
                  ))}
                </div>
              </div>

              {providers.length > 0 && (
                <div className="pt-4 border-t border-border/50">
                  <div className="bg-secondary/20 rounded-xl p-5 border border-border/50 text-center space-y-3">
                    <p className="text-sm font-medium text-foreground">Don't have digital currency?</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      You can purchase digital currency externally using one of our approved third-party providers, then return here to complete your payment.
                    </p>
                    <Button variant="outline" className="w-full bg-background mt-2 shadow-sm font-semibold text-primary border-primary/20 hover:bg-primary/5" onClick={() => setStep("buy_crypto")}>
                      Buy Digital Currency
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "buy_crypto" && (
            <div className="space-y-6">
              <div className="space-y-2 text-center mb-6">
                <h3 className="font-serif text-xl font-semibold">Buy Digital Currency</h3>
                <p className="text-sm text-muted-foreground">Select an approved provider below to purchase externally. Please note, we do not directly sell digital currency.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {providers.map((p: any) => (
                  <div key={p.id} className="rounded-xl border border-border/50 p-5 bg-card hover:border-primary/30 transition-all flex flex-col h-full shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Globe className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-sm">{p.name}</h4>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">{(p.supported_assets || []).join(', ')}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground flex-1 mb-4 leading-relaxed">{p.description}</p>
                    <Button 
                      className="w-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors font-medium mt-auto" 
                      onClick={() => window.open(p.url_template, '_blank')}
                    >
                      Visit Provider <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-border/50">
                <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground" onClick={() => setStep("asset")}>
                  Return to Payment Selection
                </Button>
              </div>
            </div>
          )}

          {step === "pay_manual" && paymentData && selectedAsset && (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="p-5 bg-white rounded-xl shadow-card border border-border/50">
                  <QRCodeSVG value={paymentData.address!} size={160} level="H" />
                </div>
                <div className="w-full space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-medium px-1">Amount to Send</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 p-3.5 rounded-lg bg-accent font-mono font-medium text-base border border-border/50">
                        {paymentData.cryptoAmount?.toFixed(8)} {selectedAsset.symbol}
                      </div>
                      <Button size="icon" variant="outline" className="h-11 w-11 rounded-lg" onClick={() => copyToClipboard(paymentData.cryptoAmount?.toString()!)}><Copy className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-medium px-1">Wallet Address ({selectedAsset.network})</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 p-3.5 rounded-lg bg-accent font-mono text-xs break-all border border-border/50 leading-relaxed">{paymentData.address}</div>
                      <Button size="icon" variant="outline" className="h-11 w-11 rounded-lg" onClick={() => copyToClipboard(paymentData.address!)}><Copy className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              </div>
              <Button className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium" onClick={() => setStep("proof")}>I have completed payment</Button>
            </div>
          )}

          {step === "pay_bank" && paymentData && (
            <div className="space-y-5">
              <div className="p-4 rounded-lg border border-border/50 bg-accent/50 space-y-3.5">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Bank Name</p>
                  <p className="font-semibold">{configs?.bank_name || "Official Bank"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Account Name</p>
                  <p className="font-semibold">{configs?.bank_account_name || "Verdant Estate LLC"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Account Number</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-semibold text-base">{configs?.bank_account_number || "1234567890"}</p>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(configs?.bank_account_number || "1234567890")}><Copy className="h-4 w-4" /></Button>
                  </div>
                </div>
                {configs?.bank_swift && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">SWIFT / BIC</p>
                    <p className="font-mono font-semibold">{configs.bank_swift}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Reference (Important)</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-semibold text-primary">{paymentData.reference}</p>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(paymentData.reference)}><Copy className="h-4 w-4" /></Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Please include this reference in your transfer notes.</p>
                </div>
              </div>
              <Button className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium" onClick={() => setStep("proof")}>I have completed transfer</Button>
            </div>
          )}

          {step === "proof" && paymentData && (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <h3 className="font-serif text-xl font-semibold">Verification Proof</h3>
                <p className="text-sm text-muted-foreground">Enter your transaction reference or upload a confirmation receipt.</p>
              </div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-medium px-1">Transaction Hash / Receipt Number</Label>
                  <input placeholder="Enter reference ID..." className="flex h-11 w-full rounded-lg border border-input bg-accent/50 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" value={hash} onChange={(e) => setHash(e.target.value)} />
                </div>
                <div className={`rounded-xl border border-dashed ${proofUrl ? 'border-primary bg-primary/5' : 'border-border bg-secondary/20'} p-8 flex flex-col items-center justify-center gap-4 group hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer relative overflow-hidden`} onClick={() => !uploadingProof && fileInputRef.current?.click()}>
                  <input type="file" className="hidden" ref={fileInputRef} accept="image/*,application/pdf" onChange={handleFileUpload} />
                  {proofUrl ? (
                    <div className="absolute inset-0">
                      <div className="absolute inset-0 flex items-center justify-center bg-background/90">
                         <div className="flex flex-col items-center">
                           <CheckCircle2 className="h-8 w-8 text-primary mb-2" />
                           <p className="text-sm font-semibold text-foreground">Receipt Uploaded</p>
                           <p className="text-xs text-muted-foreground mt-1">Click to replace</p>
                         </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="h-12 w-12 rounded-full bg-background flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                        {uploadingProof ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-foreground">{uploadingProof ? "Uploading..." : "Upload Payment Receipt"}</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, PDF up to 10MB</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <Button className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium shadow-sm" onClick={handleSubmitProof} disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Complete Submission"}
              </Button>
            </div>
          )}

          {step === "confirm" && (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-6">
              {status === "success" ? (
                <div className="h-24 w-24 rounded-full bg-green-500/10 flex items-center justify-center text-green-600"><CheckCircle2 className="h-12 w-12" /></div>
              ) : status === "failed" ? (
                <div className="h-24 w-24 rounded-full bg-red-500/10 flex items-center justify-center text-red-600"><AlertCircle className="h-12 w-12" /></div>
              ) : (
                <div className="h-24 w-24 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 animate-pulse"><Clock className="h-12 w-12" /></div>
              )}
              <div>
                <h3 className="font-serif text-2xl font-bold text-foreground">
                  {status === "success" ? "Payment Confirmed" : status === "failed" ? "Payment Failed" : "Payment Under Review"}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground px-4 leading-relaxed">
                  {status === "success" ? "Your payment has been verified and confirmed." : status === "failed" ? "Your payment could not be verified." : "Your payment submission is now being verified by our team."}
                </p>
              </div>
              <Button className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium" onClick={onClose}>
                {status === "success" ? "Done" : "Back to Dashboard"}
              </Button>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
