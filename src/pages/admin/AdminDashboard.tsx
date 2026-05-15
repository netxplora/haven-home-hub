import { useState } from "react";
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
  Briefcase, 
  Banknote, 
  CreditCard, 
  ArrowDownToLine, 
  LayoutDashboard, 
  ShieldCheck, 
  Home, 
  FileText,
  History,
  Settings,
  Wallet,
  Globe,
  ClipboardList,
  Fingerprint,
  Layers,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ImageUploader } from "@/components/site/ImageUploader";
import { Separator } from "@/components/ui/separator";
import { formatMoney } from "@/lib/invest";
import { AdminCMS } from "./AdminCMS";
import { AdminOverview } from "./AdminOverview";
import { AdminProperties } from "./AdminProperties";
import { AdminAgents } from "./AdminAgents";
import { AdminLocations } from "./AdminLocations";
import { AdminInquiries } from "./AdminInquiries";
import { AdminBookings } from "./AdminBookings";
import { AdminInvest } from "./AdminInvest";
import { AdminInvestors } from "./AdminInvestors";
import { AdminPayouts } from "./AdminPayouts";
import { AdminPayments } from "./AdminPayments";
import { AdminWallets } from "./AdminWallets";
import { AdminWithdrawals } from "./AdminWithdrawals";
import { AdminUsers } from "./AdminUsers";
import { AdminProviders } from "./AdminProviders";
import { AdminReservations } from "./AdminReservations";
import { AdminKYC } from "./AdminKYC";
import { AdminReceipts } from "./AdminReceipts";
import { AdminInstallments } from "./AdminInstallments";
import { AdminReferrals } from "./AdminReferrals";
import { AdminSettings } from "./AdminSettings";
import { DashboardShell, NavItem } from "@/components/dashboard/DashboardShell";

const navItems: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "properties", label: "Properties", icon: Home },
  { id: "invest", label: "Investments", icon: TrendingUp },
  { id: "agents", label: "Agents", icon: Users },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "inquiries", label: "Inquiries", icon: MessageSquare },
  { id: "bookings", label: "Viewings", icon: Calendar },
  { id: "reservations", label: "Reservations", icon: ClipboardList },
  { id: "investors", label: "Investors", icon: Briefcase },
  { id: "installments", label: "Installments", icon: Layers },
  { id: "payouts", label: "Payouts", icon: Banknote },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "receipts", label: "Receipts", icon: FileText },
  { id: "providers", label: "Payment Providers", icon: Globe },
  { id: "wallets", label: "Wallets", icon: Wallet },
  { id: "withdrawals", label: "Withdrawals", icon: ArrowDownToLine },
  { id: "kyc", label: "KYC Verification", icon: Fingerprint },
  { id: "users", label: "Users & Roles", icon: ShieldCheck },
  { id: "cms", label: "Website Content", icon: FileText },
  { id: "referrals", label: "Referral Program", icon: Award },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  // Realtime updates handled globally in App.tsx via RealtimeGlobal component
  const [activeTab, setActiveTab] = useState("overview");

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center p-12"><Skeleton className="h-[600px] w-full max-w-6xl rounded-xl" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <div className="min-h-screen bg-background flex flex-col items-center justify-center p-12 text-center"><h1 className="font-serif text-3xl font-bold">Access Denied</h1><p className="mt-2 text-muted-foreground">This area is reserved for administrators only.</p><Button asChild className="mt-6"><Link to="/">Return Home</Link></Button></div>;

  return (
    <DashboardShell
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      title="Admin Dashboard"
      description="Manage properties, investments, agents, and website content."
    >
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {activeTab === "overview" && <AdminOverview />}
        {activeTab === "properties" && <AdminProperties />}
        {activeTab === "agents" && <AdminAgents />}
        {activeTab === "locations" && <AdminLocations />}
        {activeTab === "inquiries" && <AdminInquiries />}
        {activeTab === "bookings" && <AdminBookings />}
        {activeTab === "reservations" && <AdminReservations />}
        {activeTab === "invest" && <AdminInvest />}
        {activeTab === "investors" && <AdminInvestors />}
        {activeTab === "installments" && <AdminInstallments />}
        {activeTab === "payouts" && <AdminPayouts />}
        {activeTab === "payments" && <AdminPayments />}
        {activeTab === "receipts" && <AdminReceipts />}
        {activeTab === "providers" && <AdminProviders />}
        {activeTab === "wallets" && <AdminWallets />}
        {activeTab === "withdrawals" && <AdminWithdrawals />}
        {activeTab === "kyc" && <AdminKYC />}
        {activeTab === "users" && <AdminUsers />}
        {activeTab === "cms" && <AdminCMS />}
        {activeTab === "referrals" && <AdminReferrals />}
        {activeTab === "settings" && <AdminSettings />}
      </div>
    </DashboardShell>
  );
}
