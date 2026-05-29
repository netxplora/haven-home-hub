import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Bell, 
  Calendar, 
  ClipboardList, 
  TrendingUp, 
  ArrowDownToLine, 
  ShieldCheck, 
  User as UserIcon,
  Search,
  FileText
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function NotificationsPanel() {
  const { items, unread, isLoading, markRead, markAllRead } = useNotifications();
  const [activeTab, setActiveTab] = useState("all");

  if (isLoading) return <Skeleton className="h-60 rounded-xl" />;
  
  if (items.length === 0) return (
    <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3 bg-card/30">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent">
        <Bell className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-serif text-xl">You're all caught up!</p>
      <p className="text-sm text-muted-foreground">No new notifications at this time.</p>
      <Button asChild variant="outline" className="mt-4"><Link to="?tab=overview">Back to Overview</Link></Button>
    </div>
  );

  function getIcon(type: string) {
    switch (type) {
      case "booking_confirmed": return <Calendar className="h-4 w-4" />;
      case "reservation": return <ClipboardList className="h-4 w-4" />;
      case "investment": return <TrendingUp className="h-4 w-4" />;
      case "investment_confirmed": return <FileText className="h-4 w-4" />;
      case "withdrawal": return <ArrowDownToLine className="h-4 w-4" />;
      case "payment_confirmed": return <ShieldCheck className="h-4 w-4" />;
      case "kyc": return <UserIcon className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  }

  function getIconStyle(type: string, isRead: boolean) {
    if (isRead) return "bg-accent text-muted-foreground";
    switch (type) {
      case "booking_confirmed": return "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400";
      case "reservation": return "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
      case "investment": return "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";
      case "investment_confirmed": return "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
      case "withdrawal": return "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400";
      case "payment_confirmed": return "bg-primary/15 text-primary dark:bg-primary/10 dark:text-primary";
      case "kyc": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400";
      default: return "bg-primary/10 text-primary";
    }
  }

  function relativeTime(dateStr: string) {
    const now = Date.now();
    const diff = now - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  const filteredItems = items.filter(n => {
    if (activeTab === "all") return true;
    if (activeTab === "finances") return ["investment", "investment_confirmed", "withdrawal", "payment_confirmed", "reservation", "booking_confirmed"].includes(n.type);
    if (activeTab === "security") return ["kyc"].includes(n.type);
    return true;
  });

  const unreadItems = filteredItems.filter(n => !n.read_at);
  const readItems = filteredItems.filter(n => !!n.read_at);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-2xl font-semibold">Notifications</h2>
          {unread > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground shadow-sm">
              {unread} new
            </span>
          )}
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllRead()} className="gap-2 rounded-xl">
            <ShieldCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-accent/50 p-1 rounded-xl h-auto flex-wrap sm:flex-nowrap">
          <TabsTrigger value="all" className="rounded-lg py-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">All</TabsTrigger>
          <TabsTrigger value="finances" className="rounded-lg py-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">Financial</TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg py-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">Account</TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-8">
          {unreadItems.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60 px-1">Recent</p>
              <div className="grid gap-3">
                {unreadItems.map((n) => (
                  <div 
                    key={n.id} 
                    className="group relative flex items-start gap-4 rounded-xl border border-primary/10 bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/20 hover:bg-card/80"
                  >
                    <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]" />
                    <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${getIconStyle(n.type, false)}`}>
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-foreground text-sm sm:text-base">{n.title}</h4>
                        <span className="text-[10px] sm:text-[11px] text-muted-foreground/80 whitespace-nowrap shrink-0">{relativeTime(n.created_at)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground/90 leading-relaxed max-w-2xl">{n.body}</p>
                      <div className="flex items-center gap-4 pt-2">
                        {(n.action_url || n.link) && (
                          <Link 
                            to={(n.action_url || n.link) as string} 
                            className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                          >
                            View Details
                            <ArrowDownToLine className="h-3 w-3 rotate-[270deg]" />
                          </Link>
                        )}
                        <button 
                          onClick={() => markRead(n.id)} 
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline decoration-dotted underline-offset-4"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {readItems.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60 px-1">Earlier</p>
              <div className="grid gap-3">
                {readItems.map((n) => (
                  <div 
                    key={n.id} 
                    className="flex items-start gap-4 rounded-xl border border-border/40 bg-background/40 p-5 transition-all hover:bg-secondary/10 hover:border-border/60"
                  >
                    <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl opacity-60 ${getIconStyle(n.type, true)}`}>
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-muted-foreground text-sm sm:text-base">{n.title}</h4>
                        <span className="text-[10px] sm:text-[11px] text-muted-foreground/40 whitespace-nowrap shrink-0">{relativeTime(n.created_at)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground/60 leading-relaxed max-w-2xl">{n.body}</p>
                      {(n.action_url || n.link) && (
                        <Link to={(n.action_url || n.link) as string} className="text-xs text-primary/60 hover:text-primary hover:underline inline-block pt-1">
                          View Details
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredItems.length === 0 && (
            <div className="py-20 text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/50">
                <Search className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium">No recent updates</p>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("all")}>Clear filters</Button>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
