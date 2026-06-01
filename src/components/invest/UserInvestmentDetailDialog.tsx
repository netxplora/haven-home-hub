import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/invest";
import { InvestmentTimeline } from "./InvestmentTimeline";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ExternalLink, FileText, Download, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface UserInvestmentDetailDialogProps {
  open: boolean;
  onClose: () => void;
  investment: any;
}

export function UserInvestmentDetailDialog({ open, onClose, investment }: UserInvestmentDetailDialogProps) {
  const qc = useQueryClient();
  const [isCancelling, setIsCancelling] = useState(false);

  if (!investment) return null;

  const property = investment.investment_properties;
  const isInstallment = investment.investment_type === "installment";
  const total = Number(investment.total_amount ?? investment.amount_invested ?? 0);
  const paid = Number(investment.amount_paid ?? (isInstallment ? 0 : total));
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100;
  
  const accruedEarnings = Number(investment.accrued_earnings || 0);
  const isCancellable = investment.status === "pending" || investment.status === "payment_under_review" || investment.status === "awaiting_payment";

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this investment? Your reserved units will be released.")) return;
    setIsCancelling(true);
    try {
      const { error } = await supabase.rpc("cancel_investment", { p_investment_id: investment.id });
      if (error) throw error;
      toast({ title: "Investment Cancelled", description: "Your investment has been cancelled and units released." });
      qc.invalidateQueries({ queryKey: ["portfolio"] });
      onClose();
    } catch (err: any) {
      toast({ title: "Cancellation Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border border-border bg-background shadow-lux rounded-2xl max-h-[90vh] flex flex-col">
        
        <DialogHeader className="p-6 md:p-8 bg-gradient-to-br from-primary/5 via-primary/5 to-background border-b border-border/40 shrink-0">
          <div className="flex gap-4 items-center">
            <div className="h-16 w-24 overflow-hidden rounded-lg bg-muted shrink-0 border border-border/50">
              {property?.cover_image_url && <img src={property.cover_image_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div>
              <DialogTitle className="font-serif text-2xl font-bold text-foreground">
                {property?.title}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1 flex items-center gap-2">
                {investment.units_owned} Units · {property?.projected_return_min}–{property?.projected_return_max}% p.a.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Invested</p>
              <p className="font-serif text-lg font-bold text-foreground mt-1">{formatMoney(total, property?.currency)}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Accrued ROI</p>
              <p className="font-serif text-lg font-bold text-primary mt-1">{formatMoney(accruedEarnings, property?.currency)}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Current Value</p>
              <p className="font-serif text-lg font-bold text-foreground mt-1">{formatMoney(total + accruedEarnings, property?.currency)}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Status</p>
              <div className="mt-1">
                <Badge variant={investment.status === "confirmed" || investment.status === "active" ? "default" : investment.status === "completed" ? "secondary" : "destructive"} className="text-[10px] capitalize">
                  {investment.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>
          </div>

          {/* Certificate Action */}
          <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">Ownership Certificate</p>
                <p className="text-[11px] text-muted-foreground">Digital proof of fractional asset allocation.</p>
              </div>
            </div>
            {investment.status !== "pending" && investment.status !== "payment_under_review" ? (
              <Button asChild size="sm" className="font-semibold rounded-lg shadow-sm">
                <Link to={`/invest/certificate/${investment.id}`}>
                  View Certificate
                </Link>
              </Button>
            ) : (
              <Button size="sm" disabled variant="outline" className="text-xs">
                Pending Verification
              </Button>
            )}
          </div>

          {/* Timeline */}
          <InvestmentTimeline investment={investment} />
          
        </div>
        
        <div className="p-6 border-t border-border/40 bg-accent/20 shrink-0 flex justify-end gap-3 items-center">
          {isCancellable && (
            <Button 
              variant="destructive" 
              onClick={handleCancel} 
              disabled={isCancelling}
              className="rounded-xl font-semibold mr-auto"
            >
              <AlertCircle className="mr-2 h-4 w-4" /> 
              {isCancelling ? "Cancelling..." : "Cancel Investment"}
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="rounded-xl font-semibold">
            Close Panel
          </Button>
          <Button asChild className="rounded-xl font-semibold shadow-sm" variant="default">
            <Link to={`/invest/${property?.slug}`}>
              View Property Details <ExternalLink className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
