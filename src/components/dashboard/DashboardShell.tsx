import { useState, useEffect, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  TrendingUp, 
  Calendar, 
  ArrowDownToLine, 
  Heart, 
  MessageSquare, 
  Bell, 
  User as UserIcon, 
  Settings,
  Menu,
  X,
  Building2,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Users,
  MapPin,
  FileText,
  Banknote,
  CreditCard,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getAvatarUrl } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
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

  // Auto-scroll to top when switching dashboard tabs
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [activeTab]);

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-background border-r border-border/50">
      {/* Logo */}
      <div className="flex h-[68px] items-center px-6 border-b border-border/50">
        <Link to="/" className="flex items-center gap-2.5 font-serif text-lg font-semibold text-foreground">
          <img src={brand.logo_url || "/logo.png"} alt={brand.platform_name} className="h-10 w-auto" />
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                setIsMobileOpen(false);
              }}
              className={cn(
                "group flex w-full items-center justify-between rounded-lg px-3.5 py-3 lg:py-2.5 text-sm font-medium transition-colors",
                activeTab === item.id 
                  ? "bg-primary/8 text-primary" 
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn(
                  "h-[18px] w-[18px]",
                  activeTab === item.id ? "text-primary" : "text-muted-foreground/70"
                )} />
                {item.label}
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-1.5">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* User Card + Sign Out */}
      <div className="border-t border-border/50 p-4">
        <div className="rounded-lg bg-accent/50 p-3.5 mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 rounded-lg">
              <AvatarImage src={avatarUrl || ""} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary rounded-lg text-sm font-semibold">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{user?.email?.split('@')[0] || "User"}</p>
              <p className="truncate text-[11px] text-muted-foreground">{isAdmin ? 'Administrator' : isAgent ? 'Agent' : 'Member'}</p>
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg h-11 lg:h-9 text-sm font-medium"
          onClick={() => signOut()}
        >
          <LogOut className="mr-2.5 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-accent/30">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 lg:block">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:pl-64 w-full min-w-0 max-w-[100vw]">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/50 bg-background/90 backdrop-blur-md px-4 lg:hidden">
          <Link to="/" className="flex items-center gap-2 font-serif text-base font-semibold text-foreground">
            <img src={brand.logo_url || "/logo.png"} alt={brand.platform_name} className="h-8 w-auto" />
          </Link>
          
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-lg h-11 w-11">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 border-r-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
              </SheetHeader>
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 w-full min-w-0">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 w-full">
            {/* Page Header */}
            <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
                {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
              </div>
              <div className="flex items-center gap-2.5">
                {(() => {
                  const notifItem = navItems.find(i => i.id === "notifications");
                  const hasUnread = (notifItem?.badge ?? 0) > 0;
                  return (
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="rounded-lg h-11 w-11 sm:h-9 sm:w-9 border-border/60 relative"
                      onClick={() => onTabChange("notifications")}
                    >
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      {hasUnread && (
                        <span className="absolute top-2.5 right-2.5 sm:top-1.5 sm:right-1.5 h-2 w-2 rounded-full bg-primary border-2 border-background"></span>
                      )}
                    </Button>
                  );
                })()}
                <Link to="/properties">
                  <Button size="sm" className="h-11 sm:h-9 px-4 sm:px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-sm">
                    Browse Properties
                  </Button>
                </Link>
              </div>
            </header>

            {/* Page Content */}
            {children}
          </div>
        </main>

        <footer className="border-t border-border/50 py-5 text-center text-xs text-muted-foreground bg-background">
          © {new Date().getFullYear()} {brand.legal_name || brand.platform_name}. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
