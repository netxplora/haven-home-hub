import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Building2, 
  Users, 
  MapPin, 
  MessageSquare, 
  Calendar, 
  TrendingUp, 
  LayoutDashboard, 
  ShieldCheck, 
  Home, 
  FileText,
  Settings,
  Globe,
  Fingerprint,
  Star,
  Sparkles,
  Landmark,
  UserSearch,
  Headset
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminCMS } from "./AdminCMS";
import { AdminOverview } from "./AdminOverview";
import { AdminProperties } from "./AdminProperties";
import { AdminAgents } from "./AdminAgents";
import { AdminLocations } from "./AdminLocations";
import { AdminInquiries } from "./AdminInquiries";
import { AdminBookings } from "./AdminBookings";
import { AdminInvest } from "./AdminInvest";
import { AdminProviders } from "./AdminProviders";
import { AdminKYC } from "./AdminKYC";
import { AdminSettings } from "./AdminSettings";
import { AdminPaymentMethods } from "./AdminPaymentMethods";
import { AdminReviews } from "./AdminReviews";
import { AdminPropertyImport } from "./AdminPropertyImport";
import { AdminFinanceCenter } from "./AdminFinanceCenter";
import { DashboardShell, NavItem } from "@/components/dashboard/DashboardShell";
import { AdminUsers } from "./AdminUsers";
import { AdminReferrals } from "./AdminReferrals";
import { AdminDocuments } from "./AdminDocuments";
import { AdminInvestor360 } from "./AdminInvestor360";
import { AdminSupportCenter } from "./AdminSupportCenter";
import { AdminInvestmentOrders } from "./AdminInvestmentOrders";
import { AdminTestimonials } from "./AdminTestimonials";
import { Award, CreditCard, ClipboardList, Quote } from "lucide-react";

const navItems: NavItem[] = [
  // Dashboard & Analytics
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "finance", label: "Finance Center", icon: Landmark },
  // Real Estate Operations
  { id: "properties", label: "Properties", icon: Home },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "bookings", label: "Viewings", icon: Calendar },
  // Investments
  { id: "invest", label: "Investments Map", icon: TrendingUp },
  { id: "invest-orders", label: "Investment Orders", icon: ClipboardList },
  { id: "investor-360", label: "Investor 360", icon: UserSearch },
  // People & Support
  { id: "users", label: "Users & Roles", icon: ShieldCheck },
  { id: "agents", label: "Agents", icon: Users },
  { id: "support-center", label: "Support Center", icon: Headset },
  { id: "inquiries", label: "Inquiries", icon: MessageSquare },
  { id: "kyc", label: "KYC Verification", icon: Fingerprint },
  // Content & Marketing
  { id: "cms", label: "Website Content", icon: FileText },
  { id: "testimonials", label: "Testimonials", icon: Quote },
  { id: "reviews", label: "Agent Reviews", icon: Star },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "referrals", label: "Referral Program", icon: Award },
  // Settings & System
  { id: "payment-methods", label: "Payment Methods", icon: CreditCard },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  // Realtime updates handled globally in App.tsx via RealtimeGlobal component
  const [activeTab, setActiveTab] = useState("overview");
  const [investor360Id, setInvestor360Id] = useState<string | undefined>();

  useEffect(() => {
    const handleOpen360 = (e: CustomEvent) => {
      setInvestor360Id(e.detail.userId);
      setActiveTab("investor-360");
    };
    window.addEventListener("open-investor-360", handleOpen360 as EventListener);
    return () => window.removeEventListener("open-investor-360", handleOpen360 as EventListener);
  }, []);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center p-12"><Skeleton className="h-[600px] w-full max-w-6xl rounded-xl" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <div className="min-h-screen bg-background flex flex-col items-center justify-center p-12 text-center"><h1 className="font-serif text-3xl font-bold">Access Denied</h1><p className="mt-2 text-muted-foreground">This area is reserved for administrators only.</p><Button asChild className="mt-6"><Link to="/">Return Home</Link></Button></div>;

  return (
    <DashboardShell
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      title="Admin Dashboard"
      description="Manage properties, investments, finance, agents, and website content."
    >
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {activeTab === "overview" && <AdminOverview />}
        {activeTab === "properties" && <AdminProperties />}
        {activeTab === "invest" && <AdminInvest />}
        {activeTab === "finance" && <AdminFinanceCenter />}
        {activeTab === "agents" && <AdminAgents />}
        {activeTab === "locations" && <AdminLocations />}
        {activeTab === "inquiries" && <AdminInquiries />}
        {activeTab === "support-center" && <AdminSupportCenter />}
        {activeTab === "bookings" && <AdminBookings />}
        {activeTab === "kyc" && <AdminKYC />}
        {activeTab === "reviews" && <AdminReviews />}
        {activeTab === "testimonials" && <AdminTestimonials />}
        {activeTab === "users" && <AdminUsers />}
        {activeTab === "cms" && <AdminCMS />}
        {activeTab === "documents" && <AdminDocuments />}
        {activeTab === "referrals" && <AdminReferrals />}
        {activeTab === "payment-methods" && <AdminPaymentMethods />}
        {activeTab === "investor-360" && <AdminInvestor360 initialUserId={investor360Id} onBack={() => setActiveTab("overview")} />}
        {activeTab === "invest-orders" && <AdminInvestmentOrders />}
        {activeTab === "settings" && <AdminSettings />}
      </div>
    </DashboardShell>
  );
}
