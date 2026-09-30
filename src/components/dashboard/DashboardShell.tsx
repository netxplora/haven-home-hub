import { useState, useEffect, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Menu,
  X,
  LogOut,
  Bell,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useBrand } from "@/hooks/useBrand";

export interface NavItem {
  id: string;
  label: string;
  icon: any;
  href?: string;
  badge?: number;
}

interface DashboardShellProps {
  children: ReactNode;
  navItems: NavItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  title: string;
  description?: string;
}

export function DashboardShell({
  children,
  navItems,
  activeTab,
  onTabChange,
  title,
  description
}: DashboardShellProps) {
  const { user, profile, signOut, isAdmin, isAgent } = useAuth();
  const { brand } = useBrand();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const avatarUrl = getAvatarUrl(profile?.avatar_url);
  const displayName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? " " + profile.last_name : ""}`
    : user?.email?.split("@")[0] || "User";
  const roleLabel = isAdmin ? "Administrator" : isAgent ? "Agent" : "Member";

  // Scroll to top on tab change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [activeTab]);

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-card border-r border-border/50">
      {/* Brand Header */}
      <div className="flex h-16 items-center px-5 border-b border-border/50 shrink-0">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={brand.logo_url || "/logo.png"} alt={brand.platform_name} className="h-9 w-auto" />
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-5 px-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { onTabChange(item.id); setIsMobileOpen(false); }}
              className={cn(
                "group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn(
                  "h-4.5 w-4.5 shrink-0",
                  isActive ? "text-primary-foreground" : "text-muted-foreground/70 group-hover:text-foreground"
                )} style={{ height: "18px", width: "18px" }} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-bold px-1.5",
                  isActive
                    ? "bg-white/25 text-white"
                    : "bg-primary text-primary-foreground"
                )}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Links Divider */}
      <div className="px-3 pb-3">
        <Link
          to="/properties"
          className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          Browse Properties
        </Link>
      </div>

      {/* User Card */}
      <div className="border-t border-border/50 p-3 space-y-2 shrink-0">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-accent/60">
          <Avatar className="h-9 w-9 rounded-xl shrink-0">
            <AvatarImage src={avatarUrl || ""} className="object-cover" />
            <AvatarFallback className="bg-primary/10 text-primary rounded-xl text-sm font-bold">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground leading-tight">{displayName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl h-9 text-sm font-medium gap-2.5"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-60 lg:block shadow-sm">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:pl-60 w-full min-w-0 max-w-[100vw]">
        {/* Mobile Top Bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/50 bg-card/90 backdrop-blur-md px-4 lg:hidden shadow-sm">
          <Link to="/" className="flex items-center gap-2">
            <img src={brand.logo_url || "/logo.png"} alt={brand.platform_name} className="h-8 w-auto" />
          </Link>

          <div className="flex items-center gap-2">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9">
                  <Menu className="h-4.5 w-4.5" style={{ height: "18px", width: "18px" }} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-60 border-r-0 shadow-xl">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <SidebarContent />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 w-full min-w-0 outline-none">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 w-full">
            {/* Page Header */}
            <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl tracking-tight">{title}</h1>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
              </div>
              <div className="flex items-center gap-2.5">
                {(() => {
                  const notifItem = navItems.find(i => i.id === "notifications");
                  const hasUnread = (notifItem?.badge ?? 0) > 0;
                  return (
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-xl h-10 w-10 sm:h-9 sm:w-9 border-border/60 relative"
                      onClick={() => onTabChange("notifications")}
                    >
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      {hasUnread && (
                        <span className="absolute top-2 right-2 sm:top-1.5 sm:right-1.5 h-2 w-2 rounded-full bg-primary border-2 border-background" />
                      )}
                    </Button>
                  );
                })()}
                <Link to="/properties">
                  <Button size="sm" className="h-10 sm:h-9 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-sm text-xs gap-1.5">
                    Browse Listings
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </header>

            {/* Page Content */}
            {children}
          </div>
        </main>

        <footer className="border-t border-border/40 py-5 text-center text-xs text-muted-foreground bg-card/50">
          © {new Date().getFullYear()} {brand.legal_name || brand.platform_name}. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
