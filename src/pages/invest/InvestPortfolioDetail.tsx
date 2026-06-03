import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/invest";
import { ArrowLeft, ExternalLink, FileText, CheckCircle, Clock, TrendingUp, AlertCircle, RefreshCw, BarChart3, LineChart, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { FractionalPaymentDialog } from "@/components/invest/FractionalPaymentDialog";
import { useState, useEffect, useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export default function InvestPortfolioDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: investment, isLoading, error } = useQuery({
    queryKey: ["portfolio-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_investments")
        .select(`
          *,
          investment_properties (*),
          signed_documents (id, document_type, signed_at),
          payments (id, amount, status, proof_url, provider)
        `)
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const { data: activityList } = useQuery({
    queryKey: ["property-activity", investment?.property_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_toasts")
        .select("*")
        .eq("property_id", investment?.property_id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!investment?.property_id
  });

  // Real-time sync
  useEffect(() => {
    if (!id || !investment?.property_id) return;
    const channel1 = supabase.channel(`inv-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_investments', filter: `id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["portfolio-detail", id] });
      })
      .subscribe();
    
    const channel2 = supabase.channel(`prop-${investment.property_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investment_properties', filter: `id=eq.${investment.property_id}` }, () => {
        qc.invalidateQueries({ queryKey: ["portfolio-detail", id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, [id, investment?.property_id, qc]);

  const prop = investment?.investment_properties;
  
  // Chart Data Generation
  const chartData = useMemo(() => {
    if (!investment || !prop) return [];
    const data = [];
    const totalInv = Number(investment.total_amount ?? investment.amount_invested ?? 0);
    const accruedEarnings = Number(investment.accrued_earnings || 0);
    const currentVal = totalInv + accruedEarnings;
    const now = new Date();
    
    // Simulate past 6 months of growth to reach current valuation
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = i === 0 ? currentVal : (currentVal - (accruedEarnings * (i / 5)));
      data.push({
        name: d.toLocaleString('default', { month: 'short' }),
        value: val > 0 ? val : totalInv
      });
    }
    return data;
  }, [investment, prop]);

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="container-wide py-12">
          <Skeleton className="h-[60vh] w-full rounded-2xl" />
        </div>
      </SiteLayout>
    );
  }

  if (error || !investment) {
    return (
      <SiteLayout>
        <div className="container-wide py-20 text-center">
          <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Investment Not Found</h2>
          <Button onClick={() => navigate("/dashboard?tab=investments")} variant="outline">
            Return to Dashboard
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const isFunded = prop.status === 'funded' || (prop.units_sold >= prop.total_units);
  const unitsAvailable = Math.max(0, prop.total_units - prop.units_sold);
  const fundingPct = Math.min(100, Math.round((prop.units_sold / prop.total_units) * 100));

  const totalInv = Number(investment.total_amount ?? investment.amount_invested ?? 0);
  const accruedEarnings = Number(investment.accrued_earnings || 0);
  const currentValue = totalInv + accruedEarnings;
  const ownershipPct = ((investment.units_owned / prop.total_units) * 100).toFixed(2);
  const expectedReturnAmt = totalInv * (Number(prop.projected_return_min) / 100);

  // Maturity calculations
  let remainingDays = 0;
  let remainingMonths = 0;
  let maturityProgress = 0;

  if (investment.start_date && investment.maturity_date) {
    const start = new Date(investment.start_date).getTime();
    const end = new Date(investment.maturity_date).getTime();
    const now = new Date().getTime();

    if (now >= end) {
      maturityProgress = 100;
    } else if (now <= start) {
      maturityProgress = 0;
      remainingDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    } else {
      maturityProgress = Math.min(100, ((now - start) / (end - start)) * 100);
      remainingDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    }
    remainingMonths = Math.floor(remainingDays / 30);
  }

  return (
    <SiteLayout>
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
                <img src={prop.cover_image_url} alt={prop.title} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant={investment.status === 'active' || investment.status === 'confirmed' ? 'default' : 'secondary'} className="uppercase tracking-wider text-[10px]">
                    {investment.status.replace(/_/g, " ")}
                  </Badge>
                  {isFunded && (
                    <Badge variant="outline" className="border-green-500/30 text-green-600 bg-green-50 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Funding Complete
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">{prop.title}</h1>
                <p className="text-muted-foreground font-mono text-sm mt-2 flex items-center gap-2">
                  ID: {investment.id.split('-')[0].toUpperCase()} <span className="text-border/50">|</span> {prop.location}
                </p>
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
                    <Link to={`/invest/${prop.slug}`}>
                      Buy More Units
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container-wide py-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-muted/50 p-1 w-full flex overflow-x-auto justify-start md:w-auto border border-border/50 rounded-xl h-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2 rounded-lg py-2.5 px-5 font-semibold text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <BarChart3 className="w-4 h-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="journey" className="flex items-center gap-2 rounded-lg py-2.5 px-5 font-semibold text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <LineChart className="w-4 h-4" /> Journey
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2 rounded-lg py-2.5 px-5 font-semibold text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <ShieldCheck className="w-4 h-4" /> Documents
            </TabsTrigger>
            <TabsTrigger value="liquidity" className="flex items-center gap-2 rounded-lg py-2.5 px-5 font-semibold text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <TrendingUp className="w-4 h-4" /> Liquidity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="animate-in fade-in space-y-8 outline-none">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content Column */}
              <div className="lg:col-span-2 space-y-8">
                {/* Real-Time ROI Dashboard */}
                <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-6 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/50 to-primary/10" />
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="font-serif text-xl font-bold text-foreground flex items-center gap-2">
                        Performance Intelligence
                        {investment.status === 'active' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">Real-time tracking of your asset valuation</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Current Value</p>
                      <p className="text-2xl font-serif font-bold text-foreground transition-all duration-500">{formatMoney(currentValue, prop.currency)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Earned ROI</p>
                      <p className="text-2xl font-serif font-bold text-green-600 transition-all duration-500">{formatMoney(accruedEarnings, prop.currency)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Expected ROI</p>
                      <p className="text-2xl font-serif font-bold text-muted-foreground">{formatMoney(expectedReturnAmt, prop.currency)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Annual Yield</p>
                      <p className="text-2xl font-serif font-bold text-muted-foreground">{prop.projected_return_min}% p.a.</p>
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
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                        <YAxis hide={true} domain={['dataMin - 500', 'dataMax + 500']} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number) => [formatMoney(value, prop.currency), "Asset Value"]}
                        />
                        <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorAsset)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Sidebar Column */}
              <div className="space-y-6">
                {/* Asset Profile Grid */}
                <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-5 space-y-4">
                  <h4 className="font-serif text-lg font-semibold text-foreground mb-4">Asset Profile</h4>
                  
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Category</span>
                    <span className="text-sm font-medium text-foreground capitalize">{prop.property_category || prop.property_type}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Units Owned</span>
                    <span className="text-sm font-medium text-foreground">{investment.units_owned}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Ownership Stake</span>
                    <span className="text-sm font-medium text-foreground">{ownershipPct}%</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Unit Price</span>
                    <span className="text-sm font-medium text-foreground">{formatMoney(prop.unit_price, prop.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Property Value</span>
                    <span className="text-sm font-medium text-foreground">{formatMoney(prop.total_value, prop.currency)}</span>
                  </div>

                  {/* Funding Progress */}
                  <div className="pt-2">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Funding Progress</span>
                      <span className="text-sm font-bold text-foreground">{fundingPct}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${fundingPct}%` }} />
                    </div>
                  </div>
                </div>

                {/* Live Activity Feed */}
                <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-5">
                  <h4 className="font-serif text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    Live Activity <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  </h4>
                  
                  <div className="space-y-4">
                    {activityList?.length === 0 && <p className="text-sm text-muted-foreground">No recent activity.</p>}
                    {activityList?.map((act) => (
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

          <TabsContent value="journey" className="animate-in fade-in space-y-8 outline-none">
             <div className="grid lg:grid-cols-2 gap-8">
                {/* Maturity Date Engine */}
                <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-6 h-fit">
                  <h3 className="font-serif text-xl font-bold text-foreground mb-6">Maturity Lifecycle</h3>
                  
                  {!investment.start_date ? (
                    <div className="bg-muted/30 border border-border/50 rounded-xl p-6 text-center">
                      <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                      <p className="font-semibold text-foreground">Awaiting Funding Completion</p>
                      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                        The ROI and maturity timeline will automatically commence the moment this property reaches 100% funding. 
                        Current funding stands at {fundingPct}%.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex justify-between text-sm">
                        <div className="text-left">
                          <p className="font-semibold text-foreground">{new Date(investment.start_date).toLocaleDateString()}</p>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">Start Date</p>
                        </div>
                        <div className="text-center">
                          <p className="font-serif text-xl font-bold text-primary">{remainingDays} Days</p>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">Remaining ({remainingMonths} months)</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">{new Date(investment.maturity_date).toLocaleDateString()}</p>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">Maturity Date</p>
                        </div>
                      </div>
                      
                      <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-1000 ease-out relative" 
                          style={{ width: `${maturityProgress}%` }}
                        >
                          <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Investment Progress Timeline */}
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
                      description="Initial funds secured and verified by administration."
                      date={investment.status !== 'pending' && investment.status !== 'payment_under_review' ? new Date(investment.updated_at).toLocaleDateString() : null}
                      isCompleted={investment.status !== 'pending' && investment.status !== 'payment_under_review'}
                      isActive={investment.status === 'payment_under_review'}
                    />

                    <TimelineStep 
                      title="Units Allocated" 
                      description={`Successfully secured ${investment.units_owned} units (${ownershipPct}% ownership).`}
                      date={investment.status === 'confirmed' || investment.status === 'active' || investment.status === 'completed' ? new Date(investment.updated_at).toLocaleDateString() : null}
                      isCompleted={investment.status === 'confirmed' || investment.status === 'active' || investment.status === 'completed'}
                      isActive={investment.status === 'confirmed'}
                    />

                    <TimelineStep 
                      title="Funding Completed" 
                      description="Property reached 100% funding goal."
                      date={isFunded ? new Date().toLocaleDateString() : null}
                      isCompleted={isFunded}
                      isActive={!isFunded && investment.status === 'confirmed'}
                    />

                    <TimelineStep 
                      title="ROI Activated" 
                      description="Returns tracking officially started."
                      date={investment.start_date ? new Date(investment.start_date).toLocaleDateString() : null}
                      isCompleted={!!investment.start_date}
                      isActive={!!investment.start_date && !investment.maturity_date}
                    />

                    <TimelineStep 
                      title="Maturity Reached" 
                      description="Investment cycle complete. Principal & returns ready for withdrawal."
                      date={investment.status === 'completed' ? new Date(investment.updated_at).toLocaleDateString() : null}
                      isCompleted={investment.status === 'completed'}
                      isActive={maturityProgress > 95 && investment.status !== 'completed'}
                      isLast={true}
                    />
                  </div>
                </div>
             </div>
          </TabsContent>

          <TabsContent value="documents" className="animate-in fade-in space-y-8 outline-none">
            {/* Document Hub */}
            <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-8 max-w-4xl">
              <h4 className="font-serif text-xl font-bold text-foreground mb-6">Document Hub</h4>
              <div className="space-y-4">
                
                <div className="flex items-center justify-between p-5 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-foreground">Official Ownership Certificate</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Legal Asset Issuance</p>
                    </div>
                  </div>
                  {investment.status === 'confirmed' || investment.status === 'active' || investment.status === 'completed' ? (
                    <Button variant="outline" className="font-semibold" asChild>
                      <Link to={`/invest/certificate/${investment.id}`}>View Certificate <ExternalLink className="w-4 h-4 ml-2" /></Link>
                    </Button>
                  ) : (
                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Pending Verification</Badge>
                  )}
                </div>

                {investment.payments && investment.payments.map((p: any) => p.proof_url && (
                  <div key={p.id} className="flex items-center justify-between p-5 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-500/10 rounded-xl text-green-600">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-foreground">Payment Receipt</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Provider: {p.provider}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="font-semibold" asChild>
                      <a href={p.proof_url} target="_blank" rel="noopener noreferrer">View Receipt <ExternalLink className="w-4 h-4 ml-2" /></a>
                    </Button>
                  </div>
                ))}

                {(!investment.payments || investment.payments.filter((p: any) => p.proof_url).length === 0) && (
                   <p className="text-sm text-muted-foreground">No additional documents available yet.</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="liquidity" className="animate-in fade-in space-y-8 outline-none">
            <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-8 max-w-4xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <h4 className="font-serif text-xl font-bold text-foreground">Secondary Market Liquidity</h4>
                  <p className="text-sm text-muted-foreground mt-1">Liquidate your units by selling them to other investors on the open market.</p>
                </div>
                <Button className="shrink-0" size="lg" disabled={investment.status !== 'confirmed' && investment.status !== 'active'} onClick={() => toast({ title: 'Secondary Market', description: 'Secondary market is currently disabled for this asset.' })}>
                  Sell Units Now
                </Button>
              </div>

              <div className="p-6 bg-muted/30 border border-border/50 rounded-xl text-center">
                 <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                 <p className="font-semibold text-foreground">No Active Sell Orders</p>
                 <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">You have not listed any units for sale. You can list your units at a premium to lock in your capital appreciation early.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <FractionalPaymentDialog 
        open={isBuyModalOpen} 
        onClose={() => setIsBuyModalOpen(false)} 
        property={prop} 
      />
    </SiteLayout>
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
