import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Search, Eye, Filter, Loader2, Calendar, Ban, Undo2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/invest";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";

// Fallback logic to support new fields even if DB migration is not applied yet
const getInvestmentType = (i: any) => i.investment_type || "full";
const getTotalAmount = (i: any) => i.total_amount || i.amount_invested;
const getAmountPaid = (i: any) => i.amount_paid || i.amount_invested;
const getRemainingBalance = (i: any) => i.remaining_balance || (getTotalAmount(i) - getAmountPaid(i));
const getStartDate = (i: any) => i.start_date || i.created_at;

export function AdminInvestors() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form states for Create/Edit
  const [formData, setFormData] = useState<any>({
    user_id: "", property_id: "", investment_type: "full", total_amount: "", amount_paid: "", status: "active", units_owned: 1, duration_months: 12
  });

  const { data: investments = [], isLoading } = useQuery({
    queryKey: ["admin-investments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_investments")
        .select("*, investment_properties(title, slug, currency), profiles(full_name)")
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("Error fetching admin investments:", error);
        // Fallback: try fetching without relationships just in case
        const fallback = await supabase.from("user_investments").select("*").order("created_at", { ascending: false });
        return fallback.data ?? [];
      }
      return data ?? [];
    },
  });

  // Fetch lookups for forms
  const { data: properties = [] } = useQuery({
    queryKey: ["admin-properties-lookup"],
    queryFn: async () => (await supabase.from("investment_properties").select("id, title, price, currency")).data ?? []
  });
  const { data: users = [] } = useQuery({
    queryKey: ["admin-users-lookup"],
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, email")).data ?? []
  });

  const filtered = investments.filter((i: any) => {
    const investorName = (i.profiles?.full_name || i.user_id).toLowerCase();
    const propName = (i.investment_properties?.title || "").toLowerCase();
    const s = search.toLowerCase();
    
    const matchesSearch = investorName.includes(s) || propName.includes(s);
    const matchesStatus = statusFilter === "all" || i.status === statusFilter;
    const matchesType = typeFilter === "all" || getInvestmentType(i) === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("user_investments").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Error deleting investment", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Investment deleted", description: "The record has been permanently removed." });
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["admin-investments"] });
    }
  };

  const handleVerify = async (id: string) => {
    const { error } = await (supabase.rpc as any)("verify_investment", { p_investment_id: id });
    if (error) {
      toast({ title: "Error verifying investment", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Investment verified", description: "Certificate has been issued successfully." });
      qc.invalidateQueries({ queryKey: ["admin-investments"] });
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    const { error } = await (supabase.rpc as any)("reject_investment", { 
      p_investment_id: id,
      p_reason: reason 
    });
    if (error) {
      toast({ title: "Rejection failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Investment rejected", description: "Units have been released and investor notified." });
      qc.invalidateQueries({ queryKey: ["admin-investments"] });
    }
  };

  const handleRefund = async (id: string) => {
    const reason = prompt("Enter refund reason:");
    if (!reason) return;
    if (!confirm("This will refund the investment and release all reserved units. Continue?")) return;
    const { error } = await (supabase.rpc as any)("refund_investment", { 
      p_investment_id: id,
      p_reason: reason 
    });
    if (error) {
      toast({ title: "Refund failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Investment refunded", description: "Units released and investor notified." });
      qc.invalidateQueries({ queryKey: ["admin-investments"] });
    }
  };

  const handleSave = async () => {
    const totalAmt = Number(formData.total_amount);
    const paidAmt = Number(formData.amount_paid);
    const balanceAmt = Math.max(0, totalAmt - paidAmt);
    
    const payload = {
      user_id: formData.user_id,
      property_id: formData.property_id,
      amount_invested: totalAmt,
      units_owned: Number(formData.units_owned),
      status: formData.status,
      investment_type: formData.investment_type,
      total_amount: totalAmt,
      amount_paid: paidAmt,
      remaining_balance: balanceAmt,
      start_date: new Date().toISOString()
    };

    let error;
    let investmentId: string | null = null;
    
    if (editItem) {
      ({ error } = await supabase.from("user_investments").update(payload as any).eq("id", editItem.id));
      investmentId = editItem.id;
    } else {
      const result = await supabase.from("user_investments").insert([payload as any]).select("id").single();
      error = result.error;
      investmentId = result.data?.id ?? null;
    }

    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      return;
    }

    // Auto-generate installment schedules on new installment investments
    if (!editItem && formData.investment_type === "installment" && investmentId && balanceAmt > 0) {
      const months = Number(formData.duration_months) || 12;
      const monthlyAmount = balanceAmt / months;
      const schedules = [];
      const startDate = new Date();
      
      for (let i = 0; i < months; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i + 1);
        schedules.push({
          investment_id: investmentId,
          due_date: dueDate.toISOString().split("T")[0],
          amount_due: Math.round(monthlyAmount * 100) / 100,
          amount_paid: 0,
          status: "pending",
        });
      }
      
      const { error: scheduleError } = await (supabase as any)
        .from("investment_schedules")
        .insert(schedules);
      
      if (scheduleError) {
        console.error("Failed to generate schedules:", scheduleError);
        toast({ title: "Investment saved", description: "However, installment schedules could not be generated. Check the database.", variant: "destructive" });
      } else {
        toast({ title: "Investment created", description: `${months} installment schedules have been auto-generated.` });
      }
    } else {
      toast({ title: "Saved successfully" });
    }

    setEditItem(null);
    setCreateOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-investments"] });
  };

  const openEdit = (i: any) => {
    setFormData({
      user_id: i.user_id,
      property_id: i.property_id,
      investment_type: getInvestmentType(i),
      total_amount: getTotalAmount(i),
      amount_paid: getAmountPaid(i),
      status: i.status,
      units_owned: i.units_owned
    });
    setEditItem(i);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold">Investments Management</h2>
          <p className="text-sm text-muted-foreground">Comprehensive control over all user property investments and schedules.</p>
        </div>
        <Button onClick={() => { setFormData({ user_id: "", property_id: "", investment_type: "full", total_amount: "", amount_paid: "", status: "active", units_owned: 1, duration_months: 12 }); setCreateOpen(true); }} className="rounded-xl shrink-0">
          <Plus className="h-4 w-4 mr-2" /> New Investment
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search investor or property..." className="pl-9 bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48 bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
            <SelectItem value="payment_under_review">Payment Under Review</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full md:w-48 bg-background"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="full">Full Payment</SelectItem>
            <SelectItem value="installment">Installment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
          {/* ── Mobile Card Layout ── */}
          <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No investments found matching criteria.</div>
            ) : (
              filtered.map((i: any) => (
                <div key={i.id} className="rounded-xl border border-border/45 bg-card p-4 shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground text-sm">{i.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Created: {new Date(i.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge className="rounded-md px-2 py-0.5 text-[10px] uppercase font-bold shrink-0" variant={(i.status === "active" || i.status === "confirmed") ? "default" : (i.status === "pending" || i.status === "payment_under_review" || i.status === "awaiting_payment") ? "secondary" : "outline"}>
                      {i.status?.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <div>
                    <p className="font-semibold text-primary text-sm">{i.investment_properties?.title}</p>
                    <div className="flex gap-2 items-center mt-1">
                      <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0 px-1.5">{getInvestmentType(i)}</Badge>
                      {getInvestmentType(i) === 'installment' && i.duration_months && (
                        <span className="text-xs text-muted-foreground">{i.duration_months} Months</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-3 border-t border-border/30">
                    <div>
                      <span className="block text-muted-foreground font-medium uppercase tracking-wider text-[9px] mb-0.5">Total</span>
                      <span className="font-mono font-semibold text-foreground">{formatMoney(getTotalAmount(i), i.investment_properties?.currency || "USD")}</span>
                    </div>
                    <div>
                      <span className="block text-muted-foreground font-medium uppercase tracking-wider text-[9px] mb-0.5">Paid</span>
                      <span className="font-mono font-semibold text-green-600">{formatMoney(getAmountPaid(i), i.investment_properties?.currency || "USD")}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-muted-foreground font-medium uppercase tracking-wider text-[9px] mb-0.5">Balance</span>
                      <span className="font-mono font-bold text-amber-600">{formatMoney(getRemainingBalance(i), i.investment_properties?.currency || "USD")}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-border/30 justify-end items-center flex-wrap">
                    {getInvestmentType(i) === 'installment' && i.next_payment_due && (
                      <span className="text-[10px] text-muted-foreground mr-auto">
                        Due: {new Date(i.next_payment_due).toLocaleDateString()}
                      </span>
                    )}
                    
                    {(i.status === "pending" || i.status === "payment_under_review") ? (
                      <>
                        <Button variant="default" size="sm" className="h-11 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold" onClick={() => handleVerify(i.id)}>
                          Verify & Cert
                        </Button>
                        <Button variant="outline" size="sm" className="h-11 px-3 rounded-lg text-destructive hover:bg-destructive/10 border-destructive/20 font-bold gap-1" onClick={() => handleReject(i.id)}>
                          <Ban className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </>
                    ) : (i.status === "active" || i.status === "confirmed") ? (
                      <>
                        <Button variant="outline" size="sm" className="h-11 px-4 rounded-lg font-bold gap-1" onClick={() => setViewItem(i)}>
                          <Eye className="h-4 w-4" /> View
                        </Button>
                        <Button variant="outline" size="sm" className="h-11 px-3 rounded-lg text-amber-600 hover:bg-amber-50 border-amber-200 font-bold gap-1" onClick={() => handleRefund(i.id)}>
                          <Undo2 className="h-3.5 w-3.5" /> Refund
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" className="h-11 px-4 rounded-lg font-bold gap-1" onClick={() => setViewItem(i)}>
                        <Eye className="h-4 w-4" /> View
                      </Button>
                    )}
                    
                    <Button variant="outline" size="sm" className="h-11 px-3 rounded-lg text-primary hover:bg-primary/10" onClick={() => window.dispatchEvent(new CustomEvent("open-investor-360", { detail: { userId: i.user_id } }))}>
                      360 View
                    </Button>
                    
                    <Button variant="outline" size="sm" className="h-11 px-3 rounded-lg text-muted-foreground hover:text-foreground" onClick={() => openEdit(i)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-11 px-3 rounded-lg text-destructive hover:bg-destructive/10 border-destructive/20" onClick={() => setDeleteId(i.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Investor</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Property & Type</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground text-right whitespace-nowrap">Total Amount</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground text-right whitespace-nowrap">Amount Paid</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground text-right whitespace-nowrap">Balance</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Duration & Next Due</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground text-center whitespace-nowrap">Status</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="p-12 text-center text-muted-foreground">No investments found matching criteria.</td></tr>
                ) : filtered.map((i: any) => (
                  <tr key={i.id} className="transition-colors hover:bg-secondary/20">
                    <td className="p-4">
                      <p className="font-semibold text-foreground">{i.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Created: {new Date(i.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-primary">{i.investment_properties?.title}</p>
                      <Badge variant="outline" className="mt-1 text-[9px] uppercase tracking-wider">{getInvestmentType(i)}</Badge>
                    </td>
                    <td className="p-4 text-right font-mono text-sm">{formatMoney(getTotalAmount(i), i.investment_properties?.currency || "USD")}</td>
                    <td className="p-4 text-right font-mono text-sm text-green-600">{formatMoney(getAmountPaid(i), i.investment_properties?.currency || "USD")}</td>
                    <td className="p-4 text-right font-mono text-sm text-amber-600 font-bold">{formatMoney(getRemainingBalance(i), i.investment_properties?.currency || "USD")}</td>
                    <td className="p-4 text-xs">
                      {getInvestmentType(i) === 'installment' ? (
                        <>
                          <p>{i.duration_months ? `${i.duration_months} Months` : 'N/A'}</p>
                          {i.next_payment_due && <p className="text-[10px] text-muted-foreground mt-0.5">Due: {new Date(i.next_payment_due).toLocaleDateString()}</p>}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <Badge className="rounded-md px-2 py-0 text-[10px] uppercase font-bold" variant={(i.status === "active" || i.status === "confirmed") ? "default" : (i.status === "pending" || i.status === "payment_under_review" || i.status === "awaiting_payment") ? "secondary" : "outline"}>
                        {i.status?.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        {(i.status === "pending" || i.status === "payment_under_review") ? (
                        <>
                          <Button variant="default" size="sm" className="h-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold" onClick={() => handleVerify(i.id)}>
                            Verify & Issue Cert
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 rounded-lg text-destructive hover:bg-destructive/10 border-destructive/20 font-bold gap-1" onClick={() => handleReject(i.id)}>
                            <Ban className="h-3.5 w-3.5" /> Reject
                          </Button>
                        </>
                      ) : (i.status === "active" || i.status === "confirmed") ? (
                        <>
                          <Button variant="ghost" size="sm" className="h-8 rounded-lg" onClick={() => setViewItem(i)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 rounded-lg text-amber-600 hover:bg-amber-50 border-amber-200 font-bold gap-1" onClick={() => handleRefund(i.id)}>
                            <Undo2 className="h-3 w-3" /> Refund
                          </Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8 rounded-lg" onClick={() => setViewItem(i)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="h-8 text-primary hover:bg-primary/10" onClick={() => window.dispatchEvent(new CustomEvent("open-investor-360", { detail: { userId: i.user_id } }))}>
                        360
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(i)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(i.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Investment</DialogTitle><DialogDescription>Are you sure you want to permanently delete this investment record? This action cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete Permanently</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Form Dialog */}
      <Dialog open={createOpen || !!editItem} onOpenChange={(v) => { if (!v) { setCreateOpen(false); setEditItem(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editItem ? 'Edit Investment' : 'Create Manual Investment'}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Investor</Label>
                <Select value={formData.user_id} onValueChange={(v) => setFormData({...formData, user_id: v})} disabled={!!editItem}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>{users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Property</Label>
                <Select value={formData.property_id} onValueChange={(v) => setFormData({...formData, property_id: v})} disabled={!!editItem}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>{properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Investment Type</Label>
                <Select value={formData.investment_type} onValueChange={(v) => setFormData({...formData, investment_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Payment</SelectItem>
                    <SelectItem value="installment">Installment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                    <SelectItem value="payment_under_review">Payment Under Review</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Amount</Label>
                <Input type="number" value={formData.total_amount} onChange={(e) => setFormData({...formData, total_amount: e.target.value})} placeholder="e.g. 50000" />
              </div>
              <div className="space-y-2">
                <Label>Amount Paid</Label>
                <Input type="number" value={formData.amount_paid} onChange={(e) => setFormData({...formData, amount_paid: e.target.value})} placeholder="e.g. 10000" />
              </div>
            </div>

            {formData.investment_type === 'installment' && !editItem && (
              <div className="space-y-2 p-4 bg-muted/30 rounded-xl border">
                <Label className="text-primary">Installment Generator</Label>
                <p className="text-xs text-muted-foreground mb-3">Schedules will be auto-generated based on the remaining balance and duration.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Duration (Months)</Label>
                    <Input type="number" value={formData.duration_months} onChange={(e) => setFormData({...formData, duration_months: e.target.value})} />
                  </div>
                  <div>
                    <Label className="text-xs">Monthly Payment</Label>
                    <Input disabled value={formData.total_amount && formData.amount_paid ? ((Number(formData.total_amount) - Number(formData.amount_paid)) / Number(formData.duration_months)).toFixed(2) : 0} />
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Units Owned</Label>
              <Input type="number" value={formData.units_owned} onChange={(e) => setFormData({...formData, units_owned: e.target.value})} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button onClick={handleSave} className="w-full">{editItem ? 'Update Investment' : 'Create Investment'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewItem} onOpenChange={(v) => !v && setViewItem(null)}>
        <DialogContent className="max-w-3xl">
          {viewItem && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-2xl font-serif">{viewItem.profiles?.full_name}'s Investment</DialogTitle>
                    <DialogDescription>Property: {viewItem.investment_properties?.title}</DialogDescription>
                  </div>
                  <Badge variant={(viewItem.status === 'confirmed' || viewItem.status === 'active') ? 'default' : (viewItem.status === 'pending' || viewItem.status === 'awaiting_payment' || viewItem.status === 'payment_under_review') ? 'secondary' : 'destructive'} className="uppercase">
                    {viewItem.status?.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </DialogHeader>

              <DialogBody className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-muted/50 p-4 rounded-xl border">
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Total Amount</p>
                    <p className="text-xl font-bold text-foreground mt-1">{formatMoney(getTotalAmount(viewItem), viewItem.investment_properties?.currency || "USD")}</p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-xl border">
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Amount Paid</p>
                    <p className="text-xl font-bold text-green-600 mt-1">{formatMoney(getAmountPaid(viewItem), viewItem.investment_properties?.currency || "USD")}</p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-xl border">
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Remaining Balance</p>
                    <p className="text-xl font-bold text-amber-600 mt-1">{formatMoney(getRemainingBalance(viewItem), viewItem.investment_properties?.currency || "USD")}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2 mb-4 border-b pb-2"><Calendar className="h-5 w-5 text-primary" /> Investment Details</h3>
                  <div className="grid grid-cols-2 gap-y-4 text-sm">
                    <div><span className="text-muted-foreground block text-xs">Start Date</span> <span className="font-medium">{new Date(getStartDate(viewItem)).toLocaleDateString()}</span></div>
                    <div><span className="text-muted-foreground block text-xs">Investment Type</span> <span className="font-medium capitalize">{getInvestmentType(viewItem)}</span></div>
                    <div><span className="text-muted-foreground block text-xs">Units Owned</span> <span className="font-medium">{viewItem.units_owned}</span></div>
                    <div><span className="text-muted-foreground block text-xs">Next Payment</span> <span className="font-medium text-amber-600">{viewItem.next_payment_due ? new Date(viewItem.next_payment_due).toLocaleDateString() : 'N/A'}</span></div>
                  </div>
                </div>

                {getInvestmentType(viewItem) === 'installment' && (
                  <AdminScheduleList investmentId={viewItem.id} currency={viewItem.investment_properties?.currency || "USD"} />
                )}
              </DialogBody>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminScheduleList({ investmentId, currency }: { investmentId: string; currency: string }) {
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["admin-schedules", investmentId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("investment_schedules")
        .select("*")
        .eq("investment_id", investmentId)
        .order("due_date", { ascending: true });
      if (error) {
        console.error("Error fetching schedules:", error);
        return [];
      }
      return data ?? [];
    },
  });

  return (
    <div>
      <h3 className="font-semibold text-lg flex items-center gap-2 mb-4 border-b pb-2">
        <Calendar className="h-5 w-5 text-primary" /> Payment Schedule
      </h3>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-secondary/20 rounded-xl p-8 text-center text-muted-foreground text-sm border border-dashed border-border">
          <p>No installment schedules have been generated for this investment yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map((s: any, idx: number) => {
            const isPaid = s.status === "paid";
            const isOverdue = s.status === "overdue" || (!isPaid && new Date(s.due_date) < new Date());
            return (
              <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl border text-sm ${isPaid ? 'bg-green-50/50 border-green-200 dark:bg-green-950/10 dark:border-green-900/30' : isOverdue ? 'bg-red-50/50 border-red-200 dark:bg-red-950/10 dark:border-red-900/30' : 'bg-card border-border'}`}>
                <div className="flex items-center gap-3">
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${isPaid ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : isOverdue ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-secondary text-muted-foreground'}`}>
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-medium">Due: {new Date(s.due_date).toLocaleDateString()}</p>
                    {isPaid && s.paid_date && <p className="text-[10px] text-muted-foreground">Paid: {new Date(s.paid_date).toLocaleDateString()}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold">{formatMoney(Number(s.amount_due), currency)}</span>
                  <Badge variant={isPaid ? "default" : isOverdue ? "destructive" : "secondary"} className="capitalize text-[10px]">
                    {isPaid ? "Paid" : isOverdue ? "Overdue" : "Pending"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
