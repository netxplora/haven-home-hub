import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/invest";
import { 
  RefreshCw, 
  Search, 
  ArrowUpDown, 
  Wallet, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
  Eye,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const ITEMS_PER_PAGE = 10;

export function AdminDeposits() {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDeposit, setSelectedDeposit] = useState<any>(null);
  const [adminNote, setAdminNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const { data: deposits = [], isLoading } = useQuery({
    queryKey: ["admin-deposits-list"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payments")
        .select(`
          *,
          profiles(full_name),
          payment_audit_logs(admin_id, previous_status, new_status, notes, created_at)
        `)
        .eq("payment_type", "deposit")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  // Calculate high level metrics
  const metrics = useMemo(() => {
    const pending = deposits.filter((d: any) => d.status === "pending" || d.status === "processing");
    const approved = deposits.filter((d: any) => d.status === "success" || d.status === "confirmed");
    const declined = deposits.filter((d: any) => d.status === "rejected" || d.status === "failed");

    const pendingTotal = pending.reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0);
    const approvedTotal = approved.reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0);

    return {
      pendingCount: pending.length,
      pendingTotal,
      approvedCount: approved.length,
      approvedTotal,
      declinedCount: declined.length,
      totalCount: deposits.length
    };
  }, [deposits]);

  const filtered = useMemo(() => {
    let result = [...deposits];

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "pending") {
        result = result.filter((d: any) => d.status === "pending" || d.status === "processing");
      } else if (statusFilter === "approved") {
        result = result.filter((d: any) => d.status === "success" || d.status === "confirmed");
      } else if (statusFilter === "declined") {
        result = result.filter((d: any) => d.status === "rejected" || d.status === "failed" || d.status === "cancelled");
      }
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((d: any) =>
        (d.profiles?.full_name ?? "").toLowerCase().includes(term) ||
        (d.transaction_hash ?? "").toLowerCase().includes(term) ||
        (d.user_id ?? "").toLowerCase().includes(term) ||
        (d.crypto_currency ?? "").toLowerCase().includes(term)
      );
    }

    // Sorting
    switch (sortBy) {
      case "newest":
        result.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "oldest":
        result.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "amount_high":
        result.sort((a: any, b: any) => Number(b.amount ?? 0) - Number(a.amount ?? 0));
        break;
      case "amount_low":
        result.sort((a: any, b: any) => Number(a.amount ?? 0) - Number(b.amount ?? 0));
        break;
    }

    return result;
  }, [deposits, statusFilter, searchTerm, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleCopy = (text: string, type: "hash" | "address") => {
    navigator.clipboard.writeText(text);
    if (type === "hash") {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } else {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleApprove = async () => {
    if (!selectedDeposit) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("admin_approve_deposit", {
        p_payment_id: selectedDeposit.id,
        p_admin_notes: adminNote.trim() || "Deposit verified and credited by administrator."
      });

      if (error) throw error;

      toast({
        title: "Deposit Approved Successfully",
        description: `Credited ${formatMoney(selectedDeposit.amount)} to user account.`
      });

      qc.invalidateQueries({ queryKey: ["admin-deposits-list"] });
      qc.invalidateQueries({ queryKey: ["admin-payments-all"] });
      qc.invalidateQueries({ queryKey: ["admin-overview-counts"] });
      qc.invalidateQueries({ queryKey: ["dashboard-overview-stats"] });
      setSelectedDeposit(null);
      setAdminNote("");
    } catch (err: any) {
      toast({
        title: "Approval Failed",
        description: err.message || "Failed to approve deposit.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!selectedDeposit) return;
    if (!declineReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for declining this deposit request.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("admin_decline_deposit", {
        p_payment_id: selectedDeposit.id,
        p_rejection_reason: declineReason.trim()
      });

      if (error) throw error;

      toast({
        title: "Deposit Declined",
        description: "The deposit request was marked as rejected."
      });

      qc.invalidateQueries({ queryKey: ["admin-deposits-list"] });
      qc.invalidateQueries({ queryKey: ["admin-payments-all"] });
      qc.invalidateQueries({ queryKey: ["admin-overview-counts"] });
      setIsDeclineModalOpen(false);
      setSelectedDeposit(null);
      setDeclineReason("");
    } catch (err: any) {
      toast({
        title: "Decline Failed",
        description: err.message || "Failed to decline deposit.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
      case "confirmed":
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold px-2.5 py-0.5">Approved</Badge>;
      case "rejected":
      case "failed":
      case "cancelled":
        return <Badge variant="destructive" className="font-semibold px-2.5 py-0.5">Declined</Badge>;
      case "processing":
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold px-2.5 py-0.5">Processing</Badge>;
      case "pending":
      default:
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold px-2.5 py-0.5">Pending Review</Badge>;
    }
  };

  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">Deposit Requests</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review, verify blockchain proofs, and credit user wallet balances.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl border-border/70 bg-card hover:bg-accent"
          onClick={() => qc.invalidateQueries({ queryKey: ["admin-deposits-list"] })}
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh Queue
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Pending Requests</span>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-serif text-foreground mt-2">{metrics.pendingCount}</p>
          <p className="text-xs text-muted-foreground mt-1">{formatMoney(metrics.pendingTotal)} pending approval</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Approved Volume</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-serif text-foreground mt-2">{formatMoney(metrics.approvedTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">{metrics.approvedCount} deposits approved</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Requests</span>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold font-serif text-foreground mt-2">{metrics.totalCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Lifetime deposit submissions</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Declined Requests</span>
            <XCircle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold font-serif text-foreground mt-2">{metrics.declinedCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Rejected transactions</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex rounded-xl border border-border/70 bg-card p-1 shadow-sm">
            {[
              { id: "pending", label: `Pending (${metrics.pendingCount})` },
              { id: "approved", label: "Approved" },
              { id: "declined", label: "Declined" },
              { id: "all", label: "All Requests" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === tab.id
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search user, tx hash, token..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9 rounded-xl text-xs bg-card border-border/70"
            />
          </div>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
            <SelectTrigger className="w-[160px] h-9 rounded-xl text-xs bg-card border-border/70">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="rounded-xl text-xs">
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="amount_high">Amount: High → Low</SelectItem>
              <SelectItem value="amount_low">Amount: Low → High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table / List Container */}
      <div className="rounded-2xl border border-border/70 bg-card shadow-sm overflow-hidden">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/40 border-b border-border/60 text-[11px] uppercase font-semibold text-muted-foreground tracking-wider">
              <tr>
                <th className="p-4">Submission Date</th>
                <th className="p-4">Investor</th>
                <th className="p-4">Asset / Network</th>
                <th className="p-4">Amount (USD)</th>
                <th className="p-4">Tx Reference</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    No deposit requests match your filter.
                  </td>
                </tr>
              ) : (
                paginated.map((d: any) => (
                  <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(d.created_at).toLocaleDateString()} · {new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-foreground text-sm">{d.profiles?.full_name || "Investor"}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{d.user_id.slice(0, 10)}...</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="font-bold text-xs bg-muted/40">
                          {d.crypto_currency || d.metadata?.crypto_currency || "USDT"}
                        </Badge>
                        {d.metadata?.network && (
                          <span className="text-[11px] text-muted-foreground">({d.metadata.network})</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-foreground text-sm">{formatMoney(d.amount)}</p>
                      {d.crypto_amount && (
                        <p className="text-[11px] text-muted-foreground">{d.crypto_amount} {d.crypto_currency || "USDT"}</p>
                      )}
                    </td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">
                      {d.transaction_hash ? (
                        <span className="truncate max-w-[140px] inline-block" title={d.transaction_hash}>
                          {d.transaction_hash.slice(0, 8)}...{d.transaction_hash.slice(-6)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 italic">No hash</span>
                      )}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(d.status)}
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg text-xs font-semibold"
                        onClick={() => setSelectedDeposit(d)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> Review
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
          {paginated.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No deposit requests match your filter.</div>
          ) : (
            paginated.map((d: any) => (
              <div key={d.id} className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{d.profiles?.full_name || "Investor"}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{new Date(d.created_at).toLocaleString()}</p>
                  </div>
                  {getStatusBadge(d.status)}
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t border-border/40">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Deposit Amount</span>
                    <span className="font-serif text-lg font-bold text-foreground">{formatMoney(d.amount)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Asset</span>
                    <span className="text-xs font-bold text-primary">{d.crypto_currency || "USDT"} {d.metadata?.network ? `(${d.metadata.network})` : ""}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 flex justify-end">
                  <Button
                    size="sm"
                    className="w-full h-9 rounded-lg text-xs font-semibold"
                    onClick={() => setSelectedDeposit(d)}
                  >
                    Review Details
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border/50 bg-muted/20">
            <span className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages} ({filtered.length} requests)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg text-xs"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg text-xs"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Complete Deposit Preview Drawer / Modal ── */}
      <Dialog open={!!selectedDeposit} onOpenChange={(open) => { if (!open) { setSelectedDeposit(null); setAdminNote(""); } }}>
        {selectedDeposit && (
          <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl border border-border/80">
            <DialogHeader className="bg-muted/40 p-6 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="font-serif text-xl font-bold text-foreground">Deposit Request Review</DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Reference ID: {selectedDeposit.id}</p>
                </div>
                {getStatusBadge(selectedDeposit.status)}
              </div>
            </DialogHeader>

            <DialogBody className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* User and Amount Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Investor Account</span>
                  <p className="font-bold text-sm text-foreground">{selectedDeposit.profiles?.full_name || "Investor"}</p>
                  <p className="text-[10px] text-muted-foreground font-mono break-all">{selectedDeposit.user_id}</p>
                </div>

                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Deposit Value</span>
                  <p className="font-serif text-2xl font-bold text-foreground">{formatMoney(selectedDeposit.amount)}</p>
                  {selectedDeposit.crypto_amount && (
                    <p className="text-xs text-muted-foreground font-medium">
                      Equivalent: {selectedDeposit.crypto_amount} {selectedDeposit.crypto_currency || "USDT"}
                    </p>
                  )}
                </div>
              </div>

              {/* Destination & Asset Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Asset & Destination Details</h4>
                <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Crypto Currency:</span>
                    <span className="font-semibold text-foreground">{selectedDeposit.crypto_currency || selectedDeposit.metadata?.crypto_currency || "USDT"}</span>
                  </div>
                  {selectedDeposit.metadata?.network && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Network / Protocol:</span>
                      <span className="font-semibold text-foreground">{selectedDeposit.metadata.network}</span>
                    </div>
                  )}
                  {selectedDeposit.metadata?.wallet_address && (
                    <div className="space-y-1 pt-2 border-t border-border/40">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Global Wallet Address:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[11px]"
                          onClick={() => handleCopy(selectedDeposit.metadata.wallet_address, "address")}
                        >
                          {copiedAddress ? <Check className="h-3 w-3 text-emerald-500 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                          {copiedAddress ? "Copied" : "Copy Address"}
                        </Button>
                      </div>
                      <p className="font-mono text-[11px] p-2 rounded-lg bg-muted/40 border border-border/40 break-all select-all">
                        {selectedDeposit.metadata.wallet_address}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Hash */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Blockchain Transaction Hash</h4>
                  {selectedDeposit.transaction_hash && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => handleCopy(selectedDeposit.transaction_hash, "hash")}
                    >
                      {copiedHash ? <Check className="h-3 w-3 text-emerald-500 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      {copiedHash ? "Copied" : "Copy Hash"}
                    </Button>
                  )}
                </div>
                {selectedDeposit.transaction_hash ? (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
                    <p className="font-mono text-xs text-foreground break-all select-all">
                      {selectedDeposit.transaction_hash}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/40 text-xs text-muted-foreground italic">
                    No transaction hash provided by the investor.
                  </div>
                )}
              </div>

              {/* Payment Proof / Receipt */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Uploaded Transfer Proof</h4>
                {(selectedDeposit.metadata?.proof_url || selectedDeposit.proof_url) ? (
                  <div className="rounded-xl border border-border/60 overflow-hidden bg-muted/20">
                    <a
                      href={selectedDeposit.metadata?.proof_url || selectedDeposit.proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group relative"
                    >
                      <img
                        src={selectedDeposit.metadata?.proof_url || selectedDeposit.proof_url}
                        alt="Transfer Proof"
                        className="w-full max-h-64 object-contain bg-background"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background text-foreground text-xs font-semibold shadow-md">
                          <ExternalLink className="h-3.5 w-3.5" /> View Full Image
                        </span>
                      </div>
                    </a>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/40 text-xs text-muted-foreground text-center">
                    No proof image was attached to this request.
                  </div>
                )}
              </div>

              {/* Verification & Audit History */}
              {selectedDeposit.payment_audit_logs && selectedDeposit.payment_audit_logs.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Audit History</h4>
                  <div className="space-y-2">
                    {selectedDeposit.payment_audit_logs.map((log: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl border border-border/40 bg-muted/20 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-foreground">
                            Status: {log.previous_status || "submitted"} → {log.new_status}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        {log.notes && (
                          <p className="text-muted-foreground italic">&ldquo;{log.notes}&rdquo;</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              {(selectedDeposit.status === "pending" || selectedDeposit.status === "processing") ? (
                <div className="space-y-4 pt-4 border-t border-border/60">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Admin Approval Note (Optional)</label>
                    <Input
                      placeholder="e.g., Verified on TRON network block #59238192"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      className="rounded-xl text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <Button
                      className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm"
                      onClick={handleApprove}
                      disabled={isSubmitting}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve & Credit {formatMoney(selectedDeposit.amount)}
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full h-11 rounded-xl text-rose-600 border-rose-500/30 hover:bg-rose-500/10 font-semibold text-sm"
                      onClick={() => setIsDeclineModalOpen(true)}
                      disabled={isSubmitting}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline Request
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center text-xs text-muted-foreground">
                  This deposit request has already been finalized ({selectedDeposit.status}).
                </div>
              )}
            </DialogBody>
          </DialogContent>
        )}
      </Dialog>

      {/* ── Mandatory Reason Decline Modal ── */}
      <Dialog open={isDeclineModalOpen} onOpenChange={setIsDeclineModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg font-bold text-foreground">Decline Deposit Request</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Please enter the reason for declining this deposit. This reason will be recorded in the audit logs and visible to the investor.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Decline Reason (Required)</label>
              <textarea
                className="w-full min-h-[100px] p-3 text-xs rounded-xl border border-border/70 bg-muted/20 focus-visible:ring-1 focus-visible:ring-primary"
                placeholder="e.g. Transaction hash not found on blockchain / Incorrect amount received"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => setIsDeclineModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="rounded-xl text-xs font-semibold"
                onClick={handleDecline}
                disabled={isSubmitting || !declineReason.trim()}
              >
                Confirm Decline
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
