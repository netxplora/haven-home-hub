import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/invest";
import { RefreshCw, Trash2 } from "lucide-react";

// Map UI-friendly filter labels to actual DB values
const STATUS_FILTER_MAP: Record<string, string> = {
  confirmed: "success",
};

export function AdminPayments() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [adminNote, setAdminNote] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-payments", status, type],
    queryFn: async () => {
      let q = (supabase as any).from("payments").select(`
        *,
        profiles(full_name),
        properties(title, slug),
        investment_properties(title, slug),
        receipts(*),
        payment_audit_logs(admin_id, previous_status, new_status, notes, created_at)
      `).order("created_at", { ascending: false }).limit(500);
      if (status !== "all") {
        const dbStatus = STATUS_FILTER_MAP[status] ?? status;
        q = q.eq("status", dbStatus as any);
      }
      if (type !== "all") q = q.eq("payment_type", type as any);
      return (await q).data ?? [];
    },
  });

  async function mark(id: string, action: "confirmed" | "failed" | "processing") {
    if (!adminNote.trim()) {
      toast({ title: "Admin note required", description: "Please enter a reason or note for this action.", variant: "destructive" });
      return;
    }
    const dbStatus = action === "confirmed" ? "success" : action;
    const { error } = await supabase.rpc("admin_verify_payment", {
      p_payment_id: id,
      p_new_status: dbStatus,
      p_notes: adminNote.trim()
    });
    if (error) {
      toast({ title: "Operation failed", description: error.message, variant: "destructive" });
    } else {
      // When confirming a full purchase payment, also complete the linked reservation
      // This triggers the database sync_property_sold_status trigger to mark property as sold
      if (action === "confirmed" && selectedPayment) {
        const reservationId = selectedPayment.reservation_id;
        const propertyId = selectedPayment.property_id;
        
        // If this payment has a linked reservation, mark it completed
        if (reservationId) {
          await (supabase.from("reservations") as any)
            .update({ status: "completed", updated_at: new Date().toISOString() })
            .eq("id", reservationId);
        }
        
        // If this is a property purchase payment (not just reservation fee), mark property as sold
        if (propertyId && selectedPayment.payment_type === "purchase") {
          await (supabase.from("properties") as any)
            .update({ status: "sold", updated_at: new Date().toISOString() })
            .eq("id", propertyId);
        }
      }

      toast({ title: `Transaction marked as ${action.replace("_", " ")}` });
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
      qc.invalidateQueries({ queryKey: ["admin-overview-counts"] });
      qc.invalidateQueries({ queryKey: ["admin-reservations"] });
      qc.invalidateQueries({ queryKey: ["admin-investments"] });
      qc.invalidateQueries({ queryKey: ["admin-investors"] });
      qc.invalidateQueries({ queryKey: ["admin-applications"] });
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["property"] });
      qc.invalidateQueries({ queryKey: ["my-purchases"] });
      qc.invalidateQueries({ queryKey: ["my-reservations"] });
      qc.invalidateQueries({ queryKey: ["dashboard-overview-stats"] });
      setSelectedPayment(null);
      setAdminNote("");
    }
  }

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px] rounded-xl border-border/50 bg-card"><SelectValue placeholder="Filter Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[180px] rounded-xl border-border/50 bg-card"><SelectValue placeholder="Filter Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="investment">Investment</SelectItem>
              <SelectItem value="booking">Booking</SelectItem>
              <SelectItem value="reservation">Reservation</SelectItem>
              <SelectItem value="referral_bonus">Referral Bonus</SelectItem>
              <SelectItem value="investment_return">Investment Return</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-xl border-border/50 bg-card h-10 w-10 hover:bg-accent"
            onClick={() => qc.invalidateQueries({ queryKey: ["admin-payments"] })}
            title="Refresh List"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
        {/* ── Mobile Card Layout ── */}
        <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
          {data.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No records found.</div>
          ) : (
            data.map((p: any) => (
              <div key={p.id} className="rounded-xl border border-border/45 bg-card p-4 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{p.profiles?.full_name || "Unknown User"}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{p.user_id ? p.user_id.slice(0, 8) : "N/A"}</p>
                  </div>
                  <Badge className="rounded-md px-2 py-0.5 text-[10px] font-bold capitalize animate-none" 
                    variant={p.status === "success" || p.status === "confirmed" ? "default" : p.status === "failed" || p.status === "cancelled" ? "destructive" : "secondary"}>
                    {p.status === "success" ? "confirmed" : (p.status ? p.status.replace("_", " ") : "N/A")}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-border/30">
                  <div>
                    <span className="block text-muted-foreground font-medium uppercase tracking-wider text-[10px] mb-0.5">Method</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="capitalize text-[10px] px-1 py-0">{p.provider}</Badge>
                      {p.provider === 'crypto' && (
                        <span className="text-[10px] font-bold text-primary">{p.crypto_currency}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-muted-foreground font-medium uppercase tracking-wider text-[10px] mb-0.5">Amount</span>
                    <span className="font-semibold text-foreground">{formatMoney(Number(p.amount), p.currency)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-border/30 items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </div>
                  <Button size="sm" variant="outline" className="h-11 px-4 rounded-lg font-bold" onClick={() => setSelectedPayment(p)}>View Details</Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Desktop Table Layout ── */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/40 border-b border-border/50">
              <tr>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Date</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">User</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Method</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Status</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground text-right whitespace-nowrap">Amount</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {data.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">No records found.</td></tr>
              ) : data.map((p: any) => (
                <tr key={p.id} className="transition-colors hover:bg-secondary/20">
                  <td className="p-4">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <p className="font-medium">{p.profiles?.full_name || "Unknown User"}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{p.user_id ? p.user_id.slice(0, 8) : "N/A"}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize text-[10px]">{p.provider}</Badge>
                      {p.provider === 'crypto' && (
                        <span className="text-[10px] font-bold text-primary">{p.crypto_currency}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge className="rounded-md px-2 py-0.5 text-[10px] font-bold capitalize" 
                      variant={p.status === "success" || p.status === "confirmed" ? "default" : p.status === "failed" || p.status === "cancelled" ? "destructive" : "secondary"}>
                      {p.status === "success" ? "confirmed" : (p.status ? p.status.replace("_", " ") : "N/A")}
                    </Badge>
                  </td>
                  <td className="p-4 text-right font-semibold">
                    {formatMoney(Number(p.amount), p.currency)}
                  </td>
                  <td className="p-4 text-right">
                    <Button size="sm" variant="ghost" className="h-8 rounded-lg" onClick={() => setSelectedPayment(p)}>View Details</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review dialog — rendered ONCE outside the table loop */}
      <Dialog open={!!selectedPayment} onOpenChange={(v) => { if (!v) { setSelectedPayment(null); setAdminNote(""); } }}>
        {selectedPayment && (
          <DialogContent className="max-w-md p-0 border border-border">
            <DialogHeader className="bg-secondary/40 p-6 border-b border-border/50 shrink-0">
              <DialogTitle className="font-serif text-2xl">Payment Review</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-6 py-6">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-accent/50 border border-border/50">
                  <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px] mb-1">User</p>
                  <p className="font-bold text-sm">{selectedPayment.profiles?.full_name}</p>
                </div>
                <div className="p-4 rounded-xl bg-accent/50 border border-border/50">
                  <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px] mb-1">Purpose</p>
                  <p className="font-bold text-sm capitalize">{selectedPayment.payment_type}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <p className="text-[10px] uppercase font-bold text-muted-foreground px-1 tracking-widest">Payment Details</p>
                <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-3xl font-serif font-bold text-foreground">{formatMoney(selectedPayment.amount, selectedPayment.currency)}</span>
                    {selectedPayment.provider === 'crypto' && (
                      <span className="text-sm text-primary font-bold">{selectedPayment.crypto_amount} {selectedPayment.crypto_currency}</span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Linked Listing</p>
                      <p className="text-sm font-bold truncate">
                        {selectedPayment.investment_properties?.title || selectedPayment.properties?.title || "Internal / Other"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Provider</p>
                      <p className="text-sm font-bold capitalize">{selectedPayment.provider}</p>
                    </div>
                  </div>

                  {selectedPayment.transaction_hash && (
                    <div className="pt-4 border-t border-border/50">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold mb-2 tracking-widest">Payment Reference</p>
                      <p className="font-mono text-[10px] break-all p-3 rounded-xl bg-accent border border-border/50 select-all">{selectedPayment.transaction_hash}</p>
                    </div>
                  )}

                  {selectedPayment.metadata?.proof_url && (
                    <div className="pt-4 border-t border-border/50">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold mb-3 tracking-widest">Payment Proof</p>
                      <a 
                        href={selectedPayment.metadata.proof_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="block group relative rounded-xl overflow-hidden border border-border/50 bg-accent/50 shadow-inner"
                      >
                        <img 
                          src={selectedPayment.metadata.proof_url} 
                          alt="Payment Proof" 
                          className="w-full h-40 object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white text-xs font-bold bg-primary/80 px-4 py-2 rounded-full backdrop-blur-sm">View Full Document</span>
                        </div>
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedPayment.payment_audit_logs && selectedPayment.payment_audit_logs.length > 0 && (
                <div className="pt-4 border-t border-border/50">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground px-1 tracking-widest mb-3">Verification History</p>
                  <div className="space-y-3">
                    {(selectedPayment.payment_audit_logs as any[]).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((log, i) => (
                      <div key={i} className="p-3 rounded-lg border border-border/50 bg-secondary/20 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-foreground">Status changed: {log.previous_status || 'N/A'} → {log.new_status}</span>
                          <span className="text-[9px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-muted-foreground italic">&ldquo;{log.notes}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(selectedPayment.status === 'processing' || selectedPayment.status === 'pending') && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground px-1 tracking-widest">Admin Note (Required)</p>
                  <textarea 
                    className="w-full min-h-[80px] p-3 text-sm rounded-xl border border-border/50 bg-accent/50 focus-visible:ring-1 focus-visible:ring-primary"
                    placeholder="Provide a reason for approval or rejection..."
                    value={adminNote}
                    onChange={e => setAdminNote(e.target.value)}
                  />
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2">
                {(selectedPayment.status === 'processing' || selectedPayment.status === 'pending') && (
                  <Button className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all text-base" onClick={() => mark(selectedPayment.id, 'confirmed')}>
                    Confirm Payment
                  </Button>
                )}
                
                <div className="flex gap-3">
                  {selectedPayment.status === 'pending' && (
                    <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold border-border/50" onClick={() => mark(selectedPayment.id, 'processing')}>
                      Mark Processing
                    </Button>
                  )}
                  {selectedPayment.status !== 'failed' && selectedPayment.status !== 'confirmed' && selectedPayment.status !== 'success' && selectedPayment.status !== 'cancelled' && (
                    <Button variant="ghost" className="flex-1 h-12 rounded-xl text-destructive font-bold hover:bg-destructive/10" onClick={() => mark(selectedPayment.id, 'failed')}>
                      Decline Payment
                    </Button>
                  )}
                </div>

                <div className="pt-4 border-t border-border/50">
                  <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-xl text-destructive border-destructive/20 hover:bg-destructive/10 font-bold gap-2"
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to permanently delete this payment record and all associated receipts/audit logs? This action cannot be undone.")) {
                        const { error } = await supabase.rpc("admin_delete_payment", {
                          p_payment_id: selectedPayment.id
                        });
                        if (error) {
                          toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
                        } else {
                          toast({ title: "Record Deleted", description: "The payment record was permanently deleted." });
                          setSelectedPayment(null);
                          qc.invalidateQueries({ queryKey: ["admin-payments"] });
                        }
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Permanent Delete Record
                  </Button>
                </div>
              </div>
              
              <p className="text-[10px] text-center text-muted-foreground italic leading-relaxed px-4">
                Confirming will automatically update the portfolio and confirm the reservation.
              </p>
            </DialogBody>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
