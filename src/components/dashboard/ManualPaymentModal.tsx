import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Copy, Loader2, AlertCircle, ChevronRight, Wallet, Clock, Upload, ShieldCheck, Building2, ChevronLeft, Globe, ExternalLink, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/invest";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { PaymentMethodPicker } from "@/components/payments/PaymentMethodPicker";

interface ManualPaymentModalProps {
  open: boolean;
  onClose: () => void;
  method?: "digital_currency" | "bank_transfer" | "third_party_provider" | string;
  amount: number;
  currency: string;
  paymentType: "investment" | "booking" | "reservation" | "installment" | "property" | "purchase";
  targetId: string;
  bookingId?: string;
  metadata?: Record<string, any>;
  holdHours?: number;
  isInvestmentProperty?: boolean;
  onSuccess?: () => void | Promise<void>;
  propertyData?: {
    title: string;
    property_type: string;
    location?: string;
  };
}

interface CryptoAsset {
  symbol: string;
  name: string;
  network: string;
  wallet_address: string;
  icon_url?: string;
}

type Step = "method_select" | "asset" | "buy_crypto" | "pay_manual" | "pay_bank" | "proof" | "confirm";

export function ManualPaymentModal({ 
  open, onClose, method, amount, currency, paymentType, targetId, bookingId, metadata = {}, holdHours, isInvestmentProperty = false, onSuccess, propertyData
}: ManualPaymentModalProps) {
  const { user } = useAuth();
  
  const [step, setStep] = useState<Step>("method_select");

  const [selectedAsset, setSelectedAsset] = useState<CryptoAsset | null>(null);
  const [paymentData, setPaymentData] = useState<{
    address?: string;
    cryptoAmount?: number;
    reference: string;
  } | null>(null);
  
  const [status, setStatus] = useState<"pending" | "processing" | "success" | "failed" | "refunded">("pending");
  const [hash, setHash] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [senderWallet, setSenderWallet] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [activeMethod, setActiveMethod] = useState<string>("");
  const [draftSavedText, setDraftSavedText] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  
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
    wallet_address: m.configuration.wallet_address,
    icon_url: m.icon_url
  }));

  const providers = methods.filter((m: any) => m.payment_category === "third_party_provider").map((m: any) => ({
    id: m.id,
    name: m.method_name,
    description: m.description,
    icon_url: m.icon_url,
    url_template: m.configuration.provider_url,
    supported_assets: m.configuration.supported_methods ? m.configuration.supported_methods.split(",").map((s: string) => s.trim()) : []
  }));

  const bankMethod = methods.find((m: any) => m.payment_category === "bank_transfer" && m.is_default) || methods.find((m: any) => m.payment_category === "bank_transfer");
  const configs = bankMethod?.configuration || {};

  const checkExistingPayment = async () => {
    if (!bookingId && !targetId) {
      if (method) {
        setActiveMethod(method);
        setStep(method === "digital_currency" || method === "third_party_provider" ? "asset" : "pay_bank");
        if (method === "bank_transfer") {
          await initBankPayment();
        }
      } else {
        setStep("method_select");
      }
      return;
    }
    
    setLoading(true);
    try {
      let query = supabase.from("payments").select("*").in("status", ["pending", "processing"]);
      if (paymentType === "reservation") {
        query = query.eq("reservation_id", bookingId);
      } else if (paymentType === "booking") {
        query = query.eq("booking_id", bookingId);
      } else if (paymentType === "investment") {
        query = query.eq("investment_id", targetId);
      } else if (paymentType === "purchase") {
        query = query.eq("property_id", targetId).eq("payment_type", "purchase");
      } else {
        query = query.eq("property_id", targetId);
      }
      
      const { data: existingPayment, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      
      if (existingPayment) {
        const metadataVal = (existingPayment.metadata as any) || {};
        setPaymentData({
          address: existingPayment.crypto_address || undefined,
          cryptoAmount: existingPayment.crypto_amount || undefined,
          reference: existingPayment.reference
        });
        setStatus(existingPayment.status);
        setHash(existingPayment.transaction_hash || metadataVal.draft_hash || "");
        setProofUrl(metadataVal.proof_url || "");
        setSenderWallet(metadataVal.sender_wallet || "");
        setPaymentNotes(metadataVal.payment_notes || "");
        
        if (existingPayment.status === "processing") {
          setStep("confirm");
        } else {
          if (existingPayment.provider === "digital_currency" || existingPayment.provider === "crypto") {
            if (metadataVal.proof_url || metadataVal.draft_hash || existingPayment.crypto_address) {
              if (metadataVal.proof_url || metadataVal.draft_hash) {
                setStep("proof");
              } else {
                const matchedAsset = assets.find(a => a.wallet_address === existingPayment.crypto_address && a.symbol === existingPayment.crypto_currency);
                if (matchedAsset) {
                  setSelectedAsset(matchedAsset);
                } else {
                  setSelectedAsset({
                    symbol: existingPayment.crypto_currency || "USDT",
                    name: existingPayment.crypto_currency || "USDT",
                    network: "TRC20",
                    wallet_address: existingPayment.crypto_address || ""
                  });
                }
                setStep("pay_manual");
              }
            } else {
              setStep("asset");
            }
          } else {
            setStep("proof");
          }
        }
      } else {
        if (method) {
          setActiveMethod(method);
          const isCrypto = method === "digital_currency" || method === "crypto" || method === "third_party_provider";
          setStep(isCrypto ? "asset" : "pay_bank");
          if (!isCrypto) {
            await initBankPayment();
          }
        } else {
          setStep("method_select");
        }
      }
    } catch (err: any) {
      console.error("Error checking existing payment:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async (currentHash: string, currentWallet: string, currentNotes: string, currentProof: string) => {
    if (!paymentData?.reference || status !== "pending") return;
    setSavingDraft(true);
    setDraftSavedText("Saving draft...");
    try {
      const { data: currentPayment } = await supabase
        .from("payments")
        .select("metadata")
        .eq("reference", paymentData.reference)
        .single();
      const currentMetadata = (currentPayment?.metadata as any) || {};

      const updatedMetadata = {
        ...currentMetadata,
        draft_hash: currentHash,
        sender_wallet: currentWallet,
        payment_notes: currentNotes,
        proof_url: currentProof
      };

      const { error } = await supabase
        .from("payments")
        .update({
          metadata: updatedMetadata
        } as any)
        .eq("reference", paymentData.reference);

      if (error) throw error;
      setDraftSavedText("Draft saved successfully");
      setTimeout(() => setDraftSavedText(""), 3000);
    } catch (err: any) {
      console.error("Error saving draft:", err);
      setDraftSavedText("Draft save failed");
    } finally {
      setSavingDraft(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSelectedAsset(null);
      setPaymentData(null);
      setHash("");
      setProofUrl("");
      setSenderWallet("");
      setPaymentNotes("");
      setUploadingProof(false);
      setDraftSavedText("");
      setSavingDraft(false);
      
      checkExistingPayment();
    }
  }, [open, method, bookingId, targetId]);

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
      reservation_id: (paymentType === 'reservation' || paymentType === 'purchase') ? bookingId : null,
      hold_hours: holdHours || (paymentType === 'reservation' ? 168 : null),
      metadata: { manual: true, method: activeMethod || method, ...metadata }
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

    // Strict regex validation for crypto TX hashes
    if (selectedAsset) {
      const cryptoHashRegex = /^(0x)?[a-fA-F0-9]{64}$/;
      // Note: BTC/TRX is 64 hex. ETH is 0x + 64 hex.
      const cleanHash = hash.trim().replace(/^0x/, '');
      if (!/^[a-fA-F0-9]{64}$/.test(cleanHash)) {
        toast({ title: "Invalid Transaction Hash", description: "Digital currency TXID must be a valid 64-character hexadecimal string.", variant: "destructive" });
        return;
      }
    }
    setLoading(true);
    try {
      const { data: currentPayment } = await supabase.from("payments").select("metadata").eq("reference", paymentData?.reference).single();
      const currentMetadata = (currentPayment?.metadata as any) || {};
      const { error } = await supabase.from("payments").update({ 
        transaction_hash: hash || null, 
        status: "processing",
        metadata: { 
          ...currentMetadata, 
          proof_url: proofUrl || currentMetadata.proof_url || null,
          sender_wallet: senderWallet || null,
          payment_notes: paymentNotes || null
        }
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

    const validMimes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validMimes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Only JPG, PNG, and PDF files are permitted.", variant: "destructive" });
      return;
    }
    setUploadingProof(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `proofs/${paymentData?.reference || crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("property-media").upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("property-media").getPublicUrl(path);
      const pubUrl = pub.publicUrl;
      setProofUrl(pubUrl);
      toast({ title: "Screenshot uploaded successfully" });
      await saveDraft(hash, senderWallet, paymentNotes, pubUrl);
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
    if (step === "asset") setStep("method_select");
    else if (step === "pay_bank") setStep("method_select");
    else if (step === "buy_crypto") setStep("method_select");
    else if (step === "pay_manual") setStep("asset");
    else if (step === "proof") {
      const currentMethod = activeMethod || method;
      setStep(currentMethod === "digital_currency" ? "pay_manual" : "pay_bank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px] p-0 border border-border">
        <DialogHeader className="bg-gradient-to-br from-secondary/50 to-background border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                {(activeMethod || method) === "bank_transfer" ? <Building2 className="h-6 w-6" /> : <Wallet className="h-6 w-6" />}
              </div>
              <div>
                <DialogTitle className="font-serif text-2xl font-bold">
                  {(activeMethod || method) === "bank_transfer" ? "Bank Transfer" : "Digital Currency"}
                </DialogTitle>
                <DialogDescription>Secure payment for {paymentType}</DialogDescription>
              </div>
            </div>
            {step !== "method_select" && step !== "confirm" && (
              <Button variant="ghost" size="icon" className="rounded-full" onClick={goBack}><ChevronLeft className="h-5 w-5" /></Button>
            )}
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Amount to Pay</div>
            <div className="text-2xl font-serif font-bold text-foreground">{formatMoney(amount, currency)}</div>
          </div>
        </DialogHeader>

        <DialogBody className="py-8">
          {step === "method_select" && (
            <div className="space-y-6">
              {propertyData && (
                <div className="bg-accent/50 rounded-xl p-5 border border-border/50 shadow-sm">
                  <h4 className="text-sm font-semibold mb-4 text-foreground uppercase tracking-wider">Purchase Breakdown</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Property</span>
                      <span className="font-medium text-foreground text-right">{propertyData.title}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium text-foreground capitalize">{propertyData.property_type.replace(/_/g, ' ')}</span>
                    </div>
                    {propertyData.location && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Location</span>
                        <span className="font-medium text-foreground text-right">{propertyData.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {propertyData?.property_type === 'land' && (
                <div className="bg-emerald-500/5 rounded-xl p-5 border border-emerald-500/20 shadow-sm">
                  <h4 className="text-sm font-semibold mb-2 text-emerald-700 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" /> Included Ownership Documentation
                  </h4>
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    After admin verification, the following official legal documents will be available to download or email directly from your investor dashboard:
                  </p>
                  <div className="space-y-3">
                    <div className="flex gap-3 items-start bg-background/80 p-3 rounded-lg border border-border/50">
                      <FileText className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Contract of Sale (COS)</p>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">Legally binding agreement of property sale and formal transaction acknowledgment.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start bg-background/80 p-3 rounded-lg border border-border/50">
                      <FileText className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Deed of Assignment (DOA)</p>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">Official ownership transfer agreement assigning full land rights to the buyer.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <PaymentMethodPicker value={activeMethod} onChange={setActiveMethod} />
              <Button 
                className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium" 
                disabled={!activeMethod || loading}
                onClick={async () => {
                  if (activeMethod === "digital_currency") {
                    setStep("asset");
                  } else if (activeMethod === "bank_transfer") {
                    setStep("pay_bank");
                    await initBankPayment();
                  } else if (activeMethod === "third_party_provider") {
                    setStep("buy_crypto");
                  }
                }}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : (
                  <span className="flex items-center justify-center gap-2">
                    Continue <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          )}

          {step === "asset" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <p className="text-sm font-medium text-muted-foreground mb-3">Select Digital Currency</p>
                <div className="grid gap-3">
                  {assets.map((asset) => {
                    return (
                    <button key={`${asset.symbol}-${asset.network}`} onClick={() => handleSelectAsset(asset)} disabled={loading} className="flex items-center justify-between p-4 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all group text-left">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-white border border-border/20 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 shadow-sm">
                          {asset.icon_url ? (
                            <img src={asset.icon_url} alt={asset.symbol} className="h-full w-full object-cover p-1.5" />
                          ) : (
                            <span className="text-foreground">{asset.symbol.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{asset.name}</p>
                          <p className="text-xs text-muted-foreground uppercase tracking-tight">{asset.network}</p>
                        </div>
                      </div>
                      {loading && selectedAsset?.symbol === asset.symbol ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />}
                    </button>
                    );
                  })}
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
                      <div className="h-10 w-10 rounded-full bg-white border border-border/20 flex items-center justify-center text-primary shrink-0 overflow-hidden shadow-sm">
                        {p.icon_url ? (
                          <img src={p.icon_url} alt={p.name} className="h-full w-full object-cover p-1.5" />
                        ) : (
                          <Globe className="h-5 w-5" />
                        )}
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
                  <p className="font-semibold">{configs?.bank_account_name || "Haven Home Hub LLC"}</p>
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
                  <input 
                    placeholder="Enter reference ID or TXID..." 
                    className="flex h-11 w-full rounded-lg border border-input bg-accent/50 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" 
                    value={hash} 
                    onChange={(e) => setHash(e.target.value)} 
                    onBlur={() => saveDraft(hash, senderWallet, paymentNotes, proofUrl)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-medium px-1">Sender Wallet Address (Optional)</Label>
                  <input 
                    placeholder="e.g. 0x... or BTC address" 
                    className="flex h-11 w-full rounded-lg border border-input bg-accent/50 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" 
                    value={senderWallet} 
                    onChange={(e) => setSenderWallet(e.target.value)} 
                    onBlur={() => saveDraft(hash, senderWallet, paymentNotes, proofUrl)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-medium px-1">Payment Notes (Optional)</Label>
                  <textarea 
                    placeholder="Any additional details about your payment..." 
                    className="flex min-h-[80px] w-full rounded-lg border border-input bg-accent/50 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" 
                    value={paymentNotes} 
                    onChange={(e) => setPaymentNotes(e.target.value)} 
                    onBlur={() => saveDraft(hash, senderWallet, paymentNotes, proofUrl)}
                  />
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
              {draftSavedText && (
                <p className={`text-xs text-center font-medium ${draftSavedText.includes("failed") ? "text-destructive" : "text-emerald-600"}`}>
                  {draftSavedText}
                </p>
              )}
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 h-11 rounded-lg border-border font-medium" 
                  disabled={loading || savingDraft}
                  onClick={async () => {
                    await saveDraft(hash, senderWallet, paymentNotes, proofUrl);
                    onClose();
                  }}
                >
                  Save Draft & Close
                </Button>
                <Button 
                  className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground font-medium shadow-sm" 
                  onClick={handleSubmitProof} 
                  disabled={loading || uploadingProof || savingDraft}
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Complete Submission"}
                </Button>
              </div>
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
