import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Search } from "lucide-react";
import { formatMoney } from "@/lib/invest";
import { ReceiptDialog } from "@/components/dashboard/ReceiptDialog";

export function AdminReceipts() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ["admin-receipts"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("receipts").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = receipts.filter((r: any) => {
    const matchesSearch = 
      r.receipt_id?.toLowerCase().includes(search.toLowerCase()) || 
      r.user_name?.toLowerCase().includes(search.toLowerCase()) || 
      r.user_email?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || r.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold">Receipts Repository</h2>
        <p className="text-sm text-muted-foreground">View and download all auto-generated receipts for confirmed payments.</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by ID, name, or email..." 
            className="pl-9 rounded-xl bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48 rounded-xl bg-card">
            <SelectValue placeholder="Payment Type" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="investment">Investment</SelectItem>
            <SelectItem value="reservation">Reservation</SelectItem>
            <SelectItem value="booking">Booking</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Mobile Card View (md:hidden) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-border/50 bg-card p-8 text-center text-muted-foreground shadow-sm">
                No receipts found matching your filters.
              </div>
            ) : (
              filtered.map((r: any) => (
                <div key={r.id} className="rounded-xl border border-border/50 bg-card p-4 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono font-bold text-primary text-sm">{r.receipt_id}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="outline" className="capitalize text-[10px]">{r.type}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/50 pt-2">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-medium">Customer</span>
                      <p className="font-medium text-foreground mt-0.5">{r.user_name || "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground">{r.user_email}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-medium">Amount & Method</span>
                      <p className="font-bold text-foreground mt-0.5">{formatMoney(Number(r.amount_paid), r.currency)}</p>
                      <span className="text-[10px] text-muted-foreground capitalize">{r.payment_method?.replace("_", " ")}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/50">
                    <Button variant="outline" size="sm" className="w-full h-11 text-sm font-medium flex items-center justify-center gap-2" onClick={() => setSelectedReceipt(r)}>
                      <FileText className="h-4 w-4" /> View Receipt
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-border/50 bg-card shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/40 border-b border-border/50">
                <tr>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Receipt ID & Date</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Customer</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Type & Method</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground text-right whitespace-nowrap">Amount</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((r: any) => (
                  <tr key={r.id} className="transition-colors hover:bg-secondary/20">
                    <td className="p-4">
                      <p className="font-mono font-bold text-primary">{r.receipt_id}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(r.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-foreground">{r.user_name || "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{r.user_email}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize text-[10px]">{r.type}</Badge>
                        <span className="text-[10px] text-muted-foreground capitalize">{r.payment_method?.replace("_", " ")}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <p className="font-bold text-foreground">{formatMoney(Number(r.amount_paid), r.currency)}</p>
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-primary hover:bg-primary/10" onClick={() => setSelectedReceipt(r)}>
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No receipts found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ReceiptDialog open={!!selectedReceipt} onClose={() => setSelectedReceipt(null)} receipt={selectedReceipt} />
    </div>
  );
}
