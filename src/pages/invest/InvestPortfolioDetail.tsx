import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { formatMoney } from "@/lib/invest";
import {
  ArrowLeft, ExternalLink, FileText, CheckCircle, Clock, TrendingUp,
  AlertCircle, RefreshCw, BarChart3, LineChart, ShieldCheck, MapPin,
  Calendar, Wallet, Target, Activity, DollarSign, Building2,
  CreditCard, ArrowUpRight, Percent, Timer, ChevronRight,
  Download, PenLine, Eye, Stamp, Scale, Lock, Award,
  Pause, Play, Zap, FileCheck
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SellUnitsDialog } from "@/components/dashboard/SellUnitsDialog";
import { useState, useEffect, useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { DocumentViewerModal } from "@/components/dashboard/DocumentViewerModal";
import { SEO } from "@/components/site/SEO";

export default function InvestPortfolioDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  // ── Enriched Data from RPC ──
  const { data: enrichedData, isLoading, error } = useQuery({
    queryKey: ["portfolio-detail-enriched", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_investment_detail_enriched", {
        p_investment_id: id
      });
      if (error) throw error;
      return data as any;
    },
    enabled: !!id
  });

  // ── Fallback: direct query if RPC fails ──
  const { data: fallbackData } = useQuery({
    queryKey: ["portfolio-detail-fallback", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_investments")
        .select(`*, investment_properties (*)`)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !enrichedData && !isLoading
  });

  // ── Chart Data from RPC ──
  const { data: chartDataRaw } = useQuery({
    queryKey: ["portfolio-growth-history", enrichedData?.investment?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_portfolio_growth_history", {
        p_user_id: enrichedData.investment.user_id
      });
      if (error) return null;
      return data as any[];
    },
    enabled: !!enrichedData?.investment?.user_id
  });

  // ── Auto-generated Lifecycle Documents ──
  const { data: userDocuments } = useQuery({
    queryKey: ["user-lifecycle-documents", id, enrichedData?.investment?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_documents")
        .select("*")
        .eq("user_id", enrichedData.investment.user_id)
        .eq("investment_property_id", enrichedData.investment.property_id)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!enrichedData?.investment?.user_id && !!enrichedData?.investment?.property_id
  });

  // ── Real-time sync ──
  useEffect(() => {
    if (!id) return;
    const propertyId = enrichedData?.investment?.property_id || fallbackData?.property_id;
    
    const channel1 = supabase.channel(`inv-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_investments', filter: `id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["portfolio-detail-enriched", id] });
      })
      .subscribe();
    
    let channel2: any = null;
    if (propertyId) {
      channel2 = supabase.channel(`prop-${propertyId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'investment_properties', filter: `id=eq.${propertyId}` }, () => {
          qc.invalidateQueries({ queryKey: ["portfolio-detail-enriched", id] });
        })
        .subscribe();
    }

    return () => {
      supabase.removeChannel(channel1);
      if (channel2) supabase.removeChannel(channel2);
    };
  }, [id, enrichedData?.investment?.property_id, fallbackData?.property_id, qc]);

  // ── Normalize data from RPC or fallback ──
  const investment = enrichedData?.investment || fallbackData;
  const prop = enrichedData?.property || fallbackData?.investment_properties;
  const maturityData = enrichedData?.maturity || null;
  const roiData = enrichedData?.roi || null;
  const documents = enrichedData?.documents || [];
  const propertyDocuments = enrichedData?.property_documents || [];
  const activityList = enrichedData?.activity || [];
  const auditLogs = enrichedData?.audit_logs || [];
  const paymentsList = enrichedData?.payments || [];
  const lifecycleDocuments = userDocuments || [];

  // ── Chart data ──
  const chartData = useMemo(() => {
    if (chartDataRaw && Array.isArray(chartDataRaw) && chartDataRaw.length > 0) {
      return chartDataRaw.map((item: any) => ({
        name: item.month,
        invested: Number(item.invested || 0),
        value: Number(item.value || 0)
      }));
    }
    // Fallback: generate from investment data
    if (!investment || !prop) return [];
    const data = [];
    const totalInv = Number(investment.total_amount ?? investment.amount_invested ?? 0);
    const accruedEarnings = Number(investment.accrued_earnings || 0);
    const currentVal = totalInv + accruedEarnings;
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = i === 0 ? currentVal : totalInv + (accruedEarnings * ((5 - i) / 5));
      data.push({
        name: d.toLocaleString('default', { month: 'short' }),
        invested: totalInv,
        value: val > 0 ? val : totalInv
      });
    }
    return data;
  }, [chartDataRaw, investment, prop]);

  // ── Loading state ──
  if (isLoading) {
    return (
      <SiteLayout>
        <div className="container-wide py-12 space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <div className="grid grid-cols-3 gap-6">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
          <Skeleton className="h-[300px] w-full rounded-2xl" />
        </div>
      </SiteLayout>
    );
  }

  if (error || !investment || !prop) {
    return (
      <SiteLayout>
        <div className="container-wide py-20 text-center">
          <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Investment Not Found</h2>
          <p className="text-muted-foreground mb-6">The investment you're looking for could not be loaded.</p>
          <Button onClick={() => navigate("/dashboard?tab=investments")} variant="outline">
            Return to Dashboard
          </Button>
        </div>
      </SiteLayout>
    );
  }

  // ── Computed values ──
  const isFunded = ['funded', 'fully_funded', 'roi_active', 'roi_paused', 'matured'].includes(prop.status) || (prop.units_sold >= prop.total_units);
  const unitsAvailable = Math.max(0, prop.total_units - prop.units_sold);
  const fundingPct = Math.min(100, Math.round((prop.units_sold / (prop.total_units || 1)) * 100));

  const totalInv = Number(investment.total_amount ?? investment.amount_invested ?? 0);
  const accruedEarnings = Number(investment.accrued_earnings || 0);
  const currentValue = totalInv + accruedEarnings;
  const ownershipPct = ((investment.units_owned / (prop.total_units || 1)) * 100).toFixed(2);
  const expectedReturnAmt = Number(roiData?.expected_roi) || (totalInv * (Number(prop.projected_return_min) / 100));
  const remainingROI = Number(roiData?.remaining_roi) ?? Math.max(0, expectedReturnAmt - accruedEarnings);
  const exactRaisedAmount = Number(prop.current_funding || 0) || (Number(prop.units_sold || 0) * Number(prop.unit_price || 0));

  // Investment lifecycle status flags
  const roiStatus = investment.roi_status || 'inactive';
  const isRoiActive = roiStatus === 'active' || investment.status === 'roi_active';
  const isRoiPaused = roiStatus === 'paused' || investment.status === 'roi_paused';
  const isMatured = investment.status === 'matured' || investment.maturity_status === 'matured';
  const isPreparingForRoi = investment.status === 'preparing_for_roi';

  // Maturity from RPC or compute locally
  const maturityProgress = maturityData?.progress_percent ?? 0;
  const remainingDays = maturityData?.remaining_days ?? 0;
  const remainingMonths = maturityData?.remaining_months ?? 0;
  const maturityStatus = maturityData?.status ?? 'not_started';

  const getMaturityLabel = (status: string) => {
    switch (status) {
      case 'matured': return { label: 'Matured', color: 'text-green-600 bg-green-50 border-green-200' };
      case 'nearing_maturity': return { label: 'Nearing Maturity', color: 'text-amber-600 bg-amber-50 border-amber-200' };
      case 'in_progress': return { label: 'In Progress', color: 'text-blue-600 bg-blue-50 border-blue-200' };
      default: return { label: 'Not Started', color: 'text-muted-foreground bg-muted/30 border-border/50' };
    }
  };
  const maturityLabel = getMaturityLabel(maturityStatus);

  const isInstallment = investment.investment_type === 'installment';

  return (
    <SiteLayout>
      <SEO 
        title={`Portfolio: ${prop.title} | Haven Home Hub`}
        description={`View your investment portfolio details for ${prop.title}.`}
        image={prop.cover_image_url}
      />
      {/* ═══ HEADER ═══ */}
      <div className="bg-muted/30 border-b border-border/50">
        <div className="container-wide py-6">
          <button 
            onClick={() => navigate("/dashboard?tab=investments")} 
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </button>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border-2 border-background shadow-soft shrink-0">
                <img src={prop.cover_image_url} alt={prop.title} loading="lazy" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant={isRoiActive || isMatured || investment.status === 'confirmed' ? 'default' : 'secondary'} className="uppercase tracking-wider text-[10px]">
                    {investment.status ? investment.status.replace(/_/g, " ") : "Processing"}
                  </Badge>
                  <Badge variant="outline" className="uppercase tracking-wider text-[10px]">
                    {isInstallment ? 'Installment' : 'Full Payment'}
                  </Badge>
                  {isRoiActive && (
                    <Badge variant="outline" className="border-green-500/30 text-green-600 bg-green-50 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      ROI Active
                    </Badge>
                  )}
                  {isRoiPaused && (
                    <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-50 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <Pause className="w-3 h-3" />
                      ROI Paused
                    </Badge>
                  )}
                  {isMatured && (
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-50 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <Award className="w-3 h-3" />
                      Matured
                    </Badge>
                  )}
                  {isPreparingForRoi && (
                    <Badge variant="outline" className="border-blue-500/30 text-blue-600 bg-blue-50 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      Awaiting Activation
                    </Badge>
                  )}
                  {isFunded && !isRoiActive && !isRoiPaused && !isMatured && !isPreparingForRoi && (
                    <Badge variant="outline" className="border-green-500/30 text-green-600 bg-green-50 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Funding Complete
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">{prop.title}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <p className="text-muted-foreground font-mono text-sm flex items-center gap-1.5">
                    ID: {investment.id.split('-')[0].toUpperCase()}
                  </p>
                  <span className="text-border/50">|</span>
                  <p className="text-muted-foreground text-sm flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> {prop.location}
                  </p>
                  <span className="text-border/50">|</span>
                  <p className="text-muted-foreground text-sm flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> {new Date(investment.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
              {!isFunded && unitsAvailable > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col md:items-end w-full md:w-64 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 translate-x-2 -translate-y-2 transition-transform group-hover:translate-x-0 group-hover:-translate-y-0">
                    <TrendingUp className="w-24 h-24 text-primary" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1 relative z-10">Expand Position</p>
                  <p className="text-sm font-semibold text-foreground mb-3 relative z-10">
                    <span className={unitsAvailable < 10 ? "text-destructive" : ""}>{unitsAvailable} Units Remaining</span>
                  </p>
                  <Button asChild className="w-full shadow-sm relative z-10" size="sm">
                    <Link to={`/invest/${prop.slug}`}>Buy More Units</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="container-wide py-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-muted/50 p-1 w-full flex overflow-x-auto justify-start md:w-auto border border-border/50 rounded-xl h-auto scrollbar-none">
            <TabsTrigger value="overview" className="flex items-center gap-2 rounded-lg py-2.5 px-5 font-semibold text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm shrink-0">
              <BarChart3 className="w-4 h-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="journey" className="flex items-center gap-2 rounded-lg py-2.5 px-5 font-semibold text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm shrink-0">
              <LineChart className="w-4 h-4" /> Journey
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2 rounded-lg py-2.5 px-5 font-semibold text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm shrink-0">
              <ShieldCheck className="w-4 h-4" /> Documents
            </TabsTrigger>
            <TabsTrigger value="liquidity" className="flex items-center gap-2 rounded-lg py-2.5 px-5 font-semibold text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm shrink-0">
              <TrendingUp className="w-4 h-4" /> Liquidity
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2 rounded-lg py-2.5 px-5 font-semibold text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm shrink-0">
              <Activity className="w-4 h-4" /> Activity
            </TabsTrigger>
          </TabsList>

          {/* ═══ OVERVIEW TAB ═══ */}
          <TabsContent value="overview" className="animate-in fade-in space-y-8 outline-none">
            {/* Investment Summary Cards */}
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <SummaryCard icon={DollarSign} label="Amount Invested" value={formatMoney(totalInv, prop.currency)} />
              <SummaryCard icon={Wallet} label="Current Value" value={formatMoney(currentValue, prop.currency)} highlight />
              <SummaryCard icon={ArrowUpRight} label="Earned ROI" value={formatMoney(accruedEarnings, prop.currency)} positive />
              <SummaryCard icon={Target} label="Expected ROI" value={formatMoney(expectedReturnAmt, prop.currency)} />
              <SummaryCard icon={TrendingUp} label="Remaining ROI" value={formatMoney(remainingROI, prop.currency)} />
              <SummaryCard icon={Percent} label="Annual Yield" value={`${prop.projected_return_min}% p.a.`} />
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content Column */}
              <div className="lg:col-span-2 space-y-8">
                {/* ROI Performance Chart */}
                <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-6 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/50 to-primary/10" />
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-serif text-xl font-bold text-foreground flex items-center gap-2">
                        Performance Overview
                        {investment.status === 'active' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">Asset value tracking over time</p>
                    </div>
                  </div>

                  <div className="h-64 mt-4 -ml-4 -mr-4 md:m-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorAsset" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                        <YAxis hide={true} domain={['dataMin - 500', 'dataMax + 500']} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: 'hsl(var(--card))' }}
                          formatter={(value: number, name: string) => [formatMoney(value, prop.currency), name === 'value' ? 'Current Value' : 'Invested']}
                        />
                        <Area type="monotone" dataKey="invested" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorInvested)" />
                        <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorAsset)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Funding Progress Center */}
                <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-6">
                  <h3 className="font-serif text-lg font-bold text-foreground mb-5">Funding Progress</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Total Units</p>
                      <p className="text-xl font-bold font-serif text-foreground">{prop.total_units}</p>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Units Sold</p>
                      <p className="text-xl font-bold font-serif text-foreground">{prop.units_sold}</p>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Available</p>
                      <p className="text-xl font-bold font-serif text-foreground">{unitsAvailable}</p>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Your Units</p>
                      <p className="text-xl font-bold font-serif text-foreground">{investment.units_owned}</p>
                    </div>
                    <div className="bg-primary/5 rounded-xl p-4 border border-primary/20 col-span-2 sm:col-span-1">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-primary mb-1">Amount Raised</p>
                      <p className="text-xl font-bold font-serif text-primary truncate" title={formatMoney(exactRaisedAmount, prop.currency)}>{formatMoney(exactRaisedAmount, prop.currency)}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-end mb-2">
                       <span className="text-sm font-semibold text-muted-foreground">
                        {formatMoney(exactRaisedAmount, prop.currency)} <span className="font-normal opacity-70">raised out of</span> {formatMoney(prop.total_value, prop.currency)}
                      </span>
                      <span className="text-sm font-bold text-foreground">{fundingPct}%</span>
                    </div>
                    <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-1000 rounded-full" style={{ width: `${fundingPct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Target: {formatMoney(prop.total_value, prop.currency)}</p>
                  </div>
                </div>

                {/* Installment Progress (if applicable) */}
                {isInstallment && (
                  <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-6">
                    <h3 className="font-serif text-lg font-bold text-foreground mb-5 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" /> Installment Progress
                    </h3>
                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                      <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Amount Paid</p>
                        <p className="text-lg font-bold font-serif text-green-600">{formatMoney(Number(investment.amount_paid || 0), prop.currency)}</p>
                      </div>
                      <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Remaining</p>
                        <p className="text-lg font-bold font-serif text-foreground">{formatMoney(Number(investment.remaining_balance || 0), prop.currency)}</p>
                      </div>
                      <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Monthly Payment</p>
                        <p className="text-lg font-bold font-serif text-foreground">{formatMoney(Number(investment.monthly_installment_amount || 0), prop.currency)}</p>
                      </div>
                      <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Next Due</p>
                        <p className="text-lg font-bold font-serif text-foreground">
                          {investment.next_payment_due ? new Date(investment.next_payment_due).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Payment Progress</span>
                        <span className="text-sm font-bold text-foreground">{Number(investment.completion_percentage || 0).toFixed(0)}%</span>
                      </div>
                      <Progress value={Number(investment.completion_percentage || 0)} className="h-2.5" />
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar Column */}
              <div className="space-y-6">
                {/* Asset Profile Grid */}
                <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-5 space-y-4">
                  <h4 className="font-serif text-lg font-semibold text-foreground mb-4">Asset Profile</h4>
                  
                  <ProfileRow label="Category" value={prop.property_category || prop.property_type} />
                  <ProfileRow label="Units Owned" value={investment.units_owned.toString()} />
                  <ProfileRow label="Ownership Stake" value={`${ownershipPct}%`} />
                  <ProfileRow label="Unit Price" value={formatMoney(prop.unit_price, prop.currency)} />
                  <ProfileRow label="Property Value" value={formatMoney(prop.total_value, prop.currency)} />
                  <ProfileRow label="Holding Period" value={`${prop.holding_period_months || 12} months`} />
                  {prop.distribution_frequency && (
                    <ProfileRow label="Distributions" value={prop.distribution_frequency} />
                  )}
                  {prop.income_model && (
                    <ProfileRow label="Income Model" value={prop.income_model} />
                  )}
                  {prop.estimated_rental_yield && (
                    <ProfileRow label="Est. Rental Yield" value={`${prop.estimated_rental_yield}%`} />
                  )}
                </div>

                {/* Live Activity Feed */}
                <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-5">
                  <h4 className="font-serif text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    Live Activity <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  </h4>
                  
                  <div className="space-y-4">
                    {activityList?.length === 0 && <p className="text-sm text-muted-foreground">No recent activity.</p>}
                    {activityList?.map((act: any) => (
                      <div key={act.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <RefreshCw className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-foreground">{act.message}</p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-1">
                            {new Date(act.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ═══ JOURNEY TAB ═══ */}
          <TabsContent value="journey" className="animate-in fade-in space-y-8 outline-none">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Maturity Lifecycle */}
              <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-6 h-fit">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-serif text-xl font-bold text-foreground">Maturity Lifecycle</h3>
                  <Badge variant="outline" className={`${maturityLabel.color} text-[10px] uppercase tracking-wider font-bold`}>
                    {maturityLabel.label}
                  </Badge>
                </div>
                
                {!investment.activated_at && !isPreparingForRoi ? (
                  <div className="bg-muted/30 border border-border/50 rounded-xl p-6 text-center">
                    <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="font-semibold text-foreground">Awaiting Funding Completion</p>
                    <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                      The ROI and maturity timeline will automatically start once this property reaches 100% funding. 
                      Current funding stands at {fundingPct}%.
                    </p>
                  </div>
                ) : isPreparingForRoi ? (
                  <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-6 text-center">
                    <Zap className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                    <p className="font-semibold text-foreground">Funding Complete — Awaiting ROI Activation</p>
                    <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                      This property has reached 100% funding. The administration team will activate ROI tracking shortly.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 xs:grid-cols-3 gap-4 text-center">
                      <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                        <p className="font-semibold text-foreground text-sm">
                          {investment.start_date ? new Date(investment.start_date).toLocaleDateString() : '—'}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">Start Date</p>
                      </div>
                      <div className="bg-primary/5 rounded-xl p-3 border border-primary/20">
                        <p className="font-serif text-xl font-bold text-primary">{remainingDays}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">
                          Days Left ({remainingMonths}mo)
                        </p>
                      </div>
                      <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                        <p className="font-semibold text-foreground text-sm">
                          {investment.maturity_date ? new Date(investment.maturity_date).toLocaleDateString() : '—'}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">Maturity Date</p>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-2">
                        <span>Progress</span>
                        <span className="font-bold text-foreground">{Number(maturityProgress).toFixed(1)}%</span>
                      </div>
                      <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-1000 ease-out relative rounded-full" 
                          style={{ width: `${maturityProgress}%` }}
                        >
                          {maturityProgress > 0 && maturityProgress < 100 && (
                            <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse rounded-full" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ROI Paused Alert */}
                    {isRoiPaused && (
                      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
                          <Pause className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">ROI Tracking Paused</p>
                          <p className="text-xs text-amber-600/80 mt-0.5">
                            Maturity countdown and ROI accrual are temporarily suspended. The maturity date will extend by the paused duration once resumed.
                            {investment.total_paused_days > 0 && ` Total paused: ${investment.total_paused_days} days.`}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Key Dates Summary */}
                    <div className="border-t border-border/50 pt-4 space-y-3">
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Key Dates</h4>
                      {investment.approved_at && (
                        <DateRow label="Investment Approved" date={investment.approved_at} />
                      )}
                      {investment.activated_at && (
                        <DateRow label="ROI Activated" date={investment.activated_at} />
                      )}
                      {investment.start_date && (
                        <DateRow label="Maturity Start" date={investment.start_date} />
                      )}
                      {investment.maturity_date && (
                        <DateRow label="Maturity End" date={investment.maturity_date} />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Investment Journey Timeline */}
              <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-6">
                <h3 className="font-serif text-xl font-bold text-foreground mb-6">Investment Journey</h3>
                <div className="relative pl-6 space-y-8 before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                  
                  <TimelineStep 
                    title="Investment Submitted" 
                    description="Application received and recorded."
                    date={new Date(investment.created_at).toLocaleDateString()}
                    isCompleted={true}
                  />
                  
                  <TimelineStep 
                    title="Payment Verified" 
                    description="Funds secured and verified by administration."
                    date={investment.approved_at ? new Date(investment.approved_at).toLocaleDateString() : null}
                    isCompleted={!!investment.approved_at || ['confirmed', 'active', 'roi_active', 'roi_paused', 'preparing_for_roi', 'matured', 'completed'].includes(investment.status)}
                    isActive={investment.status === 'payment_under_review'}
                  />

                  <TimelineStep 
                    title="Units Allocated" 
                    description={`Successfully secured ${investment.units_owned} units (${ownershipPct}% ownership).`}
                    date={investment.approved_at ? new Date(investment.approved_at).toLocaleDateString() : null}
                    isCompleted={['confirmed', 'active', 'roi_active', 'roi_paused', 'preparing_for_roi', 'matured', 'completed'].includes(investment.status)}
                    isActive={investment.status === 'confirmed' && !isFunded}
                  />

                  <TimelineStep 
                    title="Funding Completed" 
                    description="Property reached 100% funding goal."
                    date={
                      investment.funding_completed_at
                        ? new Date(investment.funding_completed_at).toLocaleDateString()
                        : prop.funding_completed_at
                          ? new Date(prop.funding_completed_at).toLocaleDateString()
                          : investment.activated_at
                            ? new Date(investment.activated_at).toLocaleDateString()
                            : null
                    }
                    isCompleted={isFunded || isPreparingForRoi || isRoiActive || isRoiPaused || isMatured}
                    isActive={isPreparingForRoi}
                  />

                  <TimelineStep 
                    title="ROI Activated" 
                    description="Returns tracking officially started."
                    date={investment.activated_at ? new Date(investment.activated_at).toLocaleDateString() : null}
                    isCompleted={!!investment.activated_at || isRoiActive || isRoiPaused || isMatured}
                    isActive={isRoiActive}
                  />

                  {isRoiPaused && (
                    <TimelineStep 
                      title="ROI Paused" 
                      description={`ROI tracking temporarily suspended.${investment.total_paused_days > 0 ? ` Total paused: ${investment.total_paused_days} days.` : ''}`}
                      date={investment.roi_paused_at ? new Date(investment.roi_paused_at).toLocaleDateString() : null}
                      isCompleted={false}
                      isActive={true}
                    />
                  )}

                  <TimelineStep 
                    title="Maturity Reached" 
                    description="Investment cycle complete. Principal and returns ready for withdrawal."
                    date={isMatured ? new Date(investment.maturity_date || investment.updated_at).toLocaleDateString() : null}
                    isCompleted={isMatured}
                    isActive={maturityStatus === 'nearing_maturity'}
                    isLast={true}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ═══ DOCUMENTS TAB ═══ */}
          <TabsContent value="documents" className="animate-in fade-in space-y-8 outline-none">
            {/* Document Summary Header */}
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg"><FileText className="w-3.5 h-3.5 text-primary" /></div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Total Documents</p>
                </div>
                <p className="text-2xl font-bold font-serif text-foreground">{1 + documents.length + propertyDocuments.length}</p>
              </div>
              <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-blue-500/10 rounded-lg"><PenLine className="w-3.5 h-3.5 text-blue-600" /></div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Signed</p>
                </div>
                <p className="text-2xl font-bold font-serif text-foreground">{documents.length}</p>
              </div>
              <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-emerald-500/10 rounded-lg"><Building2 className="w-3.5 h-3.5 text-emerald-600" /></div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Property Docs</p>
                </div>
                <p className="text-2xl font-bold font-serif text-foreground">{propertyDocuments.length}</p>
              </div>
              <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-amber-500/10 rounded-lg"><ShieldCheck className="w-3.5 h-3.5 text-amber-600" /></div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Status</p>
                </div>
                <p className="text-sm font-bold text-foreground">
                  {investment.status === 'confirmed' || investment.status === 'active' || investment.status === 'completed' ? (
                    <span className="text-green-600 flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Verified</span>
                  ) : (
                    <span className="text-amber-600 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Pending</span>
                  )}
                </p>
              </div>
            </div>

            {/* ── Ownership Certificate ── */}
            <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-b border-border/50 px-8 py-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                    <Award className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-serif text-lg font-bold text-foreground">Ownership Certificate</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Official asset ownership documentation issued by Haven Home Hub</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 font-bold uppercase tracking-wider text-[9px] px-3 py-1 flex items-center gap-1.5">
                  <Scale className="w-3 h-3" /> Legal Document
                </Badge>
              </div>
              <div className="p-8">
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Certificate ID</span>
                      <span className="font-mono font-semibold text-foreground">{investment.id.split('-')[0].toUpperCase()}-CERT</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Property</span>
                      <span className="font-semibold text-foreground">{prop.title}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Units Owned</span>
                      <span className="font-semibold text-foreground">{investment.units_owned}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Issue Date</span>
                      <span className="font-semibold text-foreground">{new Date(investment.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Amount Invested</span>
                      <span className="font-semibold text-foreground">{formatMoney(Number(investment.total_amount ?? investment.amount_invested ?? 0), prop.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Ownership</span>
                      <span className="font-semibold text-foreground">{ownershipPct}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  {investment.status === 'confirmed' || investment.status === 'active' || investment.status === 'completed' ? (
                    <>
                      <Button className="shadow-sm font-semibold" asChild>
                        <Link to={`/invest/certificate/${investment.id}`}>
                          <Eye className="w-4 h-4 mr-2" /> View Certificate
                        </Link>
                      </Button>
                      <Button variant="outline" className="font-semibold" asChild>
                        <Link to={`/invest/certificate/${investment.id}`}>
                          <Download className="w-4 h-4 mr-2" /> Download PDF
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 w-full">
                      <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-500">Certificate Pending</p>
                        <p className="text-xs text-amber-600/80 dark:text-amber-500/70 mt-0.5">Your ownership certificate will be issued once your investment is verified and confirmed.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Core Investment Documents Tracker ── */}
            <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
              <div className="border-b border-border/50 px-8 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <Scale className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-serif text-lg font-bold text-foreground">Core Investment Documents</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Standard legal and transactional records for your investment</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-border/50">
                {[
                  { id: 'contract_of_sale', title: 'Contract of Sale', desc: 'Binding agreement outlining the terms of the property purchase.', icon: PenLine },
                  { id: 'deed_of_assignment', title: 'Grant Deed', desc: 'Official document transferring property ownership rights.', icon: Building2 },
                  { id: 'purchase_receipt', title: 'Purchase Receipt', desc: 'Confirmation of your completed investment payment.', icon: DollarSign },
                  { id: 'allocation_letter', title: 'Allocation Letter', desc: 'Formal assignment of your specific property units.', icon: Stamp }
                ].map((coreDoc) => {
                  const matchedSigned = documents.find((d: any) => d.document_type === coreDoc.id || d.document_type.replace(/_/g, " ").toLowerCase() === coreDoc.title.toLowerCase());
                  const matchedProp = propertyDocuments.find((d: any) => d.title?.toLowerCase() === coreDoc.title.toLowerCase() || d.document_type === coreDoc.id);
                  const isAvailable = !!(matchedSigned || matchedProp);
                  
                  return (
                    <div key={coreDoc.id} className="p-5 md:px-8 hover:bg-muted/20 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl shrink-0 ${isAvailable ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          <coreDoc.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${isAvailable ? 'text-foreground' : 'text-muted-foreground'}`}>{coreDoc.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{coreDoc.desc}</p>
                          {matchedSigned && (
                             <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                               <Badge variant="outline" className="border-green-500/30 text-green-600 bg-green-50 dark:bg-green-500/10 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1">
                                 <CheckCircle className="w-3 h-3" /> Executed
                               </Badge>
                               <span className="text-[10px] text-muted-foreground font-mono">
                                 {new Date(matchedSigned.signed_at).toLocaleDateString()}
                               </span>
                             </div>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-3">
                        {isAvailable ? (
                          matchedSigned ? (
                            <Button variant="outline" size="sm" className="font-semibold text-xs h-9" onClick={() => {
                              setPreviewDoc({ ...matchedSigned, direct_url: matchedSigned.signature_data });
                              setPreviewOpen(true);
                            }}>
                              <Eye className="w-3.5 h-3.5 mr-1.5" /> View
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" className="font-semibold text-xs h-9" onClick={() => {
                              setPreviewDoc({ ...matchedProp, direct_url: matchedProp?.url });
                              setPreviewOpen(true);
                            }}>
                              <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                            </Button>
                          )
                        ) : (
                          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-500/20">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Pending Generation</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Lifecycle Documents (auto-generated) ── */}
            {lifecycleDocuments.length > 0 && (
              <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                <div className="border-b border-border/50 px-8 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
                      <FileCheck className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-serif text-lg font-bold text-foreground">Lifecycle Documents</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Auto-generated documents from ROI activation and maturity events</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-purple-500/30 text-purple-600 bg-purple-50 font-bold uppercase tracking-wider text-[9px] px-3 py-1">
                    {lifecycleDocuments.length} Documents
                  </Badge>
                </div>
                <div className="divide-y divide-border/50">
                  {lifecycleDocuments.map((doc: any) => {
                    const docSnapshot = doc.metadata?.document_snapshot;
                    const docRef = doc.metadata?.reference_id || doc.verification_code;
                    return (
                      <div key={doc.id} className="p-5 md:px-8 hover:bg-muted/20 transition-colors">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600 shrink-0 mt-0.5">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{doc.name || doc.document_type?.replace(/_/g, " ")}</p>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                                <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider">{doc.document_type?.replace(/_/g, " ")}</Badge>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> {new Date(doc.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                                {docRef && (
                                  <span className="text-[10px] font-mono text-muted-foreground">Ref: {docRef}</span>
                                )}
                              </div>
                              <Badge variant="outline" className="mt-2 border-green-500/30 text-green-600 bg-green-50 dark:bg-green-500/10 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1 w-fit">
                                <CheckCircle className="w-3 h-3" /> Available
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {docSnapshot && (
                          <details className="mt-4 group">
                            <summary className="cursor-pointer text-xs font-semibold text-purple-600 hover:underline flex items-center gap-1.5 select-none">
                              <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
                              View Document
                            </summary>
                            <div className="mt-3 border border-border/50 rounded-xl p-5 bg-white dark:bg-background prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed max-h-[500px] overflow-y-auto">
                              <div dangerouslySetInnerHTML={{ __html: docSnapshot }} />
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Other Signed Legal Documents ── */}
            {documents.filter((d: any) => !['contract_of_sale', 'grant_deed', 'purchase_receipt', 'allocation_letter'].includes(d.document_type)).length > 0 && (
              <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                <div className="border-b border-border/50 px-8 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                      <PenLine className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-serif text-lg font-bold text-foreground">Additional Signed Documents</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Other legally binding agreements executed with your digital signature</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-bold uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                    <Lock className="w-3 h-3" /> Tamper-proof
                  </Badge>
                </div>
                <div className="divide-y divide-border/50">
                  {documents.filter((d: any) => !['contract_of_sale', 'grant_deed', 'purchase_receipt', 'allocation_letter'].includes(d.document_type)).map((doc: any) => (
                    <div key={doc.id} className="p-6 md:px-8 hover:bg-muted/20 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600 shrink-0 mt-0.5">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-base font-semibold text-foreground capitalize">{doc.document_type.replace(/_/g, " ")}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" /> Signed: {new Date(doc.signed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Clock className="w-3 h-3" /> {new Date(doc.signed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <Badge variant="outline" className="mt-2 border-green-500/30 text-green-600 bg-green-50 dark:bg-green-500/10 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1 w-fit">
                              <CheckCircle className="w-3 h-3" /> Executed
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button variant="outline" size="sm" className="font-semibold text-xs h-9" onClick={() => {
                            setPreviewDoc({ ...doc, direct_url: doc.signature_data });
                            setPreviewOpen(true);
                          }}>
                            <Eye className="w-3.5 h-3.5 mr-1.5" /> View
                          </Button>
                        </div>
                      </div>

                      {/* Signature Display */}
                      {doc.signature_data && (
                        <div className="mt-4 border border-border/50 rounded-xl overflow-hidden">
                          <div className="bg-muted/30 px-5 py-2.5 border-b border-border/50 flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <Stamp className="w-3 h-3" /> Digital Signature
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Ref: {investment.id.split('-')[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="bg-white dark:bg-background p-6 flex items-center justify-center min-h-[100px]">
                            {doc.signature_data.startsWith('data:image') ? (
                              <img 
                                src={doc.signature_data} 
                                alt="Digital Signature" 
                                className="max-h-24 w-auto object-contain"
                              />
                            ) : (
                              <p className="font-serif text-2xl italic text-foreground/80 select-none">{doc.signature_data}</p>
                            )}
                          </div>
                          <div className="bg-muted/20 px-5 py-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>Digitally signed and verified</span>
                            <span className="font-mono">{new Date(doc.signed_at).toISOString()}</span>
                          </div>
                        </div>
                      )}

                      {/* Document Snapshot Preview */}
                      {doc.document_snapshot && (
                        <details className="mt-4 group">
                          <summary className="cursor-pointer text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 select-none">
                            <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
                            View Agreed Terms
                          </summary>
                          <div className="mt-3 border border-border/50 rounded-xl p-5 bg-muted/20 prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-muted-foreground max-h-64 overflow-y-auto">
                            <div dangerouslySetInnerHTML={{ __html: doc.document_snapshot }} />
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Additional Property Documents ── */}
            {propertyDocuments.filter((d: any) => !['contract_of_sale', 'grant_deed', 'purchase_receipt', 'allocation_letter'].includes(d.document_type) && !['contract of sale', 'grant deed', 'purchase receipt', 'allocation letter'].includes(d.title?.toLowerCase())).length > 0 && (
              <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                <div className="border-b border-border/50 px-8 py-5 flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-serif text-lg font-bold text-foreground">Additional Property Documents</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Supporting documents, reports, and filings for {prop.title}</p>
                  </div>
                </div>
                <div className="divide-y divide-border/50">
                  {propertyDocuments.filter((d: any) => !['contract_of_sale', 'grant_deed', 'purchase_receipt', 'allocation_letter'].includes(d.document_type) && !['contract of sale', 'grant deed', 'purchase receipt', 'allocation letter'].includes(d.title?.toLowerCase())).map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-5 md:px-8 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground capitalize">{doc.title || doc.document_type?.replace(/_/g, " ") || "Document"}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                            <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider">{doc.document_type?.replace(/_/g, " ") || "General"}</Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      {doc.url && (
                        <Button variant="outline" size="sm" className="font-semibold text-xs h-9 shrink-0" asChild>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {documents.length === 0 && propertyDocuments.length === 0 && (
              <div className="bg-card border border-dashed border-border/60 rounded-2xl p-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted/50 mb-4">
                  <FileText className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <p className="font-serif text-lg font-semibold text-foreground">No Additional Documents</p>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">Legal documents will appear here once your investment is processed and agreements are signed.</p>
              </div>
            )}

            {/* Legal Disclaimer */}
            <div className="bg-muted/20 border border-border/40 rounded-xl p-5 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Document Security Notice</p>
                <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                  All documents displayed on this page are securely stored and encrypted. Digital signatures are legally binding 
                  under applicable electronic signature laws. Documents are timestamped and cannot be altered after execution. 
                  For any document-related inquiries, contact our legal team at support@havenhomehub.com.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* ═══ LIQUIDITY TAB ═══ */}
          <TabsContent value="liquidity" className="animate-in fade-in space-y-8 outline-none">
            <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-8 max-w-4xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <h4 className="font-serif text-xl font-bold text-foreground">Secondary Market Liquidity</h4>
                  <p className="text-sm text-muted-foreground mt-1">Liquidate your units by selling them to other investors on the open market.</p>
                </div>
                <Button 
                  className="shrink-0" 
                  size="lg" 
                  disabled={!investment.secondary_market_enabled || (investment.status !== 'confirmed' && investment.status !== 'active' && investment.status !== 'completed')} 
                  onClick={() => setIsSellModalOpen(true)}
                >
                  {investment.secondary_market_enabled ? "Sell Units Now" : "Market Locked"}
                </Button>
              </div>

              {!investment.secondary_market_enabled ? (
                <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-xl text-center">
                   <AlertCircle className="w-12 h-12 text-red-500/50 mx-auto mb-3" />
                   <p className="font-semibold text-foreground text-red-600">Trading Locked by Administration</p>
                   <p className="text-sm text-red-500/80 mt-1 max-w-sm mx-auto">This asset is currently locked from secondary market trading. Contact support for more information.</p>
                </div>
              ) : (
                <div className="p-6 bg-muted/30 border border-border/50 rounded-xl text-center">
                   <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                   <p className="font-semibold text-foreground">No Active Sell Orders</p>
                   <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">You have not listed any units for sale. You can list your units to lock in your capital appreciation early.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ═══ ACTIVITY TAB ═══ */}
          <TabsContent value="activity" className="animate-in fade-in space-y-8 outline-none">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Audit Trail */}
              <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-6">
                <h3 className="font-serif text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" /> Investment Audit Trail
                </h3>
                <div className="space-y-4">
                  {auditLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No audit log entries yet.</p>
                  ) : (
                    auditLogs.map((log: any) => (
                      <div key={log.id} className="flex gap-3 p-3 rounded-xl bg-muted/20 border border-border/30 hover:bg-muted/40 transition-colors">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          log.action_type === 'status_change' ? 'bg-blue-500/10 text-blue-600' :
                          log.action_type === 'create' ? 'bg-green-500/10 text-green-600' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {log.action_type === 'status_change' ? <ArrowUpRight className="w-3.5 h-3.5" /> :
                           log.action_type === 'create' ? <CheckCircle className="w-3.5 h-3.5" /> :
                           <RefreshCw className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground capitalize">
                            {log.action_type.replace(/_/g, ' ')}
                            {log.field_changed && (
                              <span className="text-muted-foreground font-normal"> — {log.field_changed}</span>
                            )}
                          </p>
                          {log.old_value && log.new_value && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <span className="line-through text-red-500/60">{log.old_value}</span>
                              <ChevronRight className="w-3 h-3 inline mx-1" />
                              <span className="text-green-600">{log.new_value}</span>
                            </p>
                          )}
                          <p className="text-[10px] font-mono text-muted-foreground mt-1.5">
                            {new Date(log.created_at).toLocaleString()}
                            {log.admin_id && <span className="ml-2 text-amber-600">• Admin Action</span>}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Payment History */}
              <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-6">
                <h3 className="font-serif text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" /> Payment History
                </h3>
                <div className="space-y-3">
                  {paymentsList.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No payment records found.</p>
                  ) : (
                    paymentsList.map((pay: any) => (
                      <div key={pay.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/30">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            pay.status === 'success' || pay.status === 'confirmed' ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'
                          }`}>
                            <DollarSign className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{formatMoney(Number(pay.amount || 0), pay.currency || prop.currency)}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                              {pay.payment_method?.replace(/_/g, ' ')} • {new Date(pay.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={pay.status === 'success' || pay.status === 'confirmed' ? 'default' : 'secondary'} className="uppercase text-[9px]">
                          {pay.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <DocumentViewerModal open={previewOpen} onOpenChange={setPreviewOpen} document={previewDoc} />
      <SellUnitsDialog 
        open={isSellModalOpen} 
        onOpenChange={setIsSellModalOpen} 
        investment={investment} 
      />
    </SiteLayout>
  );
}

// ── Helper Components ──

function SummaryCard({ icon: Icon, label, value, highlight, positive }: { 
  icon: any; label: string; value: string; highlight?: boolean; positive?: boolean 
}) {
  return (
    <div className={`bg-card border rounded-2xl shadow-sm p-4 space-y-2 ${
      highlight ? 'border-primary/30 bg-primary/5' : 'border-border/50'
    }`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className={`p-1.5 rounded-lg ${highlight ? 'bg-primary/10 text-primary' : positive ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <p className={`text-lg font-bold font-serif ${positive ? 'text-green-600' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center pb-3 border-b border-border/50">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground capitalize">{value}</span>
    </div>
  );
}

function DateRow({ label, date }: { label: string; date: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-xs text-foreground bg-muted/50 px-2 py-0.5 rounded-md">
        {new Date(date).toLocaleDateString()}
      </span>
    </div>
  );
}

function TimelineStep({ title, description, date, isCompleted, isActive, isLast = false }: any) {
  return (
    <div className={`relative flex items-start gap-4 md:gap-6 ${isLast ? '' : 'pb-8'}`}>
      <div className={`absolute left-0 w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center z-10 -ml-3 md:-ml-4 border-2 shadow-sm bg-background transition-colors duration-500
        ${isCompleted ? 'border-primary text-primary' : isActive ? 'border-primary border-dashed text-primary animate-pulse' : 'border-border text-muted-foreground'}`}>
        {isCompleted ? <CheckCircle className="w-3 h-3 md:w-4 md:h-4" /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
      </div>
      <div className="flex-1 ml-6 md:ml-8">
        <h5 className={`text-base font-semibold ${isCompleted || isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{title}</h5>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
        {date && (
          <p className="text-[11px] font-mono text-muted-foreground mt-2 bg-muted/50 inline-block px-2 py-0.5 rounded-md">
            {date}
          </p>
        )}
      </div>
    </div>
  );
}
