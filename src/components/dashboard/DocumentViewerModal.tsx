import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Download, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";

interface DocumentViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: any | null;
}

export function DocumentViewerModal({ open, onOpenChange, document }: DocumentViewerModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !document) {
      setSignedUrl(null);
      setError(null);
      return;
    }

    if (!document.file_path || document.file_path.startsWith('generated://')) {
      // HTML document or no file path, no signed URL needed unless it has a direct_url
      if (document.direct_url) {
        setSignedUrl(document.direct_url);
      }
      return;
    }

    // It's a physical file with a file_path, request signed URL
    async function fetchSignedUrl() {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.storage
          .from("user-documents")
          .createSignedUrl(document.file_path, 3600); // 1 hour

        if (error) throw error;
        setSignedUrl(data.signedUrl);
      } catch (err: any) {
        console.error("Error generating signed URL:", err);
        setError("Could not generate a secure preview link for this document.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchSignedUrl();
  }, [open, document]);

  if (!document) return null;

  const isHtml = (!document.file_path || document.file_path.startsWith('generated://')) && !document.direct_url;
  const docRef = document.metadata?.reference_id || document.id?.split('-')[0]?.toUpperCase();
  const fileExt = document.file_path?.split('.').pop()?.toLowerCase() || document.direct_url?.split('.').pop()?.toLowerCase() || '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt) || document.direct_url?.startsWith('data:image/');
  const isPdf = fileExt === 'pdf';
  const isPreviewable = isHtml || isImage || isPdf;

  const handleDownload = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  const handlePrintable = () => {
    window.open(`/print-document/${document.id}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border-border/40 p-0">
        <DialogHeader className="border-b border-border/40 p-6 pb-4 bg-card shrink-0">
          <div className="flex justify-between items-center pr-6">
            <div>
              <DialogTitle className="font-serif text-lg text-foreground">{document.name || document.title || "Document Preview"}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Reference ID: {docRef}</p>
            </div>
            {isHtml ? (
              <Button
                onClick={handlePrintable}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold"
              >
                <Eye className="h-4 w-4 mr-2" /> Open Printable View
              </Button>
            ) : (
              <Button
                onClick={handleDownload}
                disabled={!signedUrl}
                variant="outline"
                className="rounded-lg font-bold border-primary text-primary hover:bg-primary/10"
              >
                <Download className="h-4 w-4 mr-2" /> Download Securely
              </Button>
            )}
          </div>
        </DialogHeader>

        <DialogBody className="flex-1 overflow-y-auto p-0 relative bg-slate-50/50">
          {isHtml ? (
            <div className="p-6 sm:p-10">
              <div className="bg-white p-10 sm:p-14 rounded-none border-2 border-slate-200 shadow-md min-h-[600px] relative overflow-hidden mx-auto max-w-[800px]">
                {/* Background Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0">
                  <ShieldCheck className="w-[400px] h-[400px]" />
                </div>

                {/* Document Content */}
                <div className="relative z-10">
                  <div className="flex justify-between items-start border-b-[3px] border-double border-slate-800 pb-4 mb-8">
                    <div className="flex items-center gap-3">
                      <img src="/logo.png" alt="Haven Home Hub" className="h-8 w-auto" />
                      <div>
                        <p className="text-[8px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">Certified Legal Documentation</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">REF: {docRef}</p>
                    </div>
                  </div>

                  <div
                    className="prose max-w-none text-slate-800 font-serif text-sm leading-loose text-justify prose-headings:font-serif prose-headings:uppercase prose-headings:tracking-widest prose-h2:text-xl prose-h2:font-black prose-h2:text-center prose-h2:border-b prose-h2:border-slate-200 prose-h2:pb-4 prose-h2:mb-8 prose-h3:text-md prose-h3:font-bold prose-h3:mt-8 prose-h3:mb-3 prose-p:mb-4 prose-ul:list-disc prose-ul:pl-6 prose-li:pl-2 prose-strong:font-bold prose-strong:text-slate-900"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(document.metadata?.document_snapshot || document.metadata?.content_html || "") }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-[500px] flex items-center justify-center p-6 h-full">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">Generating secure preview...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center text-center max-w-sm">
                  <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                  <p className="font-bold text-slate-800 mb-2">Preview Unavailable</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              ) : signedUrl ? (
                isPreviewable ? (
                  isImage ? (
                    <img src={signedUrl} alt={document.name} className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm border border-border/50 bg-white" />
                  ) : isPdf ? (
                    <iframe src={signedUrl} className="w-full h-full min-h-[70vh] rounded-lg border border-border/50 bg-white" title={document.name} />
                  ) : null
                ) : (
                  <div className="flex flex-col items-center justify-center text-center max-w-sm">
                    <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                      <Download className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="font-bold text-slate-800 mb-2">No Inline Preview Available</p>
                    <p className="text-sm text-muted-foreground mb-6">
                      This file type ({fileExt.toUpperCase()}) cannot be previewed in the browser.
                    </p>
                    <Button onClick={handleDownload} className="w-full">
                      Download File
                    </Button>
                  </div>
                )
              ) : null}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
