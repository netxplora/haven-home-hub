import { useReferrals } from "@/hooks/useReferrals";
import {
  Users,
  ShieldCheck,
  Clock,
  UserCheck,
  AlertCircle,
  Copy,
  TrendingUp,
  Wallet,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/invest";

export function ReferralsPanel({ userId }: { userId: string }) {
  const {
    referralCode,
    referralLink,
    referrals,
    rewards,
    stats,
    isLoading,
    copyToClipboard,
  } = useReferrals(userId);

  function getStatusStyle(status: string) {
    switch (status) {
      case "registered":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";
      case "qualified":
        return "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
      case "pending_reward":
        return "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400";
      case "approved":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
      case "paid":
        return "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400";
      case "rejected":
        return "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400";
      case "flagged":
        return "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "registered":
        return <Clock className="h-3 w-3" />;
      case "qualified":
      case "pending_reward":
        return <TrendingUp className="h-3 w-3" />;
      case "approved":
      case "paid":
        return <UserCheck className="h-3 w-3" />;
      case "rejected":
      case "flagged":
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  }

  function getRewardIcon(type: string) {
    switch (type) {
      case "credit":
        return <ArrowUpRight className="h-3.5 w-3.5 text-green-600" />;
      case "debit":
      case "withdrawal":
        return <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-serif font-semibold">Refer & Earn</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Grow your network and earn bonuses on every successful investment.
        </p>
      </div>

      {/* ── Referral Code & Link Banner ── */}
      <div className="rounded-xl bg-primary p-6 sm:p-8 text-primary-foreground overflow-hidden relative">
        <div className="max-w-2xl">
          <h2 className="font-serif text-2xl font-semibold">
            Share and Earn
          </h2>
          <p className="mt-2 text-primary-foreground/80 text-sm leading-relaxed max-w-lg">
            Invite your network to join. Earn a 5% bonus on their first
            confirmed investment.
          </p>

          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg bg-white/10 border border-white/15 p-4">
              <p className="text-xs font-medium uppercase tracking-wider opacity-70 mb-1.5">
                Referral Code
              </p>
              <span className="text-xl font-mono font-semibold tracking-tight select-all">
                {referralCode || "Loading..."}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(referralCode)}
                className="mt-3 h-8 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium"
              >
                <Copy className="h-3 w-3 mr-1.5" />
                Copy Code
              </Button>
            </div>
            <div className="rounded-lg bg-white/10 border border-white/15 p-4">
              <p className="text-xs font-medium uppercase tracking-wider opacity-70 mb-1.5">
                Referral Link
              </p>
              <span className="text-sm font-medium truncate opacity-80 block overflow-hidden">
                {referralLink || "Loading..."}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(referralLink)}
                className="mt-3 h-8 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium"
              >
                <Copy className="h-3 w-3 mr-1.5" />
                Copy Link
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Referrals",
            value: stats.totalReferrals.toString(),
            icon: Users,
            color: "text-primary bg-primary/10",
          },
          {
            label: "Active Investors",
            value: stats.activeInvestors.toString(),
            icon: UserCheck,
            color: "text-green-600 bg-green-500/10",
          },
          {
            label: "Total Earned",
            value: formatMoney(stats.totalEarned),
            icon: DollarSign,
            color: "text-amber-600 bg-amber-500/10",
          },
          {
            label: "Wallet Balance",
            value: formatMoney(stats.walletBalance),
            icon: Wallet,
            color: "text-emerald-600 bg-emerald-500/10",
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

      {/* ── Main Content Grid ── */}
      <div className="grid gap-8 lg:grid-cols-3 items-start">
        {/* ── Referral Network ── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-serif text-xl font-semibold">
              Referral Network
            </h3>
            <Badge
              variant="secondary"
              className="rounded-md px-3 py-1 font-medium text-xs"
            >
              {referrals.length} Total
            </Badge>
          </div>

          <div className="rounded-xl border border-border/40 bg-card overflow-hidden shadow-sm transition-shadow hover:shadow-md">
            {/* Mobile Card Layout */}
            <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
              {referrals.length === 0 && !isLoading ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">
                    No referrals yet. Start sharing!
                  </p>
                </div>
              ) : (
                referrals.map((ref: any) => (
                  <div
                    key={ref.id}
                    className="rounded-xl border border-border/40 bg-card p-4 shadow-sm space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                          {(ref.profiles?.full_name || "U")[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">
                            {ref.profiles?.full_name || "User"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Joined:{" "}
                            {new Date(ref.created_at).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`capitalize rounded-md flex w-fit items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold shrink-0 ${getStatusStyle(ref.status)}`}
                      >
                        {getStatusIcon(ref.status)}
                        {ref.status ? ref.status.replace(/_/g, " ") : "N/A"}
                      </Badge>
                    </div>
                    {ref.bonus_earned > 0 && (
                      <div className="flex items-center justify-between border-t border-border/30 pt-3">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          Reward Earned
                        </span>
                        <span className="text-sm font-bold text-primary">
                          {formatMoney(ref.bonus_earned)}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table Layout */}
            <div className="overflow-x-auto hidden md:block">
              <div className="w-full overflow-x-auto pb-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-accent/50 border-b border-border/40">
                      <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        User
                      </th>
                      <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Status
                      </th>
                      <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Joined
                      </th>
                      <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
                        Reward
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {referrals.length === 0 && !isLoading ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-20 text-center text-muted-foreground"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <Users className="h-10 w-10 opacity-20" />
                            <p className="font-medium">
                              No referrals yet. Start sharing!
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      referrals.map((ref: any) => (
                        <tr
                          key={ref.id}
                          className="transition-colors hover:bg-secondary/10 group"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary group-hover:scale-110 transition-transform">
                                {(ref.profiles?.full_name || "U")[0]}
                              </div>
                              <p className="font-medium text-foreground">
                                {ref.profiles?.full_name || "User"}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <Badge
                              variant="secondary"
                              className={`capitalize rounded-md flex w-fit items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold ${getStatusStyle(ref.status)}`}
                            >
                              {getStatusIcon(ref.status)}
                              {ref.status
                                ? ref.status.replace(/_/g, " ")
                                : "N/A"}
                            </Badge>
                          </td>
                          <td className="px-6 py-5 text-xs text-muted-foreground font-medium">
                            {new Date(ref.created_at).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </td>
                          <td className="px-6 py-5 text-sm font-bold text-right text-primary">
                            {ref.bonus_earned > 0
                              ? formatMoney(ref.bonus_earned)
                              : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Reward History ── */}
          {rewards.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-serif text-xl font-semibold px-1">
                Reward History
              </h3>
              <div className="rounded-xl border border-border/40 bg-card overflow-hidden shadow-sm">
                {/* Mobile Cards */}
                <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
                  {rewards.map((rw: any) => (
                    <div
                      key={rw.id}
                      className="flex items-center justify-between rounded-lg border border-border/30 bg-card p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
                          {getRewardIcon(rw.type)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground capitalize">
                            {rw.type}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px] truncate">
                            {rw.description || "Referral transaction"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`text-sm font-bold ${rw.type === "credit" || rw.type === "adjustment" ? "text-green-600" : "text-red-500"}`}
                        >
                          {rw.type === "credit" || rw.type === "adjustment"
                            ? "+"
                            : "-"}
                          {formatMoney(rw.amount)}
                        </p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          {new Date(rw.created_at).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="overflow-x-auto hidden md:block">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-accent/50 border-b border-border/40">
                        <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Type
                        </th>
                        <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Description
                        </th>
                        <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Date
                        </th>
                        <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
                          Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {rewards.map((rw: any) => (
                        <tr
                          key={rw.id}
                          className="hover:bg-secondary/10 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {getRewardIcon(rw.type)}
                              <span className="text-xs font-semibold capitalize text-foreground">
                                {rw.type}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-muted-foreground max-w-[300px] truncate">
                            {rw.description || "Referral transaction"}
                          </td>
                          <td className="px-6 py-4 text-xs text-muted-foreground font-medium">
                            {new Date(rw.created_at).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span
                              className={`text-sm font-bold ${rw.type === "credit" || rw.type === "adjustment" ? "text-green-600" : "text-red-500"}`}
                            >
                              {rw.type === "credit" || rw.type === "adjustment"
                                ? "+"
                                : "-"}
                              {formatMoney(rw.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-xs font-medium text-muted-foreground">
                            {formatMoney(rw.balance_after)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── How It Works Sidebar ── */}
        <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm space-y-6">
          <h3 className="font-serif text-xl font-semibold px-1">
            How it works
          </h3>
          <div className="space-y-6">
            {[
              {
                step: 1,
                title: "Invite Friends",
                desc: "Share your unique link or code with your network.",
              },
              {
                step: 2,
                title: "They Join",
                desc: "Your referrals sign up and complete their identity verification.",
              },
              {
                step: 3,
                title: "They Invest",
                desc: "Once they make their first investment, you earn a bonus.",
              },
              {
                step: 4,
                title: "Earn Rewards",
                desc: "Bonus is automatically credited to your wallet balance.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 group">
                <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  {item.step}
                </div>
                <div>
                  <h4 className="font-semibold text-foreground leading-none mb-1.5">
                    {item.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4">
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-primary mb-1">
                Current Reward
              </p>
              <p className="text-sm font-medium text-foreground">
                5% commission on first investment
              </p>
            </div>
          </div>

          {stats.walletBalance > 0 && (
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="h-4 w-4 text-emerald-600" />
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-600">
                  Your Wallet
                </p>
              </div>
              <p className="text-2xl font-serif font-bold text-foreground">
                {formatMoney(stats.walletBalance)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Available for withdrawal
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
