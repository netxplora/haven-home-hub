import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthGateModal } from "./AuthGateModal";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  type?: "standard" | "investment";
}

export function ProtectedRoute({ children, requireAuth = true, type = "standard" }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && requireAuth && !user && type === "standard") {
      const returnUrl = encodeURIComponent(location.pathname + location.search);
      navigate(`/auth?returnUrl=${returnUrl}`, { replace: true });
    }
  }, [user, loading, requireAuth, navigate, location, type]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (requireAuth && !user) {
    if (type === "investment") {
      // For investment routes, render the gate overlay instead of a hard redirect
      // Wait, we still need to wrap the children so the layout is preserved or blocked.
      // We will render nothing underneath to prevent data leaks.
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col relative overflow-hidden">
          {/* Subtle background representation of protected content */}
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://ilpbzriohwwnllpxndnl.supabase.co/storage/v1/object/public/public-assets/hero_luxury_penthouse.webp')] bg-cover bg-center" />
          <AuthGateModal />
        </div>
      );
    }
    return null; // Standard will redirect via useEffect
  }

  return <>{children}</>;
}
