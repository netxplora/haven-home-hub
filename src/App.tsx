import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));

// Dashboards (heavy)
const Dashboard = lazy(() => import("./pages/dashboard/UserDashboard"));
const AgentDashboard = lazy(() => import("./pages/dashboard/AgentDashboard"));
const Admin = lazy(() => import("./pages/admin/AdminDashboard"));

// Invest (heavy)
const InvestHome = lazy(() => import("./pages/invest/InvestHome"));
const InvestOpportunities = lazy(() => import("./pages/invest/InvestOpportunities"));
const InvestDetail = lazy(() => import("./pages/invest/InvestDetail"));
const InvestPortfolio = lazy(() => import("./pages/invest/InvestPortfolio"));
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

// Root
const NotFound = lazy(() => import("./pages/NotFound"));

import { CompareProvider } from "./hooks/useCompare";
import { CurrencyProvider } from "./hooks/useCurrency";
import { CompareWidget } from "./components/site/CompareWidget";

const queryClient = new QueryClient();

function RealtimeGlobal() {
  useRealtimeSync();
  return null;
}

// Minimal loading fallback — a subtle centered spinner
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
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
          <CompareWidget />
          <RealtimeGlobal />
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Marketplace */}
                <Route path="/" element={<Home />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/properties/:slug" element={<PropertyDetail />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/agents" element={<Agents />} />
              
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
              <Route path="/invest/portfolio" element={<InvestPortfolio />} />
              <Route path="/invest/:slug" element={<InvestDetail />} />
              <Route path="/payments/:id" element={<PaymentStatus />} />
              <Route path="/certificate/:id" element={<CertificateView />} />

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
        </BrowserRouter>
        </TooltipProvider>
      </CurrencyProvider>
    </CompareProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
