import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { 
  LayoutDashboard, 
  Wallet, 
  History, 
  TrendingUp, 
  ClipboardList, 
  FileText,
  Users, 
  Bell, 
  User, 
  Heart,
  Calendar,
  MessageSquare,
  LogOut
} from "lucide-react";

// Modularized Panels
import { OverviewPanel } from "@/components/dashboard/OverviewPanel";
import { WithdrawalsPanel } from "@/components/dashboard/WithdrawalsPanel";
import { TransactionsPanel } from "@/components/dashboard/TransactionsPanel";
import { InvestmentsPanel } from "@/components/dashboard/InvestmentsPanel";
import { ReservationsPanel } from "@/components/dashboard/ReservationsPanel";
import { PurchasesPanel } from "@/components/dashboard/PurchasesPanel";
import { ReferralsPanel } from "@/components/dashboard/ReferralsPanel";
import { NotificationsPanel } from "@/components/dashboard/NotificationsPanel";
import { ProfilePanel } from "@/components/dashboard/ProfilePanel";
import { DocumentsPanel } from "@/components/dashboard/DocumentsPanel";
import { SavedPanel } from "@/components/dashboard/SavedPanel";
import { BookingsPanel } from "@/components/dashboard/BookingsPanel";
import { InquiriesPanel } from "@/components/dashboard/InquiriesPanel";

export default function UserDashboard() {
  const { user, signOut, loading } = useAuth();
  // Realtime updates handled globally in App.tsx via RealtimeGlobal component
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background selection:bg-primary/20">
        <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-bold uppercase tracking-wider text-foreground">Haven Home Hub</p>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground animate-pulse">Loading Dashboard</p>
          </div>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "investments", label: "Investments", icon: TrendingUp },
    { id: "purchases", label: "Property Purchases", icon: ClipboardList },
    { id: "reservations", label: "Reservations", icon: ClipboardList },
    { id: "withdrawals", label: "Withdrawals", icon: Wallet },
    { id: "transactions", label: "Transactions", icon: History },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "referrals", label: "Referrals", icon: Users },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "saved", label: "Saved Properties", icon: Heart },
    { id: "bookings", label: "Bookings", icon: Calendar },
    { id: "inquiries", label: "Support", icon: MessageSquare },
    { id: "profile", label: "Profile", icon: User },
  ];

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId });
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewPanel userId={user.id} onNavigate={handleTabChange} />;
      case "investments":
        return <InvestmentsPanel />;
      case "purchases":
        return <PurchasesPanel userId={user.id} />;
      case "reservations":
        return <ReservationsPanel userId={user.id} />;
      case "withdrawals":
        return <WithdrawalsPanel userId={user.id} />;
      case "transactions":
        return <TransactionsPanel userId={user.id} />;
      case "documents":
        return <DocumentsPanel userId={user.id} />;
      case "referrals":
        return <ReferralsPanel userId={user.id} />;
      case "notifications":
        return <NotificationsPanel />;
      case "saved":
        return <SavedPanel userId={user.id} />;
      case "bookings":
        return <BookingsPanel userId={user.id} />;
      case "inquiries":
        return <InquiriesPanel userId={user.id} />;
      case "profile":
        return <ProfilePanel userId={user.id} />;
      default:
        return <OverviewPanel userId={user.id} onNavigate={handleTabChange} />;
    }
  };

  return (
    <DashboardShell
      title="Dashboard"
      description="Manage your properties and investments"
      navItems={menuItems}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div className="max-w-7xl mx-auto py-2">
        {renderContent()}
      </div>
      
      <div className="mt-20 pt-8 border-t border-border/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Haven Home Hub • Version 2.4.0</p>
        <button 
          onClick={() => signOut()} 
          className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-destructive hover:opacity-80 transition-opacity"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign Out
        </button>
      </div>
    </DashboardShell>
  );
}