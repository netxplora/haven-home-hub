import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, Printer, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrintDocument() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [sealUrl, setSealUrl] = useState<string | null>(null);

  // Fetch document details
  const { data: doc, isLoading, error } = useQuery({
    queryKey: ["print-document", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_documents")
        .select(`
          *,
          profiles:user_id(full_name, email)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-rose-600 mb-4" />
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

  const snapshotHtml = doc.metadata?.document_snapshot || doc.metadata?.content_html || "";
  const verifyCode = doc.verification_code || doc.metadata?.verification_code || "N/A";
  const docRef = doc.metadata?.reference_id || doc.id.split("-")[0].toUpperCase();
  const verifyUrl = `${window.location.origin}/verify-document/${doc.id}`;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 py-10 px-4 print:p-0 print:bg-white print:dark:bg-white">
      {/* Control bar - hidden on print */}
      <div className="max-w-[800px] mx-auto mb-6 flex items-center justify-between bg-card p-4 rounded-xl border border-border/50 shadow-sm print:hidden">
        <Button onClick={() => navigate(-1)} variant="ghost" className="rounded-lg">
          <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100 flex items-center gap-1.5 capitalize">
            <ShieldCheck className="h-3.5 w-3.5" /> {doc.status}
          </span>
          <Button onClick={handlePrint} className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold">
            <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
          </Button>
        </div>
      </div>

      {/* A4 Document Container */}
      <div className="max-w-[800px] mx-auto bg-white dark:bg-white text-slate-900 p-[60px] border border-slate-200 shadow-lg print:border-0 print:shadow-none min-h-[1123px] flex flex-col justify-between print:p-0">
        
        {/* Document Content */}
        <div className="flex-1">
          {/* Header & Logo */}
          <div className="flex justify-between items-start border-b-2 border-rose-800 pb-6 mb-8">
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-rose-900">HAVEN HOME HUB</h1>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">Real Estate Documentation Service</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-mono font-bold text-slate-500">REF: {docRef}</p>
              <p className="text-xs text-slate-500 mt-0.5">Issued: {new Date(doc.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Dynamic HTML Content */}
          <div 
            className="prose max-w-none text-slate-800 prose-headings:font-serif prose-h3:text-md prose-h3:font-bold prose-h3:mt-4 prose-h3:mb-2 prose-ul:list-disc prose-ul:pl-5"
            dangerouslySetInnerHTML={{ __html: snapshotHtml }} 
          />

          {/* Signatures & Seal Section */}
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
              <p className="text-sm font-semibold text-slate-800 border-t border-slate-100 pt-2">Registrar, Haven Home Hub</p>
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
        </div>

        {/* Verification Footer Block */}
        <div className="mt-16 pt-6 border-t-2 border-slate-200 flex justify-between items-center bg-slate-50 p-6 rounded-xl border border-slate-100 print:bg-slate-50">
          <div className="flex-1 pr-6 space-y-1">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-rose-700" /> DIGITAL LEGAL VERIFICATION
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              This document is digitally verified and registered in the Haven Home Hub property registry. Scan the QR code or verify using the reference code below.
            </p>
            <div className="grid grid-cols-2 gap-x-4 pt-2 text-[10px] font-mono text-slate-600">
              <p>Doc ID: <span className="text-slate-800 font-bold">{doc.id}</span></p>
              <p>Verify Code: <span className="text-slate-800 font-bold">{verifyCode}</span></p>
              <p>Reference: <span className="text-slate-800 font-bold">{docRef}</span></p>
              <p>Timestamp: <span className="text-slate-800 font-bold">{new Date(doc.created_at).toLocaleString()}</span></p>
            </div>
          </div>
          <div className="shrink-0 bg-white p-2 border border-slate-200 rounded-lg flex items-center justify-center">
            <QRCodeSVG value={verifyUrl} size={70} />
          </div>
        </div>

      </div>
    </div>
  );
}
