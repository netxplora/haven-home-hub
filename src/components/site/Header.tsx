import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, User as UserIcon, LogOut, LayoutDashboard, Shield } from "lucide-react";
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
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo-emerald.png";

// We'll generate this inside the component to use the t() hook

export function Header() {
  const { user, isAdmin, isAgent, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const nav = [
    { to: "/properties?type=buy", label: t('nav.buy', 'Buy') },
    { to: "/properties?type=rent", label: t('nav.rent', 'Rent') },
    { to: "/properties?type=land", label: t('nav.land', 'Land') },
    { to: "/invest", label: t('nav.invest', 'Invest') },
    { to: "/agents", label: t('nav.agents', 'Agents') },
    { to: "/blog", label: t('nav.blog', 'Blog') },
    { to: "/about", label: t('nav.about', 'About') },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/90 backdrop-blur-md">
      <div className="container-wide flex h-[68px] items-center justify-between gap-6">
        {/* Logo */}
        <Link to="/" className="flex items-center shrink-0" aria-label="Verdant Estate home">
          <img src={logo} alt="Verdant Estate" width={144} height={48} className="h-8 w-auto" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-2 md:flex">
          <LanguageToggle />
          <CurrencyToggle />
          {user ? (
            <>
              <NotificationBell />
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 rounded-lg border-border/60 h-9">
                  <UserIcon className="h-4 w-4" />
                  Account
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate font-normal text-muted-foreground text-xs">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate("/dashboard")}>
                  <LayoutDashboard className="mr-2 h-4 w-4" /> My dashboard
                </DropdownMenuItem>
                {isAgent && (
                  <DropdownMenuItem onSelect={() => navigate("/agent")}>
                    <UserIcon className="mr-2 h-4 w-4" /> Agent dashboard
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem onSelect={() => navigate("/admin")}>
                    <Shield className="mr-2 h-4 w-4" /> Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="h-9 text-muted-foreground hover:text-foreground" onClick={() => navigate("/auth")}>
                Sign in
              </Button>
              <Button size="sm" className="h-9 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-sm" onClick={() => navigate("/auth?tab=signup")}>
                Get started
              </Button>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden h-10 w-10 rounded-lg" aria-label="Menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] p-0">
            <div className="flex flex-col h-full">
              {/* Mobile Nav Links */}
              <div className="flex-1 overflow-y-auto px-6 pt-10 pb-6">
                <nav className="flex flex-col gap-1">
                  {nav.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
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
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Settings</span>
                  <div className="flex gap-2">
                    <LanguageToggle />
                    <CurrencyToggle />
                  </div>
                </div>
                {user ? (
                  <>
                    <Link to="/dashboard" className="block py-2 text-sm font-medium text-foreground">My dashboard</Link>
                    {isAgent && <Link to="/agent" className="block py-2 text-sm font-medium text-foreground">Agent dashboard</Link>}
                    {isAdmin && <Link to="/admin" className="block py-2 text-sm font-medium text-foreground">Admin</Link>}
                    <button onClick={signOut} className="block w-full text-left text-sm font-medium py-2 text-destructive">Sign out</button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="w-full rounded-lg" onClick={() => navigate("/auth")}>Sign in</Button>
                    <Button className="w-full rounded-lg bg-primary text-primary-foreground" onClick={() => navigate("/auth?tab=signup")}>Get started</Button>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}