import { Link, useLocation, useNavigate } from "react-router-dom";
import { Lock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AuthGateModal() {
  const location = useLocation();
  const navigate = useNavigate();
  const returnUrl = encodeURIComponent(location.pathname);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-500">
        
        {/* Header Section */}
        <div className="p-8 pb-6 text-center shrink-0">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Create an Account to Access Investment Opportunities
          </h2>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Register or sign in to view investment property details, projected returns, ownership opportunities, funding progress, and investor documents.
          </p>
        </div>

        {/* Actions Section */}
        <div className="p-8 pt-4 bg-accent/20 border-t border-border/40 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="w-full h-12 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              asChild
            >
              <Link to={`/auth?tab=signup&returnUrl=${returnUrl}`}>
                Create Account
              </Link>
            </Button>
            
            <Button
              variant="outline"
              className="w-full h-12 text-sm font-semibold rounded-xl border-primary/20 hover:bg-primary/5 text-primary"
              asChild
            >
              <Link to={`/auth?tab=signin&returnUrl=${returnUrl}`}>
                Sign In
              </Link>
            </Button>
          </div>

          <Button
            variant="ghost"
            className="w-full h-12 mt-2 text-sm font-semibold rounded-xl text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/invest")}
          >
            <Search className="mr-2 h-4 w-4" />
            Back to Investment Page
          </Button>
        </div>

      </div>
    </div>
  );
}
