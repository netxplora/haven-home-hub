import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUploader } from "@/components/site/ImageUploader";
import { Separator } from "@/components/ui/separator";
import { formatMoney } from "@/lib/invest";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function AdminWithdrawals() {
  const qc = useQueryClient();
  const [statusF, setStatusF] = useState("all");
  const { data = [] } = useQuery({
    queryKey: ["admin-withdrawals", statusF],
    queryFn: async () => {
      let q = supabase.from("withdrawal_requests").select("*, profiles(full_name)").order("created_at", { ascending: false }).limit(500);
      if (statusF !== "all") q = q.eq("status", statusF as any);
      return (await q).data ?? [];
    },
  });
  async function act(id: string, action: "process" | "reject" | "complete" | "fail", extra: Record<string, string> = {}) {
    // Get current user as admin reviewer
    const { data: { user: admin } } = await supabase.auth.getUser();

    // Build the update payload based on action
    let updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    let newStatus = "";
    let notifTitle = "";
    let notifBody = "";
    let notifType: string = "system";

    switch (action) {
      case "process":
        newStatus = "processing";
        updatePayload.status = "processing";
        updatePayload.reviewed_by = admin?.id ?? null;
        updatePayload.reviewed_at = new Date().toISOString();
        notifTitle = "Withdrawal in progress";
        notifBody = "Your withdrawal request is now being processed.";
        notifType = "withdrawal_approved";
        break;
      case "reject":
        newStatus = "rejected";
        updatePayload.status = "rejected";
        updatePayload.reviewed_by = admin?.id ?? null;
        updatePayload.reviewed_at = new Date().toISOString();
        updatePayload.rejection_reason = extra.rejection_reason || "Request rejected by admin.";
        notifTitle = "Withdrawal Declined";
        notifBody = extra.rejection_reason
          ? `Your withdrawal was declined: ${extra.rejection_reason}`
          : "Your withdrawal request was declined. Please contact support.";
        notifType = "withdrawal_rejected";
        break;
      case "complete":
        newStatus = "completed";
        updatePayload.status = "completed";
        updatePayload.completed_at = new Date().toISOString();
        if (extra.transaction_reference) updatePayload.transaction_reference = extra.transaction_reference;
        notifTitle = "Withdrawal completed";
        notifBody = "Your withdrawal has been sent successfully.";
        notifType = "withdrawal_completed";
        break;
      case "fail":
        newStatus = "failed";
        updatePayload.status = "failed";
        updatePayload.rejection_reason = extra.rejection_reason || "Transfer failed.";
        notifTitle = "Withdrawal failed";
        notifBody = extra.rejection_reason
          ? `Your withdrawal failed: ${extra.rejection_reason}`
          : "Your withdrawal could not be processed. Please try again or contact support.";
        notifType = "withdrawal_rejected";
        break;
    }

    // Perform the update
    const { data: updated, error } = await supabase
      .from("withdrawal_requests")
      .update(updatePayload as any)
      .eq("id", id)
      .select("user_id")
      .single();

    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }

    // Create notification for the user
    if (updated?.user_id) {
      await supabase.from("notifications").insert({
        user_id: updated.user_id,
        type: notifType as any,
        title: notifTitle,
        body: notifBody,
        link: "/dashboard?tab=withdrawals",
      });
    }

    toast({ title: `Withdrawal marked as ${newStatus}` });
    qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold">Withdrawal Requests</h2>
          <p className="text-sm text-muted-foreground">Manage user payouts and fund distributions.</p>
        </div>
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="w-[180px] rounded-xl border-border/50 bg-card shadow-sm"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All requests</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Declined</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-4">
        {data.length === 0 && (
          <div className="p-16 text-center rounded-xl border border-dashed border-border/50 bg-secondary/10">
            <TrendingUp className="h-14 w-14 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="font-serif text-xl text-muted-foreground italic">No withdrawal requests.</p>
          </div>
        )}
        {data.map((w: any) => (
          <div key={w.id} className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-6 transition-all hover:shadow-lg hover:border-primary/20">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex-1 min-w-[280px] space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-serif text-2xl font-bold text-foreground">{formatMoney(Number(w.amount), w.currency)}</p>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider leading-none mt-1">
                      {w.method ? w.method.replace("_"," ") : "N/A"} · {new Date(w.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-accent/50 p-4 border border-border/30">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider leading-none mb-2">Recipient</p>
                  <p className="font-medium text-sm text-foreground">{w.profiles?.full_name ?? (w.user_id ? w.user_id.slice(0,8) : "System")}</p>
                  {w.method === "bank_transfer" ? (
                    <div className="mt-3 pt-3 border-t border-border/30 text-xs space-y-1">
                      <p className="text-muted-foreground">Bank: <span className="text-foreground font-medium">{w.bank_name}</span></p>
                      <p className="text-muted-foreground">Account: <span className="text-foreground font-medium">{w.bank_account_name}</span></p>
                      <p className="text-muted-foreground">Number: <span className="text-foreground font-mono font-medium">{w.bank_account_number}</span></p>
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t border-border/30 text-xs">
                      <p className="text-muted-foreground mb-1">Crypto Asset: <span className="text-foreground font-bold">{w.crypto_currency}</span></p>
                      <p className="font-mono text-[10px] break-all p-2 rounded-lg bg-accent border border-border/30 select-all">{w.crypto_address}</p>
                    </div>
                  )}
                </div>

                {(w.transaction_reference || w.rejection_reason) && (
                  <div className="space-y-2">
                    {w.transaction_reference && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Tx Reference</p>
                        <p className="text-xs font-mono bg-accent p-2 rounded-md">{w.transaction_reference}</p>
                      </div>
                    )}
                    {w.rejection_reason && (
                      <div>
                        <p className="text-[10px] font-bold text-destructive uppercase tracking-widest mb-1">Decline Reason</p>
                        <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-md border border-destructive/20">{w.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-4 w-full sm:w-auto sm:items-end">
                <Badge 
                  className="h-6 rounded-md uppercase text-[9px] tracking-widest font-bold px-3 shadow-sm"
                  variant={w.status === "completed" ? "default" : w.status === "rejected" || w.status === "failed" ? "destructive" : "secondary"}
                >
                  {w.status}
                </Badge>
                
                <div className="flex flex-col gap-2 w-full sm:w-[160px]">
                  {w.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => act(w.id, "process")} className="w-full bg-primary text-primary-foreground font-bold hover:scale-[1.02] transition-transform shadow-md shadow-primary/20">Review & Process</Button>
                      <Button size="sm" variant="ghost" className="w-full text-destructive hover:bg-destructive/10" onClick={() => { const r = prompt("Reason for declining?"); if (r) act(w.id, "reject", { rejection_reason: r }); }}>Decline Request</Button>
                    </>
                  )}
                  {w.status === "processing" && (
                    <>
                      <Button size="sm" onClick={() => { const ref = prompt("Transaction reference / tx hash?") ?? ""; act(w.id, "complete", { transaction_reference: ref }); }} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-md">Mark Paid</Button>
                      <Button size="sm" variant="ghost" className="w-full text-destructive hover:bg-destructive/10" onClick={() => { const r = prompt("Failure reason?") ?? ""; act(w.id, "fail", { rejection_reason: r }); }}>Mark Failed</Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
