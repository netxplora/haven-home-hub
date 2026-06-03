import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/invest";
import { Check, X, Search, FileText, Download, ExternalLink, CalendarClock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

export function AdminInvestmentOrders() {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [adjustUnits, setAdjustUnits] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-investment-orders"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_investments")
        .select(`
          *,
          profiles(full_name, email, phone),
          investment_properties(title, currency, projected_return_min, projected_return_max),
          payments(*)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return orders;
    const term = searchTerm.toLowerCase();
    return orders.filter((o: any) => 
      o.profiles?.full_name?.toLowerCase().includes(term) ||
      o.profiles?.email?.toLowerCase().includes(term) ||
      o.investment_properties?.title?.toLowerCase().includes(term)
    );
  }, [orders, searchTerm]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-investment-orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_investments' },
        () => {
          qc.invalidateQueries({ queryKey: ["admin-investment-orders"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const handleApprove = async () => {
    if (!selectedOrder) return;
    try {
      // Approve investment using the hardened RPC
      const { data: session } = await supabase.auth.getSession();
      const adminId = session.session?.user.id;
      
      const { error } = await supabase.rpc("verify_investment", {
        p_investment_id: selectedOrder.id,
        p_admin_id: adminId,
        p_notes: adminNotes
      });
      
      if (error) {
        // Fallback if the RPC signature expects only p_investment_id
        if (error.message.includes("function verify_investment(uuid, uuid, text) does not exist")) {
            const { error: fallbackError } = await supabase.rpc("verify_investment", {
                p_investment_id: selectedOrder.id
            });
            if (fallbackError) throw fallbackError;
        } else {
            throw error;
        }
      }
      
      toast({ title: "Order Approved", description: `Investment approved for ${selectedOrder.profiles.full_name}` });
      setSelectedOrder(null);
      qc.invalidateQueries({ queryKey: ["admin-investment-orders"] });
    } catch (err: any) {
      toast({ title: "Approval Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleReject = async () => {
    if (!selectedOrder) return;
    if (!rejectionReason.trim()) {
      toast({ title: "Reason Required", description: "Please provide a reason for rejection.", variant: "destructive" });
      return;
    }
    
    try {
      // Reject investment using the hardened RPC
      const { error } = await supabase.rpc("reject_investment", {
        p_investment_id: selectedOrder.id,
        p_reason: rejectionReason
      });
      
      if (error) throw error;
      
      toast({ title: "Order Rejected", description: `Investment rejected for ${selectedOrder.profiles.full_name}` });
      setSelectedOrder(null);
      qc.invalidateQueries({ queryKey: ["admin-investment-orders"] });
    } catch (err: any) {
      toast({ title: "Rejection Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleAdjust = async () => {
    if (!selectedOrder) return;
    const units = parseInt(adjustUnits, 10);
    if (isNaN(units) || units <= 0) {
      return toast({ title: "Invalid Units", description: "Please enter a valid positive number.", variant: "destructive" });
    }
    try {
      const { error } = await supabase.rpc("admin_adjust_investment_allocation", {
        p_investment_id: selectedOrder.id,
        p_new_units: units,
        p_reason: adminNotes || "Manual allocation adjustment"
      });
      if (error) throw error;
      toast({ title: "Allocation Adjusted", description: `Units adjusted to ${units}.` });
      setSelectedOrder(null);
      qc.invalidateQueries({ queryKey: ["admin-investment-orders"] });
    } catch (err: any) {
      toast({ title: "Adjustment Failed", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading orders...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Investment Orders</h2>
          <p className="text-muted-foreground text-sm mt-1">Approve, reject, and manage incoming investment requests.</p>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search investors or properties..." 
            className="pl-9 rounded-xl"
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Investor</th>
                <th className="px-6 py-4 font-semibold">Property</th>
                <th className="px-6 py-4 font-semibold text-right">Amount</th>
                <th className="px-6 py-4 font-semibold text-right">Units</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((order: any) => (
                <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{order.profiles?.full_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{order.profiles?.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium max-w-[200px] truncate">{order.investment_properties?.title}</p>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wider mt-0.5">{order.investment_type}</p>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-medium">
                    {formatMoney(order.amount_invested || order.total_amount, order.investment_properties?.currency)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Badge variant="outline" className="font-mono bg-background">
                      {order.units_owned}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge 
                      variant={
                        order.status === "confirmed" || order.status === "active" ? "default" :
                        order.status === "pending" || order.status === "payment_under_review" ? "secondary" :
                        order.status === "rejected" ? "destructive" : "outline"
                      }
                      className="capitalize text-[10px] tracking-wider"
                    >
                      {order.status.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 text-xs font-semibold rounded-lg"
                      onClick={() => {
                        setSelectedOrder(order);
                        setAdminNotes(order.admin_notes || "");
                        setRejectionReason(order.rejection_reason || "");
                        setAdjustUnits(order.units_owned?.toString() || "");
                      }}
                    >
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground text-sm">
                    No investment orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(v) => !v && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl bg-card">
          <DialogHeader>
            <DialogTitle>Review Investment Order</DialogTitle>
            <DialogDescription>Process the investment request for {selectedOrder?.profiles?.full_name}</DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
              <div className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Investor Details</h4>
                  <p className="font-semibold text-sm">{selectedOrder.profiles?.full_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedOrder.profiles?.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedOrder.profiles?.phone || "No phone"}</p>
                </div>
                
                <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Investment Specs</h4>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-muted-foreground">Amount</span>
                    <span className="font-mono font-medium text-sm">{formatMoney(selectedOrder.amount_invested || selectedOrder.total_amount, selectedOrder.investment_properties?.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-muted-foreground">Units</span>
                    <span className="font-mono font-medium text-sm">{selectedOrder.units_owned}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Type</span>
                    <span className="text-xs uppercase font-medium">{selectedOrder.investment_type}</span>
                  </div>
                </div>

                {selectedOrder.payments && selectedOrder.payments.length > 0 && (
                  <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Payment Proof</h4>
                    
                    {selectedOrder.payments.map((payment: any, index: number) => (
                      <div key={payment.id || index} className="mb-4 last:mb-0">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-muted-foreground">Provider</span>
                          <span className="font-mono font-medium text-xs uppercase">{payment.provider}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-muted-foreground">Reference</span>
                          <span className="font-mono text-xs">{payment.reference}</span>
                        </div>
                        {payment.crypto_currency && (
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-muted-foreground">Crypto Amount</span>
                            <span className="font-mono text-xs">{payment.crypto_amount} {payment.crypto_currency}</span>
                          </div>
                        )}
                        {payment.transaction_hash && (
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-muted-foreground">Hash</span>
                            <span className="font-mono text-[10px] truncate max-w-[150px]">{payment.transaction_hash}</span>
                          </div>
                        )}
                        {payment.proof_url && (
                          <div className="mt-3">
                            <Button variant="outline" size="sm" className="w-full text-xs h-8" asChild>
                              <a href={payment.proof_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3 mr-2" />
                                View Uploaded Receipt
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold">Admin Notes (Internal)</label>
                  <Textarea 
                    value={adminNotes} 
                    onChange={(e) => setAdminNotes(e.target.value)} 
                    placeholder="Internal remarks..."
                    className="h-20 text-xs resize-none"
                  />
                </div>
                
                {(selectedOrder.status === 'pending' || selectedOrder.status === 'payment_under_review' || selectedOrder.status === 'rejected') && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-destructive">Rejection Reason (Visible to user)</label>
                    <Textarea 
                      value={rejectionReason} 
                      onChange={(e) => setRejectionReason(e.target.value)} 
                      placeholder="Required if rejecting..."
                      className="h-20 text-xs resize-none border-destructive/20 focus-visible:ring-destructive/30"
                    />
                  </div>
                )}
                
                {selectedOrder.status !== 'rejected' && selectedOrder.status !== 'cancelled' && (
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <label className="text-xs font-semibold">Adjust Allocation</label>
                    <div className="flex gap-2">
                      <Input 
                        type="number"
                        value={adjustUnits}
                        onChange={(e) => setAdjustUnits(e.target.value)}
                        placeholder="New Unit Count"
                        className="text-xs h-9"
                      />
                      <Button onClick={handleAdjust} variant="outline" className="h-9 text-xs">Update</Button>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col gap-2 pt-2">
                  {selectedOrder.status !== 'confirmed' && selectedOrder.status !== 'active' && (
                    <Button onClick={handleApprove} className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold">
                      <Check className="mr-2 h-4 w-4" /> Approve & Allocate
                    </Button>
                  )}
                  {selectedOrder.status !== 'rejected' && (
                    <Button onClick={handleReject} variant="destructive" className="w-full font-bold">
                      <X className="mr-2 h-4 w-4" /> Reject Order
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
