import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { HelmetProvider } from "react-helmet-async";
import { useRealtimeSync } from "./hooks/useRealtimeSync";
import { Suspense, lazy } from "react";

// Critical path — loaded eagerly (home, auth, properties)
import Home from "./pages/marketplace/Home";
import Properties from "./pages/marketplace/Properties";
import PropertyDetail from "./pages/marketplace/PropertyDetail";
import Auth from "./pages/auth/Auth";

// Lazy-loaded routes — loaded on demand
const ComparePage = lazy(() => import("./pages/marketplace/ComparePage"));
const Agents = lazy(() => import("./pages/marketplace/Agents"));
const SecondaryMarket = lazy(() => import("./pages/marketplace/SecondaryMarket"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const PropertyMapExplorer = lazy(() => import("./pages/marketplace/PropertyMapExplorer"));

// Dashboards (heavy)
const Dashboard = lazy(() => import("./pages/dashboard/UserDashboard"));
const AgentDashboard = lazy(() => import("./pages/dashboard/AgentDashboard"));
const Admin = lazy(() => import("./pages/admin/AdminDashboard"));

// Invest (heavy)
const InvestHome = lazy(() => import("./pages/invest/InvestHome"));
const InvestOpportunities = lazy(() => import("./pages/invest/InvestOpportunities"));
const InvestDetail = lazy(() => import("./pages/invest/InvestDetail"));

const InvestPortfolioDetail = lazy(() => import("./pages/invest/InvestPortfolioDetail"));
const Withdrawals = lazy(() => import("./pages/invest/Withdrawals"));
const PaymentStatus = lazy(() => import("./pages/invest/PaymentStatus"));
const CertificateView = lazy(() => import("./pages/invest/CertificateView"));

// Static / CMS (light but rarely accessed)
const About = lazy(() => import("./pages/static/About"));
const Careers = lazy(() => import("./pages/static/Careers"));
const Press = lazy(() => import("./pages/static/Press"));
const Privacy = lazy(() => import("./pages/static/Privacy"));
const Terms = lazy(() => import("./pages/static/Terms"));
const BlogList = lazy(() => import("./pages/cms/BlogList"));
const BlogPost = lazy(() => import("./pages/cms/BlogPost"));
const PrintDocument = lazy(() => import("./pages/static/PrintDocument"));
const VerifyDocument = lazy(() => import("./pages/static/VerifyDocument"));

// Root
const NotFound = lazy(() => import("./pages/NotFound"));

import { CompareProvider } from "./hooks/useCompare";
import { CurrencyProvider } from "./hooks/useCurrency";
import { CompareWidget } from "./components/site/CompareWidget";
import { SupportWidget } from "./components/site/SupportWidget";
import { useDeploymentCache } from "./hooks/useDeploymentCache";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { ScrollToTop } from "./components/ScrollToTop";
import { BrandProvider } from "./hooks/useBrand";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes default stale time
      gcTime: 10 * 60 * 1000,   // 10 minutes cache garbage collection
      refetchOnWindowFocus: false, // Prevents repetitive network updates when refocusing tab
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

// Configure custom caching defaults for public static data to reduce repeated API requests
queryClient.setQueryDefaults(["brand-settings"], { staleTime: 30 * 60 * 1000 });
queryClient.setQueryDefaults(["properties"], { staleTime: 5 * 60 * 1000 });
queryClient.setQueryDefaults(["property"], { staleTime: 5 * 60 * 1000 });
queryClient.setQueryDefaults(["locations"], { staleTime: 15 * 60 * 1000 });
queryClient.setQueryDefaults(["admin-locations-list"], { staleTime: 15 * 60 * 1000 });
queryClient.setQueryDefaults(["filter-metadata"], { staleTime: 30 * 60 * 1000 });
queryClient.setQueryDefaults(["all-payment-methods"], { staleTime: 30 * 60 * 1000 });

// Configure custom defaults for real-time/sensitive keys to guarantee live freshness
queryClient.setQueryDefaults(["profile"], { staleTime: 0, refetchOnMount: true });
queryClient.setQueryDefaults(["user-roles"], { staleTime: 0, refetchOnMount: true });
queryClient.setQueryDefaults(["user-balance"], { staleTime: 0, refetchOnMount: true });
queryClient.setQueryDefaults(["available-balance"], { staleTime: 0, refetchOnMount: true });
queryClient.setQueryDefaults(["admin-withdrawals"], { staleTime: 0, refetchOnMount: true });
queryClient.setQueryDefaults(["admin-verification-queue"], { staleTime: 0, refetchOnMount: true });
queryClient.setQueryDefaults(["kyc"], { staleTime: 0, refetchOnMount: true });

function RealtimeGlobal() {
  useRealtimeSync();
  useDeploymentCache();
  return null;
}

// Improved loading fallback with skeleton structure for smoother transitions
function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <div className="h-16 border-b border-border/50 bg-card px-6 flex items-center justify-between hidden md:flex">
        <div className="w-32 h-6 bg-muted rounded-md animate-pulse" />
        <div className="flex gap-4">
           <div className="w-16 h-6 bg-muted rounded-md animate-pulse" />
           <div className="w-16 h-6 bg-muted rounded-md animate-pulse" />
        </div>
      </div>
      <div className="flex-1 container-wide py-12 flex flex-col gap-6 w-full max-w-7xl mx-auto px-4">
        <div className="w-1/3 h-8 bg-muted rounded-md animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="h-32 bg-muted rounded-xl animate-pulse" />
           <div className="h-32 bg-muted rounded-xl animate-pulse" />
           <div className="h-32 bg-muted rounded-xl animate-pulse" />
        </div>
        <div className="h-64 bg-muted rounded-xl animate-pulse mt-4" />
      </div>
    </div>
  );
}

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <CompareProvider>
      <CurrencyProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ScrollToTop />
          <CompareWidget />
          <RealtimeGlobal />
          <GlobalErrorBoundary>
          <BrandProvider>
          <AuthProvider>
            <SupportWidget />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Marketplace */}
                <Route path="/" element={<Home />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/properties/:slug" element={<PropertyDetail />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/secondary-market" element={<SecondaryMarket />} />
              <Route path="/explore" element={<PropertyMapExplorer />} />
              
              {/* Auth */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Dashboards */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/agent" element={<AgentDashboard />} />
              <Route path="/admin" element={<Admin />} />
              
              {/* Invest */}
              <Route path="/invest" element={<InvestHome />} />
              <Route path="/invest/opportunities" element={<InvestOpportunities />} />
              <Route path="/invest/portfolio" element={<Navigate to="/dashboard?tab=investments" replace />} />
              <Route path="/invest/portfolio/:id" element={<InvestPortfolioDetail />} />
              <Route path="/invest/withdrawals" element={<Withdrawals />} />
              <Route path="/invest/:slug" element={<InvestDetail />} />
              <Route path="/payments/:id" element={<PaymentStatus />} />
              <Route path="/invest/certificate/:id" element={<CertificateView />} />
              <Route path="/print-document/:id" element={<PrintDocument />} />
              <Route path="/verify-document/:id" element={<VerifyDocument />} />

              {/* Static Pages */}
              <Route path="/about" element={<About />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/press" element={<Press />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              
              {/* CMS / Blog */}
              <Route path="/blog" element={<BlogList />} />
              <Route path="/blog/:slug" element={<BlogPost />} />

              <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
          </BrandProvider>
          </GlobalErrorBoundary>
        </BrowserRouter>
        </TooltipProvider>
      </CurrencyProvider>
    </CompareProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
