import { useState } from "react";
import { useAdminReferrals } from "@/hooks/useReferrals";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  DollarSign,
  Award,
  AlertTriangle,
  ShieldCheck,
  Settings,
  Save,
  Loader2,
  Search,
  Flag,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  FileText,
  ChevronDown,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/invest";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type TabId = "referrals" | "audit" | "settings";

const STATUS_OPTIONS = [
  "all",
  "registered",
  "qualified",
  "pending_reward",
  "approved",
  "paid",
  "rejected",
  "flagged",
];

export function AdminReferrals() {
  const {
    referrals,
    auditLog,
    isLoading,
    stats,
    updateStatus,
    flagReferral,
  } = useAdminReferrals();

  const [activeTab, setActiveTab] = useState<TabId>("referrals");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    referral: any;
    action: string;
  }>({ open: false, referral: null, action: "" });
  const [actionNotes, setActionNotes] = useState("");
  const [isActioning, setIsActioning] = useState(false);

  // Settings
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<any>({
    bonus_percentage: 5,
    min_investment_required: 1000,
    max_bonus_cap: 500,
  });

  useQuery({
    queryKey: ["referral-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_configs")
        .select("value")
        .eq("key", "referral_settings")
        .maybeSingle();
      if (data?.value) setSettings(data.value);
      return data?.value;
    },
  });

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Update the main settings object
      const { error: e1 } = await supabase.from("system_configs").upsert({
        key: "referral_settings",
        value: settings,
        updated_at: new Date().toISOString(),
      });
      if (e1) throw e1;

      // Also update individual config keys used by the trigger
      await supabase.from("system_configs").upsert({
        key: "referral_bonus_pct",
        value: JSON.stringify(String(settings.bonus_percentage)),
        category: "referrals",
        updated_at: new Date().toISOString(),
      });
      await supabase.from("system_configs").upsert({
        key: "referral_min_investment",
        value: JSON.stringify(String(settings.min_investment_required)),
        category: "referrals",
        updated_at: new Date().toISOString(),
      });
      await supabase.from("system_configs").upsert({
        key: "referral_max_bonus_cap",
        value: JSON.stringify(String(settings.max_bonus_cap)),
        category: "referrals",
        updated_at: new Date().toISOString(),
      });

      toast({
        title: "Settings updated",
        description: "Referral program configuration has been saved.",
      });
    } catch (e: any) {
      toast({
        title: "Failed to save",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  async function handleAction() {
    if (!actionDialog.referral) return;
    setIsActioning(true);

    try {
      if (actionDialog.action === "flag") {
        await flagReferral(actionDialog.referral.id, actionNotes);
      } else {
        await updateStatus(
          actionDialog.referral.id,
          actionDialog.action,
          actionNotes
        );
      }
    } finally {
      setIsActioning(false);
      setActionDialog({ open: false, referral: null, action: "" });
      setActionNotes("");
    }
  }

  // Filter referrals
  const filteredReferrals = referrals.filter((r: any) => {
    const matchesStatus =
      statusFilter === "all" || r.status === statusFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      r.referrer?.full_name?.toLowerCase().includes(query) ||
      r.referrer?.email?.toLowerCase().includes(query) ||
      r.referred?.full_name?.toLowerCase().includes(query) ||
      r.referred?.email?.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  function getStatusStyle(status: string) {
    switch (status) {
      case "registered":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "qualified":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "pending_reward":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      case "approved":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "paid":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      case "flagged":
        return "bg-red-600/10 text-red-700 border-red-600/20";
      default:
        return "";
    }
  }

  const tabs: { id: TabId; label: string; icon: any; count?: number }[] = [
    { id: "referrals", label: "Referrals", icon: Users, count: referrals.length },
    { id: "audit", label: "Audit Log", icon: FileText, count: auditLog.length },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-serif font-bold">
          Referral Management Center
        </h2>
        <p className="text-sm text-muted-foreground">
          Monitor referral activity, manage rewards, and review fraud flags.
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            label: "Total Referrals",
            value: stats.total,
            icon: Users,
            color: "text-primary bg-primary/10",
          },
          {
            label: "Rewards Paid",
            value: formatMoney(stats.totalRewards),
            icon: DollarSign,
            color: "text-amber-600 bg-amber-500/10",
          },
          {
            label: "Conversion Rate",
            value: `${stats.conversionRate}%`,
            icon: Award,
            color: "text-green-600 bg-green-500/10",
          },
          {
            label: "Pending",
            value: stats.pendingCount,
            icon: Clock,
            color: "text-orange-600 bg-orange-500/10",
          },
          {
            label: "Flagged",
            value: stats.flaggedCount,
            icon: AlertTriangle,
            color: stats.flaggedCount > 0
              ? "text-red-600 bg-red-500/10"
              : "text-muted-foreground bg-secondary",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-xl p-3 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {stat.label}
                </p>
                <p className="text-xl font-serif font-bold mt-0.5">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex gap-1 border-b border-border/50 pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.count !== undefined && (
              <Badge
                variant="secondary"
                className="text-[9px] px-1.5 py-0 rounded-md"
              >
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content: Referrals ── */}
      {activeTab === "referrals" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 pl-10 pr-8 rounded-md border border-input bg-background text-sm font-medium appearance-none cursor-pointer min-w-[160px]"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === "all"
                      ? "All Statuses"
                      : s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredReferrals.length === 0 && !isLoading ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground shadow-sm">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No referral data found.</p>
              </div>
            ) : (
              filteredReferrals.map((r: any) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-muted-foreground text-[10px] uppercase font-medium">
                      Referral Details
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md ${getStatusStyle(r.status)}`}
                    >
                      {r.status?.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-medium block">
                        Referrer
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-7 w-7 shrink-0 rounded-full border border-border/50">
                          <AvatarImage
                            src={getAvatarUrl(r.referrer?.avatar_url)}
                          />
                          <AvatarFallback className="bg-secondary text-[10px] font-bold">
                            {r.referrer?.full_name?.charAt(0) ?? "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-foreground truncate">
                            {r.referrer?.full_name}
                          </p>
                          <p className="text-[9px] text-muted-foreground truncate">
                            {r.referrer?.email}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-medium block">
                        Referred
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-7 w-7 shrink-0 rounded-full border border-border/50">
                          <AvatarImage
                            src={getAvatarUrl(r.referred?.avatar_url)}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                            {r.referred?.full_name?.charAt(0) ?? "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-foreground truncate">
                            {r.referred?.full_name}
                          </p>
                          <p className="text-[9px] text-muted-foreground truncate">
                            {r.referred?.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/50 pt-2">
                    <div>
                      <span className="text-muted-foreground text-[10px] uppercase font-medium block">
                        Date
                      </span>
                      <span className="text-foreground block mt-0.5">
                        {new Date(r.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] uppercase font-medium block">
                        Bonus
                      </span>
                      <span className="font-bold text-primary block mt-0.5">
                        {formatMoney(r.bonus_earned)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1 border-t border-border/50">
                    {r.status !== "paid" && r.status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] rounded-md flex-1"
                        onClick={() =>
                          setActionDialog({
                            open: true,
                            referral: r,
                            action: "paid",
                          })
                        }
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                    )}
                    {r.status !== "rejected" && r.status !== "flagged" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] rounded-md flex-1 text-red-600 hover:text-red-700"
                        onClick={() =>
                          setActionDialog({
                            open: true,
                            referral: r,
                            action: "flag",
                          })
                        }
                      >
                        <Flag className="h-3 w-3 mr-1" />
                        Flag
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/20 border-b border-border/50">
                    <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                      Referrer
                    </th>
                    <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                      Referred User
                    </th>
                    <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                      Date
                    </th>
                    <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right whitespace-nowrap">
                      Bonus
                    </th>
                    <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground text-center whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredReferrals.map((r: any) => (
                    <tr
                      key={r.id}
                      className="hover:bg-secondary/10 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 shrink-0 rounded-full border border-border/50">
                            <AvatarImage
                              src={getAvatarUrl(r.referrer?.avatar_url)}
                            />
                            <AvatarFallback className="bg-secondary text-[10px] font-bold">
                              {r.referrer?.full_name?.charAt(0) ?? "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-bold text-foreground">
                              {r.referrer?.full_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {r.referrer?.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 shrink-0 rounded-full border border-border/50">
                            <AvatarImage
                              src={getAvatarUrl(r.referred?.avatar_url)}
                            />
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                              {r.referred?.full_name?.charAt(0) ?? "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-bold text-foreground">
                              {r.referred?.full_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {r.referred?.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="secondary"
                          className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md ${getStatusStyle(r.status)}`}
                        >
                          {r.status?.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-[11px] text-muted-foreground font-medium">
                        {new Date(r.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-right text-primary">
                        {formatMoney(r.bonus_earned)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          {r.status !== "paid" && r.status !== "rejected" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg text-green-600 hover:text-green-700 hover:bg-green-500/10"
                              title="Approve reward"
                              onClick={() =>
                                setActionDialog({
                                  open: true,
                                  referral: r,
                                  action: "paid",
                                })
                              }
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {r.status !== "rejected" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              title="Reject"
                              onClick={() =>
                                setActionDialog({
                                  open: true,
                                  referral: r,
                                  action: "rejected",
                                })
                              }
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {r.status !== "flagged" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                              title="Flag for review"
                              onClick={() =>
                                setActionDialog({
                                  open: true,
                                  referral: r,
                                  action: "flag",
                                })
                              }
                            >
                              <Flag className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredReferrals.length === 0 && !isLoading && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-20 text-center text-muted-foreground italic bg-secondary/5"
                      >
                        <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No referral data found.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Content: Audit Log ── */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
            {/* Mobile Audit Cards */}
            <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
              {auditLog.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No audit entries yet.</p>
                </div>
              ) : (
                auditLog.map((entry: any) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-border/30 p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {entry.is_fraud_flag && (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        )}
                        <span className="text-xs font-semibold text-foreground capitalize">
                          {entry.action?.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="text-[9px] text-muted-foreground shrink-0">
                        {new Date(entry.created_at).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" }
                        )}
                      </span>
                    </div>
                    {entry.actor?.full_name && (
                      <p className="text-[10px] text-muted-foreground">
                        By: {entry.actor.full_name}
                      </p>
                    )}
                    {entry.details &&
                      Object.keys(entry.details).length > 0 && (
                        <pre className="text-[9px] text-muted-foreground bg-accent/50 rounded p-2 overflow-x-auto">
                          {JSON.stringify(entry.details, null, 2)}
                        </pre>
                      )}
                  </div>
                ))
              )}
            </div>

            {/* Desktop Audit Table */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/20 border-b border-border/50">
                    <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Action
                    </th>
                    <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      By
                    </th>
                    <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Details
                    </th>
                    <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Date
                    </th>
                    <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground text-center">
                      Flag
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {auditLog.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-20 text-center text-muted-foreground"
                      >
                        <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No audit entries yet.</p>
                      </td>
                    </tr>
                  ) : (
                    auditLog.map((entry: any) => (
                      <tr
                        key={entry.id}
                        className={`hover:bg-secondary/10 transition-colors ${entry.is_fraud_flag ? "bg-red-500/5" : ""}`}
                      >
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-foreground capitalize">
                            {entry.action?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">
                          {entry.actor?.full_name || "System"}
                        </td>
                        <td className="px-6 py-4">
                          {entry.details &&
                          Object.keys(entry.details).length > 0 ? (
                            <pre className="text-[9px] text-muted-foreground bg-accent/50 rounded p-1.5 max-w-xs overflow-hidden text-ellipsis">
                              {JSON.stringify(entry.details, null, 2).substring(
                                0,
                                120
                              )}
                            </pre>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-[11px] text-muted-foreground font-medium whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {entry.is_fraud_flag ? (
                            <AlertTriangle className="h-4 w-4 text-red-500 mx-auto" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Content: Settings ── */}
      {activeTab === "settings" && (
        <div className="max-w-xl">
          <Card className="rounded-xl border-primary/20 shadow-card overflow-hidden">
            <CardHeader className="bg-accent/50 pb-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold uppercase tracking-widest">
                  Program Settings
                </CardTitle>
              </div>
              <CardDescription className="text-[10px]">
                Configure bonus rules and caps. Changes apply to new reward
                calculations only.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                  Bonus Percentage (%)
                </Label>
                <Input
                  type="number"
                  value={settings.bonus_percentage}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      bonus_percentage: Number(e.target.value),
                    })
                  }
                  className="h-9 text-sm font-bold"
                />
                <p className="text-[9px] text-muted-foreground">
                  Percentage of the referred user's investment amount.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                  Min. Investment Required ($)
                </Label>
                <Input
                  type="number"
                  value={settings.min_investment_required}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      min_investment_required: Number(e.target.value),
                    })
                  }
                  className="h-9 text-sm font-bold"
                />
                <p className="text-[9px] text-muted-foreground">
                  Minimum investment by the referred user before reward is
                  triggered.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                  Max Bonus Cap ($)
                </Label>
                <Input
                  type="number"
                  value={settings.max_bonus_cap}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      max_bonus_cap: Number(e.target.value),
                    })
                  }
                  className="h-9 text-sm font-bold"
                />
                <p className="text-[9px] text-muted-foreground">
                  Maximum reward per referral, regardless of investment amount.
                </p>
              </div>
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="w-full mt-2 h-10 font-bold"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Action Dialog ── */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(o) => {
          if (!o) {
            setActionDialog({ open: false, referral: null, action: "" });
            setActionNotes("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader className="bg-secondary/40 pb-6 border-b border-border/50">
            <DialogTitle className="font-serif text-xl">
              {actionDialog.action === "paid" && "Approve Referral Reward"}
              {actionDialog.action === "rejected" && "Reject Referral"}
              {actionDialog.action === "flag" && "Flag for Fraud Review"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="py-6 space-y-4">
            {actionDialog.referral && (
              <div className="rounded-lg bg-accent/50 border border-border/30 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">
                    Referrer
                  </span>
                  <span className="font-bold">
                    {actionDialog.referral.referrer?.full_name}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">
                    Referred
                  </span>
                  <span className="font-bold">
                    {actionDialog.referral.referred?.full_name}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">
                    Current Status
                  </span>
                  <Badge
                    variant="secondary"
                    className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-md ${getStatusStyle(actionDialog.referral.status)}`}
                  >
                    {actionDialog.referral.status?.replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {actionDialog.action === "flag" ? "Reason" : "Notes"}{" "}
                <span className="font-normal text-muted-foreground">
                  (Optional)
                </span>
              </Label>
              <Textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={
                  actionDialog.action === "flag"
                    ? "Describe why this referral is suspicious..."
                    : "Add a note about this action..."
                }
                className="min-h-[80px] text-sm"
              />
            </div>
          </DialogBody>
          <DialogFooter className="bg-secondary/5 pt-6 pb-6">
            <Button
              onClick={handleAction}
              disabled={isActioning}
              className={`w-full h-11 rounded-xl font-bold shadow-sm ${
                actionDialog.action === "paid"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : actionDialog.action === "rejected"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-amber-600 hover:bg-amber-700 text-white"
              }`}
            >
              {isActioning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : actionDialog.action === "paid" ? (
                <CheckCircle className="mr-2 h-4 w-4" />
              ) : actionDialog.action === "rejected" ? (
                <XCircle className="mr-2 h-4 w-4" />
              ) : (
                <Flag className="mr-2 h-4 w-4" />
              )}
              {actionDialog.action === "paid" && "Approve Reward"}
              {actionDialog.action === "rejected" && "Reject Referral"}
              {actionDialog.action === "flag" && "Flag for Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
