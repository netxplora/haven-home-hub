import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle2, AlertCircle, ShieldCheck, Download, ExternalLink, Clock, Folder, RefreshCw, Send } from "lucide-react";
import { ESignatureModal } from "@/components/site/ESignatureModal";
import { ReceiptDialog } from "@/components/dashboard/ReceiptDialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/invest";

export function DocumentsPanel({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"legal" | "property" | "investment" | "transaction">("legal");
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<any>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [requestingDoc, setRequestingDoc] = useState(false);

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

  // 2. Property Documents
  const { data: propertyDocs = [], isLoading: isLoadingPropertyDocs } = useQuery({
    queryKey: ["user-documents", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_documents" as any)
        .select("*, investment_properties(title)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error && error.code !== '42P01') throw error; // Ignore table not found if migration hasn't run
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
      if (error && error.code !== '42P01') throw error;
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
      if (error && error.code !== '42P01') throw error;
      return data || [];
    },
  });

  const handleDownloadDoc = async (doc: any) => {
    try {
      toast({ title: "Requesting secure link..." });
      const { data, error } = await supabase.storage
        .from("user-documents")
        .createSignedUrl(doc.file_path, 60); // 60 seconds
      
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (err: any) {
      console.error(err);
      toast({ title: "Download Failed", description: "Could not generate a secure download link.", variant: "destructive" });
    }
  };

  const handleRequestDocument = async () => {
    setRequestingDoc(true);
    try {
      const { error } = await supabase.from("inquiries").insert({
        user_id: userId,
        message: "I would like to request my missing ownership documents (e.g. Deed of Assignment, C of O) for my recent purchase.",
        status: "open"
      });
      if (error) throw error;
      toast({ title: "Request Sent", description: "Our team will process your document request shortly." });
      qc.invalidateQueries({ queryKey: ["my-inquiries"] });
    } catch (error: any) {
      toast({ title: "Request Failed", description: error.message, variant: "destructive" });
    } finally {
      setRequestingDoc(false);
    }
  };

  const tabs = [
    { id: "legal", label: "Legal Agreements" },
    { id: "property", label: "Property Ownership" },
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
              "pb-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors duration-200",
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
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            {(isLoadingSigned || isLoadingReq) ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : (
              <>
                <div>
                  <h2 className="font-serif text-2xl font-bold mb-4">Action Required</h2>
                  {requiredDocs.length === 0 ? (
                    <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center justify-center text-center">
                      <CheckCircle2 className="h-10 w-10 text-orange-500 mb-3" />
                      <p className="font-semibold">All caught up!</p>
                      <p className="text-sm text-muted-foreground">You have no pending documents to sign.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {requiredDocs.map((doc: any) => (
                        <div key={doc.type} className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-xl border border-destructive/20 bg-destructive/5 gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                              <AlertCircle className="h-5 w-5 text-destructive" />
                            </div>
                            <div>
                              <p className="font-semibold">{doc.name}</p>
                              <p className="text-sm text-muted-foreground">Signature required to continue operations.</p>
                            </div>
                          </div>
                          <Button 
                            onClick={() => { setSelectedDocType(doc.type); setSignModalOpen(true); }}
                            className="w-full sm:w-auto"
                          >
                            Review & Sign
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="font-serif text-2xl font-bold mb-4">Signed Documents</h2>
                  {signedDocs.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-8 text-center">
                      <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No documents signed yet.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {signedDocs.map((doc: any) => (
                        <div key={doc.id} className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-xl border border-border bg-card gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold">{doc.document_templates?.name || "Document"}</p>
                              <p className="text-xs text-muted-foreground">Signed on {new Date(doc.signed_at).toLocaleString()}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 shrink-0">
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
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
              <div>
                <h2 className="font-serif text-2xl font-bold">Ownership Documents</h2>
                <p className="text-sm text-muted-foreground">C of O, Deeds, Allocation Letters</p>
              </div>
              <Button onClick={handleRequestDocument} disabled={requestingDoc} variant="outline">
                 {requestingDoc ? "Sending..." : <><Send className="h-4 w-4 mr-2" /> Request Missing Document</>}
              </Button>
            </div>
            {isLoadingPropertyDocs ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : propertyDocs.length === 0 ? (
               <div className="rounded-xl border border-dashed border-border p-10 text-center flex flex-col items-center">
                 <Folder className="h-10 w-10 text-muted-foreground/40 mb-3" />
                 <p className="font-semibold">No Property Documents</p>
                 <p className="text-sm text-muted-foreground max-w-sm mt-1">
                   When you fully purchase a property, your official ownership documents will be uploaded here securely.
                 </p>
               </div>
            ) : (
              <div className="grid gap-4">
                {propertyDocs.map((doc: any) => (
                  <div key={doc.id} className="p-5 rounded-xl border border-border bg-card flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-primary/30 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                        doc.status === 'available' ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                      )}>
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground">{doc.name}</h4>
                        <p className="text-sm font-medium text-muted-foreground">Property: {doc.investment_properties?.title || "Unknown"}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-[10px] uppercase tracking-wider",
                              doc.status === 'available' ? "bg-orange-500/10 text-orange-600" :
                              doc.status === 'processing' ? "bg-amber-500/10 text-amber-600" :
                              doc.status === 'rejected' ? "bg-destructive/10 text-destructive" :
                              ""
                            )}
                          >
                            {doc.status}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-mono">ID: {doc.id.split('-')[0]}</span>
                        </div>
                      </div>
                    </div>
                    
                    {doc.status === 'available' ? (
                      <Button onClick={() => handleDownloadDoc(doc)} variant="outline" className="w-full sm:w-auto shrink-0 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary">
                        <Download className="h-4 w-4 mr-2" /> Download Securely
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground w-full sm:w-auto bg-secondary/50 px-4 py-2 rounded-lg justify-center">
                        {doc.status === 'processing' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                        {doc.status === 'processing' ? 'Processing...' : 'Pending Review'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================
            INVESTMENT CERTIFICATES TAB
           ========================================= */}
        {activeTab === "investment" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-serif text-2xl font-bold">Certificates</h2>
              <p className="text-sm text-muted-foreground">Proof of Unit Investment</p>
            </div>
            {isLoadingCertificates ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : certificates.length === 0 ? (
               <div className="rounded-xl border border-dashed border-border p-10 text-center flex flex-col items-center">
                 <ShieldCheck className="h-10 w-10 text-muted-foreground/40 mb-3" />
                 <p className="font-semibold">No Certificates Yet</p>
                 <p className="text-sm text-muted-foreground max-w-sm mt-1">
                   Once your investment payments are fully verified, your official cryptographically verified certificates will appear here.
                 </p>
               </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {certificates.map((cert: any) => (
                  <div key={cert.id} className="p-5 rounded-xl border border-orange-500/20 bg-orange-500/5 hover:border-orange-500/40 transition-colors flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                          <ShieldCheck className="h-5 w-5 text-orange-600" />
                        </div>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Verified</Badge>
                      </div>
                      <h4 className="font-bold text-lg leading-tight mb-1">{cert.investment_properties?.title || "Property Asset"}</h4>
                      <p className="text-sm text-muted-foreground mb-4">Certificate ID: <span className="font-mono text-xs">{cert.certificate_number}</span></p>
                      
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
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white"
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
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-serif text-2xl font-bold">Transaction Receipts</h2>
            </div>
            {isLoadingReceipts ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : receipts.length === 0 ? (
               <div className="rounded-xl border border-dashed border-border p-10 text-center flex flex-col items-center">
                 <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
                 <p className="font-semibold">No Receipts</p>
                 <p className="text-sm text-muted-foreground mt-1">Transaction receipts will appear here after confirmed payments.</p>
               </div>
            ) : (
              <div className="grid gap-3">
                {receipts.map((receipt: any) => (
                  <div key={receipt.id} className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => {
                    setSelectedReceipt(receipt);
                    setReceiptModalOpen(true);
                  }}>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold truncate">{receipt.metadata?.property_title || receipt.type}</p>
                          <Badge variant="secondary" className="text-[10px] uppercase">{receipt.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-1">REC: {receipt.receipt_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-0 border-border/50 pt-3 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <p className="font-serif font-bold text-primary">{formatMoney(receipt.amount_paid, receipt.currency)}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(receipt.created_at).toLocaleDateString()}</p>
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
    </div>
  );
}
