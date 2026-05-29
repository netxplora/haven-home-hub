import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, XCircle, ArrowLeft, Loader2, Calendar, User, Building, Landmark, Hash, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyDocument() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch document details for public verification
  const { data: doc, isLoading, error } = useQuery({
    queryKey: ["public-verify-document", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_documents")
        .select(`
          id,
          name,
          document_type,
          status,
          verification_code,
          created_at,
          profiles:user_id(full_name),
          properties(title),
          investment_properties(title)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Contacting registry verification ledger...</p>
      </div>
    );
  }

  const isVerified = doc && doc.status !== "revoked" && doc.status !== "pending";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/60 dark:border-slate-700 shadow-xl overflow-hidden p-8 space-y-6">
        
        {/* Verification Status Banner */}
        <div className="text-center space-y-2">
          {error || !doc ? (
            <>
              <div className="mx-auto h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
                <XCircle className="h-10 w-10" />
              </div>
              <h2 className="font-serif text-xl font-bold text-slate-950 dark:text-white">Document Invalid</h2>
              <p className="text-sm text-muted-foreground">
                This document record could not be found in the registry system.
              </p>
            </>
          ) : isVerified ? (
            <>
              <div className="mx-auto h-16 w-16 bg-emerald-100 dark:bg-emerald-950 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-10 w-10" />
              </div>
              <h2 className="font-serif text-xl font-bold text-slate-950 dark:text-white">Authenticity Verified</h2>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/50 inline-block font-semibold">
                Official Registered Document
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto h-16 w-16 bg-red-100 dark:bg-red-950 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
                <XCircle className="h-10 w-10" />
              </div>
              <h2 className="font-serif text-xl font-bold text-slate-950 dark:text-white">Document Revoked</h2>
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-1 rounded-full border border-red-100 dark:border-red-900/50 inline-block font-semibold">
                Invalidated by Administration
              </p>
            </>
          )}
        </div>

        {doc && (
          <>
            {/* Document Details Table */}
            <div className="border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/20 text-sm">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                <FileText className="h-4 w-4 text-slate-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Document Name</p>
                  <p className="font-semibold truncate text-slate-800 dark:text-slate-200">{doc.name}</p>
                </div>
              </div>

              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                <User className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Document Holder</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{doc.profiles?.full_name || "N/A"}</p>
                </div>
              </div>

              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                <Building className="h-4 w-4 text-slate-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Linked Asset</p>
                  <p className="font-semibold truncate text-slate-800 dark:text-slate-200">
                    {doc.investment_properties?.title || doc.properties?.title || "N/A"}
                  </p>
                </div>
              </div>

              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                <Calendar className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Registration Date</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {new Date(doc.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="p-4 flex items-center gap-3">
                <Hash className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Verification Hash Code</p>
                  <p className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">{doc.verification_code || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Authenticity statement */}
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              This system verifies that the metadata matches the official database ledger records. If any details above differ from the physical copy, the document is considered tampered with and invalid.
            </p>
          </>
        )}

        {/* Back navigation */}
        <div className="pt-2">
          <Button onClick={() => navigate("/")} className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold" variant="outline">
            Return to Homepage
          </Button>
        </div>

      </div>
    </div>
  );
}
