import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight, ArrowLeft, Loader2, CheckCircle2, ShieldCheck, Wallet, Copy, Upload, Building2, ExternalLink, Clock } from "lucide-react";
import { formatMoney, InvestmentProperty, fundingPercent, availableUnits } from "@/lib/invest";
import { PaymentMethodPicker, type PaymentMethod } from "@/components/payments/PaymentMethodPicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { QRCodeSVG } from "qrcode.react";
import { useQuery } from "@tanstack/react-query";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch unified payment methods to display instructions
  const { data: methods = [] } = useQuery({
    queryKey: ["all-payment-methods"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("payment_methods").select("*").eq("is_active", true).order("display_order", { ascending: true });
      return data || [];
    }
  });

  const paymentMethodData = methods.find((m: any) => m.payment_category === method);
  const paymentConfigs = paymentMethodData?.configuration || {};
  const isCrypto = method === "digital_currency";
  const isBank = method === "bank_transfer";
  const isThirdParty = method === "third_party_provider";
  
  const currentAmount = investMode === "installment" ? downPaymentAmount : totalAmount;

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
    }
  }, [open]);

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
        // Mock rate logic
        let rate = 1;
        if (paymentConfigs.supported_currency === 'BTC') rate = 0.00002;
        else if (paymentConfigs.supported_currency === 'ETH') rate = 0.0004;
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
      const { data: currentPayment } = await (supabase as any).from("payments").select("metadata").eq("reference", paymentData?.reference).single();
      const currentMetadata = currentPayment?.metadata || {};
      const { error } = await (supabase as any).from("payments").update({ 
        transaction_hash: hash || null, 
        status: "processing",
        metadata: { ...currentMetadata, proof_url: proofUrl }
      }).eq("reference", paymentData?.reference);
      if (error) throw error;
      setStep("confirm");
      toast({ title: "Payment processing", description: "Your payment has been submitted and is under review." });
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
    setUploadingProof(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Math.random()}.${ext}`;
      const filePath = `${user?.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("payment_receipts").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("payment_receipts").getPublicUrl(filePath);
      setProofUrl(data.publicUrl);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingProof(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-none bg-background shadow-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b border-primary/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            {step !== "confirm" && (
              <div className="flex gap-2">
                {["summary", "acknowledgement", "method", "instructions", "proof"].map((s, i) => {
                  const steps = ["summary", "acknowledgement", "method", "instructions", "proof"];
                  const currentIdx = steps.indexOf(step);
                  return (
                    <div key={s} className={`h-1.5 w-8 rounded-full transition-all ${i <= currentIdx ? "bg-primary" : "bg-primary/20"}`} />
                  );
                })}
              </div>
            )}
          </div>
          <DialogTitle className="font-serif text-3xl font-bold text-foreground">
            {step === "summary" && "Investment Summary"}
            {step === "acknowledgement" && "Investor Acknowledgement"}
            {step === "method" && "Payment Method"}
            {step === "instructions" && "Payment Instructions"}
            {step === "proof" && "Submit Proof of Payment"}
            {step === "confirm" && "Pending Confirmation"}
          </DialogTitle>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {step === "summary" && `You are about to make a fractional ownership investment payment for ${property.title}.`}
            {step === "acknowledgement" && "Please review and acknowledge the investment terms before proceeding."}
            {step === "method" && "Select your preferred payment method."}
            {step === "instructions" && "Follow the instructions below to complete your payment."}
            {step === "proof" && "Upload your payment receipt to complete the transaction."}
            {step === "confirm" && "Your investment payment has been submitted successfully."}
          </p>
        </DialogHeader>

        <DialogBody className="p-8 overflow-y-auto space-y-6">
          {step === "summary" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="rounded-xl border border-border/50 overflow-hidden shadow-sm">
                <div className="p-5 bg-card flex gap-4">
                  <div className="h-20 w-20 rounded-lg overflow-hidden shrink-0 bg-accent">
                    <img src={property.cover_image_url} alt={property.title} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{property.title}</h3>
                    <p className="text-sm text-muted-foreground">{property.location}, {property.city}</p>
                    <div className="mt-2 flex gap-2">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md font-medium">{property.property_category || "Real Estate"}</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border/50 bg-accent/20 p-5 grid grid-cols-2 gap-y-4 gap-x-6">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Selected Units</p>
                    <p className="font-serif font-bold text-lg">{units.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Price per Unit</p>
                    <p className="font-serif font-bold text-lg">{formatMoney(Number(property.unit_price), property.currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Total Investment</p>
                    <p className="font-serif font-bold text-lg text-primary">{formatMoney(totalAmount, property.currency)}</p>
                  </div>
                  {investMode === "installment" && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Initial Payment Due</p>
                      <p className="font-serif font-bold text-lg text-amber-600">{formatMoney(downPaymentAmount, property.currency)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Estimated ROI</p>
                    <p className="font-serif font-bold text-lg">{property.projected_return_min}% - {property.projected_return_max}%</p>
                  </div>
                </div>
              </div>
              
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
                <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                  Projected returns are estimated and begin accumulating after all investment units for this property have been fully subscribed.
                </p>
              </div>
            </div>
          )}

          {step === "acknowledgement" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="rounded-xl bg-accent p-6 border border-border/50 space-y-4">
                <h4 className="font-bold text-lg font-serif">Investor Agreement</h4>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <p>By proceeding, you acknowledge that:</p>
                  <ul className="space-y-3">
                    <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-primary shrink-0" /> You are purchasing fractional ownership units in {property.title}.</li>
                    <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-primary shrink-0" /> Investment performance and growth updates will be shared through the investor dashboard and email notifications.</li>
                    <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-primary shrink-0" /> Returns are projected and subject to market conditions.</li>
                    <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-primary shrink-0" /> Your investment will remain in a "Pending" state until administrative verification of your payment is complete.</li>
                  </ul>
                </div>
              </div>
              <label className="flex items-start gap-3 p-4 border border-border/50 rounded-xl cursor-pointer hover:bg-accent/50 transition-colors">
                <Checkbox checked={ackChecked} onCheckedChange={(c) => setAckChecked(!!c)} className="mt-1" />
                <div>
                  <p className="font-bold">I acknowledge and understand the terms</p>
                  <p className="text-xs text-muted-foreground mt-1">I have read the investment breakdown and am ready to proceed with funding.</p>
                </div>
              </label>
            </div>
          )}

          {step === "method" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <PaymentMethodPicker value={method} onChange={setMethod} />
            </div>
          )}

          {step === "instructions" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              {isCrypto && (
                <div className="space-y-6">
                  <div className="rounded-xl bg-accent p-6 border border-border/50 text-center">
                    <h4 className="font-bold text-lg font-serif mb-4">Transfer Digital Currency</h4>
                    <div className="bg-white p-4 rounded-xl inline-block mx-auto mb-6">
                      <QRCodeSVG value={paymentData?.address || "address"} size={160} />
                    </div>
                    <div className="space-y-4 text-left">
                      <div className="bg-background rounded-lg p-3 border border-border/50">
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Exact Amount to Send</p>
                        <div className="flex justify-between items-center">
                          <p className="font-mono text-lg font-bold">{paymentData?.cryptoAmount} {paymentConfigs.supported_currency}</p>
                          <Button variant="ghost" size="icon" onClick={() => {
                            navigator.clipboard.writeText(String(paymentData?.cryptoAmount));
                            toast({ title: "Copied" });
                          }}><Copy className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <div className="bg-background rounded-lg p-3 border border-border/50">
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">{paymentConfigs.supported_currency} Wallet Address ({paymentConfigs.wallet_network})</p>
                        <div className="flex justify-between items-center gap-2">
                          <p className="font-mono text-sm break-all">{paymentData?.address}</p>
                          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => {
                            navigator.clipboard.writeText(String(paymentData?.address));
                            toast({ title: "Copied" });
                          }}><Copy className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/50 p-5 space-y-4">
                    <h4 className="font-bold text-sm">Need Digital Currency?</h4>
                    <p className="text-xs text-muted-foreground">Buy digital currency instantly using your debit or credit card through our approved partners.</p>
                    <div className="grid gap-3">
                      {methods.filter((m: any) => m.payment_category === "third_party_provider").map((provider: any) => (
                        <div key={provider.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-accent/30">
                          <div>
                            <p className="font-bold text-sm">{provider.method_name}</p>
                            <p className="text-xs text-muted-foreground">{provider.description}</p>
                          </div>
                          <Button asChild size="sm" variant="outline">
                            <a href={provider.configuration.provider_url} target="_blank" rel="noopener noreferrer">
                              Visit Provider <ExternalLink className="ml-2 h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {isBank && (
                <div className="rounded-xl bg-accent p-6 border border-border/50">
                  <h4 className="font-bold text-lg font-serif mb-6 text-center">Wire Transfer Instructions</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-[1fr_2fr] gap-4 border-b border-border/50 pb-3">
                      <span className="text-sm font-bold text-muted-foreground">Bank Name</span>
                      <span className="text-sm font-medium text-right">{paymentConfigs.bank_name}</span>
                    </div>
                    <div className="grid grid-cols-[1fr_2fr] gap-4 border-b border-border/50 pb-3">
                      <span className="text-sm font-bold text-muted-foreground">Account Name</span>
                      <span className="text-sm font-medium text-right">{paymentConfigs.account_name}</span>
                    </div>
                    <div className="grid grid-cols-[1fr_2fr] gap-4 border-b border-border/50 pb-3">
                      <span className="text-sm font-bold text-muted-foreground">Account Number</span>
                      <span className="text-sm font-mono text-right flex items-center justify-end gap-2">
                        {paymentConfigs.account_number}
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                          navigator.clipboard.writeText(paymentConfigs.account_number);
                          toast({ title: "Copied" });
                        }}><Copy className="h-3 w-3" /></Button>
                      </span>
                    </div>
                    <div className="grid grid-cols-[1fr_2fr] gap-4 border-b border-border/50 pb-3">
                      <span className="text-sm font-bold text-muted-foreground">Routing / SWIFT</span>
                      <span className="text-sm font-mono text-right flex items-center justify-end gap-2">
                        {paymentConfigs.routing_number || paymentConfigs.swift_code || "N/A"}
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                          navigator.clipboard.writeText(paymentConfigs.routing_number || paymentConfigs.swift_code);
                          toast({ title: "Copied" });
                        }}><Copy className="h-3 w-3" /></Button>
                      </span>
                    </div>
                    <div className="grid grid-cols-[1fr_2fr] gap-4 pt-2">
                      <span className="text-sm font-bold text-muted-foreground">Payment Reference</span>
                      <span className="text-sm font-bold text-primary text-right flex items-center justify-end gap-2">
                        {paymentData?.reference}
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                          navigator.clipboard.writeText(paymentData?.reference || "");
                          toast({ title: "Copied" });
                        }}><Copy className="h-3 w-3" /></Button>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-border/50 p-4 space-y-4">
                <h5 className="font-bold text-sm">Investor Guidance Checklist</h5>
                <div className="space-y-3">
                  <div className="flex gap-3 text-sm"><div className="bg-primary/20 text-primary h-5 w-5 flex items-center justify-center rounded-full text-xs font-bold shrink-0">1</div> Initiate the transfer using the exact details provided.</div>
                  <div className="flex gap-3 text-sm"><div className="bg-primary/20 text-primary h-5 w-5 flex items-center justify-center rounded-full text-xs font-bold shrink-0">2</div> Make sure to include the Reference Code if required.</div>
                  <div className="flex gap-3 text-sm"><div className="bg-primary/20 text-primary h-5 w-5 flex items-center justify-center rounded-full text-xs font-bold shrink-0">3</div> Save a screenshot or PDF of your transfer receipt.</div>
                  <div className="flex gap-3 text-sm"><div className="bg-primary/20 text-primary h-5 w-5 flex items-center justify-center rounded-full text-xs font-bold shrink-0">4</div> Click "I have made the payment" to upload your proof.</div>
                </div>
              </div>
            </div>
          )}

          {step === "proof" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-4">
                <Label className="font-bold text-sm">Transaction Reference / Hash</Label>
                <Input 
                  placeholder="Enter the transaction ID or hash..." 
                  value={hash} 
                  onChange={(e) => setHash(e.target.value)} 
                  className="h-14 rounded-xl"
                />
              </div>

              <div className="space-y-4">
                <Label className="font-bold text-sm">Proof of Payment</Label>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
                
                {proofUrl ? (
                  <div className="relative rounded-xl border border-primary/30 overflow-hidden group">
                    <div className="aspect-video w-full bg-accent/30 flex items-center justify-center p-2">
                      <img src={proofUrl} alt="Proof" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Replace File</Button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingProof}
                    className="w-full h-40 border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 rounded-xl flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {uploadingProof ? <Loader2 className="h-8 w-8 text-primary animate-spin" /> : <Upload className="h-8 w-8 text-muted-foreground" />}
                    <p className="font-bold text-sm mt-2">{uploadingProof ? "Uploading..." : "Click to upload receipt"}</p>
                    <p className="text-xs text-muted-foreground">JPEG, PNG, or PDF</p>
                  </button>
                )}
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className="py-12 flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="h-24 w-24 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <div className="space-y-2">
                <h3 className="font-serif text-3xl font-bold">Payment Submitted</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Your investment payment has been submitted successfully and is currently awaiting admin verification.
                </p>
              </div>
              <div className="rounded-xl border border-border/50 bg-accent/30 p-5 max-w-md text-sm text-left space-y-3">
                <div className="flex gap-3"><Clock className="h-5 w-5 text-primary shrink-0" /> Verification may take 1-2 business days.</div>
                <div className="flex gap-3"><Building2 className="h-5 w-5 text-primary shrink-0" /> Your dashboard will automatically update once confirmed.</div>
                <div className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-primary shrink-0" /> You will receive an email and in-app notification upon approval.</div>
              </div>
            </div>
          )}

        </DialogBody>

        <DialogFooter className="p-8 bg-accent/30 border-t border-border/40 shrink-0">
          {step === "summary" && (
            <Button className="w-full h-14 text-lg font-bold rounded-xl" onClick={() => setStep("acknowledgement")}>
              Continue to Terms <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          )}
          {step === "acknowledgement" && (
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="h-14 w-14 shrink-0 rounded-xl" onClick={() => setStep("summary")}><ArrowLeft className="h-5 w-5" /></Button>
              <Button className="flex-1 h-14 text-lg font-bold rounded-xl" disabled={!ackChecked} onClick={() => setStep("method")}>
                I Understand <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}
          {step === "method" && (
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="h-14 w-14 shrink-0 rounded-xl" onClick={() => setStep("acknowledgement")}><ArrowLeft className="h-5 w-5" /></Button>
              <Button className="flex-1 h-14 text-lg font-bold rounded-xl" disabled={loading} onClick={handleCreateInvestment}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Confirm Method <ChevronRight className="ml-2 h-5 w-5" /></>}
              </Button>
            </div>
          )}
          {step === "instructions" && (
            <div className="flex gap-3 w-full">
              <Button className="w-full h-14 text-lg font-bold rounded-xl" onClick={() => setStep("proof")}>
                I have made the payment
              </Button>
            </div>
          )}
          {step === "proof" && (
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="h-14 w-14 shrink-0 rounded-xl" onClick={() => setStep("instructions")}><ArrowLeft className="h-5 w-5" /></Button>
              <Button className="flex-1 h-14 text-lg font-bold rounded-xl" disabled={loading || !hash || !proofUrl} onClick={handleSubmitProof}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit Proof"}
              </Button>
            </div>
          )}
          {step === "confirm" && (
            <Button className="w-full h-14 text-lg font-bold rounded-xl" onClick={() => {
              onClose();
              window.location.href = "/dashboard?tab=investments";
            }}>
              Go to Dashboard
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
