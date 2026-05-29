import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ChevronRight, ArrowLeft, Loader2, CheckCircle2, ShieldCheck, Wallet, Copy, Upload, 
  Building2, ExternalLink, Clock, Check, ZoomIn, Eye, AlertTriangle, ArrowUpRight 
} from "lucide-react";
import { formatMoney, InvestmentProperty, fundingPercent, availableUnits } from "@/lib/invest";
import { PaymentMethodPicker, type PaymentMethod } from "@/components/payments/PaymentMethodPicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { QRCodeSVG } from "qrcode.react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface FractionalPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  property: InvestmentProperty;
  units: number;
  investMode: "full" | "installment";
  totalAmount: number;
  downPaymentAmount: number;
  durationMonths: number;
  monthlyInstallment: number;
  onSuccess: () => void;
}

type Step = "summary" | "acknowledgement" | "method" | "instructions" | "proof" | "confirm";

const stepsList: { key: Step; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "acknowledgement", label: "Agreement" },
  { key: "method", label: "Method" },
  { key: "instructions", label: "Instructions" },
  { key: "proof", label: "Proof" },
  { key: "confirm", label: "Pending" }
];

export function FractionalPaymentDialog({
  open,
  onClose,
  property,
  units,
  investMode,
  totalAmount,
  downPaymentAmount,
  durationMonths,
  monthlyInstallment,
  onSuccess
}: FractionalPaymentDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("summary");
  const [method, setMethod] = useState<PaymentMethod>("digital_currency");
  const [ackChecked, setAckChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  
  const [investmentId, setInvestmentId] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<{ reference: string; address?: string; cryptoAmount?: number } | null>(null);
  
  const [hash, setHash] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [qrZoomed, setQrZoomed] = useState(false);
  
  // Clipboard copy state tracking
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch unified payment methods to display instructions
  const { data: methods = [] } = useQuery({
    queryKey: ["all-payment-methods"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("payment_methods")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      return data || [];
    }
  });

  const paymentMethodData = methods.find((m: any) => m.payment_category === method);
  const paymentConfigs = paymentMethodData?.configuration || {};
  const isCrypto = method === "digital_currency";
  const isBank = method === "bank_transfer";
  const isThirdParty = method === "third_party_provider";
  
  const currentAmount = investMode === "installment" ? downPaymentAmount : totalAmount;
  const pct = fundingPercent(property);
  const remainingUnits = availableUnits(property);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setStep("summary");
      setMethod("digital_currency");
      setAckChecked(false);
      setInvestmentId(null);
      setPaymentData(null);
      setHash("");
      setProofUrl("");
      setQrZoomed(false);
      setCopyStates({});
    }
  }, [open]);

  // Copy with tooltip handler
  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopyStates(prev => ({ ...prev, [key]: true }));
    toast({ title: "Copied to clipboard", description: "Successfully copied requested field." });
    setTimeout(() => {
      setCopyStates(prev => ({ ...prev, [key]: false }));
    }, 1500);
  };

  const handleCreateInvestment = async () => {
    setLoading(true);
    try {
      const body: Record<string, any> = {
        property_id: property.id,
        amount: currentAmount,
        units,
        provider: method,
        investment_type: investMode,
      };

      if (investMode === "installment") {
        body.total_amount = totalAmount;
        body.down_payment_amount = downPaymentAmount;
        body.duration_months = durationMonths;
        body.monthly_installment_amount = monthlyInstallment;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) throw new Error("Authentication required.");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-investment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json().catch(() => ({ error: "Unknown error" }));
      if (!response.ok || result?.error) {
        throw new Error(result?.error || `Server returned ${response.status}`);
      }

      setInvestmentId(result.investment_id);

      // Now create the payment record
      const reference = `${isCrypto ? "CRYP" : "BANK"}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      let cryptoAmount = currentAmount;
      if (isCrypto && paymentConfigs.supported_currency) {
        // Precise conversion rate logic
        let rate = 1;
        if (paymentConfigs.supported_currency === 'BTC') rate = 0.000015;
        else if (paymentConfigs.supported_currency === 'ETH') rate = 0.00032;
        else if (paymentConfigs.supported_currency === 'USDT' || paymentConfigs.supported_currency === 'USDC') rate = 1;
        cryptoAmount = currentAmount * rate;
      }

      const { error: insertErr } = await (supabase as any).from("payments").insert({
        user_id: user?.id,
        amount: currentAmount,
        currency: property.currency,
        crypto_amount: isCrypto ? cryptoAmount : null,
        crypto_currency: isCrypto ? paymentConfigs.supported_currency : null,
        crypto_address: isCrypto ? paymentConfigs.wallet_address : null,
        payment_type: "investment",
        provider: method,
        reference,
        status: "pending",
        investment_property_id: property.id,
        investment_id: result.investment_id,
        metadata: { manual: true, method }
      });

      if (insertErr) throw insertErr;

      setPaymentData({ 
        reference, 
        address: paymentConfigs.wallet_address, 
        cryptoAmount: isCrypto ? cryptoAmount : undefined 
      });

      setStep("instructions");
    } catch (e: any) {
      toast({ title: "Request failed", description: e.message, variant: "destructive" });
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
      // 1. Update the payment status to processing (admin verification queue)
      const { data: currentPayment } = await (supabase as any)
        .from("payments")
        .select("metadata")
        .eq("reference", paymentData?.reference)
        .single();
      
      const currentMetadata = currentPayment?.metadata || {};
      const { error: payError } = await (supabase as any).from("payments").update({ 
        transaction_hash: hash || null, 
        status: "processing",
        metadata: { ...currentMetadata, proof_url: proofUrl }
      }).eq("reference", paymentData?.reference);
      
      if (payError) throw payError;

      // 2. Perform explicit update to user_investments setting state to payment_under_review
      if (investmentId) {
        const { error: invError } = await supabase
          .from("user_investments")
          .update({ status: "payment_under_review" as any })
          .eq("id", investmentId);
        
        if (invError) throw invError;
      }

      setStep("confirm");
      toast({ title: "Payment processing", description: "Your payment proof has been securely recorded." });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast({ title: "Submission error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploadingProof(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Math.random()}.${ext}`;
      const filePath = `${user?.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("payment_receipts").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("payment_receipts").getPublicUrl(filePath);
      setProofUrl(data.publicUrl);
      toast({ title: "File uploaded", description: "Receipt verification proof captured successfully." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingProof(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const activeIdx = stepsList.findIndex(s => s.key === step);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border border-border bg-background shadow-lux max-h-[90vh] overflow-y-auto flex flex-col rounded-2xl md:max-h-[90vh]">
        {/* Header Block with Premium Aesthetics */}
        <DialogHeader className="p-6 md:p-8 bg-gradient-to-br from-rose-500/5 via-primary/5 to-background border-b border-border/40 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-primary font-bold">Secure Gate</span>
                <DialogTitle className="font-serif text-2xl font-bold text-foreground">
                  {step === "summary" && "Investment Summary"}
                  {step === "acknowledgement" && "Terms Agreement"}
                  {step === "method" && "Choose Payment"}
                  {step === "instructions" && "Submit Funds"}
                  {step === "proof" && "Submit Proof"}
                  {step === "confirm" && "Pending Verification"}
                </DialogTitle>
              </div>
            </div>
            
            {/* Steps tracker - Hidden on mobile view and replaced with step count */}
            {step !== "confirm" && (
              <div className="hidden md:flex items-center gap-1 bg-accent/50 p-1 rounded-full border border-border/40">
                {stepsList.slice(0, 5).map((s, i) => (
                  <div key={s.key} className="flex items-center">
                    <span 
                      className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300",
                        i < activeIdx ? "bg-primary text-white" :
                        i === activeIdx ? "bg-primary text-white shadow-sm font-extrabold ring-4 ring-rose-600/15" :
                        "bg-muted text-muted-foreground"
                      )}
                    >
                      {i < activeIdx ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    {i < 4 && (
                      <span className={cn("h-[2px] w-4 transition-all duration-300", i < activeIdx ? "bg-primary" : "bg-muted")} />
                    )}
                  </div>
                ))}
              </div>
            )}
            {step !== "confirm" && (
              <div className="md:hidden flex items-center justify-between text-xs border border-border bg-accent/40 rounded-xl p-2.5">
                <span className="font-medium text-muted-foreground">Progress Checklist</span>
                <span className="font-bold text-primary bg-primary/100/5 px-2 py-0.5 rounded-lg border border-rose-500/10">Step {activeIdx + 1} of 5</span>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Scrollable Container with Smooth Inner Transitions */}
        <DialogBody className="p-6 md:p-8 overflow-y-auto space-y-6 max-h-[60vh]">
          
          {/* STEP 1: SUMMARY */}
          {step === "summary" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-4 bg-primary/100/5 border border-rose-500/10 rounded-xl">
                <p className="text-xs md:text-sm text-primary dark:text-rose-300 leading-relaxed">
                  You are about to make a fractional ownership investment payment for <strong className="font-semibold">{property.title}</strong>. 
                  Purchased fractional units grant legal ownership. Projected ROI yields begin accumulating post-subscription completion. 
                  All updates will propagate live to your dashboard.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="p-5 flex gap-4 border-b border-border bg-accent/10">
                  <div className="h-20 w-20 rounded-xl overflow-hidden shrink-0 bg-accent border border-border">
                    <img src={property.cover_image_url} alt={property.title} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold">{property.property_category || "Fractional Real Estate"}</span>
                    <h3 className="font-serif font-bold text-lg text-foreground mt-1 line-clamp-1">{property.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {property.location}, {property.city}
                    </p>
                  </div>
                </div>

                <div className="p-5 grid grid-cols-2 gap-y-4 gap-x-6 bg-card text-sm">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">Fractional Units</span>
                    <span className="font-bold text-foreground text-base mt-0.5 block">{units.toLocaleString()} Units</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">Unit Value</span>
                    <span className="font-bold text-foreground text-base mt-0.5 block">{formatMoney(Number(property.unit_price), property.currency)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">Expected Return</span>
                    <span className="font-bold text-primary text-base mt-0.5 block">{property.projected_return_min}% - {property.projected_return_max}% p.a.</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">Total Purchase Value</span>
                    <span className="font-bold text-foreground text-base mt-0.5 block">{formatMoney(totalAmount, property.currency)}</span>
                  </div>

                  {investMode === "installment" && (
                    <div className="col-span-2 border-t border-dashed border-border pt-3 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-amber-600 uppercase font-semibold block tracking-wider">Down Payment Due</span>
                        <span className="font-bold text-amber-600 text-base mt-0.5 block">{formatMoney(downPaymentAmount, property.currency)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">Installments plan</span>
                        <span className="font-bold text-foreground text-base mt-0.5 block">{formatMoney(monthlyInstallment, property.currency)} / mo</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Funding Progress bar inside card */}
                <div className="px-5 pb-5 pt-2 border-t border-border bg-accent/5">
                  <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                    <span>Funding Campaign</span>
                    <span className="font-bold text-foreground">{pct}% subscribed</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-1.5 font-medium">
                    <span>{remainingUnits.toLocaleString()} units remaining</span>
                    <span>Hold Period: {property.holding_period_months} mo</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  <strong>Estimated Yield Notice</strong>: Projected returns are estimated and begin accumulating after all investment units for this property have been fully subscribed.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: AGREEMENT */}
          {step === "acknowledgement" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="p-5 border-b border-border bg-accent/10">
                  <h4 className="font-serif font-bold text-lg text-foreground">Acknowledge Fractional Terms</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Please review the compliance declarations before checking out.</p>
                </div>
                
                <div className="p-5 space-y-4 max-h-[30vh] overflow-y-auto text-xs text-muted-foreground leading-relaxed custom-scrollbar divide-y divide-border/60">
                  <div className="pb-3 flex gap-3 items-start">
                    <CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                    <p>
                      <strong>Fractional Asset Allocation</strong>: I understand I am purchasing legal fractional titles inside the property coordinates. Units are distributed based on capital contribution records.
                    </p>
                  </div>
                  <div className="py-3 flex gap-3 items-start">
                    <CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                    <p>
                      <strong>Capital Hold and Illiquidity</strong>: I acknowledge that fractional assets represent long-term holdings of {property.holding_period_months} months. Early redemption options are restricted and subject to secondary market regulations.
                    </p>
                  </div>
                  <div className="py-3 flex gap-3 items-start">
                    <CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                    <p>
                      <strong>Pending Administrative Verification</strong>: Payments undergo strict human audit. Accounts remain in a `payment_under_review` (Pending Confirmation) state until transaction receipts are cleared.
                    </p>
                  </div>
                  <div className="pt-3 flex gap-3 items-start">
                    <CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                    <p>
                      <strong>Growth Dynamics</strong>: Property valuations are dynamic. Rental returns fluctuate with market updates and management efficiency.
                    </p>
                  </div>
                </div>
              </div>

              <label 
                className={cn(
                  "flex items-start gap-3.5 p-4 border rounded-2xl cursor-pointer hover:bg-accent/40 transition-all",
                  ackChecked ? "border-rose-600 bg-primary/100/5 shadow-sm" : "border-border"
                )}
              >
                <Checkbox 
                  id="modal-terms-ack" 
                  checked={ackChecked} 
                  onCheckedChange={(c) => setAckChecked(!!c)} 
                  className="mt-1 border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-rose-600" 
                />
                <div>
                  <p className="font-bold text-sm text-foreground">I acknowledge and authorize terms</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">I verify that the above declarations match my investment profile.</p>
                </div>
              </label>
            </div>
          )}

          {/* STEP 3: PAYMENT METHOD SELECTION */}
          {step === "method" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <PaymentMethodPicker value={method} onChange={setMethod} />
              
              {/* Buy Digital Currency assistance section */}
              {method === "third_party_provider" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="p-4 bg-primary/100/5 border border-rose-500/10 rounded-xl">
                    <h5 className="font-bold text-xs text-primary dark:text-rose-300 flex items-center gap-1.5">
                      <Wallet className="h-4 w-4" />
                      Buy Digital Currency Assistance Flow
                    </h5>
                    <p className="text-[11px] text-primary/80 leading-relaxed mt-1">
                      If you do not hold digital currency in a personal wallet, purchase cryptocurrency instantly with your credit/debit card from our licensed partners. Once purchased, send the assets directly to the address provided on the next step.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="border border-border rounded-xl p-4 bg-card hover:border-rose-600/50 hover:shadow-sm transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-sm text-foreground">MoonPay</span>
                          <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">Recommended</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                          Supported cards: Visa, Mastercard, Apple Pay, Google Pay. Global support covering 150+ countries. Fast clearance times.
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline" className="mt-4 w-full text-xs font-semibold rounded-lg">
                        <a href="https://www.moonpay.com/buy" target="_blank" rel="noopener noreferrer">
                          Visit MoonPay <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>

                    <div className="border border-border rounded-xl p-4 bg-card hover:border-rose-600/50 hover:shadow-sm transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-sm text-foreground">Transak</span>
                          <span className="text-[9px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded font-bold">Card & Bank</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                          Supported options: Card, Local Bank Transfers. High conversion limits, covering UK, Europe, Americas, and Asia.
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline" className="mt-4 w-full text-xs font-semibold rounded-lg">
                        <a href="https://global.transak.com/" target="_blank" rel="noopener noreferrer">
                          Visit Transak <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>

                  {/* Guided Onboarding Checklist timeline */}
                  <div className="rounded-xl border border-border bg-accent/10 p-5 space-y-3">
                    <span className="text-xs font-bold text-foreground block tracking-wider uppercase">How to Purchase & Complete Investment:</span>
                    <div className="relative pl-5 border-l border-border/80 space-y-4 text-xs text-muted-foreground">
                      <div className="relative">
                        <span className="absolute -left-[27px] top-[2px] h-3.5 w-3.5 rounded-full bg-primary border border-background flex items-center justify-center text-[8px] text-white font-bold">1</span>
                        <p className="font-semibold text-foreground">Choose preferred provider</p>
                        <p className="text-[10px] mt-0.5">Click "Visit Provider" above to start purchase flow on their verified portal.</p>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[27px] top-[2px] h-3.5 w-3.5 rounded-full bg-primary border border-background flex items-center justify-center text-[8px] text-white font-bold">2</span>
                        <p className="font-semibold text-foreground">Purchase digital assets with credit/debit card</p>
                        <p className="text-[10px] mt-0.5">Buy the exact amount needed: {paymentConfigs.supported_currency || 'USDT'}.</p>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[27px] top-[2px] h-3.5 w-3.5 rounded-full bg-primary border border-background flex items-center justify-center text-[8px] text-white font-bold">3</span>
                        <p className="font-semibold text-foreground">Transfer digital currency to platform wallet</p>
                        <p className="text-[10px] mt-0.5">Input the platform wallet address displayed on the next step as destination.</p>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[27px] top-[2px] h-3.5 w-3.5 rounded-full bg-primary border border-background flex items-center justify-center text-[8px] text-white font-bold">4</span>
                        <p className="font-semibold text-foreground">Return here and submit details</p>
                        <p className="text-[10px] mt-0.5">Enter hash/reference key and upload screenshot confirmation receipt.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: PAYMENT INSTRUCTIONS */}
          {step === "instructions" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              
              {/* Crypto instructions layout */}
              {isCrypto && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-border bg-accent/15 text-center">
                      <h4 className="font-serif font-bold text-lg text-foreground">Cryptocurrency Gateway</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Transfer digital currency assets to the secure platform address below.</p>
                    </div>

                    <div className="p-6 flex flex-col items-center border-b border-border bg-card">
                      {/* Zoomable QR code component */}
                      <button 
                        onClick={() => setQrZoomed(!qrZoomed)}
                        className="group relative bg-white p-4 rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-rose-600/30 transition-all focus:outline-none"
                      >
                        <QRCodeSVG value={paymentData?.address || "wallet_address"} size={160} />
                        <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white text-xs font-semibold flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
                            <ZoomIn className="h-4 w-4" /> Zoom QR
                          </span>
                        </div>
                      </button>
                      <p className="text-[10px] text-muted-foreground mt-3 italic">Click QR code to toggle full-screen view</p>
                    </div>

                    <div className="p-5 bg-card space-y-4">
                      {/* Copy Crypto Amount Card */}
                      <div className="border border-border/80 bg-accent/15 rounded-xl p-3.5 flex justify-between items-center">
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">Exact Cryptocurrency Amount</span>
                          <span className="font-mono text-base font-extrabold text-foreground mt-0.5 block">
                            {paymentData?.cryptoAmount} {paymentConfigs.supported_currency}
                          </span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-10 px-4 rounded-lg flex items-center gap-1 font-semibold text-xs transition-all hover:bg-primary/5 hover:border-rose-600/40"
                          onClick={() => handleCopyText(String(paymentData?.cryptoAmount), "crypto_amount")}
                        >
                          {copyStates["crypto_amount"] ? (
                            <><Check className="h-4 w-4 text-primary" /> Copied</>
                          ) : (
                            <><Copy className="h-3.5 w-3.5" /> Copy Amount</>
                          )}
                        </Button>
                      </div>

                      {/* Copy Crypto Wallet Address Card */}
                      <div className="border border-border/80 bg-accent/15 rounded-xl p-3.5 flex justify-between items-center gap-4">
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                            {paymentConfigs.supported_currency} Address ({paymentConfigs.wallet_network})
                          </span>
                          <span className="font-mono text-xs font-semibold text-foreground mt-1 block break-all truncate">
                            {paymentData?.address}
                          </span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-10 px-4 rounded-lg flex items-center gap-1 font-semibold text-xs shrink-0 transition-all hover:bg-primary/5 hover:border-rose-600/40"
                          onClick={() => handleCopyText(String(paymentData?.address), "crypto_address")}
                        >
                          {copyStates["crypto_address"] ? (
                            <><Check className="h-4 w-4 text-primary" /> Copied</>
                          ) : (
                            <><Copy className="h-3.5 w-3.5" /> Copy Address</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bank wire instructions layout */}
              {isBank && (
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm animate-in fade-in duration-300">
                  <div className="p-5 border-b border-border bg-accent/15 text-center">
                    <h4 className="font-serif font-bold text-lg text-foreground">Direct Bank Wire Transfer</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Please transfer your funds using the platform coordinates listed below.</p>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-[1fr_2fr] gap-4 items-center border-b border-border pb-3 text-xs">
                      <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Bank Name</span>
                      <span className="font-bold text-foreground text-right">{paymentConfigs.bank_name}</span>
                    </div>

                    <div className="grid grid-cols-[1fr_2fr] gap-4 items-center border-b border-border pb-3 text-xs">
                      <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Account Name</span>
                      <span className="font-bold text-foreground text-right">{paymentConfigs.account_name}</span>
                    </div>

                    <div className="grid grid-cols-[1fr_2fr] gap-4 items-center border-b border-border pb-3 text-xs">
                      <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Account Number</span>
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-mono font-bold text-foreground">{paymentConfigs.account_number}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleCopyText(paymentConfigs.account_number, "bank_acc")}
                        >
                          {copyStates["bank_acc"] ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr_2fr] gap-4 items-center border-b border-border pb-3 text-xs">
                      <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">SWIFT / Routing</span>
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-mono font-bold text-foreground">{paymentConfigs.routing_number || paymentConfigs.swift_code || "N/A"}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleCopyText(paymentConfigs.routing_number || paymentConfigs.swift_code, "bank_routing")}
                        >
                          {copyStates["bank_routing"] ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr_2fr] gap-4 items-center pt-1 text-xs">
                      <span className="font-semibold text-primary uppercase tracking-wider text-[10px]">Payment Reference</span>
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-mono font-extrabold text-primary bg-primary/100/5 border border-rose-500/10 px-2 py-0.5 rounded-md">{paymentData?.reference}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleCopyText(paymentData?.reference || "", "bank_ref")}
                        >
                          {copyStates["bank_ref"] ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Onboarding timeline checklist */}
              <div className="rounded-2xl border border-border bg-accent/15 p-5 space-y-4">
                <h5 className="font-bold text-xs text-foreground tracking-wider uppercase">Onboarding Checklist:</h5>
                <div className="space-y-3.5 text-xs text-muted-foreground leading-normal">
                  <div className="flex gap-3.5 items-start">
                    <span className="h-5.5 w-5.5 bg-primary/15 text-primary border border-primary/20 rounded-full flex items-center justify-center font-bold shrink-0 text-[10px]">1</span>
                    <p>Initiate transfer with exact balance: <strong className="text-foreground">{formatMoney(currentAmount, property.currency)}</strong>.</p>
                  </div>
                  <div className="flex gap-3.5 items-start">
                    <span className="h-5.5 w-5.5 bg-primary/15 text-primary border border-primary/20 rounded-full flex items-center justify-center font-bold shrink-0 text-[10px]">2</span>
                    <p>Ensure wire transfers contain the payment reference code: <strong className="font-mono text-foreground font-bold">{paymentData?.reference}</strong> inside the transfer narrative field.</p>
                  </div>
                  <div className="flex gap-3.5 items-start">
                    <span className="h-5.5 w-5.5 bg-primary/15 text-primary border border-primary/20 rounded-full flex items-center justify-center font-bold shrink-0 text-[10px]">3</span>
                    <p>Capture screenshot or export PDF receipt once transaction is finalized.</p>
                  </div>
                  <div className="flex gap-3.5 items-start">
                    <span className="h-5.5 w-5.5 bg-primary/15 text-primary border border-primary/20 rounded-full flex items-center justify-center font-bold shrink-0 text-[10px]">4</span>
                    <p>Click "I have made the payment" to upload confirmation documentation.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: PROOF OF PAYMENT SUBMISSION */}
          {step === "proof" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label className="font-bold text-xs text-muted-foreground uppercase tracking-widest block">Transaction ID / Hash Reference</Label>
                <Input 
                  placeholder="Enter the transaction reference, SWIFT receipt ID, or hash..." 
                  value={hash} 
                  onChange={(e) => setHash(e.target.value)} 
                  className="h-13 rounded-xl border-border bg-accent/40 focus:bg-background transition-all font-bold text-sm focus-visible:ring-rose-600/40"
                />
                <p className="text-[10px] text-muted-foreground">Please double check that transaction reference matches your financial receipt.</p>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-xs text-muted-foreground uppercase tracking-widest block">Proof of Payment</Label>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*,.pdf" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }} 
                />
                
                {proofUrl ? (
                  <div className="relative rounded-2xl border border-rose-600/30 overflow-hidden group shadow-sm bg-accent/20">
                    <div className="aspect-[16/9] w-full flex items-center justify-center p-3">
                      {proofUrl.endsWith('.pdf') ? (
                        <div className="flex flex-col items-center gap-2">
                          <Eye className="h-10 w-10 text-primary" />
                          <span className="font-bold text-xs text-foreground">PDF Receipt Loaded</span>
                        </div>
                      ) : (
                        <img src={proofUrl} alt="Receipt proof preview" className="max-h-full max-w-full object-contain rounded-lg" />
                      )}
                    </div>
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" className="rounded-xl font-semibold border-rose-600/30 hover:bg-primary/5 text-xs h-10" onClick={() => fileInputRef.current?.click()}>
                        Replace Verification Document
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "w-full h-44 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer select-none",
                      isDragOver ? "border-rose-600 bg-primary/100/5 scale-[1.01]" : "border-border hover:border-rose-600/40 hover:bg-accent/40",
                      uploadingProof && "pointer-events-none opacity-50"
                    )}
                  >
                    {uploadingProof ? (
                      <>
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="font-bold text-xs mt-2 text-foreground">Uploading document proof...</p>
                      </>
                    ) : (
                      <>
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Upload className="h-6 w-6 text-primary" />
                        </div>
                        <p className="font-bold text-xs mt-1 text-foreground">Drag and drop file or click to browse</p>
                        <p className="text-[10px] text-muted-foreground">Supported file formats: JPEG, PNG, or PDF</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: PENDING CONFIRMATION STATE */}
          {step === "confirm" && (
            <div className="py-8 flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center animate-bounce [animation-duration:1500ms]">
                <CheckCircle2 className="h-10 w-10 text-primary" />
              </div>
              
              <div className="space-y-2 max-w-sm mx-auto">
                <span className="text-[10px] uppercase tracking-wider text-primary bg-primary/100/5 border border-rose-500/10 px-2 py-0.5 rounded font-extrabold">
                  Status: payment_under_review
                </span>
                <h3 className="font-serif text-2xl font-bold text-foreground pt-1.5">Onboarding Initialized</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  Your fractional investment payment has been submitted successfully and is currently awaiting admin verification.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-accent/10 p-5 max-w-md text-xs text-left space-y-3.5">
                <div className="flex gap-3">
                  <Clock className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                  <p><strong>Verification Timelines</strong>: Human audit takes approximately 1-2 business days. Fractional blocks remain reserved.</p>
                </div>
                <div className="flex gap-3">
                  <Building2 className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                  <p><strong>Dashboard Status Update</strong>: Your Unified Dashboard updates automatically to `confirmed` status post verification.</p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                  <p><strong>Confirmation Correspondence</strong>: You will receive direct email receipt confirmation and institutional ownership certificate links immediately upon clearance.</p>
                </div>
              </div>
            </div>
          )}

        </DialogBody>

        {/* Sticky Mobile Footer Controls */}
        <DialogFooter className="p-6 md:p-8 bg-accent/20 border-t border-border/40 shrink-0 flex flex-row items-center gap-3">
          {step === "summary" && (
            <Button className="w-full h-13 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 text-white" onClick={() => setStep("acknowledgement")}>
              Continue to Terms <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {step === "acknowledgement" && (
            <div className="flex gap-2.5 w-full">
              <Button variant="outline" className="h-13 w-13 shrink-0 rounded-xl" onClick={() => setStep("summary")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button className="flex-1 h-13 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 text-white" disabled={!ackChecked} onClick={() => setStep("method")}>
                I Understand <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
          {step === "method" && (
            <div className="flex gap-2.5 w-full">
              <Button variant="outline" className="h-13 w-13 shrink-0 rounded-xl" onClick={() => setStep("acknowledgement")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button className="flex-1 h-13 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 text-white" disabled={loading} onClick={handleCreateInvestment}>
                {loading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <>Confirm Method <ChevronRight className="ml-1 h-4 w-4" /></>}
              </Button>
            </div>
          )}
          {step === "instructions" && (
            <div className="flex gap-2.5 w-full">
              <Button variant="outline" className="h-13 w-13 shrink-0 rounded-xl" onClick={() => setStep("method")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button className="flex-1 h-13 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 text-white" onClick={() => setStep("proof")}>
                I have made the payment
              </Button>
            </div>
          )}
          {step === "proof" && (
            <div className="flex gap-2.5 w-full">
              <Button variant="outline" className="h-13 w-13 shrink-0 rounded-xl" onClick={() => setStep("instructions")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button className="flex-1 h-13 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 text-white" disabled={loading || !hash || !proofUrl} onClick={handleSubmitProof}>
                {loading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : "Submit Verification proof"}
              </Button>
            </div>
          )}
          {step === "confirm" && (
            <Button className="w-full h-13 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 text-white" onClick={() => {
              onClose();
              window.location.href = "/dashboard?tab=investments";
            }}>
              Go to Dashboard
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* QR Code zoomed view dialog */}
      <Dialog open={qrZoomed} onOpenChange={setQrZoomed}>
        <DialogContent className="max-w-sm p-8 flex flex-col items-center justify-center text-center gap-4 rounded-2xl border-none">
          <DialogHeader className="p-0 text-center sm:text-center">
            <DialogTitle className="text-lg font-bold font-serif">Wallet Address QR Code</DialogTitle>
          </DialogHeader>
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm mt-2">
            <QRCodeSVG value={paymentData?.address || "wallet_address"} size={220} />
          </div>
          <div className="text-xs text-muted-foreground mt-2 leading-relaxed">
            <p>Wallet Address Network: <strong>{paymentConfigs.wallet_network}</strong></p>
            <p className="font-mono mt-1 font-bold text-foreground break-all">{paymentData?.address}</p>
          </div>
          <Button className="w-full h-11 text-xs font-semibold rounded-xl mt-4 bg-primary hover:bg-primary/90 text-white" onClick={() => setQrZoomed(false)}>
            Close Zoomed View
          </Button>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
