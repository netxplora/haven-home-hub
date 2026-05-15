import { useState } from "react";
import { 
  CalendarClock, 
  ShieldCheck, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  Wallet,
  Clock,
  XCircle
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogBody,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatMoney } from "@/lib/invest";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { PaymentMethodPicker, PaymentMethod } from "@/components/payments/PaymentMethodPicker";
import { Badge } from "@/components/ui/badge";
import { ManualPaymentModal } from "@/components/dashboard/ManualPaymentModal";
import { useNavigate } from "react-router-dom";

interface ReserveDialogProps {
  open: boolean;
  onClose: () => void;
  property: {
    id: string;
    title: string;
    currency: string;
  };
  type?: "property" | "investment";
}

export function ReserveDialog({ open, onClose, property, type = "property" }: ReserveDialogProps) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<"confirm" | "submitting" | "success">("confirm");
  const [method, setMethod] = useState<PaymentMethod>("crypto");
  const [cryptoOpen, setCryptoOpen] = useState(false);
  const reservationFee = 500; 

  // Fetch existing reservation
  const { data: existingReservation, isLoading: isLoadingRes, refetch: refetchRes } = useQuery({
    queryKey: ["my-reservation", property.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reservations")
        .select("*")
        .eq("user_id", user?.id)
        .eq("related_id", property.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && open,
  });

  const { data: balance = 0 } = useQuery({
    queryKey: ["user-balance"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("user_available_balance");
      if (error) throw error;
      return Number(data || 0);
    },
    enabled: open,
  });

  async function handleReserve() {
    setStep("submitting");
    try {
      // Create reservation record for admin review
      const { data, error } = await supabase.from("reservations").insert({
        user_id: user?.id,
        type: type,
        related_id: property.id,
        property_id: type === "property" ? property.id : null,
        investment_property_id: type === "investment" ? property.id : null,
        status: "awaiting_reservation_fee",
        reservation_fee_status: "pending"
      } as any).select().single();

      if (error) throw error;

      await refetchRes();
      toast({
        title: "Reservation Requested",
        description: "Please complete your reservation fee payment to proceed.",
      });
      // Do not change step to success, let existingReservation trigger the payment screen
    } catch (e: any) {
      toast({ 
        title: "Request failed", 
        description: e.message || "Please try again later.", 
        variant: "destructive" 
      });
      setStep("confirm");
    }
  }

  async function handlePayment() {
    if (method === "crypto" || method === "manual_bank") {
      setCryptoOpen(true);
      return;
    }
    
    toast({
      title: "Invalid Method",
      description: "Please select a valid payment method.",
      variant: "destructive"
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-background shadow-2xl">
          <DialogHeader className="p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b border-primary/10">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
              <CalendarClock className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="font-serif text-3xl font-bold text-foreground">Property Reservation</DialogTitle>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Place a hold on <span className="font-semibold text-foreground">{property.title}</span>.
            </p>
          </DialogHeader>

          <DialogBody className="p-8 space-y-6">
            {step === "confirm" && !existingReservation && (
              <div className="space-y-6 ">
                <div className="rounded-xl bg-secondary/10 border border-secondary/20 p-6 shadow-inner">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reservation Fee</span>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">Exclusive Hold</Badge>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-3xl font-bold font-serif text-secondary-foreground">{formatMoney(reservationFee, "USD")}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tighter">Fully refundable if purchase proceeds</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-primary">Required Now</p>
                      <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tighter">Initial Step</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">Your reservation request requires an initial reservation fee to be processed.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">You will be prompted to complete the payment immediately to lock your request.</p>
                  </div>
                </div>
              </div>
            )}

            {step === "confirm" && (existingReservation?.status as any) === "under_admin_review" && (
              <div className="flex flex-col items-center justify-center gap-6 py-8 text-center">
                <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-amber-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Under Review</h3>
                  <p className="text-sm text-muted-foreground mt-2 px-4">
                    Our team is currently reviewing your request. You will be notified once it has been confirmed.
                  </p>
                </div>
              </div>
            )}

            {step === "confirm" && existingReservation?.status === "awaiting_reservation_fee" && (
              <div className="space-y-6">
                <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    </div>
                    <p className="font-bold text-amber-700">Payment Required</p>
                  </div>
                  <p className="text-sm text-amber-600/80">
                    Your reservation is locked. Please complete the reservation fee payment. Admin review will begin once your payment is verified.
                  </p>
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Payment Method</Label>
                  <PaymentMethodPicker value={method} onChange={setMethod} availableBalance={balance} />
                </div>
              </div>
            )}

            {step === "confirm" && (existingReservation?.status as any) === "rejected" && (
              <div className="flex flex-col items-center justify-center gap-6 py-8 text-center">
                <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-red-600">Request Not Approved</h3>
                  <p className="text-sm text-muted-foreground mt-2 px-4">
                    {(existingReservation as any)?.rejection_reason || "Unfortunately, your request was not approved at this time."}
                  </p>
                </div>
              </div>
            )}


            {step === "submitting" && (
              <div className="flex flex-col items-center justify-center gap-6 py-12 animate-in fade-in zoom-in duration-500">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                  <Loader2 className="h-10 w-10 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center space-y-2">
                  <p className="font-bold text-xl text-foreground">Processing Request</p>
                  <p className="text-sm text-muted-foreground">Connecting to our secure system...</p>
                </div>
              </div>
            )}

            {step === "success" && (
              <div className="flex flex-col items-center justify-center gap-6 py-8 animate-in fade-in zoom-in duration-500">
                <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
                <div className="text-center space-y-2">
                  <p className="font-bold text-2xl text-foreground">Success!</p>
                  <p className="text-sm text-muted-foreground max-w-[240px]">
                    Your reservation request has been received and is currently under review. 
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 p-4 flex gap-3">
              <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-[10px] leading-relaxed text-amber-800 dark:text-amber-300 italic">
                Our team will review your account and the property availability. Once confirmed, you will receive a notification to complete the payment.
              </p>
            </div>
          </DialogBody>

          <DialogFooter className="p-10 bg-accent/30 border-t border-border/40">
            {step === "confirm" && !existingReservation && (
              <Button
                className="w-full h-14 bg-primary text-primary-foreground hover:opacity-90 rounded-xl font-bold shadow-sm transition-all active:scale-[0.98]"
                onClick={handleReserve}
              >
                Place Reservation Hold
              </Button>
            )}
            {step === "confirm" && existingReservation?.status === "awaiting_reservation_fee" && (
              <Button
                className="w-full h-14 bg-secondary text-secondary-foreground hover:opacity-90 rounded-xl font-bold shadow-sm transition-all active:scale-[0.98]"
                onClick={handlePayment}
              >
                Complete Payment
              </Button>
            )}
            {step === "confirm" && ((existingReservation?.status as any) === "under_admin_review" || (existingReservation?.status as any) === "rejected") && (
              <Button
                variant="outline"
                className="w-full h-14 rounded-xl font-bold border-border/60 hover:bg-accent/50"
                onClick={onClose}
              >
                Return to Portal
              </Button>
            )}
            {step === "success" && (
              <Button
                className="w-full h-14 bg-primary text-primary-foreground hover:opacity-90 rounded-xl font-bold shadow-sm transition-all"
                onClick={() => {
                  nav("/dashboard?tab=reservations");
                  onClose();
                }}
              >
                View in Dashboard
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManualPaymentModal
        open={cryptoOpen}
        method={method as any}
        onClose={() => {
          setCryptoOpen(false);
          onClose();
        }}
        onSuccess={async () => {
          await refetchRes();
        }}
        amount={reservationFee}
        currency="USD"
        paymentType="reservation"
        targetId={property.id}
        bookingId={existingReservation?.id} // passing reservation id through bookingId to payments
        isInvestmentProperty={type === "investment"}
        holdHours={48}
        metadata={{
          reservation_type: type === "investment" ? "investment_property" : "property",
          property_title: property.title
        }}
      />
    </>
  );
}
