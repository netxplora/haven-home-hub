import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { ESignatureModal } from "@/components/site/ESignatureModal";
import { formatMoney } from "@/lib/invest";

export function DocumentsPanel({ userId }: { userId: string }) {
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<any>(null);

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
      // Find what documents the user might need to sign.
      // E.g., if they have investments without a signed agreement.
      // For simplicity, we'll just check if they have signed the Standard Investment Agreement.
      const hasSignedInvestment = signedDocs.some((d: any) => d.document_type === "investment_agreement");
      const hasSignedKyc = signedDocs.some((d: any) => d.document_type === "kyc_declaration");

      const req = [];
      if (!hasSignedInvestment) req.push({ type: "investment_agreement", name: "Standard Investment Agreement" });
      if (!hasSignedKyc) req.push({ type: "kyc_declaration", name: "KYC Terms & Declaration" });

      return req;
    },
    enabled: !isLoadingSigned,
  });

  if (isLoadingSigned || isLoadingReq) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl font-bold mb-4">Action Required</h2>
        {requiredDocs.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-3" />
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
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Legally Binding
                </Badge>
              </div>
            ))}
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
    </div>
  );
}
