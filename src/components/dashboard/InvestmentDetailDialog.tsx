import { useState } from "react";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, AlertCircle, Receipt, ArrowRight, ShieldCheck, FileText } from "lucide-react";
import { formatMoney } from "@/lib/invest";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PaymentMethodPicker, type PaymentMethod } from "@/components/payments/PaymentMethodPicker";
import { ManualPaymentModal } from "@/components/dashboard/ManualPaymentModal";

interface InvestmentDetailDialogProps {
  investment: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvestmentDetailDialog({ investment, open, onOpenChange }: InvestmentDetailDialogProps) {
  const qc = useQueryClient();
  const [payingSchedule, setPayingSchedule] = useState<any | null>(null);
  const [payingFull, setPayingFull] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("crypto");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  // Fetch installment schedules
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["investment-schedules", investment?.id],
    enabled: !!investment?.id && investment?.investment_type === "installment",
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("investment_schedules")
        .select("*")
        .eq("investment_id", investment.id)
        .order("due_date", { ascending: true });
      if (error) {
        console.error("Error fetching schedules:", error);
        return [];
      }
      return data ?? [];
    },
  });

  // Fetch certificate
  const { data: certificate, isLoading: isCertLoading } = useQuery({
    queryKey: ["investment-certificate", investment?.id],
    enabled: !!investment?.id && (investment?.status === "active" || investment?.status === "confirmed"),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("investment_certificates")
        .select("*")
        .eq("investment_id", investment.id)
        .maybeSingle();
      if (error) {
        console.error("Error fetching certificate:", error);
        return null;
      }
      return data;
    },
  });

  if (!investment) return null;

  const isInstallment = investment.investment_type === "installment";
  const currency = investment.investment_properties?.currency ?? "USD";
  const total = Number(investment.total_amount ?? investment.amount_invested ?? 0);
  const paid = Number(investment.amount_paid ?? investment.amount_invested ?? 0);
  const balance = Number(investment.remaining_balance ?? 0);
  const progressPercent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const isPendingApproval = investment.status === "pending_review" || investment.status === "pending_verification";
  const isRejected = investment.status === "rejected";
  const isApproved = investment.status === "confirmed" || investment.status === "active";

  const handlePayFull = async () => {
    if (!isApproved) {
      toast({ 
        title: "Payment Locked", 
        description: "Your investment must be approved by an admin before you can make payments.", 
        variant: "destructive" 
      });
      return;
    }
    setPayingFull(true);
    setPaymentModalOpen(true);
  };

  const handlePayInstallment = async (schedule: any) => {
    if (!isApproved) {
      toast({ 
        title: "Payment Locked", 
        description: "Your investment must be approved by an admin before you can make payments.", 
        variant: "destructive" 
      });
      return;
    }
    setPayingSchedule(schedule);
    setPaymentModalOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-card">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl flex items-center justify-between">
              <span>{investment.investment_properties?.title ?? "Investment Details"}</span>
              <Badge 
                variant="secondary"
                className={cn(
                  "capitalize border font-semibold text-[10px] tracking-widest",
                  (investment.status === "confirmed" || investment.status === "active" || investment.status === "success") && "bg-primary text-primary-foreground border-none shadow-sm",
                  (investment.status === "pending_review" || investment.status === "pending_verification") && "bg-secondary/10 text-secondary border-secondary/20",
                  investment.status === "rejected" && "bg-destructive/10 text-destructive border-destructive/20",
                  investment.status === "completed" && "bg-primary text-primary-foreground border-none shadow-sm"
                )}
              >
                {investment.status?.replace('_', ' ')}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {isInstallment ? "Installment Plan Overview" : "Full Payment Investment Overview"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[70vh] px-6 pb-6">
          <div className="space-y-8 mt-6">
            
            {(investment.status === "pending_review" || investment.status === "pending_verification") && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 flex gap-4">
                <Clock className="h-6 w-6 text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-900 leading-none mb-2">Awaiting Verification</h4>
                  <p className="text-sm text-amber-800/80">
                    Your investment application and payment are currently being verified by our administrative team. 
                    Your certificate will be issued once approved.
                  </p>
                </div>
              </div>
            )}

            {investment.status === "rejected" && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 flex gap-4">
                <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-red-900 leading-none mb-2">Application Rejected</h4>
                  <p className="text-sm text-red-800/80">
                    Unfortunately, your investment application was not approved at this time. 
                    Please contact support for more information.
                  </p>
                </div>
              </div>
            )}
            {/* Progress Section */}
            <div className="rounded-xl border border-border bg-secondary/20 p-5">
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-muted-foreground">Payment Progress</span>
                <span className="font-bold">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2 mb-4" />
              
              <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border/40 bg-card p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Total Cost</p>
                <p className="font-serif text-2xl font-bold">{formatMoney(total)}</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-card p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Amount Paid</p>
                <p className="font-serif text-2xl font-bold text-primary">{formatMoney(paid)}</p>
              </div>
            </div>

            {certificate && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold">Official Investment Certificate</h4>
                    <p className="text-sm text-muted-foreground">ID: {certificate.certificate_id}</p>
                  </div>
                </div>
                <Button variant="outline" className="shrink-0" onClick={() => window.open(`/certificate/${certificate.id}`, '_blank')}>
                  <FileText className="h-4 w-4 mr-2" /> View Certificate
                </Button>
              </div>
            )}

            {isInstallment && (
                <div className="grid grid-cols-3 gap-4 text-center mt-4 pt-4 border-t border-border/50">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Initial Payment</p>
                    <p className="font-mono font-semibold mt-1">{formatMoney(Number(investment.down_payment_amount ?? 0), currency)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Monthly</p>
                    <p className="font-mono font-semibold mt-1">{formatMoney(Number(investment.monthly_installment_amount ?? 0), currency)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Duration</p>
                    <p className="font-semibold mt-1">{investment.duration_months ?? "—"} months</p>
                  </div>
                </div>
              )}

              {isInstallment && investment.next_payment_due && isApproved && investment.status !== "completed" && (
                <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Next Payment Due</p>
                  <p className="text-sm font-bold text-amber-600">{format(new Date(investment.next_payment_due), "MMM dd, yyyy")}</p>
                </div>
              )}
            </div>

            {/* Full Payment Section */}
            {!isInstallment && investment.status === "confirmed" && paid < total && (
               <div className="space-y-4">
                 <h3 className="font-serif text-lg font-semibold border-b border-border pb-2">Complete Investment</h3>
                 <div className="flex items-center justify-between p-5 rounded-xl border border-primary/20 bg-primary/5">
                   <div>
                     <p className="font-bold text-foreground">Total Due: {formatMoney(total - paid, currency)}</p>
                     <p className="text-xs text-muted-foreground mt-1">Pay the full amount to activate your investment.</p>
                   </div>
                   <Button onClick={() => handlePayFull()} className="rounded-lg px-6 font-bold">
                     Pay Now
                   </Button>
                 </div>
               </div>
            )}

            {/* Schedule Section */}
            {isInstallment && (
              <div className="space-y-4">
                <h3 className="font-serif text-lg font-semibold border-b border-border pb-2">Installment Schedule</h3>
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : schedules.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No schedules generated.</p>
                ) : (
                  <div className="space-y-3">
                    {schedules.map((schedule: any, idx: number) => {
                      const isPaid = schedule.status === "paid";
                      const isOverdue = schedule.status === "overdue" || (new Date(schedule.due_date) < new Date() && !isPaid);
                      
                      return (
                        <div key={schedule.id} className={`flex items-center justify-between p-4 rounded-xl border ${isPaid ? 'bg-secondary/10 border-border/50' : isOverdue ? 'bg-destructive/5 border-destructive/20' : 'bg-card border-border'} transition-colors`}>
                          <div className="flex items-center gap-4">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isPaid ? 'bg-primary/10 text-primary' : isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'}`}>
                              {isPaid ? <CheckCircle2 className="h-5 w-5" /> : isOverdue ? <AlertCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{schedule.is_down_payment ? "Initial Payment" : `Installment ${idx + 1}`}</p>
                              <p className="text-xs text-muted-foreground">Due: {format(new Date(schedule.due_date), "MMM dd, yyyy")}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-mono font-semibold text-sm">{formatMoney(Number(schedule.amount_due), currency)}</p>
                              {isPaid && schedule.paid_date && (
                                <p className="text-[10px] text-muted-foreground">Paid: {format(new Date(schedule.paid_date), "MMM dd")}</p>
                              )}
                            </div>
                            
                            {!isPaid && (
                              <Button 
                                size="sm" 
                                variant={isOverdue ? "destructive" : "default"}
                                className="h-8 px-3 text-xs"
                                disabled={!isApproved}
                                onClick={() => handlePayInstallment(schedule)}
                              >
                                Pay Now
                              </Button>
                            )}
                            {isPaid && (
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                <Receipt className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Investment Details List */}
            <div className="pt-6 border-t border-border/50">
              <h4 className="font-bold mb-4">Investment Summary</h4>
              <div className="grid grid-cols-2 gap-y-4">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Units Owned</p>
                  <p className="font-medium">{investment.units_owned} {investment.units_owned === 1 ? 'Unit' : 'Units'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Projected Return</p>
                  <p className="font-medium">
                    {investment.investment_properties?.projected_return_min && investment.investment_properties?.projected_return_max
                      ? `${investment.investment_properties.projected_return_min}% – ${investment.investment_properties.projected_return_max}%`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Status</p>
                  <p className="font-medium capitalize">{investment.status}</p>
                </div>
              </div>
            </div>

          </div>
        </ScrollArea>
      </DialogContent>

      <ManualPaymentModal
        open={paymentModalOpen}
        method={paymentMethod}
        onClose={() => {
          setPaymentModalOpen(false);
          setPayingSchedule(null);
          setPayingFull(false);
        }}
        onSuccess={() => {
          setPaymentModalOpen(false);
          setPayingSchedule(null);
          setPayingFull(false);
          qc.invalidateQueries({ queryKey: ["investment-schedules"] });
          qc.invalidateQueries({ queryKey: ["my-investments"] });
          qc.invalidateQueries({ queryKey: ["admin-investments"] });
          qc.invalidateQueries({ queryKey: ["admin-payments"] });
        }}
        amount={payingFull ? (total - paid) : payingSchedule ? Number(payingSchedule.amount_due) : 0}
        currency={currency}
        paymentType="installment"
        targetId={investment.property_id}
        isInvestmentProperty={true}
        metadata={{
          investment_id: investment.id,
          ...(payingSchedule && { schedule_id: payingSchedule.id }),
          payment_context: payingFull ? "full_payment" : "installment"
        }}
      />
    </Dialog>
  );
}
