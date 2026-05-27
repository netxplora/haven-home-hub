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
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
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

  const handleRequestDocument = async () => {
    if (selectedRequestTypes.length === 0) {
      toast.error("Please select at least one document type.");
      return;
    }
    setRequestingDoc(true);
    try {
      const { error } = await supabase.from("document_requests").insert({
        user_id: userId,
        requested_documents: selectedRequestTypes,
        status: "pending"
      });
      if (error) throw error;
      toast.success("Document request submitted. Our team will verify and generate them shortly.");
      setRequestModalOpen(false);
      setSelectedRequestTypes([]);
      qc.invalidateQueries({ queryKey: ["admin-document-requests"] }); // if admin is also logged in
    } catch (error: any) {
      toast.error(error.message || "Failed to submit request.");
    } finally {
      setRequestingDoc(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return "bg-rose-500/10 text-rose-700 border-rose-500/20";
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
                      <CheckCircle2 className="h-10 w-10 text-rose-500 mb-3" />
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
                            className="w-full sm:w-auto rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
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
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-700 border-rose-500/20 shrink-0 font-bold">
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
                <p className="text-sm text-muted-foreground">Certificates of Occupancy, Deed of Assignments, and survey documentation.</p>
              </div>
              <Button onClick={() => setRequestModalOpen(true)} disabled={requestingDoc} variant="outline" className="rounded-xl font-bold">
                 {requestingDoc ? "Sending..." : <><Send className="h-4 w-4 mr-2" /> Request Documentation</>}
              </Button>
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
                {propertyDocs.map((doc: any) => {
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
                            <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white", isRevoked ? "bg-destructive" : "bg-rose-500")}>
                              {isRevoked ? "✕" : "✓"}
                            </div>
                            <span className="text-[10px] font-bold text-slate-700 mt-1">Generated</span>
                          </div>

                          <div className="flex flex-col items-center relative z-10">
                            <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold", 
                              doc.status === 'pending' || doc.status === 'processing' 
                                ? "bg-slate-200 text-slate-400" 
                                : isRevoked ? "bg-destructive text-white" : "bg-rose-500 text-white"
                            )}>
                              {doc.status === 'pending' || doc.status === 'processing' ? "2" : "✓"}
                            </div>
                            <span className="text-[10px] font-bold text-slate-700 mt-1">Approved</span>
                          </div>

                          <div className="flex flex-col items-center relative z-10">
                            <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold", 
                              ['verified', 'delivered'].includes(doc.status) && !isRevoked
                                ? "bg-rose-500 text-white" 
                                : isRevoked ? "bg-destructive text-white" : "bg-slate-200 text-slate-400"
                            )}>
                              {['verified', 'delivered'].includes(doc.status) && !isRevoked ? "✓" : "3"}
                            </div>
                            <span className="text-[10px] font-bold text-slate-700 mt-1">Delivered</span>
                          </div>

                          <div className="flex flex-col items-center relative z-10">
                            <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold", 
                              doc.status === 'verified' && !isRevoked
                                ? "bg-rose-500 text-white" 
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
                  <div key={cert.id} className="p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40 transition-all flex flex-col h-full justify-between shadow-sm">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                          <ShieldCheck className="h-5 w-5 text-rose-600" />
                        </div>
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-bold">Verified</Badge>
                      </div>
                      <h4 className="font-bold text-lg leading-tight mb-1">{cert.investment_properties?.title || "Property Asset"}</h4>
                      <p className="text-xs text-muted-foreground mb-4">Certificate ID: <span className="font-mono text-xs">{cert.certificate_number}</span></p>
                      
                      <div className="grid grid-cols-2 gap-2 mb-6">
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
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold"
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
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold"
              >
                <Eye className="h-4 w-4 mr-2" /> Open Printable View
              </Button>
            </div>
          </DialogHeader>
          <DialogBody className="py-6">
            <div className="bg-slate-50 p-8 rounded-xl border border-slate-100 min-h-[500px]">
              <div 
                className="prose max-w-none text-slate-800 prose-headings:font-serif prose-h3:text-md prose-h3:font-bold prose-h3:mt-4 prose-h3:mb-2 prose-ul:list-disc prose-ul:pl-5"
                dangerouslySetInnerHTML={{ __html: previewDoc?.metadata?.document_snapshot || "" }} 
              />
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
            <p className="text-sm text-muted-foreground">Select the official documents you are requesting for your property/investment:</p>
            <div className="space-y-2">
              {[
                { id: "contract_of_sale", label: "Contract of Sale" },
                { id: "deed_of_assignment", label: "Deed of Assignment" },
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
              <Button onClick={handleRequestDocument} disabled={requestingDoc || selectedRequestTypes.length === 0} className="w-full">
                {requestingDoc ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
