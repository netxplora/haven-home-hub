import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Download, Printer, ArrowLeft, Building2, User } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/invest";
import { format } from "date-fns";

export default function CertificateView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: cert, isLoading, error } = useQuery({
    queryKey: ["investment-certificate-full", id],
    enabled: !!id,
    queryFn: async () => {
      // Try 1: Direct lookup by certificate table UUID
      const { data: directHit, error: directError } = await (supabase as any)
        .from("investment_certificates")
        .select(`
          *,
          investment_properties(title, slug, location, description),
          profiles(full_name, email)
        `)
        .eq("id", id)
        .maybeSingle();
      
      if (directHit) return directHit as any;

      // Try 2: Lookup by investment_id (user navigated from portfolio)
      const { data: byInvestment, error: invError } = await (supabase as any)
        .from("investment_certificates")
        .select(`
          *,
          investment_properties(title, slug, location, description),
          profiles(full_name, email)
        `)
        .eq("investment_id", id)
        .maybeSingle();
      
      if (byInvestment) return byInvestment as any;

      // Try 3: Lookup by certificate_id text field
      const { data: byCertId, error: certIdError } = await (supabase as any)
        .from("investment_certificates")
        .select(`
          *,
          investment_properties(title, slug, location, description),
          profiles(full_name, email)
        `)
        .eq("certificate_id", id)
        .maybeSingle();
      
      if (byCertId) return byCertId as any;

      return null;
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="w-[800px] h-[1000px] rounded-xl" />
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="rounded-2xl border border-border bg-card p-12 max-w-md text-center shadow-lg">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
            <ShieldCheck className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="font-serif text-2xl font-bold mb-3">Certificate Not Available</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            This certificate has not been issued yet. Certificates are generated after your investment payment has been verified by our team. This process typically takes 1-3 business days.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate("/dashboard?tab=investments")} className="w-full font-semibold">
              Return to Portfolio
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)} className="w-full font-semibold">
              <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const printDocument = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 print:py-0 print:px-0">
      <div className="max-w-4xl mx-auto space-y-8 print:space-y-0">
        
        {/* Actions (Hidden on Print) */}
        <div className="flex items-center justify-between print:hidden">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={printDocument}>
              <Printer className="h-4 w-4 mr-2" /> Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Certificate Container */}
        <div className="bg-card text-card-foreground shadow-2xl rounded-xl overflow-hidden border-8 border-double border-primary/20 print:shadow-none print:border-none print:rounded-none">
          
          {/* Header */}
          <div className="bg-primary/5 p-12 text-center border-b border-primary/10">
            <div className="mx-auto w-24 mb-6">
              <img src="/logo.png" alt="Haven Home Hub" className="w-full h-auto" />
            </div>
            <h1 className="font-serif text-5xl font-bold tracking-tight mb-4">Official Investment Certificate</h1>
            <p className="text-lg text-muted-foreground uppercase tracking-widest font-bold">Haven Home Hub Real Estate Trust</p>
            <div className="mt-6 inline-flex items-center gap-2 bg-background px-4 py-2 rounded-full text-xs font-mono font-bold border border-border shadow-sm">
              CERT ID: {cert.certificate_id}
            </div>
          </div>

          {/* Body */}
          <div className="p-12 space-y-12 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
            
            <div className="text-center space-y-2">
              <p className="text-muted-foreground uppercase tracking-widest text-sm font-bold">This certifies that</p>
              <h2 className="font-serif text-4xl font-bold border-b border-primary/20 inline-block pb-2 px-8">
                {cert.profiles?.full_name || "Valued Investor"}
              </h2>
            </div>

            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <p className="text-muted-foreground uppercase tracking-widest text-sm font-bold">is the registered owner of</p>
              <h3 className="font-serif text-3xl font-bold text-primary">
                {cert.units_owned} {cert.units_owned === 1 ? 'Unit' : 'Units'}
              </h3>
              <p className="text-muted-foreground uppercase tracking-widest text-sm font-bold mt-2">in the property known as</p>
              <h4 className="font-serif text-2xl font-semibold mt-1">
                {cert.investment_properties?.title}
              </h4>
              <p className="text-sm text-muted-foreground mt-2">{cert.investment_properties?.location}</p>
            </div>

            {/* Financials Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-border">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Total Investment</p>
                <p className="font-serif font-bold text-xl">{formatMoney(cert.total_investment_amount, cert.currency)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Currency</p>
                <p className="font-serif font-bold text-xl uppercase">{cert.currency}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Expected ROI</p>
                <p className="font-serif font-bold text-xl">{cert.expected_roi_min}% - {cert.expected_roi_max}%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Issue Date</p>
                <p className="font-serif font-bold text-xl">{format(new Date(cert.issued_at), 'MMM dd, yyyy')}</p>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="bg-muted/50 p-12 flex items-center justify-between border-t border-border">
            <div className="space-y-1">
              <div className="w-48 border-b-2 border-primary/50 pb-2">
                <img src="/logo.png" alt="Haven Home Hub Auth" className="h-8 w-auto opacity-50 grayscale" />
              </div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-2">Authorized Signature</p>
            </div>
            
            <div className="text-right space-y-1">
              <div className="w-32 h-32 ml-auto rounded-xl border border-primary/20 bg-background flex items-center justify-center p-2 opacity-90 mix-blend-multiply">
                <QRCodeSVG
                  value={window.location.href}
                  size={112}
                  level="H"
                  includeMargin={false}
                  className="w-full h-full text-foreground"
                />
              </div>
              <p className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold mt-1 text-center pr-2">Scan to Verify</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
