import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BarChart3, LineChart, ShieldCheck, TrendingUp, Loader2, Upload, Activity, FileText, Trash2, RefreshCw, ArrowUpRight, CheckCircle, ChevronRight, Calendar, Download } from "lucide-react";
import { formatMoney } from "@/lib/invest";
import DOMPurify from "dompurify";

interface AdminManageInvestmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment: any;
}

export function AdminManageInvestmentDialog({ open, onOpenChange, investment }: AdminManageInvestmentDialogProps) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Form states
  const [status, setStatus] = useState(investment?.status || "pending");
  const [unitsOwned, setUnitsOwned] = useState(investment?.units_owned || 0);
  const [amountInvested, setAmountInvested] = useState(investment?.amount_invested || investment?.total_amount || 0);
  const [accruedEarnings, setAccruedEarnings] = useState(investment?.accrued_earnings || 0);
  
  // Dates
  const [startDate, setStartDate] = useState<string>(
    investment?.start_date ? new Date(investment.start_date).toISOString().split('T')[0] : ""
  );
  const [maturityDate, setMaturityDate] = useState<string>(
    investment?.maturity_date ? new Date(investment.maturity_date).toISOString().split('T')[0] : ""
  );

  // Liquidity
  const [secondaryMarket, setSecondaryMarket] = useState(investment?.secondary_market_enabled || false);

  // Document Upload
  const [uploading, setUploading] = useState(false);

  // Reset form when investment changes
  useEffect(() => {
    if (investment) {
      setStatus(investment.status || "pending");
      setUnitsOwned(investment.units_owned || 0);
      setAmountInvested(investment.amount_invested || investment.total_amount || 0);
      setAccruedEarnings(investment.accrued_earnings || 0);
      setStartDate(investment.start_date ? new Date(investment.start_date).toISOString().split('T')[0] : "");
      setMaturityDate(investment.maturity_date ? new Date(investment.maturity_date).toISOString().split('T')[0] : "");
      setSecondaryMarket(investment.secondary_market_enabled || false);
    }
  }, [investment]);

  // Fetch existing documents for this investment
  const { data: investmentDocs = [], refetch: refetchDocs } = useQuery({
    queryKey: ["admin-investment-docs", investment?.id],
    queryFn: async () => {
      if (!investment?.id) return [];
      const { data, error } = await supabase
        .from("signed_documents")
        .select("*")
        .eq("reference_id", investment.id)
        .order("signed_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!investment?.id && open
  });

  // Fetch auto-generated lifecycle documents
  const { data: lifecycleDocs = [], refetch: refetchLifecycleDocs } = useQuery({
    queryKey: ["admin-investment-lifecycle-docs", investment?.id],
    queryFn: async () => {
      if (!investment?.id) return [];
      const { data, error } = await supabase
        .from("user_documents")
        .select("*")
        .eq("user_id", investment.user_id);
      if (error) return [];
      return (data || []).filter((doc: any) => doc.metadata?.investment_id === investment.id);
    },
    enabled: !!investment?.id && open
  });

  // Operations states
  const [extensionMonths, setExtensionMonths] = useState(6);
  const [extending, setExtending] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const handleExtendTerm = async () => {
    try {
      setExtending(true);
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) throw new Error("Not logged in");

      const { error } = await supabase.rpc("extend_investment_term", {
        p_investment_id: investment.id,
        p_extension_months: Number(extensionMonths),
        p_admin_id: adminUser.id
      });
      if (error) throw error;
      toast({ title: "Term Extended", description: `Term successfully extended by ${extensionMonths} months.` });
      qc.invalidateQueries({ queryKey: ["admin-investments"] });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Extension Failed", description: err.message, variant: "destructive" });
    } finally {
      setExtending(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm("Archive this investment? This will prevent further updates.")) return;
    try {
      setArchiving(true);
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) throw new Error("Not logged in");

      const { error } = await supabase.rpc("archive_investment", {
        p_investment_id: investment.id,
        p_admin_id: adminUser.id
      });
      if (error) throw error;
      toast({ title: "Investment Archived" });
      qc.invalidateQueries({ queryKey: ["admin-investments"] });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Archive Failed", description: err.message, variant: "destructive" });
    } finally {
      setArchiving(false);
    }
  };

  // Fetch audit logs for this investment
  const { data: auditLogs = [] } = useQuery({
    queryKey: ["admin-investment-audit", investment?.id],
    queryFn: async () => {
      if (!investment?.id) return [];
      const { data, error } = await supabase
        .from("portfolio_audit_logs")
        .select("*")
        .eq("investment_id", investment.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) return [];
      return data || [];
    },
    enabled: !!investment?.id && open
  });

  const { mutate: handleSave, isPending } = useMutation({
    mutationFn: async () => {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) throw new Error("Not logged in");

      // If accrued earnings changed, let's call the RPC edit_investment_roi_parameters
      if (Number(accruedEarnings) !== Number(investment.accrued_earnings)) {
        const { error: rpcErr } = await supabase.rpc("edit_investment_roi_parameters", {
          p_investment_id: investment.id,
          p_accrued_earnings: Number(accruedEarnings),
          p_admin_id: adminUser.id
        });
        if (rpcErr) throw rpcErr;
      }

      // Generate documents if status changed to active/roi_active
      const isActivating = (status === 'roi_active' || status === 'active') && 
                            !['active', 'roi_active'].includes(investment.status);
      const isMaturing = (status === 'matured' || status === 'completed') && 
                           !['matured', 'completed'].includes(investment.status);

      if (isActivating) {
        await Promise.all([
          supabase.rpc("create_automated_document", { p_user_id: investment.user_id, p_document_type: "investment_activation_certificate", p_investment_id: investment.id }),
          supabase.rpc("create_automated_document", { p_user_id: investment.user_id, p_document_type: "roi_commencement_notice", p_investment_id: investment.id }),
          supabase.rpc("create_automated_document", { p_user_id: investment.user_id, p_document_type: "investment_summary_report", p_investment_id: investment.id })
        ]);
      }

      if (isMaturing) {
        await Promise.all([
          supabase.rpc("create_automated_document", { p_user_id: investment.user_id, p_document_type: "investment_completion_report", p_investment_id: investment.id }),
          supabase.rpc("create_automated_document", { p_user_id: investment.user_id, p_document_type: "final_roi_statement", p_investment_id: investment.id }),
          supabase.rpc("create_automated_document", { p_user_id: investment.user_id, p_document_type: "investment_maturity_certificate", p_investment_id: investment.id })
        ]);
      }

      const payload = {
        status,
        units_owned: Number(unitsOwned),
        amount_invested: Number(amountInvested),
        total_amount: Number(amountInvested),
        start_date: startDate ? new Date(startDate).toISOString() : null,
        maturity_date: maturityDate ? new Date(maturityDate).toISOString() : null,
        secondary_market_enabled: secondaryMarket,
      };

      const { error } = await supabase
        .from("user_investments")
        .update(payload)
        .eq("id", investment.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-investments"] });
      qc.invalidateQueries({ queryKey: ["admin-investment-orders"] });
      qc.invalidateQueries({ queryKey: ["portfolio-detail-enriched", investment.id] });
      toast({ title: "Investment Updated", description: "All changes have been saved." });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string = 'certificate') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `certificates/${investment.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('investment_documents')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('investment_documents')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('signed_documents')
        .insert({
          user_id: investment.user_id,
          document_type: docType,
          reference_id: investment.id,
          signature_data: publicUrl,
          document_snapshot: `Document uploaded by admin on ${new Date().toLocaleDateString()}`
        });

      if (dbError) throw dbError;

      toast({ title: "Document Uploaded", description: "The document is now visible to the investor." });
      refetchDocs();
      qc.invalidateQueries({ queryKey: ["portfolio-documents", investment.id] });
      
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message || "Ensure the 'investment_documents' bucket exists.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    const { error } = await supabase.from("signed_documents").delete().eq("id", docId);
    if (error) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Document Deleted" });
      refetchDocs();
    }
  };

  if (!investment) return null;

  const totalInv = Number(investment.total_amount ?? investment.amount_invested ?? 0);
  const currentValue = totalInv + Number(investment.accrued_earnings || 0);
  const currency = investment.investment_properties?.currency || 'USD';
  const propTitle = investment.investment_properties?.title || 'Unknown Property';
  const investorName = investment.profiles?.full_name || 'Unknown';
  const investorEmail = investment.profiles?.email || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Manage Investment</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-primary">{investment.id.split('-')[0]}</span>
            <span className="mx-2">·</span>
            {investorName}
            <span className="mx-2">·</span>
            {propTitle}
          </DialogDescription>
        </DialogHeader>

        {/* Quick Status Banner */}
        <div className="flex flex-wrap items-center gap-2 py-2">
          <Badge variant={investment.status === 'active' || investment.status === 'confirmed' ? 'default' : investment.status === 'rejected' ? 'destructive' : 'secondary'} className="uppercase text-[10px]">
            {investment.status?.replace(/_/g, ' ')}
          </Badge>
          <Badge variant="outline" className="uppercase text-[10px]">
            {investment.investment_type || 'full'}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto font-mono">
            {formatMoney(totalInv, currency)} · {investment.units_owned} units
          </span>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid grid-cols-5 bg-muted/50 w-full rounded-xl">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs"><BarChart3 className="w-3.5 h-3.5" /> Overview</TabsTrigger>
            <TabsTrigger value="journey" className="flex items-center gap-1.5 text-xs"><LineChart className="w-3.5 h-3.5" /> Journey</TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-1.5 text-xs"><ShieldCheck className="w-3.5 h-3.5" /> Docs</TabsTrigger>
            <TabsTrigger value="liquidity" className="flex items-center gap-1.5 text-xs"><TrendingUp className="w-3.5 h-3.5" /> Liquidity</TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-1.5 text-xs"><Activity className="w-3.5 h-3.5" /> Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 pt-6">
            {/* Read-only computed metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/30 rounded-xl p-3 border border-border/50 text-center">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Current Value</p>
                <p className="text-sm font-bold font-serif text-foreground">{formatMoney(currentValue, currency)}</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 border border-border/50 text-center">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Ownership</p>
                <p className="text-sm font-bold font-serif text-foreground">
                  {((investment.units_owned / (investment.investment_properties?.total_units || 1)) * 100).toFixed(2)}%
                </p>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 border border-border/50 text-center">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">ROI</p>
                <p className="text-sm font-bold font-serif text-green-600">
                  {totalInv > 0 ? ((Number(investment.accrued_earnings || 0) / totalInv) * 100).toFixed(1) : '0'}%
                </p>
              </div>
            </div>

            {/* Editable fields */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Amount Invested ({currency})</Label>
                <Input 
                  type="number" 
                  value={amountInvested} 
                  onChange={(e) => setAmountInvested(Number(e.target.value))} 
                />
              </div>
              <div className="space-y-2">
                <Label>Units Owned</Label>
                <Input 
                  type="number" 
                  value={unitsOwned} 
                  onChange={(e) => setUnitsOwned(Number(e.target.value))} 
                />
              </div>
              <div className="space-y-2 col-span-2 pt-6 mt-6 border-t border-destructive/25">
                <Label className="text-destructive font-bold">Danger Zone</Label>
                <div className="flex items-center justify-between p-4 bg-destructive/5 border border-destructive/25 rounded-xl mt-1">
                  <div>
                    <h5 className="text-sm font-semibold text-destructive">Archive Investment</h5>
                    <p className="text-xs text-muted-foreground">Locks and archives the investment record once completed.</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={handleArchive} disabled={archiving}>
                    {archiving ? "Archiving..." : "Archive Investment"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="journey" className="space-y-6 pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Investment Lifecycle Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="payment_under_review">Payment Under Review</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="preparing_for_roi">Preparing for ROI</SelectItem>
                    <SelectItem value="roi_active">ROI Active</SelectItem>
                    <SelectItem value="roi_paused">ROI Paused</SelectItem>
                    <SelectItem value="matured">Matured</SelectItem>
                    <SelectItem value="active">Active (ROI Accruing)</SelectItem>
                    <SelectItem value="completed">Completed (Matured)</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                  />
                  <p className="text-xs text-muted-foreground mt-1">When ROI tracking begins.</p>
                </div>
                <div className="space-y-2">
                  <Label>Maturity Date</Label>
                  <Input 
                    type="date" 
                    value={maturityDate} 
                    onChange={(e) => setMaturityDate(e.target.value)} 
                  />
                  <p className="text-xs text-muted-foreground mt-1">Controls maturity progress bar.</p>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-border/50">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Lifecycle Term Extension</h4>
                <div className="flex items-end gap-4 p-4 bg-secondary/10 rounded-xl border">
                  <div className="flex-1 space-y-2">
                    <Label>Extend Holding Period (Months)</Label>
                    <Input 
                      type="number" 
                      value={extensionMonths} 
                      onChange={(e) => setExtensionMonths(Number(e.target.value))} 
                      className="bg-background"
                    />
                  </div>
                  <Button onClick={handleExtendTerm} disabled={extending} className="shrink-0 font-bold">
                    {extending ? "Extending..." : "Extend Term"}
                  </Button>
                </div>
              </div>

              {/* Read-only date references */}
              <div className="border-t border-border/50 pt-4 space-y-3">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">System Dates (Read-only)</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approved At</span>
                    <span className="font-mono text-xs">{investment.approved_at ? new Date(investment.approved_at).toLocaleDateString() : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Activated At</span>
                    <span className="font-mono text-xs">{investment.activated_at ? new Date(investment.activated_at).toLocaleDateString() : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-mono text-xs">{new Date(investment.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span className="font-mono text-xs">{new Date(investment.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6 pt-6">
            {/* Auto-Generated Lifecycle Documents */}
            {lifecycleDocs.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Auto-Generated Lifecycle Documents</h4>
                <div className="space-y-2.5">
                  {lifecycleDocs.map((doc: any) => {
                    const docRef = doc.metadata?.reference_id || doc.verification_code;
                    return (
                      <div key={doc.id} className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-purple-600" />
                            <div>
                              <p className="text-sm font-semibold">{doc.name || doc.document_type?.replace(/_/g, ' ')}</p>
                              <p className="text-[10px] text-muted-foreground">Generated: {new Date(doc.created_at).toLocaleDateString()} {docRef && `· Ref: ${docRef}`}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="border-green-500/30 text-green-600 bg-green-50 font-bold uppercase tracking-wider text-[9px] px-2 py-0.5">
                            Available
                          </Badge>
                        </div>
                        {doc.metadata?.document_snapshot && (
                          <details className="mt-2 group">
                            <summary className="cursor-pointer text-xs font-semibold text-purple-600 hover:underline flex items-center gap-1 select-none">
                              <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
                              View Document Content
                            </summary>
                            <div className="mt-2 border border-border/50 rounded-lg p-4 bg-white dark:bg-background prose prose-sm dark:prose-invert max-h-[300px] overflow-y-auto text-[11px] leading-relaxed">
                              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(doc.metadata.document_snapshot) }} />
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Existing Documents */}
            {investmentDocs.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Uploaded Documents</h4>
                {investmentDocs.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium capitalize">{doc.document_type?.replace(/_/g, ' ')}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(doc.signed_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {doc.signature_data && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                          <a href={doc.signature_data} target="_blank" rel="noopener noreferrer">View</a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="h-7 text-xs text-destructive hover:bg-destructive hover:text-white" onClick={() => handleDeleteDoc(doc.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Area */}
            <div className="border-2 border-dashed border-border/60 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:bg-muted/30 transition-colors">
              <Upload className="w-10 h-10 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Upload Document</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Upload a PDF or image. This will appear in the investor's Document Hub.
              </p>
              
              <div className="relative">
                <Button disabled={uploading}>
                  {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {uploading ? "Uploading..." : "Select File"}
                </Button>
                <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  accept="application/pdf,image/*"
                  onChange={(e) => handleFileUpload(e)}
                  disabled={uploading}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="liquidity" className="space-y-6 pt-6">
            <div className="bg-muted/30 border border-border/50 rounded-xl p-6 flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-foreground mb-1">Enable Secondary Market</h4>
                <p className="text-sm text-muted-foreground max-w-md">
                  Allow the investor to list units for sale on the marketplace. If disabled, their position is locked.
                </p>
              </div>
              <Switch 
                checked={secondaryMarket} 
                onCheckedChange={setSecondaryMarket} 
              />
            </div>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4 pt-6">
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Change History</h4>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No audit entries yet.</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="flex gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      log.action_type === 'status_change' ? 'bg-blue-500/10 text-blue-600' :
                      log.action_type === 'create' ? 'bg-green-500/10 text-green-600' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {log.action_type === 'status_change' ? <ArrowUpRight className="w-3 h-3" /> :
                       log.action_type === 'create' ? <CheckCircle className="w-3 h-3" /> :
                       <RefreshCw className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground capitalize">
                        {log.action_type.replace(/_/g, ' ')}
                        {log.field_changed && <span className="text-muted-foreground font-normal"> — {log.field_changed}</span>}
                      </p>
                      {log.old_value && log.new_value && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          <span className="line-through text-red-500/60">{log.old_value}</span>
                          <ChevronRight className="w-2.5 h-2.5 inline mx-0.5" />
                          <span className="text-green-600">{log.new_value}</span>
                        </p>
                      )}
                      <p className="text-[9px] font-mono text-muted-foreground mt-1">
                        {new Date(log.created_at).toLocaleString()}
                        {log.admin_id && <span className="ml-1 text-amber-600">• Admin</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-border/50">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => handleSave()} disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
