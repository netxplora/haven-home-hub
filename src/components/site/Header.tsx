import { Link, NavLink, useNavigate } from "react-router-dom";
import { Home, Menu, User as UserIcon, LogOut, LayoutDashboard, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetTrigger,
} from "@/components/ui/sheet";

const nav = [
  { to: "/properties?type=buy", label: "Buy" },
  { to: "/properties?type=rent", label: "Rent" },
  { to: "/properties?type=land", label: "Land" },
  { to: "/agents", label: "Agents" },
];

export function Header() {
  const { user, isAdmin, isAgent, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="container-wide flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-serif text-xl font-semibold text-foreground">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-warm text-primary-foreground shadow-warm">
            <Home className="h-4 w-4" />
          </span>
          Warm Estate
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors hover:text-primary ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <UserIcon className="h-4 w-4" />
                  Account
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
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
                <DropdownMenuItem onSelect={signOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                Sign in
              </Button>
              <Button size="sm" className="bg-gradient-warm hover:opacity-95" onClick={() => navigate("/auth?tab=signup")}>
                Join free
              </Button>
            </>
          )}
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden" aria-label="Menu">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px]">
            <div className="mt-8 flex flex-col gap-4">
              {nav.map((item) => (
                <Link key={item.to} to={item.to} className="text-base font-medium">
                  {item.label}
                </Link>
              ))}
              <hr className="border-border" />
              {user ? (
                <>
                  <Link to="/dashboard">My dashboard</Link>
                  {isAgent && <Link to="/agent">Agent dashboard</Link>}
                  {isAdmin && <Link to="/admin">Admin</Link>}
                  <button onClick={signOut} className="text-left text-destructive">Sign out</button>
                </>
              ) : (
                <>
                  <Link to="/auth">Sign in</Link>
                  <Link to="/auth?tab=signup" className="font-semibold text-primary">Create account</Link>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}