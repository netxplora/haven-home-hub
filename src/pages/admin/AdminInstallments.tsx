import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/invest";
import { Search, Eye, AlertTriangle, CheckCircle2, Clock, Layers, TrendingUp, Banknote, XCircle, Calendar } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

export function AdminInstallments() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewItem, setViewItem] = useState<any>(null);

  // Fetch all installment investments
  const { data: investments = [], isLoading } = useQuery({
    queryKey: ["admin-installment-investments"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_investments")
        .select("*, investment_properties(title, slug, currency), profiles(full_name)")
        .eq("investment_type", "installment")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching installment investments:", error);
        return [];
      }
      return data ?? [];
    },
  });

  // Analytics
  const totalInstallmentInvestments = investments.length;
  const activePlans = investments.filter((i: any) => i.status === "active" || i.status === "confirmed").length;
  const overduePlans = investments.filter((i: any) => i.status === "overdue").length;
  const completedPlans = investments.filter((i: any) => i.status === "completed").length;
  const defaultedPlans = investments.filter((i: any) => i.status === "defaulted").length;
  const totalRevenue = investments.reduce((s: number, i: any) => s + Number(i.amount_paid ?? 0), 0);
  const totalOutstanding = investments.reduce((s: number, i: any) => s + Number(i.remaining_balance ?? 0), 0);

  const filtered = investments.filter((i: any) => {
    const investorName = (i.profiles?.full_name || "").toLowerCase();
    const propName = (i.investment_properties?.title || "").toLowerCase();
    const matchesSearch = investorName.includes(search.toLowerCase()) || propName.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold">Installment Plans</h2>
        <p className="text-sm text-muted-foreground">Monitor and manage all active payment schedules.</p>
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticsCard icon={Layers} label="Active Plans" value={String(totalInstallmentInvestments)} />
        <AnalyticsCard icon={TrendingUp} label="Active Plans" value={String(activePlans)} accent />
        <AnalyticsCard icon={AlertTriangle} label="Overdue Payments" value={String(overduePlans)} variant="warning" />
        <AnalyticsCard icon={CheckCircle2} label="Completed" value={String(completedPlans)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Total Payments Received</p>
          <p className="text-2xl font-serif font-bold text-primary mt-1">{formatMoney(totalRevenue)}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Outstanding Balance</p>
          <p className="text-2xl font-serif font-bold text-amber-600 mt-1">{formatMoney(totalOutstanding)}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Overdue Accounts</p>
          <p className="text-2xl font-serif font-bold text-destructive mt-1">{defaultedPlans}</p>
        </div>
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
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="defaulted">Defaulted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
      ) : (
        <>
          {/* Mobile Card View (md:hidden) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-border/50 bg-card p-8 text-center text-muted-foreground shadow-sm">
                No installment plans found.
              </div>
            ) : (
              filtered.map((i: any) => {
                const currency = i.investment_properties?.currency || "USD";
                const total = Number(i.total_amount ?? i.amount_invested ?? 0);
                const paid = Number(i.amount_paid ?? 0);
                const balance = Number(i.remaining_balance ?? 0);
                const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

                return (
                  <div key={i.id} className="rounded-xl border border-border/50 bg-card p-4 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-foreground">{i.profiles?.full_name || "Unknown"}</h4>
                        <p className="text-[10px] text-muted-foreground">{new Date(i.created_at).toLocaleDateString()}</p>
                      </div>
                      <Badge
                        className="rounded-md px-2 py-0.5 text-[10px] font-bold capitalize"
                        variant={
                          i.status === "active" || i.status === "confirmed" ? "default" :
                          i.status === "overdue" || i.status === "defaulted" ? "destructive" :
                          i.status === "completed" ? "default" : "secondary"
                        }
                      >
                        {i.status === "defaulted" ? "Overdue" : i.status}
                      </Badge>
                    </div>

                    <div className="border-t border-border/50 my-2 pt-2">
                      <p className="text-[10px] uppercase font-medium text-muted-foreground">Property</p>
                      <p className="font-medium text-primary text-sm">{i.investment_properties?.title}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-medium">Total Price</span>
                        <span className="font-mono font-semibold text-foreground">{formatMoney(total, currency)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-medium">Monthly</span>
                        <span className="font-semibold text-foreground">{formatMoney(Number(i.monthly_installment_amount ?? 0), currency)} ({i.duration_months ? `${i.duration_months}mo` : "—"})</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-medium">Paid</span>
                        <span className="font-mono font-semibold text-green-600">{formatMoney(paid, currency)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-medium">Remaining</span>
                        <span className="font-mono font-semibold text-amber-600 font-bold">{formatMoney(balance, currency)}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Progress ({pct}%)</span>
                        {i.next_payment_due && (
                          <span>
                            Next Due:{" "}
                            <span className={new Date(i.next_payment_due) < new Date() ? "text-destructive font-semibold" : "text-muted-foreground"}>
                              {new Date(i.next_payment_due).toLocaleDateString()}
                            </span>
                          </span>
                        )}
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>

                    <div className="pt-2">
                      <Button variant="outline" size="sm" className="w-full h-11 text-sm font-medium flex items-center justify-center gap-2" onClick={() => setViewItem(i)}>
                        <Eye className="h-4 w-4" /> View Details
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-border/50 bg-card shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/40 border-b border-border/50">
                <tr>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Investor</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Property</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground text-right whitespace-nowrap">Total Price</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground text-right whitespace-nowrap">Initial Payment</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground text-right whitespace-nowrap">Paid</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground text-right whitespace-nowrap">Balance</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Monthly</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Duration</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Next Due</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Progress</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground text-center whitespace-nowrap">Status</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={12} className="p-12 text-center text-muted-foreground">No installment plans found.</td></tr>
                ) : filtered.map((i: any) => {
                  const currency = i.investment_properties?.currency || "USD";
                  const total = Number(i.total_amount ?? i.amount_invested ?? 0);
                  const paid = Number(i.amount_paid ?? 0);
                  const balance = Number(i.remaining_balance ?? 0);
                  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

                  return (
                    <tr key={i.id} className="transition-colors hover:bg-secondary/20">
                      <td className="p-4">
                        <p className="font-semibold">{i.profiles?.full_name || "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(i.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-primary">{i.investment_properties?.title}</p>
                      </td>
                      <td className="p-4 text-right font-mono text-sm">{formatMoney(total, currency)}</td>
                      <td className="p-4 text-right font-mono text-sm">{formatMoney(Number(i.down_payment_amount ?? 0), currency)}</td>
                      <td className="p-4 text-right font-mono text-sm text-green-600">{formatMoney(paid, currency)}</td>
                      <td className="p-4 text-right font-mono text-sm text-amber-600 font-bold">{formatMoney(balance, currency)}</td>
                      <td className="p-4 text-sm font-medium">{formatMoney(Number(i.monthly_installment_amount ?? 0), currency)}</td>
                      <td className="p-4 text-sm">{i.duration_months ? `${i.duration_months}mo` : "—"}</td>
                      <td className="p-4 text-xs">
                        {i.next_payment_due ? (
                          <span className={new Date(i.next_payment_due) < new Date() ? "text-destructive font-semibold" : "text-muted-foreground"}>
                            {new Date(i.next_payment_due).toLocaleDateString()}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="p-4">
                        <div className="w-20">
                          <div className="flex justify-between text-[10px] mb-1">
                            <span>{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <Badge
                          className="rounded-md px-2 py-0.5 text-[10px] font-bold capitalize"
                          variant={
                            i.status === "active" || i.status === "confirmed" ? "default" :
                            i.status === "overdue" || i.status === "defaulted" ? "destructive" :
                            i.status === "completed" ? "default" : "secondary"
                          }
                        >
                          {i.status === "defaulted" ? "Overdue" : i.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setViewItem(i)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!viewItem} onOpenChange={(v) => !v && setViewItem(null)}>
        {viewItem && (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <div className="flex justify-between items-start">
                <div>
                  <DialogTitle className="text-2xl font-serif">{viewItem.profiles?.full_name}'s Payment Schedule</DialogTitle>
                  <DialogDescription>Property: {viewItem.investment_properties?.title}</DialogDescription>
                </div>
                <Badge variant={viewItem.status === "active" || viewItem.status === "confirmed" ? "default" : "destructive"} className="uppercase">
                  {viewItem.status}
                </Badge>
              </div>
            </DialogHeader>

            <DialogBody className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MiniStat label="Total Amount" value={formatMoney(Number(viewItem.total_amount ?? 0), viewItem.investment_properties?.currency)} />
                <MiniStat label="Initial Payment" value={formatMoney(Number(viewItem.down_payment_amount ?? 0), viewItem.investment_properties?.currency)} />
                <MiniStat label="Amount Paid" value={formatMoney(Number(viewItem.amount_paid ?? 0), viewItem.investment_properties?.currency)} accent />
                <MiniStat label="Remaining" value={formatMoney(Number(viewItem.remaining_balance ?? 0), viewItem.investment_properties?.currency)} warning />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-bold">{Number(viewItem.completion_percentage ?? 0).toFixed(0)}%</span>
                </div>
                <Progress value={Number(viewItem.completion_percentage ?? 0)} className="h-2" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Payment</p>
                  <p className="font-semibold mt-0.5">{formatMoney(Number(viewItem.monthly_installment_amount ?? 0), viewItem.investment_properties?.currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-semibold mt-0.5">{viewItem.duration_months ?? "—"} months</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="font-semibold mt-0.5">{new Date(viewItem.start_date || viewItem.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Next Due</p>
                  <p className="font-semibold mt-0.5 text-amber-600">{viewItem.next_payment_due ? new Date(viewItem.next_payment_due).toLocaleDateString() : "N/A"}</p>
                </div>
              </div>

              <InstallmentScheduleViewer investmentId={viewItem.id} currency={viewItem.investment_properties?.currency || "USD"} />
            </DialogBody>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function AnalyticsCard({ icon: Icon, label, value, accent, variant }: { icon: any; label: string; value: string; accent?: boolean; variant?: "warning" }) {
  return (
    <div className={`group relative overflow-hidden rounded-xl border p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
      variant === "warning" ? "border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/10" :
      accent ? "border-primary/20 bg-primary/5" : "border-border/50 bg-card"
    }`}>
      <div className="flex items-center gap-4">
        <span className={`grid h-12 w-12 place-items-center rounded-xl transition-colors ${
          variant === "warning" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
          accent ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground"
        }`}>
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{label}</p>
          <p className="text-2xl font-serif font-bold text-foreground mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent, warning }: { label: string; value: string; accent?: boolean; warning?: boolean }) {
  return (
    <div className="bg-muted/50 p-4 rounded-xl border">
      <p className="text-xs text-muted-foreground font-semibold uppercase">{label}</p>
      <p className={`text-lg font-bold mt-1 ${accent ? "text-green-600" : warning ? "text-amber-600" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function InstallmentScheduleViewer({ investmentId, currency }: { investmentId: string; currency: string }) {
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["admin-installment-schedules", investmentId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("investment_schedules")
        .select("*")
        .eq("investment_id", investmentId)
        .order("due_date", { ascending: true });
      if (error) return [];
      return data ?? [];
    },
  });

  return (
    <div>
      <h3 className="font-semibold text-lg flex items-center gap-2 mb-4 border-b pb-2">
        <Calendar className="h-5 w-5 text-primary" /> Payment Schedule
      </h3>
      {isLoading ? (
        <div className="space-y-3"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
      ) : schedules.length === 0 ? (
        <div className="bg-secondary/20 rounded-xl p-8 text-center text-muted-foreground text-sm border border-dashed border-border">
          <p>No installment schedules found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map((s: any, idx: number) => {
            const isPaid = s.status === "paid";
            const isOverdue = s.status === "overdue" || (!isPaid && new Date(s.due_date) < new Date());
            return (
              <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl border text-sm ${
                isPaid ? "bg-green-50/50 border-green-200 dark:bg-green-950/10 dark:border-green-900/30" :
                isOverdue ? "bg-red-50/50 border-red-200 dark:bg-red-950/10 dark:border-red-900/30" :
                "bg-card border-border"
              }`}>
                <div className="flex items-center gap-3">
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    isPaid ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                    isOverdue ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                    "bg-secondary text-muted-foreground"
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-medium">Installment {idx + 1}</p>
                    <p className="text-[10px] text-muted-foreground">Due: {format(new Date(s.due_date), "MMM dd, yyyy")}</p>
                    {isPaid && s.paid_date && <p className="text-[10px] text-green-600">Paid: {format(new Date(s.paid_date), "MMM dd, yyyy")}</p>}
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
