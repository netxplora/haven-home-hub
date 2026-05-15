import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <SiteLayout>
      <div className="relative overflow-hidden min-h-[70vh] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/30 to-background" />
        <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
          <p className="text-primary text-sm font-medium tracking-wider uppercase mb-4">Page not found</p>
          <h1 className="font-serif text-8xl sm:text-9xl font-bold text-foreground/10 leading-none select-none">404</h1>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold -mt-6 sm:-mt-8 relative z-10 text-foreground">
            This page doesn't exist
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed max-w-lg mx-auto">
            The page you're looking for may have been moved, removed, or the address may be incorrect.
            Try browsing our available properties or returning to the homepage.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-primary text-primary-foreground  hover:bg-primary/90 shadow-sm">
              <Link to="/"><Home className="mr-2 h-4 w-4" /> Go to homepage</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-border hover:bg-accent">
              <Link to="/properties"><Search className="mr-2 h-4 w-4" /> Browse properties</Link>
            </Button>
          </div>
          <p className="mt-10 text-xs text-muted-foreground">
            Requested path: <code className="bg-accent px-2 py-1 rounded text-foreground/70">{location.pathname}</code>
          </p>
        </div>
      </div>
    </SiteLayout>
  );
};

export default NotFound;
