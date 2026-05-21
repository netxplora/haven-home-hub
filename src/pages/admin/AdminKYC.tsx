import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  ShieldX,
  Search,
  ExternalLink,
  Check,
  X,
  Eye,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
} from "lucide-react";

type KycFilter = "all" | "pending" | "approved" | "rejected" | "unverified";

export function AdminKYC() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<KycFilter>("pending");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-kyc-profiles", filter],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("updated_at", { ascending: false });

      if (filter !== "all") {
        if (filter === "unverified") {
          query = query.or("kyc_status.is.null,kyc_status.eq.unverified");
        } else {
          query = query.eq("kyc_status", filter);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = profiles.filter((p: any) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (p.full_name ?? "").toLowerCase().includes(term) ||
      (p.id ?? "").toLowerCase().includes(term) ||
      (p.phone ?? "").toLowerCase().includes(term)
    );
  });

  // Get count of pending reviews
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["admin-kyc-pending-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("kyc_status", "pending");
      return count ?? 0;
    },
  });

  async function updateKycStatus(userId: string, status: "approved" | "rejected", reason?: string) {
    setProcessing(userId);
    try {
      const updateData: any = { kyc_status: status };
      if (status === "rejected" && reason) {
        updateData.kyc_rejection_reason = reason;
      }
      if (status === "approved") {
        updateData.kyc_rejection_reason = null;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", userId);

      if (error) throw error;

      // Send notification to user
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "system",
        title: status === "approved" ? "Identity Verified" : "Verification Declined",
        body:
          status === "approved"
            ? "Your identity verification has been approved. You now have full access to all investment opportunities."
            : `Your identity verification has been rejected. Reason: ${reason || "Documents not accepted."}`,
        link: "/dashboard?tab=profile",
      });

      toast({
        title: `Verification ${status === "approved" ? "Approved" : "Rejected"}`,
        description: `User verification has been ${status}.`,
      });

      setExpandedId(null);
      setRejectionReason("");
      qc.invalidateQueries({ queryKey: ["admin-kyc-profiles"] });
      qc.invalidateQueries({ queryKey: ["admin-kyc-pending-count"] });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  }

  const statusIcon = (status: string | null) => {
    switch (status) {
      case "approved":
        return <ShieldCheck className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "rejected":
        return <ShieldX className="h-4 w-4 text-red-500" />;
      default:
        return <ShieldAlert className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const statusVariant = (status: string | null) => {
    switch (status) {
      case "approved":
        return "default" as const;
      case "pending":
        return "secondary" as const;
      case "rejected":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {(["pending", "approved", "rejected", "unverified"] as KycFilter[]).map((status) => {
          const count =
            status === "all"
              ? profiles.length
              : profiles.filter((p: any) =>
                  status === "unverified"
                    ? !p.kyc_status || p.kyc_status === "unverified"
                    : p.kyc_status === status
                ).length;
          const isActive = filter === status;

          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  status === "pending"
                    ? "bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
                    : status === "approved"
                    ? "bg-green-100 text-green-600 dark:bg-green-950/30 dark:text-green-400"
                    : status === "rejected"
                    ? "bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {status === "pending" && <Clock className="h-5 w-5" />}
                {status === "approved" && <ShieldCheck className="h-5 w-5" />}
                {status === "rejected" && <ShieldX className="h-5 w-5" />}
                {status === "unverified" && <ShieldAlert className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {status === "pending" ? "Pending Review" : status === "approved" ? "Verified" : status === "rejected" ? "Not Approved" : "Unverified"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 font-serif text-lg font-semibold text-muted-foreground">
            No {filter === "all" ? "" : filter} submissions found
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/50 bg-card shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-border/50 bg-secondary/40 hidden md:table-header-group">
              <tr>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">
                  User
                </th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">
                  Status
                </th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">
                  Documents
                </th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">
                  Updated
                </th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground text-right whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((profile: any) => {
                const isExpanded = expandedId === profile.id;
                const hasIdDoc = !!profile.id_document_url;
                const hasProofAddr = !!profile.proof_of_address_url;

                return (
                  <tr key={profile.id} className="group">
                    <td colSpan={5} className="p-0">
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          {/* User info */}
                          <div className="flex items-center gap-3 min-w-[180px]">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <User className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {profile.full_name || "Unnamed User"}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {profile.id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>

                          {/* Status */}
                          <Badge
                            variant={statusVariant(profile.kyc_status)}
                            className="capitalize"
                          >
                            {statusIcon(profile.kyc_status)}
                            <span className="ml-1">
                              <span className="capitalize">
                                {profile.kyc_status === "approved" ? "Verified" : 
                                 profile.kyc_status === "pending" ? "Pending" : 
                                 profile.kyc_status === "rejected" ? "Declined" : "Unverified"}
                              </span>
                            </span>
                          </Badge>

                          {/* Documents indicator */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span
                              className={hasIdDoc ? "text-green-500" : "text-muted-foreground/30"}
                            >
                              ID {hasIdDoc ? "✓" : "✗"}
                            </span>
                            <span className="text-border">|</span>
                            <span
                              className={
                                hasProofAddr ? "text-green-500" : "text-muted-foreground/30"
                              }
                            >
                              Address {hasProofAddr ? "✓" : "✗"}
                            </span>
                          </div>

                          {/* Updated */}
                          <p className="text-xs text-muted-foreground">
                            {new Date(profile.updated_at).toLocaleDateString()}
                          </p>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {profile.kyc_status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-11 md:h-8 gap-1 text-sm md:text-xs px-4 md:px-3"
                                  disabled={processing === profile.id}
                                  onClick={() =>
                                    updateKycStatus(profile.id, "approved")
                                  }
                                >
                                  <Check className="h-3 w-3" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-11 md:h-8 gap-1 text-sm md:text-xs px-4 md:px-3"
                                  disabled={processing === profile.id}
                                  onClick={() =>
                                    setExpandedId(
                                      isExpanded ? null : profile.id
                                    )
                                  }
                                >
                                  <X className="h-3 w-3" /> Reject
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-11 w-11 md:h-8 md:w-8 p-0"
                              onClick={() =>
                                setExpandedId(isExpanded ? null : profile.id)
                              }
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="mt-4 space-y-4 rounded-xl border border-border/50 bg-secondary/20 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="grid gap-4 sm:grid-cols-2">
                              {/* ID Document */}
                              <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  Government ID
                                </p>
                                {hasIdDoc ? (
                                  <Button
                                    variant="outline"
                                    className="flex w-full items-center justify-start gap-2 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:border-primary/30 hover:text-primary"
                                    onClick={async () => {
                                      const path = profile.id_document_url;
                                      if (path.startsWith('http')) {
                                        window.open(path, '_blank');
                                        return;
                                      }
                                      const { data, error } = await supabase.storage.from("kyc_documents").createSignedUrl(path, 60);
                                      if (error) toast({ title: "Failed to open document", description: error.message, variant: "destructive" });
                                      else if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                    View Document
                                    <ExternalLink className="h-3 w-3 ml-auto" />
                                  </Button>
                                ) : (
                                  <p className="text-sm text-muted-foreground/60 italic">
                                    Not submitted
                                  </p>
                                )}
                              </div>

                              {/* Proof of Address */}
                              <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  Proof of Address
                                </p>
                                {hasProofAddr ? (
                                  <Button
                                    variant="outline"
                                    className="flex w-full items-center justify-start gap-2 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:border-primary/30 hover:text-primary"
                                    onClick={async () => {
                                      const path = profile.proof_of_address_url;
                                      if (path.startsWith('http')) {
                                        window.open(path, '_blank');
                                        return;
                                      }
                                      const { data, error } = await supabase.storage.from("kyc_documents").createSignedUrl(path, 60);
                                      if (error) toast({ title: "Failed to open document", description: error.message, variant: "destructive" });
                                      else if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                    View Document
                                    <ExternalLink className="h-3 w-3 ml-auto" />
                                  </Button>
                                ) : (
                                  <p className="text-sm text-muted-foreground/60 italic">
                                    Not submitted
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Contact info */}
                            <div className="grid gap-4 sm:grid-cols-3 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Full Name</p>
                                <p className="font-medium">{profile.full_name || "—"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Phone</p>
                                <p className="font-medium">{profile.phone || "—"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">User ID</p>
                                <p className="font-mono text-xs">{profile.id}</p>
                              </div>
                            </div>

                            {/* Rejection reason (for pending or already rejected) */}
                            {(profile.kyc_status === "pending" ||
                              profile.kyc_status === "rejected") && (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  {profile.kyc_status === "rejected"
                                    ? "Decline Reason"
                                    : "Decline Reason (if declining)"}
                                </p>
                                {profile.kyc_status === "rejected" &&
                                profile.kyc_rejection_reason ? (
                                  <p className="text-sm bg-destructive/10 text-destructive p-3 rounded-lg">
                                    {profile.kyc_rejection_reason}
                                  </p>
                                ) : (
                                  profile.kyc_status === "pending" && (
                                    <div className="flex gap-2">
                                      <Textarea
                                        placeholder="Provide a reason for declining..."
                                        value={rejectionReason}
                                        onChange={(e) =>
                                          setRejectionReason(e.target.value)
                                        }
                                        className="min-h-[80px] flex-1"
                                      />
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        disabled={
                                          !rejectionReason.trim() ||
                                          processing === profile.id
                                        }
                                        onClick={() =>
                                          updateKycStatus(
                                            profile.id,
                                            "rejected",
                                            rejectionReason
                                          )
                                        }
                                      >
                                        Confirm Decline
                                      </Button>
                                    </div>
                                  )
                                )}
                              </div>
                            )}

                            {/* Re-approve button for rejected */}
                            {profile.kyc_status === "rejected" && (
                              <Button
                                size="sm"
                                className="gap-1"
                                disabled={processing === profile.id}
                                onClick={() =>
                                  updateKycStatus(profile.id, "approved")
                                }
                              >
                                <Check className="h-3 w-3" /> Re-approve
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
