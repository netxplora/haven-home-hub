import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Home from "./pages/Home";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import Agents from "./pages/Agents";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AgentDashboard from "./pages/AgentDashboard";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import InvestHome from "./pages/invest/InvestHome";
import InvestOpportunities from "./pages/invest/InvestOpportunities";
import InvestDetail from "./pages/invest/InvestDetail";
import InvestPortfolio from "./pages/invest/InvestPortfolio";
import PaymentStatus from "./pages/PaymentStatus";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/properties/:slug" element={<PropertyDetail />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/agent" element={<AgentDashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/invest" element={<InvestHome />} />
            <Route path="/invest/opportunities" element={<InvestOpportunities />} />
            <Route path="/invest/portfolio" element={<InvestPortfolio />} />
            <Route path="/invest/:slug" element={<InvestDetail />} />
            <Route path="/payments/:id" element={<PaymentStatus />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
