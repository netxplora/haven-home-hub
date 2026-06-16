import { useState, useEffect, useRef, useCallback } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, User as UserIcon, LogOut, LayoutDashboard, Shield, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetTrigger,
} from "@/components/ui/sheet";
import { NotificationBell } from "@/components/site/NotificationBell";
import { CurrencyToggle } from "@/components/site/CurrencyToggle";
import { getAvatarUrl } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useBrand } from "@/hooks/useBrand";

export function Header() {
  const { user, profile, isAdmin, isAgent, signOut } = useAuth();
  const { brand } = useBrand();
  
  let accountType = "Investor";
  if (isAdmin) accountType = "Admin";
  else if (isAgent) accountType = "Agent";
  else if (profile?.role === 'owner') accountType = "Property Owner";
  else if (profile?.role === 'support') accountType = "Support";

  const getInitials = (name?: string) => {
    if (!name) return "GU";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [announcementHeight, setAnnouncementHeight] = useState(0);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Scroll & Announcement Height Tracking ──
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    const updateHeight = () => {
      const el = document.getElementById("announcement-bar");
      setAnnouncementHeight(el ? el.offsetHeight : 0);
    };
    updateHeight();

    // Observe the announcement bar directly for size changes & removal
    const observer = new MutationObserver(updateHeight);
    observer.observe(document.body, { childList: true, subtree: true });

    // Also handle resize
    window.addEventListener("resize", updateHeight, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateHeight);
      observer.disconnect();
    };
  }, []);

  // ── Hover Dropdown Handlers ──
  const openProperties = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setPropertiesOpen(true);
  }, []);

  const closeProperties = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => setPropertiesOpen(false), 150);
  }, []);

  const prefetchRoute = (path: string) => {
    // Dynamically import the chunk to prefetch it when user hovers
    const baseRoute = path.split('?')[0];
    switch(baseRoute) {
      case "/explore": import("@/pages/marketplace/PropertyMapExplorer"); break;
      case "/invest": import("@/pages/invest/InvestHome"); break;
      case "/secondary-market": import("@/pages/marketplace/SecondaryMarket"); break;
      case "/agents": import("@/pages/marketplace/Agents"); break;
      case "/blog": import("@/pages/cms/BlogList"); break;
      case "/about": import("@/pages/static/About"); break;
      case "/properties": import("@/pages/marketplace/Properties"); break;
      case "/dashboard": import("@/pages/dashboard/UserDashboard"); break;
      case "/agent": import("@/pages/dashboard/AgentDashboard"); break;
      case "/admin": import("@/pages/admin/AdminDashboard"); break;
    }
  };

  const avatarUrl = getAvatarUrl(profile?.avatar_url);

  // Compute the dynamic top value
  const topOffset = isScrolled ? 0 : announcementHeight;

  const nav = [
    { to: "/explore", label: "Map" },
    { to: "/invest", label: "Invest" },
    { to: "/secondary-market", label: "Trade" },
    { to: "/agents", label: "Agents" },
    { to: "/blog", label: "Blog" },
    { to: "/about", label: "About" },
  ];

  const propertyLinks = [
    { to: "/properties?type=buy", label: "Buy" },
    { to: "/properties?type=rent", label: "Rent" },
    { to: "/properties?type=land", label: "Land" },
    { to: "/properties", label: "All Properties", separator: true },
  ];

  // ── Shared Nav Link Style ──
  const navLinkClass = (isActive: boolean) =>
    `px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? "text-primary bg-primary/8"
        : "text-foreground/80 hover:text-foreground hover:bg-accent/50"
    }`;

  return (
    <header
      className={`fixed inset-x-0 z-40 transition-all duration-300 ease-in-out ${
        isScrolled
          ? "border-b border-border/50 bg-white/90 dark:bg-background/90 backdrop-blur-lg shadow-sm"
          : "border-b border-white/10 bg-white/70 dark:bg-background/70 backdrop-blur-md shadow-sm"
      }`}
      style={{ top: topOffset }}
    >
      <div className="container-wide flex flex-col md:flex-row md:h-[64px] justify-between gap-0 md:gap-6 py-2 md:py-0">
        
        <div className="flex w-full md:w-auto h-[48px] md:h-full items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0" aria-label={`${brand.platform_name} home`}>
            <img src={brand.logo_url || "/logo.png"} alt={brand.platform_name} className="h-10 md:h-12 w-auto" />
          </Link>
          
          {/* Mobile Hamburger & Notification */}
          <div className="flex items-center gap-1.5 md:hidden">
            {user && <NotificationBell />}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg" aria-label={"Menu"}>
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] p-0">
                <div className="flex flex-col h-full">
                  {/* Mobile Profile Header in Sidebar */}
                  {user && (
                     <div className="px-6 pt-10 pb-4 border-b border-border/50 bg-accent/20">
                        <div className="flex items-center gap-3 mb-4">
                           <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-sm">
                              <AvatarImage src={avatarUrl || ""} />
                              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                 {getInitials(profile?.full_name)}
                              </AvatarFallback>
                           </Avatar>
                           <div className="flex flex-col overflow-hidden">
                              <span className="text-base font-bold truncate text-foreground leading-tight">{profile?.full_name || "Guest User"}</span>
                              <span className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</span>
                              <span className="w-fit mt-1.5 px-2 py-0.5 rounded-md border border-primary/20 bg-primary/5 text-primary text-[10px] uppercase font-bold tracking-wider">
                                 {accountType}
                              </span>
                           </div>
                        </div>
                        {/* Quick Links */}
                        <div className="grid grid-cols-2 gap-2 mt-4">
                           <Link to="/dashboard?tab=profile" onClick={() => setMobileOpen(false)} className="text-[11px] font-semibold bg-background border border-border/50 p-2.5 rounded-lg text-center hover:border-primary/50 hover:bg-accent/50 transition-colors text-foreground">My Profile</Link>
                           <Link to="/dashboard?tab=my-properties" onClick={() => setMobileOpen(false)} className="text-[11px] font-semibold bg-background border border-border/50 p-2.5 rounded-lg text-center hover:border-primary/50 hover:bg-accent/50 transition-colors text-foreground">My Properties</Link>
                           <Link to="/dashboard?tab=investments" onClick={() => setMobileOpen(false)} className="text-[11px] font-semibold bg-background border border-border/50 p-2.5 rounded-lg text-center hover:border-primary/50 hover:bg-accent/50 transition-colors text-foreground">Portfolio</Link>
                           <Link to="/dashboard?tab=documents" onClick={() => setMobileOpen(false)} className="text-[11px] font-semibold bg-background border border-border/50 p-2.5 rounded-lg text-center hover:border-primary/50 hover:bg-accent/50 transition-colors text-foreground">Documents</Link>
                        </div>
                     </div>
                  )}

                  {/* Mobile Nav Links */}
                  <div className="flex-1 overflow-y-auto px-6 pt-6 pb-6">
                    <nav className="flex flex-col gap-1">
                      <div className="py-2 px-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{"Properties"}</p>
                        <div className="flex flex-col gap-1 ml-2 border-l border-border/50 pl-3">
                          <Link to="/properties?type=buy" onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2 rounded-lg hover:text-primary transition-colors text-foreground">{"Buy"}</Link>
                          <Link to="/properties?type=rent" onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2 rounded-lg hover:text-primary transition-colors text-foreground">{"Rent"}</Link>
                          <Link to="/properties?type=land" onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2 rounded-lg hover:text-primary transition-colors text-foreground">{"Land"}</Link>
                          <Link to="/properties" onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2 rounded-lg hover:text-primary transition-colors text-foreground">{"All Properties"}</Link>
                        </div>
                      </div>
                      {nav.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileOpen(false)}
                          className="text-base font-medium py-3 px-3 rounded-lg hover:bg-accent transition-colors text-foreground"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </nav>
                  </div>
                  {/* Mobile Footer Actions */}
                  <div className="border-t border-border/50 px-6 py-5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-border/30 mb-2 gap-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{"Settings"}</span>
                      <div className="flex gap-2">
                        <CurrencyToggle />
                      </div>
                    </div>
                    {user ? (
                      <>
                        <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-foreground">{"My dashboard"}</Link>
                        {isAgent && <Link to="/agent" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-foreground">{"Agent dashboard"}</Link>}
                        {isAdmin && <Link to="/admin" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-foreground">{"Admin"}</Link>}
                        <button onClick={() => { setMobileOpen(false); signOut(); }} className="block w-full text-left text-sm font-medium py-2 text-destructive">{"Sign out"}</button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" className="w-full rounded-lg" onClick={() => { setMobileOpen(false); navigate("/auth"); }}>{"Sign in"}</Button>
                        <Button className="w-full rounded-lg bg-primary text-primary-foreground" onClick={() => { setMobileOpen(false); navigate("/auth?tab=signup"); }}>{"Get started"}</Button>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>


        {/* Desktop Nav */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {/* Properties Hover Dropdown */}
          <div
            className="relative"
            onMouseEnter={openProperties}
            onMouseLeave={closeProperties}
          >
            <button
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1 ${
                propertiesOpen
                  ? "text-primary bg-primary/8"
                  : "text-foreground/80 hover:text-foreground hover:bg-accent/50"
              }`}
              onClick={() => setPropertiesOpen((v) => !v)}
              aria-expanded={propertiesOpen}
              aria-haspopup="true"
            >
              {"Properties"}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${propertiesOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Panel */}
            <div
              className={`absolute left-0 top-full pt-2 transition-all duration-200 ease-out ${
                propertiesOpen
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 -translate-y-1 pointer-events-none"
              }`}
            >
              <div className="w-48 rounded-xl border border-border/50 bg-white dark:bg-card shadow-lg backdrop-blur-lg p-1.5">
                {propertyLinks.map((item, i) => (
                  <div key={item.to}>
                    {item.separator && (
                      <div className="my-1 h-px bg-border/40" />
                    )}
                    <Link
                      to={item.to}
                      onMouseEnter={() => prefetchRoute(item.to)}
                      onClick={() => setPropertiesOpen(false)}
                      className="block w-full px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors"
                    >
                      {item.label}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onMouseEnter={() => prefetchRoute(item.to)}
              className={({ isActive }) => navLinkClass(isActive)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-2 md:flex">
          
          <CurrencyToggle />
          {user ? (
            <>
              <NotificationBell />
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 rounded-lg h-9 border-border/60 hover:bg-accent/50 p-1 pr-3">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={avatarUrl || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {user.email?.charAt(0).toUpperCase() || <UserIcon className="h-3 w-3" />}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">Account</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate font-normal text-muted-foreground text-xs">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate("/dashboard")}>
                  <LayoutDashboard className="mr-2 h-4 w-4" /> {"My dashboard"}
                </DropdownMenuItem>
                {isAgent && (
                  <DropdownMenuItem onSelect={() => navigate("/agent")}>
                    <UserIcon className="mr-2 h-4 w-4" /> {"Agent dashboard"}
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem onSelect={() => navigate("/admin")}>
                    <Shield className="mr-2 h-4 w-4" /> {"Admin"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> {"Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-foreground/70 hover:text-foreground"
                onClick={() => navigate("/auth")}
              >
                {"Sign in"}
              </Button>
              <Button size="sm" className="h-9 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-sm" onClick={() => navigate("/auth?tab=signup")}>
                {"Get started"}
              </Button>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
