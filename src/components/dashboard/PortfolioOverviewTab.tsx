import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, CreditCard, ArrowLeftRight, ShieldAlert, CheckCircle2, Eye, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/invest";
import { format } from "date-fns";

export function PortfolioOverviewTab({ 
  selectedUserId, 
  activityData, 
  isFlagged, 
  profileData, 
  handleViewDocument, 
  setActiveTab 
}: { 
  selectedUserId: string;
  activityData: any;
  isFlagged: boolean;
  profileData: any;
  handleViewDocument: (url: string) => void;
  setActiveTab: (tab: string) => void;
}) {
  // Live portfolio summary from DB RPC
  const { data: portfolioSummary, isLoading } = useQuery({
    queryKey: ["admin-portfolio-summary", selectedUserId],
    enabled: !!selectedUserId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_investor_portfolio_summary", { p_user_id: selectedUserId });
      if (error) {
        console.error("Portfolio summary RPC error:", error);
        return null;
      }
      return data as any;
    },
  });

  const totalInvested = Number(portfolioSummary?.total_invested || 0);
  const activeCount = Number(portfolioSummary?.active_investments || 0);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Invested" 
          value={formatMoney(totalInvested)} 
          icon={TrendingUp} 
        />
        <StatCard 
          title="Active Investments" 
          value={activeCount.toString()} 
          icon={Building2} 
        />
        <StatCard 
          title="Total Payments" 
          value={formatMoney(activityData?.payments?.filter((p:any) => p.status === 'success' || p.status === 'confirmed').reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) || 0)} 
          icon={CreditCard} 
        />
        <StatCard 
          title="Market Trades" 
          value={activityData?.trades?.length.toString() || "0"} 
          icon={ArrowLeftRight} 
        />
      </div>
      
      {isFlagged && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-destructive">Account Flagged for Review</h4>
            <p className="text-xs text-destructive/80 mt-1">This account has been flagged by an administrator. Check Admin Controls for notes.</p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Timeline */}
        <div className="bg-card border border-border/50 rounded-xl p-6">
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
          <div className="space-y-4">
            {/* Mix of recent payments and investments - simplified for view */}
            {(!activityData?.investments?.length && !activityData?.payments?.length) ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
            ) : (
              [...(activityData?.investments || []).map((i:any)=>({...i, _type:'inv'})), 
               ...(activityData?.payments || []).map((p:any)=>({...p, _type:'pay'}))]
              .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 5)
              .map((item: any, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${item._type === 'inv' ? 'bg-primary/10 text-primary' : 'bg-primary/100/10 text-primary'}`}>
                    {item._type === 'inv' ? <TrendingUp className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item._type === 'inv' ? 'New Investment' : 'Payment Made'}
                      <span className="mx-2 text-muted-foreground">·</span>
                      {formatMoney(Number(item.total_amount || item.amount_invested || item.amount || 0), item.currency || 'USD')}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.investment_properties?.title || item.properties?.title || "Unknown Property"}
                    </p>
                  </div>
                  <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {format(new Date(item.created_at), "MMM d")}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* KYC Snapshot */}
        <div className="bg-card border border-border/50 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">KYC Documents</h3>
            <Button variant="outline" size="sm" onClick={() => setActiveTab("admin")} className="h-7 text-xs">Manage</Button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-secondary/10">
              <div className="flex items-center gap-3">
                <CheckCircle2 className={`h-4 w-4 ${profileData.id_document_url ? 'text-green-500' : 'text-muted-foreground/30'}`} />
                <span className="text-sm font-medium">Identity Document</span>
              </div>
              {profileData.id_document_url ? (
                <button onClick={() => handleViewDocument(profileData.id_document_url)} className="text-xs text-primary hover:underline flex items-center gap-1"><Eye className="h-3 w-3"/> View</button>
              ) : <span className="text-xs text-muted-foreground">Not uploaded</span>}
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-secondary/10">
              <div className="flex items-center gap-3">
                <CheckCircle2 className={`h-4 w-4 ${profileData.proof_of_address_url ? 'text-green-500' : 'text-muted-foreground/30'}`} />
                <span className="text-sm font-medium">Proof of Address</span>
              </div>
              {profileData.proof_of_address_url ? (
                <button onClick={() => handleViewDocument(profileData.proof_of_address_url)} className="text-xs text-primary hover:underline flex items-center gap-1"><Eye className="h-3 w-3"/> View</button>
              ) : <span className="text-xs text-muted-foreground">Not uploaded</span>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string, value: string, icon: any }) {
  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm flex flex-col justify-between">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{title}</p>
        <div className="p-1.5 bg-primary/10 rounded-lg text-primary"><Icon className="h-4 w-4" /></div>
      </div>
      <p className="text-xl font-bold font-serif text-foreground">{value}</p>
    </div>
  );
}
