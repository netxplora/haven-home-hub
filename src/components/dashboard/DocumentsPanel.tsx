import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Download,
  ExternalLink,
  Clock,
  Folder,
  RefreshCw,
  Send,
  Eye,
  Mail,
  XCircle,
  FileCheck2,
  Calendar
} from "lucide-react";
import { ESignatureModal } from "@/components/site/ESignatureModal";
import { ReceiptDialog } from "@/components/dashboard/ReceiptDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/invest";

export function DocumentsPanel({ userId }: { userId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"legal" | "property" | "investment" | "transaction">("legal");
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<any>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [requestingDoc, setRequestingDoc] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedRequestTypes, setSelectedRequestTypes] = useState<string[]>([]);

  // Preview Document Modal
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  // 1. Legal Documents (Signed Docs)
  const { data: signedDocs = [], isLoading: isLoadingSigned } = useQuery({
    queryKey: ["signed-docs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signed_documents" as any)
        .select("*, document_templates(name)")
        .eq("user_id", userId)
        .order("signed_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: requiredDocs = [], isLoading: isLoadingReq } = useQuery({
    queryKey: ["required-docs", userId],
    queryFn: async () => {
      const hasSignedInvestment = signedDocs.some((d: any) => d.document_type === "investment_agreement");
      const hasSignedKyc = signedDocs.some((d: any) => d.document_type === "kyc_declaration");

      const req = [];
      if (!hasSignedInvestment) req.push({ type: "investment_agreement", name: "Standard Investment Agreement" });
      if (!hasSignedKyc) req.push({ type: "kyc_declaration", name: "KYC Terms & Declaration" });
      return req;
    },
    enabled: !isLoadingSigned,
  });

  // 2. Property & Ownership Documents (Including dynamic ones)
  const { data: propertyDocs = [], isLoading: isLoadingPropertyDocs, refetch: refetchPropertyDocs } = useQuery({
    queryKey: ["user-documents", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_documents")
        .select(`
          *,
          investment_properties(title, location),
          properties(title, address)
        `)
        .eq("user_id", userId)
        .neq("status", "deleted") // Exclude deleted documents
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Search & Filtering State
  const [docSearch, setDocSearch] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState("none");

  // Fetch user's portfolio assets for the document request dropdown
  const { data: portfolioAssets = [] } = useQuery({
    queryKey: ["portfolio-assets", userId],
    queryFn: async () => {
      // Fetch only verified investments and standard properties from fully completed payments
      const [invs, paymentsResponse] = await Promise.all([
        supabase.from("user_investments" as any)
          .select("investment_property_id, investment_properties(title)")
          .eq("user_id", userId)
          .in("status", ["active", "completed", "verified"]),
        supabase.from("payments" as any)
          .select("property_id, investment_property_id, properties(title), investment_properties(title)")
          .eq("user_id", userId)
          .eq("status", "success")
      ]);
      
      const merged = [
        ...(invs.data || []).map((i: any) => ({
          id: i.investment_property_id,
          title: i.investment_properties?.title || "Unknown Asset",
          type: "investment"
        })),
        ...(paymentsResponse.data || [])
          .filter((p: any) => p.property_id)
          .map((p: any) => ({
            id: p.property_id,
            title: p.properties?.title || "Unknown Asset",
            type: "property"
          })),
        ...(paymentsResponse.data || [])
          .filter((p: any) => p.investment_property_id)
          .map((p: any) => ({
            id: p.investment_property_id,
            title: p.investment_properties?.title || "Unknown Asset",
            type: "investment"
          }))
      ];

      
      // Deduplicate by ID
      const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
      return unique;
    },
  });

  // 3. Investment Certificates
  const { data: certificates = [], isLoading: isLoadingCertificates } = useQuery({
    queryKey: ["investment-certificates", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investment_certificates" as any)
        .select("*, investment_properties(title)")
        .eq("user_id", userId)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // 4. Transaction Receipts
  const { data: receipts = [], isLoading: isLoadingReceipts } = useQuery({
    queryKey: ["user-receipts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipts" as any)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const handleDownloadDoc = async (doc: any) => {
    if (doc.file_path.startsWith('generated://')) {
      // Generated document: open printable window
      window.open(`/print-document/${doc.id}`, '_blank');
      return;
    }

    try {
      toast.info("Requesting secure download link...");
      const { data, error } = await supabase.storage
        .from("user-documents")
        .createSignedUrl(doc.file_path, 60);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (err: any) {
      console.error(err);
      toast.error("Could not generate a secure download link.");
    }
  };

  const handleResendDoc = (doc: any) => {
    setSendingEmailId(doc.id);
    setTimeout(async () => {
      await supabase.from("user_documents").update({ status: 'delivered' }).eq("id", doc.id);
      setSendingEmailId(null);
      toast.success(`A secure copy of "${doc.name}" has been sent to your registered email address.`);
      refetchPropertyDocs();
    }, 1500);
  };

  const handleDeleteDoc = async (doc: any) => {
    if (!confirm("CRITICAL WARNING: This action will permanently delete this document and its file. It cannot be easily undone. Are you absolutely sure?")) return;

    toast.loading("Permanently deleting document...");
    try {
      // 1. If it's a physical file in storage, remove it completely.
      if (!doc.file_path.startsWith('generated://')) {
        await supabase.storage.from("user-documents").remove([doc.file_path]);
      }

      // 2. Call the secure RPC to soft-delete the DB record and generate an audit log
      const { error } = await supabase.rpc('investor_delete_document', { p_document_id: doc.id });
      if (error) throw error;

      toast.dismiss();
      toast.success("Document permanently deleted from your dashboard.");
      refetchPropertyDocs();
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || "Failed to delete document.");
    }
  };

  const handleRequestDocument = async () => {
    if (selectedRequestTypes.length === 0) {
      toast.error("Please select at least one document type.");
      return;
    }

    // Find the selected asset from the portfolio array
    const asset = portfolioAssets.find(a => a.id === selectedPropertyId);
    if (!asset) {
      toast.error("Invalid property selection.");
      return;
    }

    setRequestingDoc(true);
    try {
      const { error } = await supabase.from("document_requests").insert({
        user_id: userId,
        requested_documents: selectedRequestTypes,
        status: "pending",
        property_id: asset.type === 'property' ? asset.id : null,
        investment_property_id: asset.type === 'investment' ? asset.id : null
      });
      if (error) throw error;
      toast.success("Document request submitted. Our team will verify and generate them shortly.");
      setRequestModalOpen(false);
      setSelectedRequestTypes([]);
      setSelectedPropertyId("none");
      qc.invalidateQueries({ queryKey: ["admin-document-requests"] }); // if admin is also logged in
    } catch (error: any) {
      toast.error(error.message || "Failed to submit request.");
    } finally {
      setRequestingDoc(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return "bg-primary/ text-primary border-primary/";
      case 'available':
      case 'delivered': return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      case 'pending':
      case 'processing': return "bg-amber-500/10 text-amber-700 border-amber-500/20";
      case 'revoked': return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-secondary text-muted-foreground";
    }
  };

  const tabs = [
    { id: "legal", label: "Legal Agreements" },
    { id: "property", label: "Ownership Deeds" },
    { id: "investment", label: "Investment Certificates" },
    { id: "transaction", label: "Transaction Receipts" },
  ] as const;

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="flex overflow-x-auto pb-2 border-b border-border/50 gap-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "pb-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors duration-200",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {/* =========================================
            LEGAL AGREEMENTS TAB
           ========================================= */}
        {activeTab === "legal" && (
          <div className="space-y-8 animate-in fade-in">
            {(isLoadingSigned || isLoadingReq) ? (
              <Skeleton className="h-64 rounded-2xl" />
            ) : (
              <>
                <div>
                  <h3 className="font-serif text-xl font-bold mb-4">Pending Signature</h3>
                  {requiredDocs.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-card p-8 flex flex-col items-center justify-center text-center shadow-soft">
                      <CheckCircle2 className="h-10 w-10 text-primary mb-3" />
                      <p className="font-bold text-slate-800">All caught up!</p>
                      <p className="text-sm text-muted-foreground mt-1">You have no pending documents to sign.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {requiredDocs.map((doc: any) => (
                        <div key={doc.type} className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-2xl border border-destructive/20 bg-destructive/5 gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                              <AlertCircle className="h-5 w-5 text-destructive" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{doc.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Please review and sign this agreement to fully authorize your investments.</p>
                            </div>
                          </div>
                          <Button
                            onClick={() => { setSelectedDocType(doc.type); setSignModalOpen(true); }}
                            className="w-full sm:w-auto rounded-xl bg-primary hover:bg-primary text-white font-bold"
                          >
                            Review & Sign
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-serif text-xl font-bold mb-4">Signed Agreements</h3>
                  {signedDocs.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card shadow-soft">
                      <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No documents signed yet.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {signedDocs.map((doc: any) => (
                        <div key={doc.id} className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-2xl border border-border/40 bg-card gap-4 shadow-soft">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{doc.document_templates?.name || "Document"}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Signed on {new Date(doc.signed_at).toLocaleString()}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-primary/ text-primary border-primary/ shrink-0 font-bold">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Legally Binding
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* =========================================
            PROPERTY OWNERSHIP TAB
           ========================================= */}
        {activeTab === "property" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
              <div>
                <h3 className="font-serif text-xl font-bold">Ownership Records</h3>
                <p className="text-sm text-muted-foreground">Title Insurance, Grant Deeds, and survey documentation.</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search documents..."
                  className="flex h-10 w-full sm:w-[250px] rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                />
                <Button onClick={() => setRequestModalOpen(true)} disabled={requestingDoc} variant="outline" className="rounded-xl font-bold">
                  {requestingDoc ? "Sending..." : <><Send className="h-4 w-4 mr-2" /> Request Documentation</>}
                </Button>
              </div>
            </div>

            {isLoadingPropertyDocs ? (
              <Skeleton className="h-64 rounded-2xl" />
            ) : propertyDocs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center flex flex-col items-center bg-card shadow-soft">
                <Folder className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="font-bold text-slate-800">No Deeds Generated Yet</p>
                <p className="text-sm text-muted-foreground max-w-sm mt-1 leading-relaxed">
                  Your dynamic legal documents are auto-generated when your payment checks clear.
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {propertyDocs
                  .filter((d: any) =>
                    d.name.toLowerCase().includes(docSearch.toLowerCase()) ||
                    (d.investment_properties?.title || "").toLowerCase().includes(docSearch.toLowerCase()) ||
                    (d.properties?.title || "").toLowerCase().includes(docSearch.toLowerCase())
                  )
                  .map((doc: any) => {
                    const docRef = doc.metadata?.reference_id || doc.id.split('-')[0].toUpperCase();
                    const isReady = doc.status !== 'pending' && doc.status !== 'processing';
                    const isRevoked = doc.status === 'revoked';

                    return (
                      <div key={doc.id} className="p-6 rounded-2xl border border-border/40 bg-card flex flex-col space-y-4 hover:border-primary/20 transition-all shadow-soft group">

                        {/* Document details header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div className="flex gap-4">
                            <div className={cn(
                              "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                              isRevoked ? "bg-red-50 text-red-500 border border-red-100" : "bg-primary/5 text-primary"
                            )}>
                              <FileText className="h-6 w-6" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 leading-snug">{doc.name}</h4>
                              <p className="text-xs text-muted-foreground font-medium mt-1">
                                Asset: {doc.investment_properties?.title || doc.properties?.title || "Property Unit"}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono mt-1">Reference: {docRef}</p>
                            </div>
                          </div>

                          <div className="flex flex-col sm:items-end gap-1 shrink-0">
                            <Badge variant="outline" className={cn("font-bold text-xs capitalize", getStatusColor(doc.status))}>
                              {doc.status}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-medium mt-1">Generated: {new Date(doc.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Timeline System */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100/80">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Document Timeline Tracking</p>
                          <div className="flex items-center justify-between relative max-w-lg">
                            {/* Stepper line */}
                            <div className="absolute top-[9px] left-3 right-3 h-[2px] bg-slate-200 -z-0" />

                            <div className="flex flex-col items-center relative z-10">
                              <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white", isRevoked ? "bg-destructive" : "bg-primary")}>
                                {isRevoked ? "✕" : "✓"}
                              </div>
                              <span className="text-[10px] font-bold text-slate-700 mt-1">Generated</span>
                            </div>

                            <div className="flex flex-col items-center relative z-10">
                              <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                                doc.status === 'pending' || doc.status === 'processing'
                                  ? "bg-slate-200 text-slate-400"
                                  : isRevoked ? "bg-destructive text-white" : "bg-primary text-white"
                              )}>
                                {doc.status === 'pending' || doc.status === 'processing' ? "2" : "✓"}
                              </div>
                              <span className="text-[10px] font-bold text-slate-700 mt-1">Approved</span>
                            </div>

                            <div className="flex flex-col items-center relative z-10">
                              <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                                ['verified', 'delivered'].includes(doc.status) && !isRevoked
                                  ? "bg-primary text-white"
                                  : isRevoked ? "bg-destructive text-white" : "bg-slate-200 text-slate-400"
                              )}>
                                {['verified', 'delivered'].includes(doc.status) && !isRevoked ? "✓" : "3"}
                              </div>
                              <span className="text-[10px] font-bold text-slate-700 mt-1">Delivered</span>
                            </div>

                            <div className="flex flex-col items-center relative z-10">
                              <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                                doc.status === 'verified' && !isRevoked
                                  ? "bg-primary text-white"
                                  : isRevoked ? "bg-destructive text-white" : "bg-slate-200 text-slate-400"
                              )}>
                                {doc.status === 'verified' && !isRevoked ? "✓" : "4"}
                              </div>
                              <span className="text-[10px] font-bold text-slate-700 mt-1">Verified</span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Buttons */}
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/30">
                          {isReady && !isRevoked && doc.file_path.startsWith('generated://') && (
                            <Button
                              onClick={() => {
                                setPreviewDoc(doc);
                                setPreviewOpen(true);
                              }}
                              variant="ghost"
                              size="sm"
                              className="rounded-lg font-bold text-xs"
                            >
                              <Eye className="h-4 w-4 mr-2" /> Live Preview
                            </Button>
                          )}
                          <Button
                            onClick={() => handleDownloadDoc(doc)}
                            variant="outline"
                            size="sm"
                            disabled={!isReady}
                            className="rounded-lg font-bold text-xs shrink-0 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all"
                          >
                            <Download className="h-4 w-4 mr-2" /> {doc.file_path.startsWith('generated://') ? 'View / Print PDF' : 'Download Securely'}
                          </Button>
                          <Button
                            onClick={() => handleResendDoc(doc)}
                            variant="secondary"
                            size="sm"
                            disabled={!isReady || isRevoked || sendingEmailId === doc.id}
                            className="rounded-lg font-bold text-xs bg-secondary/60 hover:bg-secondary shrink-0"
                          >
                            {sendingEmailId === doc.id ? (
                              <><RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" /> Dispatching...</>
                            ) : (
                              <><Mail className="h-3.5 w-3.5 mr-2" /> Send Email Link</>
                            )}
                          </Button>
                          <Button
                            onClick={() => handleDeleteDoc(doc)}
                            variant="destructive"
                            size="sm"
                            className="rounded-lg font-bold text-xs shrink-0"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-2" /> Delete Permanently
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* =========================================
            INVESTMENT CERTIFICATES TAB
           ========================================= */}
        {activeTab === "investment" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-serif text-xl font-bold">Investments & Shares Certificates</h3>
              <p className="text-sm text-muted-foreground">Certified unit shareholdings.</p>
            </div>
            {isLoadingCertificates ? (
              <Skeleton className="h-64 rounded-2xl" />
            ) : certificates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center flex flex-col items-center bg-card shadow-soft">
                <ShieldCheck className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="font-bold text-slate-800">No Certificates Issued</p>
                <p className="text-sm text-muted-foreground max-w-sm mt-1 leading-relaxed">
                  Certificates are cryptographically verified upon the validation of investment transactions.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {certificates.map((cert: any) => (
                  <div key={cert.id} className="p-5 rounded-2xl border border-primary/ bg-primary/ hover:border-primary/ transition-all flex flex-col h-full justify-between shadow-sm">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="h-10 w-10 rounded-full bg-primary/ flex items-center justify-center">
                          <ShieldCheck className="h-5 w-5 text-primary" />
                        </div>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary font-bold">Verified</Badge>
                      </div>
                      <h4 className="font-bold text-lg leading-tight mb-1">{cert.investment_properties?.title || "Property Asset"}</h4>
                      <p className="text-xs text-muted-foreground mb-4">Certificate ID: <span className="font-mono text-xs">{cert.certificate_number}</span></p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
                        <div className="bg-background rounded-lg p-3 border border-border/50">
                          <p className="text-[10px] uppercase text-muted-foreground font-bold mb-1">Units Owned</p>
                          <p className="font-semibold">{cert.units_owned}</p>
                        </div>
                        <div className="bg-background rounded-lg p-3 border border-border/50">
                          <p className="text-[10px] uppercase text-muted-foreground font-bold mb-1">Invested</p>
                          <p className="font-semibold">{formatMoney(cert.amount_invested, cert.currency)}</p>
                        </div>
                      </div>
                    </div>

                    <Button
                      className="w-full bg-primary hover:bg-primary text-white rounded-xl font-bold"
                      onClick={() => window.open(`/certificate/${cert.id}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" /> View Certificate
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================
            TRANSACTION RECEIPTS TAB
           ========================================= */}
        {activeTab === "transaction" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-serif text-xl font-bold">Verified Receipts</h3>
            </div>
            {isLoadingReceipts ? (
              <Skeleton className="h-64 rounded-2xl" />
            ) : receipts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center flex flex-col items-center bg-card shadow-soft">
                <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="font-bold text-slate-800">No Receipts Found</p>
                <p className="text-sm text-muted-foreground mt-1">Transaction receipts appear here immediately after payment processing.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {receipts.map((receipt: any) => (
                  <div key={receipt.id} className="p-4 rounded-xl border border-border/40 bg-card flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-primary/30 transition-all cursor-pointer shadow-soft" onClick={() => {
                    setSelectedReceipt(receipt);
                    setReceiptModalOpen(true);
                  }}>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold truncate text-slate-800">{receipt.metadata?.property_title || receipt.type}</p>
                          <Badge variant="secondary" className="text-[10px] uppercase font-bold">{receipt.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-1">REC: {receipt.receipt_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-0 border-border/50 pt-3 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <p className="font-serif font-bold text-primary">{formatMoney(receipt.amount_paid, receipt.currency)}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{new Date(receipt.created_at).toLocaleDateString()}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-primary">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedDocType && (
        <ESignatureModal
          open={signModalOpen}
          onOpenChange={setSignModalOpen}
          documentType={selectedDocType}
        />
      )}

      {selectedReceipt && (
        <ReceiptDialog
          open={receiptModalOpen}
          onClose={() => {
            setReceiptModalOpen(false);
            setTimeout(() => setSelectedReceipt(null), 300);
          }}
          receipt={selectedReceipt}
        />
      )}

      {/* MODAL: Inline Document Preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border-border/40">
          <DialogHeader className="border-b border-border/40 pb-4">
            <div className="flex justify-between items-center pr-6">
              <div>
                <DialogTitle className="font-serif text-lg">{previewDoc?.name}</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Reference ID: {previewDoc?.metadata?.reference_id || previewDoc?.id.split('-')[0].toUpperCase()}</p>
              </div>
              <Button
                onClick={() => window.open(`/print-document/${previewDoc?.id}`, '_blank')}
                className="bg-primary hover:bg-primary text-white rounded-lg font-bold"
              >
                <Eye className="h-4 w-4 mr-2" /> Open Printable View
              </Button>
            </div>
          </DialogHeader>
          <DialogBody className="py-6 relative">
            <div className="bg-white p-10 sm:p-14 rounded-none border-2 border-slate-200 shadow-md min-h-[600px] relative overflow-hidden">
              {/* Background Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0">
                <ShieldCheck className="w-[400px] h-[400px]" />
              </div>

              {/* Document Content */}
              <div className="relative z-10">
                {/* Header */}
                <div className="flex justify-between items-start border-b-[3px] border-double border-slate-800 pb-4 mb-8">
                  <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Haven Home Hub" className="h-8 w-auto" />
                    <div>
                      <p className="text-[8px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">Certified Legal Documentation</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">REF: {previewDoc?.metadata?.reference_id || previewDoc?.id?.split('-')[0].toUpperCase()}</p>
                  </div>
                </div>

                <div
                  className="prose max-w-none text-slate-800 font-serif text-sm leading-loose text-justify prose-headings:font-serif prose-headings:uppercase prose-headings:tracking-widest prose-h2:text-xl prose-h2:font-black prose-h2:text-center prose-h2:border-b prose-h2:border-slate-200 prose-h2:pb-4 prose-h2:mb-8 prose-h3:text-md prose-h3:font-bold prose-h3:mt-8 prose-h3:mb-3 prose-p:mb-4 prose-ul:list-disc prose-ul:pl-6 prose-li:pl-2 prose-strong:font-bold prose-strong:text-slate-900"
                  dangerouslySetInnerHTML={{ __html: previewDoc?.metadata?.document_snapshot || "" }}
                />
              </div>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
      {/* Document Request Modal */}
      <Dialog open={requestModalOpen} onOpenChange={setRequestModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Request Documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Select Property / Asset</label>
              <select
                className="w-full flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
              >
                <option value="none" disabled>Select an asset...</option>
                {portfolioAssets.map((asset: any) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.title} ({asset.type === 'investment' ? 'Fractional' : 'Full Ownership'})
                  </option>
                ))}
              </select>
            </div>

            <p className="text-sm text-muted-foreground mt-4">Select the official documents you are requesting:</p>
            <div className="space-y-2">
              {[
                { id: "contract_of_sale", label: "Contract of Sale" },
                { id: "deed_of_assignment", label: "Grant Deed" },
                { id: "purchase_receipt", label: "Purchase Receipt" },
                { id: "allocation_letter", label: "Allocation Letter" }
              ].map(docType => (
                <label key={docType.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={selectedRequestTypes.includes(docType.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRequestTypes(prev => [...prev, docType.id]);
                      } else {
                        setSelectedRequestTypes(prev => prev.filter(t => t !== docType.id));
                      }
                    }}
                  />
                  <span className="text-sm font-medium">{docType.label}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleRequestDocument} disabled={requestingDoc || selectedRequestTypes.length === 0 || selectedPropertyId === "none"} className="w-full">
                {requestingDoc ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
