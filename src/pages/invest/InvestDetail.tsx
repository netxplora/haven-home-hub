import { useState, useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  AlertTriangle, ArrowLeft, Building2, CalendarClock, ChartLine, Coins, 
  Layers, MapPin, ShieldAlert, ShieldCheck, Lock, Loader2, Minus, Plus,
  FileText, Map as MapIcon, Star, Info, CheckCircle2, TrendingUp, Calendar, Clock, Maximize2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { resolveImage } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SEO } from "@/components/site/SEO";
import { LazyImage } from "@/components/ui/LazyImage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { InvestmentProperty, formatMoney, fundingPercent, availableUnits } from "@/lib/invest";
import { FractionalPaymentDialog } from "@/components/invest/FractionalPaymentDialog";
import { InvestmentCalculator } from "@/components/invest/InvestmentCalculator";
import { SecondaryListingsSection } from "@/components/invest/SecondaryListingsSection";
import { PropertyGallery } from "@/components/site/PropertyGallery";
import { InteractivePropertyMap } from "@/components/site/InteractivePropertyMap";

export default function InvestDetail() {
  const { slug } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [units, setUnits] = useState<number>(1);
  const [investMode, setInvestMode] = useState<"full" | "installment">("full");
  const [durationMonths, setDurationMonths] = useState<number>(12);
  const [downPaymentPct, setDownPaymentPct] = useState<number>(0);
  const [riskAck, setRiskAck] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);
  const [authWarningOpen, setAuthWarningOpen] = useState(false);
  const [kycWarningOpen, setKycWarningOpen] = useState(false);
  const [showRiskPulse, setShowRiskPulse] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["invest-detail", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("investment_properties")
        .select(`
          *, 
          investment_property_images(url, sort_order, is_cover),
          property_documents(id, title, url, document_type, size_bytes, document_date),
          property_journey(id, stage_name, description, expected_date, completed_date, status, sort_order)
        `)
        .eq("slug", slug!)
        .maybeSingle();
      return data as (InvestmentProperty & { 
        investment_property_images: { url: string; sort_order: number; is_cover: boolean }[],
        property_documents: any[],
        property_journey: any[]
      }) | null;
    },
    enabled: !!slug,
  });

  useEffect(() => {
    if (data) {
      setUnits(1);
      if ((data as any).installment_available) {
        setDownPaymentPct(Number((data as any).min_down_payment_pct ?? 20));
      }
    }
  }, [data]);

  // Check KYC status
  const { data: kycStatus } = useQuery({
    queryKey: ["user-kyc-status", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("kyc_status")
        .eq("id", user.id)
        .maybeSingle();
      return data?.kyc_status ?? "unverified";
    },
    enabled: !!user,
  });

  const kycApproved = kycStatus === "approved";

  if (authLoading || isLoading) {
    return (
      <SiteLayout transparentNav="mobile">
        <div className="container-wide pt-20 md:pt-24 pb-10 space-y-6 animate-pulse">
          <Skeleton className="h-4 w-48 rounded-md" />
          <Skeleton className="h-[460px] w-full rounded-2xl" />
          <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              <Skeleton className="h-10 w-3/4 rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
            <Skeleton className="h-[450px] w-full rounded-2xl" />
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  if (!data) return <Navigate to="/invest/opportunities" replace />;

  const pct = fundingPercent(data);
  const avail = availableUnits(data);
  const maxAllowedUnits = avail;
  const currentMinUnits = 1;
  
  const minOk = units >= currentMinUnits && units <= maxAllowedUnits && Number.isInteger(units);
  
  const totalAmount = units * Number(data.unit_price);
  const minDownPct = Number((data as any).min_down_payment_pct ?? 20);
  const currentDownPct = downPaymentPct === 0 ? minDownPct : downPaymentPct;
  const downPaymentAmount = Math.round((totalAmount * currentDownPct) / 100);
  const remainingBalance = totalAmount - downPaymentAmount;
  const monthlyInstallment = durationMonths > 0 ? Math.round((remainingBalance / durationMonths) * 100) / 100 : 0;
  
  const expectedReturnMin = totalAmount * (Number(data.projected_return_min) / 100);
  const expectedReturnMax = totalAmount * (Number(data.projected_return_max) / 100);

  async function handleInvest() {
    if (!user) {
      setAuthWarningOpen(true);
      return;
    }
    if (!kycApproved) {
      setKycWarningOpen(true);
      return;
    }
    if (!minOk) {
      toast({ 
        title: "Invalid Unit Selection", 
        description: `Please select a valid number of units between ${currentMinUnits} and ${maxAllowedUnits}.`, 
        variant: "destructive" 
      });
      return;
    }
    if (!riskAck) {
      const checkboxEl = document.getElementById("risk-ack-container");
      if (checkboxEl) {
        checkboxEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setShowRiskPulse(true);
      setTimeout(() => setShowRiskPulse(false), 2000);
      toast({ 
        title: "Acknowledgement Required", 
        description: "Please read and acknowledge the risk disclosure before proceeding." 
      });
      return;
    }

    setBtnLoading(true);
    setTimeout(() => {
      setBtnLoading(false);
      setPayModalOpen(true);
    }, 600);
  }

  const galleryImages = [
    data.cover_image_url,
    ...(data.investment_property_images ?? []).sort((a, b) => a.sort_order - b.sort_order).map(i => i.url),
  ].filter(Boolean) as string[];

  const renderInvestmentPanel = () => (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
          <Building2 className="h-3.5 w-3.5" /> {data.status === "funded" ? "Fully Funded" : "Open for Allocation"}
        </span>
        <span className="text-xs font-mono font-medium text-muted-foreground">{data.currency}</span>
      </div>

      {(data as any).installment_available && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5">
          <Layers className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-semibold text-primary">Installment plans available</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 pt-1">
        <Stat small label="Asset Value" value={formatMoney(Number(data.total_value), data.currency)} />
        <Stat small label="Unit Price" value={formatMoney(Number(data.unit_price), data.currency)} />
        <Stat small label="Total Units" value={data.total_units.toLocaleString()} />
        <Stat small label="Units Sold" value={data.units_sold.toLocaleString()} />
      </div>

      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">Funding Progress</span>
          <span className="font-bold text-foreground font-mono">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/30">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <Separator className="bg-border/60" />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Units</Label>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setUnits(Math.max(currentMinUnits, units - 1))}
              disabled={units <= currentMinUnits || avail === 0 || data.status !== "open"}
              className="h-11 w-11 shrink-0 rounded-xl"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              min={currentMinUnits}
              max={maxAllowedUnits}
              value={units}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (isNaN(val)) setUnits(currentMinUnits);
                else if (val > maxAllowedUnits) setUnits(maxAllowedUnits);
                else setUnits(val);
              }}
              disabled={avail === 0 || data.status !== "open"}
              className="h-11 flex-1 min-w-0 rounded-xl border-border bg-muted/40 focus:bg-background transition-all font-bold text-base text-center"
            />
            <Button
              variant="outline"
              size="icon"
              disabled={units >= maxAllowedUnits || avail === 0 || data.status !== "open"}
              onClick={() => setUnits(Math.min(maxAllowedUnits, units + 1))}
              className="h-11 w-11 shrink-0 rounded-xl"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <p className="text-[11px] text-muted-foreground">
              Price per unit: <span className="font-semibold text-foreground">{formatMoney(Number(data.unit_price), data.currency)}</span>
            </p>
            <p className="text-[11px] font-medium text-primary">
              {avail.toLocaleString()} units remaining
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Structure</Label>
          <Select value={investMode} onValueChange={(val: "full" | "installment") => setInvestMode(val)} disabled={avail === 0 || data.status !== "open"}>
            <SelectTrigger className="h-11 rounded-xl border-border bg-muted/40 font-semibold text-xs">
              <SelectValue placeholder="Select payment plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Full Upfront Allocation</SelectItem>
              {(data as any).installment_available && (
                <SelectItem value="installment">Structured Installments</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Financial Return Summary */}
      <div className="rounded-xl border border-primary/20 bg-accent/30 p-4 space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground font-medium">Total Capital Allocation</span>
          <span className="font-serif font-bold text-base text-foreground">{formatMoney(totalAmount, data.currency)}</span>
        </div>
        
        <div className="flex justify-between items-center text-xs border-t border-border/50 pt-2.5">
          <span className="text-muted-foreground font-medium">Est. Annual Return ({data.projected_return_min}–{data.projected_return_max}%)</span>
          <span className="font-bold text-primary">
            {formatMoney(expectedReturnMin, data.currency)} – {formatMoney(expectedReturnMax, data.currency)}
          </span>
        </div>

        {investMode === "installment" && (
          <>
            <div className="flex justify-between items-center text-xs border-t border-border/50 pt-2.5">
              <span className="text-muted-foreground font-medium">Initial Down Payment ({currentDownPct}%)</span>
              <span className="font-bold text-primary">{formatMoney(downPaymentAmount, data.currency)}</span>
            </div>
            <div className="flex justify-between items-center text-xs border-t border-border/50 pt-2.5">
              <span className="text-muted-foreground font-medium">Monthly Installment</span>
              <span className="font-bold text-foreground">{formatMoney(monthlyInstallment, data.currency)} / mo</span>
            </div>
          </>
        )}
      </div>

      <Button
        className={cn(
          "w-full h-12 font-semibold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all",
          (avail === 0 || data.status !== "open" || !riskAck) 
            ? "bg-muted text-muted-foreground cursor-not-allowed" 
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        disabled={btnLoading || avail === 0 || data.status !== "open" || !riskAck}
        onClick={handleInvest}
      >
        {btnLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Initializing checkout...
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            Proceed to Secure Payment
          </>
        )}
      </Button>
      
      <div 
        id="risk-ack-container" 
        className={cn(
          "flex items-start gap-2.5 text-xs text-foreground/80 rounded-xl p-3 border border-border/40 bg-muted/20 transition-all", 
          showRiskPulse && "border-primary/50 bg-primary/10 animate-pulse"
        )}
      >
        <Checkbox
          id="risk-ack"
          checked={riskAck}
          onCheckedChange={(v) => setRiskAck(v === true)}
          className="mt-0.5"
        />
        <label htmlFor="risk-ack" className="cursor-pointer select-none leading-relaxed text-[11px]">
          I acknowledge that real estate projections are estimates, and that units are held for the stated duration.
        </label>
      </div>

      {user && !kycApproved && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 text-amber-800 dark:text-amber-200">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-tight">
            Identity verification is required before initiating payments.
          </p>
        </div>
      )}

      <Button asChild variant="outline" size="sm" className="w-full h-10 rounded-xl text-xs font-semibold">
        <Link to="/agents">Speak to an Investment Consultant</Link>
      </Button>
    </div>
  );

  return (
    <SiteLayout transparentNav="mobile">
      <SEO 
        title={`${data.title} — Fractional Real Estate Asset`} 
        description={data.description.slice(0, 160)} 
        image={resolveImage(data.cover_image_url)} 
        canonicalUrl={`${window.location.origin}/invest/opportunities/${data.slug}`}
      />

      {/* ── 1. Top Breadcrumb Nav ── */}
      <div className="container-wide pt-14 md:pt-24 pb-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted-foreground font-medium flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link to="/invest/opportunities" className="hover:text-primary transition-colors">Investment Assets</Link>
          <span>/</span>
          <span className="text-foreground font-semibold truncate max-w-xs">{data.title}</span>
        </nav>
      </div>

      {/* ── 2. Primary Image Gallery ── */}
      <section className="container-wide mb-8">
        <PropertyGallery 
          images={galleryImages} 
          title={data.title}
          propertyType="investment"
          status={data.status}
          typeLabel="Fractional Asset"
          statusLabel={data.status === "funded" ? "Fully Funded" : "Open"}
        />
      </section>

      {/* ── 3. Main Content & Sidebar Grid ── */}
      <div className="container-wide grid gap-10 pb-20 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_400px]">
        <div className="min-w-0 w-full space-y-10">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <MapPin className="h-3.5 w-3.5 shrink-0" /> {data.location}
              </span>
              <span className="text-xs font-mono font-medium text-muted-foreground">
                ID: <span className="text-foreground font-semibold">ASSET-{data.id.substring(0, 8).toUpperCase()}</span>
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground tracking-tight leading-[1.2]">
              {data.title}
            </h1>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
              <div className="p-4 rounded-xl border border-border/60 bg-card text-center shadow-xs">
                <TrendingUp className="h-4 w-4 text-primary mx-auto mb-1.5" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Projected Return</p>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{data.projected_return_min}–{data.projected_return_max}%</p>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-card text-center shadow-xs">
                <Maximize2 className="h-4 w-4 text-primary mx-auto mb-1.5" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Unit Value</p>
                <p className="text-base font-bold text-foreground mt-0.5">{formatMoney(Number(data.unit_price), data.currency)}</p>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-card text-center shadow-xs">
                <Calendar className="h-4 w-4 text-primary mx-auto mb-1.5" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Distribution</p>
                <p className="text-sm font-bold text-foreground capitalize mt-0.5">{data.distribution_frequency.replace("_", " ")}</p>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-card text-center shadow-xs">
                <Clock className="h-4 w-4 text-primary mx-auto mb-1.5" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Holding Term</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{data.holding_period_months} Months</p>
              </div>
            </div>

            <p className="pt-2 whitespace-pre-line text-base text-foreground/80 leading-relaxed max-w-3xl">
              {data.description}
            </p>
          </div>

          {/* Mobile-only investment panel anchor */}
          <div id="mobile-investment-panel" className="block lg:hidden">
            {renderInvestmentPanel()}
          </div>

          {/* Investment Calculator */}
          <div className="pt-4">
            <InvestmentCalculator
              minInvestment={Number(data.min_investment)}
              maxInvestment={Number(data.total_value)}
              projectedReturnMin={data.projected_return_min}
              projectedReturnMax={data.projected_return_max}
              currency={data.currency || 'USD'}
            />
          </div>

          {/* Income Model & Risk Disclosure */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-primary" />
                <h3 className="font-serif text-lg font-semibold text-foreground">Income Structure</h3>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">{data.income_model}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-2">
                <CalendarClock className="h-3.5 w-3.5 text-primary" /> Payout schedule: {data.distribution_frequency.replace("_"," ")}
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" />
                <h3 className="font-serif text-lg font-semibold text-foreground">Risk Disclosure</h3>
              </div>
              <ul className="text-xs text-foreground/80 space-y-1.5 leading-relaxed">
                <li>• Real estate values correlate with regional market dynamics.</li>
                <li>• Capital is locked during the {data.holding_period_months}-month asset holding term.</li>
                <li>• Secondary market trades are supported subject to buyer matching.</li>
              </ul>
            </div>
          </div>

          {/* Secondary Market Listings */}
          <SecondaryListingsSection
            propertyId={data.id}
            propertyTitle={data.title}
            currency={data.currency || "USD"}
          />

          {/* Details Tabs (Highlights, Location, Journey, Documents, Liquidity) */}
          <div className="w-full min-w-0 pt-2">
            <Tabs defaultValue="highlights" className="w-full">
              <div className="w-full overflow-hidden border-b border-border/60">
                <TabsList className="w-max min-w-full justify-start rounded-none bg-transparent p-0 h-auto flex-nowrap">
                  <TabsTrigger value="highlights" className="rounded-none border-b-2 border-transparent px-5 py-3 text-xs font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent">Highlights</TabsTrigger>
                  <TabsTrigger value="location" className="rounded-none border-b-2 border-transparent px-5 py-3 text-xs font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent">Location & Map</TabsTrigger>
                  <TabsTrigger value="journey" className="rounded-none border-b-2 border-transparent px-5 py-3 text-xs font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent">Development Journey</TabsTrigger>
                  <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent px-5 py-3 text-xs font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent">Legal Documents</TabsTrigger>
                  {(data as any).liquidity_rules && <TabsTrigger value="liquidity" className="rounded-none border-b-2 border-transparent px-5 py-3 text-xs font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent">Liquidity Rules</TabsTrigger>}
                </TabsList>
              </div>
              
              <TabsContent value="highlights" className="mt-6 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <HighlightItem icon={Star} title="High-Demand Corridor" desc="Strategically located in an active metropolitan development zone." />
                  <HighlightItem icon={Building2} title="Institutional Asset" desc="Quality construction with energy-efficient systems and verified titles." />
                  <HighlightItem icon={ChartLine} title="Consistent Yield" desc="Projected annual capital appreciation and stable rental dividend distributions." />
                  <HighlightItem icon={CheckCircle2} title="Managed Asset" desc="Full asset operations and tenant relationships handled by licensed managers." />
                </div>
              </TabsContent>

              <TabsContent value="location" className="mt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{data.location}</h4>
                    <p className="text-xs text-muted-foreground">{data.city}, {data.state}, {data.country}</p>
                  </div>
                </div>
                <div className="relative h-[380px] w-full rounded-2xl overflow-hidden border border-border/60 bg-muted/20">
                  <InteractivePropertyMap
                    latitude={null}
                    longitude={null}
                    address={[data.location, data.city, data.state, data.country].filter(Boolean).join(", ")}
                    title={data.title}
                  />
                </div>
              </TabsContent>

              <TabsContent value="journey" className="mt-6">
                {data.property_journey?.length === 0 ? (
                  <p className="text-muted-foreground italic text-xs">No project milestones recorded yet.</p>
                ) : (
                  <div className="space-y-5 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60">
                    {data.property_journey?.sort((a,b) => a.sort_order - b.sort_order).map((stage, idx) => (
                      <div key={stage.id} className="flex gap-4 items-start relative z-10">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border-2 border-background ${
                          stage.status === 'completed' ? 'bg-emerald-600 text-white' :
                          stage.status === 'in_progress' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="pt-0.5">
                          <h4 className="font-semibold text-xs text-foreground">{stage.stage_name}</h4>
                          {stage.description && <p className="text-xs text-muted-foreground mt-0.5">{stage.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="documents" className="mt-6">
                <div className="grid gap-3">
                  {data.property_documents?.length === 0 ? (
                    <p className="text-muted-foreground italic text-xs">No prospectus documents uploaded yet.</p>
                  ) : (
                    data.property_documents?.map((doc) => (
                      <DocumentLink key={doc.id} url={doc.url} title={doc.title} size={doc.size_bytes > 0 ? `${(doc.size_bytes / 1024 / 1024).toFixed(1)} MB` : ""} date={doc.document_date || ""} />
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="liquidity" className="mt-6">
                <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xs text-xs text-foreground/85 leading-relaxed whitespace-pre-line">
                  {(data as any).liquidity_rules}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Desktop Sticky Sidebar */}
        <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
          {renderInvestmentPanel()}
        </aside>
      </div>

      {/* ── 4. Mobile Sticky Bottom Action Bar ── */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/60 p-3 sm:hidden shadow-lg flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Unit Price</p>
          <p className="font-serif text-base font-bold text-foreground truncate">
            {formatMoney(Number(data.unit_price), data.currency)}
          </p>
        </div>

        <Button 
          className="h-10 px-5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
          disabled={avail === 0 || data.status !== "open"}
          onClick={() => {
            const el = document.getElementById("mobile-investment-panel");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
        >
          {data.status === "funded" ? "Fully Funded" : "Invest Now"}
        </Button>
      </div>

      {payModalOpen && (
        <FractionalPaymentDialog
          open={payModalOpen}
          onClose={() => setPayModalOpen(false)}
          property={data}
          units={units}
          investMode={investMode}
          totalAmount={totalAmount}
          downPaymentAmount={downPaymentAmount}
          durationMonths={durationMonths}
          monthlyInstallment={monthlyInstallment}
          onSuccess={() => {
            setPayModalOpen(false);
            window.location.href = "/dashboard?tab=investments";
          }}
        />
      )}

      {/* Auth Dialog */}
      <Dialog open={authWarningOpen} onOpenChange={setAuthWarningOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader className="text-center sm:text-center pb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl font-bold font-serif">Investor Account Required</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs mt-1">
              Sign in or create an account to allocate units and track your real estate portfolio.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 flex flex-col gap-2">
            <Button className="w-full h-11 text-xs font-semibold rounded-xl bg-primary text-primary-foreground" asChild>
              <Link to="/auth">Sign In or Register</Link>
            </Button>
            <Button variant="ghost" className="w-full h-10 text-xs rounded-xl" onClick={() => setAuthWarningOpen(false)}>
              Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KYC Dialog */}
      <Dialog open={kycWarningOpen} onOpenChange={setKycWarningOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader className="text-center sm:text-center pb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl font-bold font-serif">Identity Verification Required</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs mt-1">
              To comply with real estate regulations, verify your identity before completing investments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 flex flex-col gap-2">
            <Button className="w-full h-11 text-xs font-semibold rounded-xl bg-primary text-primary-foreground" asChild>
              <Link to="/dashboard?tab=profile" onClick={() => setKycWarningOpen(false)}>
                Verify Identity Now
              </Link>
            </Button>
            <Button variant="ghost" className="w-full h-10 text-xs rounded-xl" onClick={() => setKycWarningOpen(false)}>
              Complete Later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="p-3 rounded-xl border border-border/50 bg-background text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-serif font-bold ${small ? "text-sm text-foreground mt-0.5" : "text-base text-primary mt-0.5"}`}>{value}</p>
    </div>
  );
}

function HighlightItem({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex gap-3.5 items-start p-4 rounded-xl border border-border/60 bg-card shadow-xs">
      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h4 className="text-xs font-bold text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function DocumentLink({ title, size, date, url }: { title: string; size: string; date: string; url?: string }) {
  return (
    <a 
      href={url || "#"} 
      target={url ? "_blank" : "_self"} 
      rel="noreferrer" 
      className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
          <FileText className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">{title}</p>
          {(date || size) && <p className="text-[10px] text-muted-foreground mt-0.5">{date} {date && size ? '·' : ''} {size}</p>}
        </div>
      </div>
      <Info className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100" />
    </a>
  );
}
