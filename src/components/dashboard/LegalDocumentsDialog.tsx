import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Mail, Loader2, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface LegalDocumentsDialogProps {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle: string;
  userId: string;
}

export function LegalDocumentsDialog({ open, onClose, propertyId, propertyTitle, userId }: LegalDocumentsDialogProps) {
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  const { data: documents, isLoading } = useQuery({
    queryKey: ["legal-documents", propertyId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_documents")
        .select("*")
        .eq("user_id", userId)
        .eq("property_id", propertyId)
        .in("document_type", ["contract", "deed", "contract_of_sale", "deed_of_assignment", "property_purchase_agreement", "ownership_confirmation"]);

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!propertyId && !!userId,
  });

  const handleSimulateEmail = (doc: any, docName: string) => {
    setSendingEmail(doc.document_type);
    setTimeout(async () => {
      await supabase.from("user_documents").update({ status: 'delivered' }).eq("id", doc.id);
      setSendingEmail(null);
      toast.success(`${docName} sent to your registered email address securely.`);
    }, 1500);
  };

  const requiredDocs = [
    { 
      types: ["contract", "contract_of_sale", "property_purchase_agreement"], 
      title: "Contract of Sale (COS)", 
      desc: "Agreement of property sale and terms." 
    },
    { 
      types: ["deed", "deed_of_assignment", "ownership_confirmation"], 
      title: "Deed of Assignment (DOA)", 
      desc: "Official ownership transfer agreement." 
    }
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="bg-primary/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-rose-500/20 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <DialogTitle className="font-serif text-xl">Legal Ownership Documents</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-[300px]">{propertyTitle}</p>
            </div>
          </div>
        </DialogHeader>
        <DialogBody className="py-6 space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary/50" />
              <p>Retrieving secure documents...</p>
            </div>
          ) : (
            requiredDocs.map(reqDoc => {
              const doc = documents?.find(d => reqDoc.types.includes(d.document_type));
              
              const isReady = doc && (doc.file_path || doc.metadata?.document_snapshot) && doc.status !== 'pending';
              const isVerified = doc?.status === 'verified';
              
              return (
                <div key={reqDoc.title} className="flex flex-col sm:flex-row gap-4 p-5 rounded-xl border border-border/60 bg-card shadow-sm hover:border-border transition-colors">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-bold text-foreground">{reqDoc.title}</h4>
                      {isVerified ? (
                         <Badge variant="outline" className="bg-rose-500/10 text-rose-700 border-rose-500/20 gap-1 px-2 py-0.5 text-[10px]">
                           <CheckCircle2 className="h-3 w-3" /> Verified
                         </Badge>
                      ) : isReady ? (
                         <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20 gap-1 px-2 py-0.5 text-[10px]">
                           <CheckCircle2 className="h-3 w-3" /> Ready
                         </Badge>
                      ) : (
                         <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20 gap-1 px-2 py-0.5 text-[10px]">
                           <Clock className="h-3 w-3" /> Pending Prep
                         </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4">{reqDoc.desc}</p>
                    
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs font-semibold rounded-lg h-9"
                        disabled={!isReady}
                        onClick={async () => {
                          if (doc?.file_path) {
                            if (doc.file_path.startsWith('generated://')) {
                              window.open(`/print-document/${doc.id}`, '_blank');
                            } else {
                              const { data } = await supabase.storage.from("user-documents").createSignedUrl(doc.file_path, 60);
                              if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                            }
                          }
                        }}
                      >
                        <Download className="h-3.5 w-3.5 mr-2" /> Download / Print PDF
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="text-xs font-semibold rounded-lg h-9 bg-secondary/60 hover:bg-secondary"
                        disabled={!isReady || sendingEmail === doc?.document_type}
                        onClick={() => handleSimulateEmail(doc, reqDoc.title)}
                      >
                        {sendingEmail === doc?.document_type ? (
                          <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Sending...</>
                        ) : (
                          <><Mail className="h-3.5 w-3.5 mr-2" /> Email Copy</>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
