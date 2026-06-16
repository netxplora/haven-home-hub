import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, Printer, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import DOMPurify from "dompurify";
import { useBrand } from "@/hooks/useBrand";

export default function PrintDocument() {
  const { brand } = useBrand();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [sealUrl, setSealUrl] = useState<string | null>(null);

  // Fetch document details
  const { data: doc, isLoading, error } = useQuery({
    queryKey: ["print-document", id],
    queryFn: async () => {
      // First try with profiles join
      const { data, error } = await supabase
        .from("user_documents")
        .select(`
          *,
          profiles:user_id(full_name, email)
        `)
        .eq("id", id)
        .neq("status", "deleted")
        .maybeSingle();

      // If the join fails due to RLS on profiles, try without the join
      if (error) {
        console.warn("PrintDocument: profiles join failed, retrying without join:", error.message);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("user_documents")
          .select("*")
          .eq("id", id)
          .neq("status", "deleted")
          .maybeSingle();
        if (fallbackError) throw fallbackError;
        if (!fallbackData) throw new Error("Document not found");
        return { ...fallbackData, profiles: null };
      }

      if (!data) throw new Error("Document not found");
      return data;
    },
    enabled: !!id,
  });

  // Fetch active signatures and seals
  const { data: signatures = [] } = useQuery({
    queryKey: ["active-signatures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_signatures")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  // Load signature and seal signed URLs from storage
  useEffect(() => {
    async function loadAssets() {
      const activeSignature = signatures.find(s => s.type === "signature");
      const activeSeal = signatures.find(s => s.type === "seal");

      if (activeSignature) {
        const { data } = await supabase.storage
          .from("admin-assets")
          .createSignedUrl(activeSignature.file_path, 3600); // 1 hour
        if (data?.signedUrl) setSignatureUrl(data.signedUrl);
      }
      if (activeSeal) {
        const { data } = await supabase.storage
          .from("admin-assets")
          .createSignedUrl(activeSeal.file_path, 3600); // 1 hour
        if (data?.signedUrl) setSealUrl(data.signedUrl);
      }
    }
    if (signatures.length > 0) {
      loadAssets();
    }
  }, [signatures]);

  const handlePrint = () => {
    window.print();
  };

  // Derived values (safe even when doc is null)
  const snapshotHtml = doc?.metadata?.document_snapshot || doc?.metadata?.content_html || "";
  const verifyCode = doc?.verification_code || doc?.metadata?.verification_code || "N/A";
  const docRef = doc?.metadata?.reference_id || doc?.id?.split("-")[0]?.toUpperCase() || "";
  const verifyUrl = `${window.location.origin}/verify-document/${doc?.id || ""}`;
  const legalMeta = doc?.metadata?.legal_metadata;

  // After render, inject signature/seal images into the template HTML's #signature-block div
  useEffect(() => {
    if (!doc) return;
    const signatureBlock = document.getElementById("signature-block");
    if (!signatureBlock) return;

    // Find the line div inside the signature block (first child div with border-bottom)
    const lineDiv = signatureBlock.querySelector("div");

    if (signatureUrl && lineDiv) {
      // Create signature image overlay
      const sigImg = document.createElement("img");
      sigImg.src = signatureUrl;
      sigImg.alt = "Authorized Signature";
      sigImg.style.cssText = "position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%); max-height: 55px; max-width: 180px; object-fit: contain; z-index: 20;";
      lineDiv.style.position = "relative";
      lineDiv.appendChild(sigImg);
    }

    if (sealUrl) {
      // Create seal overlay positioned at the bottom-right of the signature block
      const sealImg = document.createElement("img");
      sealImg.src = sealUrl;
      sealImg.alt = "Company Seal";
      sealImg.style.cssText = "position: absolute; bottom: -10px; right: -30px; max-height: 90px; max-width: 90px; object-fit: contain; opacity: 0.85; z-index: 15;";
      signatureBlock.style.position = "relative";
      signatureBlock.appendChild(sealImg);
    }
  }, [signatureUrl, sealUrl, doc]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Loading secure legal document...</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <h2 className="text-xl font-serif font-bold text-destructive mb-2">Failed to Load Document</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          The document could not be found or you do not have permission to access it.
        </p>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 py-10 px-4 print:p-0 print:bg-white print:dark:bg-white">
      {/* Print-specific CSS */}
      <style>{`
        @media print {
          @page { margin: 15mm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-hide { display: none !important; }
          .doc-container { border: none !important; box-shadow: none !important; padding: 0 !important; }
        }
      `}</style>

      {/* Control bar - hidden on print */}
      <div className="max-w-[800px] mx-auto mb-6 flex items-center justify-between bg-card p-4 rounded-xl border border-border/50 shadow-sm print-hide">
        <Button onClick={() => navigate(-1)} variant="ghost" className="rounded-lg">
          <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 flex items-center gap-1.5 capitalize">
            <ShieldCheck className="h-3.5 w-3.5" /> {doc.status}
          </span>
          <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-white rounded-lg font-bold">
            <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
          </Button>
        </div>
      </div>

      {/* A4 Document Container */}
      <div className="doc-container max-w-[800px] mx-auto bg-white dark:bg-white text-slate-900 p-[60px] border border-slate-200 shadow-lg print:border-0 print:shadow-none min-h-[1123px] flex flex-col justify-between relative overflow-hidden">
        
        {/* Background Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0">
          <ShieldCheck className="w-[600px] h-[600px]" />
        </div>

        {/* Document Content */}
        <div className="flex-1 relative z-10">
          {/* Header & Logo */}
          <div className="flex justify-between items-start border-b-[3px] border-double border-slate-800 pb-6 mb-10">
            <div className="flex items-center gap-4">
              <div>
                <img src={brand.logo_url || "/logo.png"} alt={brand.platform_name} className="h-10 w-auto" />
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">Certified Legal Documentation Service</p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end justify-center h-14">
              <p className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">REF: {docRef}</p>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-2">Issued: {new Date(doc.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div 
            className="prose max-w-none text-slate-800 font-serif text-sm leading-loose text-justify prose-headings:font-serif prose-headings:uppercase prose-headings:tracking-widest prose-h2:text-xl prose-h2:font-black prose-h2:text-center prose-h2:border-b prose-h2:border-slate-200 prose-h2:pb-4 prose-h2:mb-8 prose-h3:text-md prose-h3:font-bold prose-h3:mt-8 prose-h3:mb-3 prose-p:mb-4 prose-ul:list-disc prose-ul:pl-6 prose-li:pl-2 prose-strong:font-bold prose-strong:text-slate-900"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(snapshotHtml) }} 
          />

          {/* Fallback Signatures & Seal Section (only shows if template has no #signature-block) */}
          {!snapshotHtml.includes('id="signature-block"') && (
            <div className="mt-16 pt-8 border-t border-slate-200 grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-xs uppercase font-bold tracking-wider text-slate-500">Authorized Signature</p>
                <div className="h-16 flex items-end">
                  {signatureUrl ? (
                    <img src={signatureUrl} alt="Signature" className="max-h-16 max-w-[200px] object-contain print:block" />
                  ) : (
                    <div className="h-10 w-40 border-b border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400">
                      Awaiting Official Signature
                    </div>
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-800 border-t border-slate-100 pt-2">Registrar, {brand.platform_name}</p>
              </div>
              
              <div className="flex flex-col items-end space-y-4">
                <p className="text-xs uppercase font-bold tracking-wider text-slate-500">Official Seal</p>
                <div className="h-16 flex items-end">
                  {sealUrl ? (
                    <img src={sealUrl} alt="Company Seal" className="max-h-16 max-w-[120px] object-contain print:block" />
                  ) : (
                    <div className="h-12 w-12 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-[9px] text-slate-400">
                      Seal
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Verification Footer Block */}
        <div className="mt-16 pt-6 border-t-[3px] border-double border-slate-800 flex justify-between items-center bg-slate-50 p-6 rounded-none print:bg-slate-50 relative z-10">
          <div className="flex-1 pr-6 space-y-1">
            <h4 className="text-[10px] font-black tracking-widest text-slate-900 uppercase flex items-center gap-1.5 mb-2">
              <ShieldCheck className="h-4 w-4 text-slate-900" /> OFFICIAL DIGITAL VERIFICATION
            </h4>
            <p className="text-[10px] text-slate-500 leading-relaxed font-sans max-w-md">
              This document is digitally verified and permanently registered in the {brand.platform_name} legal registry. Scan the QR code or verify online using the unique reference code.
            </p>
            <div className="grid grid-cols-2 gap-x-4 pt-3 text-[9px] font-mono text-slate-600 uppercase tracking-wider">
              <p>Registry ID: <span className="text-slate-900 font-bold ml-1">{doc.id.split('-')[0]}</span></p>
              <p>Security Hash: <span className="text-slate-900 font-bold ml-1">{verifyCode}</span></p>
              <p>Ledger Ref: <span className="text-slate-900 font-bold ml-1">{docRef}</span></p>
              <p>Timestamp: <span className="text-slate-900 font-bold ml-1">{new Date(doc.created_at).toLocaleString()}</span></p>
              {legalMeta?.jurisdiction && (
                <p>Jurisdiction: <span className="text-slate-900 font-bold ml-1">{legalMeta.jurisdiction}</span></p>
              )}
              {legalMeta?.blockchain_hash && (
                <p>Doc Hash: <span className="text-slate-900 font-bold ml-1">{legalMeta.blockchain_hash.substring(0, 12)}...</span></p>
              )}
            </div>
          </div>
          <div className="shrink-0 bg-white p-2 border-2 border-slate-900 flex items-center justify-center shadow-sm">
            <QRCodeSVG value={verifyUrl} size={76} />
          </div>
        </div>

      </div>
    </div>
  );
}
