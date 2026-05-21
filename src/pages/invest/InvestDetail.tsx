import { useState, useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Building2, CalendarClock, ChartLine, Coins, Layers, MapPin, ShieldAlert, ShieldCheck, Wallet, Minus, Plus } from "lucide-react";
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
import { Lock, Loader2 } from "lucide-react";

import { SEO } from "@/components/site/SEO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Map as MapIcon, Star, Info, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { InvestmentProperty, formatMoney, fundingPercent, availableUnits } from "@/lib/invest";
import { FractionalPaymentDialog } from "@/components/invest/FractionalPaymentDialog";
import { InvestmentCalculator } from "@/components/invest/InvestmentCalculator";

export default function InvestDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [units, setUnits] = useState<number>(1);
  const [investMode, setInvestMode] = useState<"full" | "installment">("full");
  const [durationMonths, setDurationMonths] = useState<number>(12);
  const [downPaymentPct, setDownPaymentPct] = useState<number>(0);
  const [riskAck, setRiskAck] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
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
        .select("*, investment_property_images(url, sort_order, is_cover)")
        .eq("slug", slug!)
        .maybeSingle();
      return data as (InvestmentProperty & { investment_property_images: { url: string; sort_order: number; is_cover: boolean }[] }) | null;
    },
    enabled: !!slug,
  });

  useEffect(() => {
    if (data) {
      const minUnits = Math.ceil(Number(data.min_investment || data.unit_price) / Number(data.unit_price));
      setUnits(minUnits);
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

  if (isLoading) {
    return <SiteLayout><div className="container-wide py-10"><Skeleton className="h-[500px]" /></div></SiteLayout>;
  }
  if (!data) return <Navigate to="/invest/opportunities" replace />;

  const pct = fundingPercent(data);
  const avail = availableUnits(data);
  
  // Allow up to all available units
  const maxAllowedUnits = avail;
  const currentMinUnits = Math.ceil(Number(data.min_investment || data.unit_price) / Number(data.unit_price));
  
  const minOk = units >= currentMinUnits && units <= maxAllowedUnits && Number.isInteger(units);
  const canInvest = minOk && riskAck && avail > 0 && data.status === "open";
  
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

  const gallery = [
    { url: data.cover_image_url },
    ...(data.investment_property_images ?? []).sort((a, b) => a.sort_order - b.sort_order),
  ].filter((g) => g.url).slice(0, 5);

  return (
    <SiteLayout>
      <SEO title={data.title} description={data.description.slice(0, 160)} image={resolveImage(data.cover_image_url)} />
      <div className="container-wide py-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/invest/opportunities"><ArrowLeft className="mr-1 h-4 w-4" />All opportunities</Link>
        </Button>
      </div>

      <div className="container-wide grid gap-10 pb-16 lg:grid-cols-[1fr_400px]">
        {/* LEFT */}
        <div>
          {/* Gallery */}
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl shadow-card border border-border/50">
            {gallery.map((g, i) => (
              <img
                key={i}
                src={resolveImage(g.url)}
                alt={data.title}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-in-out ${activeImg === i ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              />
            ))}
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
              {gallery.map((g, i) => (
                <button 
                  key={i} 
                  onClick={() => setActiveImg(i)}
                  className={`relative aspect-square w-full overflow-hidden rounded-lg transition-all duration-300 ${activeImg === i ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "opacity-70 hover:opacity-100"}`}
                >
                  <img src={resolveImage(g.url)} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-8">
            <p className="inline-flex items-center gap-1 text-xs font-medium tracking-wider text-primary uppercase">
              <MapPin className="h-3 w-3" /> {data.location}
            </p>
            <h1 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">{data.title}</h1>
            <p className="mt-5 whitespace-pre-line text-foreground/85">{data.description}</p>
          </div>

          {/* Returns */}
          <div className="mt-10 rounded-xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <ChartLine className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-xl font-semibold">Estimated returns</h2>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Stat label="Expected annual return" value={`${data.projected_return_min}–${data.projected_return_max}%`} />
              <Stat label="Est. rental yield" value={data.estimated_rental_yield ? `${data.estimated_rental_yield}%` : "—"} />
              <Stat label="Distribution" value={data.distribution_frequency.replace("_"," ")} />
            </div>
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-accent p-3 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Returns are estimates based on property performance and are not guaranteed.
            </p>
          </div>

          <InvestmentCalculator
            minInvestment={Number(data.min_investment)}
            maxInvestment={Number(data.total_value)}
            projectedReturnMin={data.projected_return_min}
            projectedReturnMax={data.projected_return_max}
            currency={data.currency || 'USD'}
          />

          {/* Income model */}
          <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-xl font-semibold">Income model</h2>
            </div>
            <p className="mt-3 text-sm text-foreground/85">{data.income_model}</p>
            <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" /> Distributions: {data.distribution_frequency.replace("_"," ")} · Expected holding period: {data.holding_period_months} months
            </p>
          </div>

          {/* Risk */}
          <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-xl font-semibold">Risk disclosure</h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-foreground/85">
              <li><strong className="font-semibold">Market risk:</strong> Property values and rental income can fluctuate with local market conditions.</li>
              <li><strong className="font-semibold">Investment Period:</strong> These are long-term investments. Units cannot be redeemed on demand and may be held for the full period.</li>
              <li><strong className="font-semibold">Holding period:</strong> Expected {data.holding_period_months} months. Early exit is not guaranteed.</li>
              {data.risk_notes && <li className="whitespace-pre-line text-muted-foreground">{data.risk_notes}</li>}
            </ul>
          </div>

          {/* Installment Calculator */}
          {(data as any).installment_available && (
            <div className="mt-8 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 shadow-soft">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <h2 className="font-serif text-xl font-semibold">Installment Payment Available</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                This property supports installment-based purchases. Pay a minimum Initial Payment of {(data as any).min_down_payment_pct ?? 20}% and spread the remainder over up to {(data as any).max_installment_months ?? 24} months.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Min. Initial Payment</p>
                  <p className="mt-1 font-serif text-lg font-semibold text-primary">
                    {formatMoney(Math.round(Number(data.min_investment) * ((data as any).min_down_payment_pct ?? 20) / 100), data.currency)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{(data as any).min_down_payment_pct ?? 20}% of Min. Investment</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Est. Monthly Payment</p>
                  <p className="mt-1 font-serif text-lg font-semibold">
                    {formatMoney(
                      Math.round((Number(data.min_investment) * (1 - ((data as any).min_down_payment_pct ?? 20) / 100)) / 12),
                      data.currency
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Over 12 months</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Max Duration</p>
                  <p className="mt-1 font-serif text-lg font-semibold">{(data as any).max_installment_months ?? 24} months</p>
                  <p className="text-[10px] text-muted-foreground">Flexible scheduling</p>
                </div>
              </div>
            </div>
          )}

          {/* Details Tabs */}
          <div className="mt-10">
            <Tabs defaultValue="highlights" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
                <TabsTrigger value="highlights" className="rounded-none border-b-2 border-transparent px-6 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent">Highlights</TabsTrigger>
                <TabsTrigger value="location" className="rounded-none border-b-2 border-transparent px-6 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent">Location</TabsTrigger>
                <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent px-6 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent">Documents</TabsTrigger>
                <TabsTrigger value="how-it-works" className="rounded-none border-b-2 border-transparent px-6 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent">How it works</TabsTrigger>
              </TabsList>
              
              <TabsContent value="highlights" className="mt-8 space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <HighlightItem icon={Star} title="Prime Location" desc="Situated in one of the fastest-growing real estate corridors with high demand." />
                  <HighlightItem icon={Building2} title="Modern Architecture" desc="State-of-the-art design featuring energy-efficient systems and premium finishes." />
                  <HighlightItem icon={ChartLine} title="Value Growth" desc="Estimated value growth of 12-15% annually based on local market trends." />
                  <HighlightItem icon={CheckCircle2} title="Fully Managed" desc="Hassle-free ownership with professional property management handled by our team." />
                </div>
                <div className="rounded-xl bg-accent/50 p-6 border border-border/50">
                  <h4 className="font-serif font-bold text-lg mb-3">Amenities & Features</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4">
                    {["24/7 Smart Security", "Infinity Pool", "Fitness Center", "Co-working Space", "High-speed Fiber", "Backup Power", "Concierge Service", "Rooftop Garden"].map((a) => (
                      <div key={a} className="flex items-center gap-2 text-sm text-foreground/80">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {a}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="location" className="mt-8">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <MapIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold">{data.location}</h4>
                      <p className="text-sm text-muted-foreground">{data.city}, {data.state}, {data.country}</p>
                    </div>
                  </div>
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border bg-accent/50">
                    {/* Placeholder for map */}
                    <div className="absolute inset-0 flex items-center justify-center flex-col text-muted-foreground">
                      <MapIcon className="h-10 w-10 mb-2 opacity-20" />
                      <p className="text-sm font-medium">Interactive Map View</p>
                      <p className="text-xs">Precise coordinates: {data.city}, {data.state}</p>
                    </div>
                    <img 
                      src={`https://api.dicebear.com/7.x/identicon/svg?seed=${data.slug}&backgroundColor=f1f5f9`} 
                      alt="Map" 
                      className="w-full h-full object-cover opacity-10 mix-blend-multiply" 
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="mt-8">
                <div className="grid gap-3">
                  <DocumentLink title="Project Prospectus" size="2.4 MB" date="Oct 2025" />
                  <DocumentLink title="Market Analysis Report" size="1.8 MB" date="Nov 2025" />
                  <DocumentLink title="Financial Projections" size="1.2 MB" date="Jan 2026" />
                  <DocumentLink title="Property Certificate" size="3.5 MB" date="Dec 2025" />
                </div>
              </TabsContent>

              <TabsContent value="how-it-works" className="mt-8">
                <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/50">
                  <StepItem num={1} title="Select Amount" desc="Decide how much you want to invest. Your investment represents a share of the property." />
                  <StepItem num={2} title="Identity Verification" desc="Submit your identity documents for verification to comply with real estate regulations." />
                  <StepItem num={3} title="Secure Investment" desc="Pay via your preferred method. Your units are locked once payment is confirmed." />
                  <StepItem num={4} title="Earn Returns" desc="Receive rental payouts and benefit from property value growth over time." />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* RIGHT — Investment panel */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border/50 bg-card p-6 shadow-card">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium ">
                <Building2 className="h-3 w-3" /> {data.status === "funded" ? "Fully funded" : "Open"}
              </span>
              <span className="text-xs text-muted-foreground">{data.currency}</span>
            </div>
            {(data as any).installment_available && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">Installment plans available</span>
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-4">
              <Stat small label="Total value" value={formatMoney(Number(data.total_value), data.currency)} />
              <Stat small label="Unit price" value={formatMoney(Number(data.unit_price), data.currency)} />
              <Stat small label="Total units" value={data.total_units.toLocaleString()} />
              <Stat small label="Units sold" value={data.units_sold.toLocaleString()} />
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Funded</span>
                <span className="font-medium">{pct}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary text-primary-foreground" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Number of Units</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setUnits(Math.max(currentMinUnits, units - 1))}
                    disabled={units <= currentMinUnits || avail === 0 || data.status !== "open"}
                    className="h-12 w-12 shrink-0 rounded-xl"
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
                    className="h-12 flex-1 rounded-xl border-border bg-accent/50 focus:bg-background transition-all font-bold text-lg text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    className="h-12 w-12 rounded-xl border border-border bg-accent/50 hover:bg-accent flex items-center justify-center text-lg font-bold transition-colors disabled:opacity-40"
                    disabled={units >= maxAllowedUnits || avail === 0 || data.status !== "open"}
                    onClick={() => setUnits(Math.min(maxAllowedUnits, units + 1))}
                  >+</button>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground italic">
                    Unit price: {formatMoney(Number(data.unit_price), data.currency)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {avail.toLocaleString()} units available
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Payment Plan</Label>
                <Select value={investMode} onValueChange={(val: "full" | "installment") => setInvestMode(val)} disabled={avail === 0 || data.status !== "open"}>
                  <SelectTrigger className="h-12 rounded-xl border-border bg-accent/50 focus:bg-background transition-all font-bold text-sm">
                    <SelectValue placeholder="Select payment plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Payment</SelectItem>
                    {(data as any).installment_available && (
                       <SelectItem value="installment">Installment Payment</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {investMode === "installment" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Initial Payment ({currentDownPct}%)</Label>
                      <span className="font-bold text-primary">{formatMoney(downPaymentAmount, data.currency)}</span>
                    </div>
                    <input
                      type="range"
                      min={minDownPct}
                      max={80}
                      step={5}
                      value={currentDownPct}
                      onChange={(e) => setDownPaymentPct(Number(e.target.value))}
                      disabled={avail === 0 || data.status !== "open"}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-secondary"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Min {minDownPct}%</span>
                      <span>80%</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Installment Duration</Label>
                    <Select value={String(durationMonths)} onValueChange={(val) => setDurationMonths(Number(val))} disabled={avail === 0 || data.status !== "open"}>
                      <SelectTrigger className="h-12 rounded-xl border-border bg-accent/50 focus:bg-background transition-all font-bold text-sm">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 Months</SelectItem>
                        <SelectItem value="6">6 Months</SelectItem>
                        <SelectItem value="9">9 Months</SelectItem>
                        <SelectItem value="12">12 Months</SelectItem>
                        {(data as any).max_installment_months >= 18 && <SelectItem value="18">18 Months</SelectItem>}
                        {(data as any).max_installment_months >= 24 && <SelectItem value="24">24 Months</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Live Calculator */}
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Total Investment</span>
                <span className="font-serif font-bold text-lg">{formatMoney(totalAmount, data.currency)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm border-t border-primary/10 pt-3">
                <span className="text-muted-foreground font-medium">Est. Yearly Profit ({data.projected_return_min}–{data.projected_return_max}%)</span>
                <span className="font-bold text-primary">
                  {formatMoney(expectedReturnMin, data.currency)} – {formatMoney(expectedReturnMax, data.currency)}
                </span>
              </div>

              {investMode === "installment" && (
                <>
                  <div className="flex justify-between items-center text-sm border-t border-primary/10 pt-3">
                    <span className="text-muted-foreground font-medium">Initial Payment ({currentDownPct}%)</span>
                    <span className="font-bold text-primary">{formatMoney(downPaymentAmount, data.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-primary/10 pt-3">
                    <span className="text-muted-foreground font-medium">Monthly Installment</span>
                    <span className="font-bold">{formatMoney(monthlyInstallment, data.currency)} / mo</span>
                  </div>
                </>
              )}
            </div>

            <Button
              className={cn(
                "mt-6 w-full text-white shadow-sm h-14 font-semibold text-lg rounded-xl flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]",
                (avail === 0 || data.status !== "open") 
                  ? "bg-muted text-muted-foreground cursor-not-allowed" 
                  : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
              )}
              size="lg"
              disabled={btnLoading || avail === 0 || data.status !== "open"}
              onClick={handleInvest}
            >
              {btnLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Verifying secure gateway...
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  Proceed to Payment
                </>
              )}
            </Button>
            
            <div 
              id="risk-ack-container" 
              className={cn(
                "mt-4 flex items-start gap-3 text-xs text-foreground/85 rounded-xl p-3 border border-transparent transition-all duration-300", 
                showRiskPulse && "border-amber-500/50 bg-amber-500/10 animate-pulse scale-[1.02]"
              )}
            >
              <Checkbox
                id="risk-ack"
                checked={riskAck}
                onCheckedChange={(v) => setRiskAck(v === true)}
                className="mt-0.5"
              />
              <label htmlFor="risk-ack" className="cursor-pointer select-none leading-relaxed">
                I have read and understood the <strong>risk disclosure</strong>, that returns are estimated and not guaranteed,
                and that this investment is long-term for the stated period.
              </label>
            </div>

            {user && !kycApproved && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200/50 bg-amber-500/5 p-4">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">Identity verification is required</p>
                  <p className="text-[10px] text-amber-800/80 mt-0.5">Please complete your verification in your profile before initiating payments.</p>
                </div>
              </div>
            )}

            <Button asChild variant="outline" className="mt-3 w-full h-11 rounded-xl">
              <Link to="/agents">Speak to an advisor</Link>
            </Button>
            <p className="mt-4 text-center text-[10px] leading-relaxed text-muted-foreground">
              Returns are estimates and not guaranteed. Investments are long-term. Please review the full risk disclosure before investing.
            </p>
          </div>
        </aside>
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

      {/* Auth Gate Dialog */}
      <Dialog open={authWarningOpen} onOpenChange={setAuthWarningOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none rounded-2xl bg-background shadow-lux">
          <DialogHeader className="p-8 pb-4 text-center sm:text-center shrink-0">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="h-6 w-6 text-emerald-600" />
            </div>
            <DialogTitle className="text-2xl font-bold font-serif">Investor Access Required</DialogTitle>
            <DialogDescription className="text-muted-foreground mt-2 text-sm">
              To secure fractional ownership units and complete investment payments, you need an active investor account.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="px-8 py-4 text-center">
            <p className="text-xs text-muted-foreground">
              Creating an account takes less than a minute. You can track all investment properties, historical dividends, and fractional certificates directly from your unified dashboard.
            </p>
          </DialogBody>
          <DialogFooter className="p-8 pt-4 bg-accent/20 border-t border-border/40 shrink-0 flex flex-col sm:flex-col gap-3">
            <Button className="w-full h-12 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
              <Link to="/auth">Sign In or Register</Link>
            </Button>
            <Button variant="ghost" className="w-full h-12 text-sm font-semibold rounded-xl" onClick={() => setAuthWarningOpen(false)}>
              Back to Property Overview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KYC Gate Dialog */}
      <Dialog open={kycWarningOpen} onOpenChange={setKycWarningOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none rounded-2xl bg-background shadow-lux">
          <DialogHeader className="p-8 pb-4 text-center sm:text-center shrink-0">
            <div className="h-14 w-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <ShieldCheck className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle className="text-2xl font-bold font-serif">Identity Verification Required</DialogTitle>
            <DialogDescription className="text-muted-foreground mt-2 text-sm">
              To comply with global financial regulations, all fractional investors must complete a quick identity check.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="px-8 py-4 text-center">
            <p className="text-xs text-muted-foreground">
              This verification ensures high compliance and secure funds management. It takes under 2 minutes to upload verification credentials.
            </p>
          </DialogBody>
          <DialogFooter className="p-8 pt-4 bg-accent/20 border-t border-border/40 shrink-0 flex flex-col sm:flex-col gap-3">
            <Button className="w-full h-12 text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white" asChild>
              <Link to="/dashboard?tab=profile" onClick={() => setKycWarningOpen(false)}>
                Verify Identity Now
              </Link>
            </Button>
            <Button variant="ghost" className="w-full h-12 text-sm font-semibold rounded-xl" onClick={() => setKycWarningOpen(false)}>
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
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-serif font-semibold ${small ? "text-base" : "text-lg text-primary"}`}>{value}</p>
    </div>
  );
}

function HighlightItem({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex gap-4 items-start p-4 rounded-xl border border-border/50 bg-card shadow-soft transition-colors hover:border-border">
      <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function DocumentLink({ title, size, date }: { title: string; size: string; date: string }) {
  return (
    <button className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/50 transition-all w-full text-left group">
      <div className="flex items-center gap-4">
        <div className="p-2.5 rounded-lg bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{date} · {size}</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="rounded-lg h-9 w-9">
        <Info className="h-4 w-4 opacity-40" />
      </Button>
    </button>
  );
}

function StepItem({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex gap-6 items-start relative z-10">
      <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm shrink-0">
        {num}
      </div>
      <div className="pt-1">
        <h4 className="font-semibold text-sm">{title}</h4>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}