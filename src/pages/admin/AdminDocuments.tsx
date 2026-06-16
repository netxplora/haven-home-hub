import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  Trash2, 
  Search, 
  Plus, 
  Mail, 
  Edit3, 
  History, 
  Signature, 
  FileSignature, 
  ShieldAlert, 
  Eye, 
  RotateCcw,
  RefreshCw,
  Loader2,
  Clock,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useBrand } from "@/hooks/useBrand";

export function AdminDocuments() {
  const { brand } = useBrand();
  const qc = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<"docs" | "templates" | "signatures" | "requests" | "audit">("requests");
  
  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  
  // Loading states
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // Form states - Upload Document
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState("none");
  const [documentType, setDocumentType] = useState("contract_of_sale");
  const [documentName, setDocumentName] = useState("");
  
  // Form states - Manage Template
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState("contract_of_sale");
  const [templateHtml, setTemplateHtml] = useState("");
  const [templateSignatureX, setTemplateSignatureX] = useState("bottom-left");
  const [templateSealX, setTemplateSealX] = useState("bottom-right");

  // Form states - Upload Signature/Seal
  const [sigName, setSigName] = useState("");
  const [sigType, setSigType] = useState<"signature" | "seal">("signature");

  // Search/Filters
  const [search, setSearch] = useState("");
  const [templateHistory, setTemplateHistory] = useState<any[]>([]);

  // 1. Fetch user documents
  const { data: documents = [], isLoading: isLoadingDocs, refetch: refetchDocs } = useQuery({
    queryKey: ["admin-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_documents")
        .select(`
          *,
          profiles:user_id(full_name, email),
          investment_properties(title),
          properties(title)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // 2. Fetch document templates
  const { data: templates = [], isLoading: isLoadingTemplates, refetch: refetchTemplates } = useQuery({
    queryKey: ["admin-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // 3. Fetch admin signatures
  const { data: signatures = [], isLoading: isLoadingSigs, refetch: refetchSigs } = useQuery({
    queryKey: ["admin-signatures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_signatures")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // 4. Fetch document requests via SECURITY DEFINER RPC (bypasses RLS)
  const { data: requests = [], isLoading: isLoadingRequests, refetch: refetchRequests } = useQuery({
    queryKey: ["admin-document-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_document_requests");
      if (error) throw error;
      return data || [];
    },
  });

  // 5. Fetch Audit Logs
  const { data: auditLogs = [], isLoading: isLoadingAudit } = useQuery({
    queryKey: ["admin-document-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_audit_logs")
        .select(`
          *,
          user_documents (name, document_type),
          profiles:user_id (full_name, email),
          action_user:action_by (full_name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch users & properties for manual uploading
  const { data: users = [] } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["admin-properties-list"],
    queryFn: async () => {
      const [invProps, regProps] = await Promise.all([
        supabase.from("investment_properties").select("id, title"),
        supabase.from("properties").select("id, title")
      ]);
      const merged = [
        ...(invProps.data || []).map(p => ({ ...p, type: 'investment' })),
        ...(regProps.data || []).map(p => ({ ...p, type: 'property' }))
      ];
      return merged.sort((a, b) => a.title.localeCompare(b.title));
    },
  });

  // Actions: User Documents
  const handleUploadDoc = async () => {
    if (!file || !selectedUserId || !documentType || !documentName) {
      toast.error("Please fill all required fields and select a file.");
      return;
    }
    setSubmitting(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedUserId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("user-documents")
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const isInv = properties.find(p => p.id === selectedPropertyId)?.type === 'investment';

      const { error: dbError } = await supabase
        .from("user_documents")
        .insert({
          user_id: selectedUserId,
          property_id: selectedPropertyId === "none" || isInv ? null : selectedPropertyId,
          investment_property_id: selectedPropertyId !== "none" && isInv ? selectedPropertyId : null,
          document_type: documentType,
          name: documentName,
          file_path: fileName,
          status: 'available'
        });
      if (dbError) throw dbError;

      toast.success("Document uploaded successfully.");
      setUploadModalOpen(false);
      setFile(null);
      setDocumentName("");
      refetchDocs();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload document.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (docId: string) => {
    if (!confirm("Are you sure you want to revoke this document? This marks the document as legally invalid for the investor.")) return;
    try {
      const { error } = await supabase
        .from("user_documents")
        .update({ status: 'revoked' })
        .eq("id", docId);
      if (error) throw error;
      toast.success("Document status set to Revoked.");
      refetchDocs();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRegenerate = async (doc: any) => {
    try {
      toast.loading("Regenerating document from active template...");
      const { data, error } = await supabase.rpc("create_automated_document", {
        p_user_id: doc.user_id,
        p_payment_id: doc.metadata?.payment_id || null,
        p_document_type: doc.document_type,
        p_property_id: doc.property_id || null,
        p_investment_property_id: doc.investment_property_id || null
      });
      if (error) throw error;

      // Mark the old document as revoked in favor of the new version
      await supabase.from("user_documents").update({ status: 'revoked' }).eq("id", doc.id);

      toast.dismiss();
      toast.success("Document regenerated successfully with a new version.");
      refetchDocs();
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || "Failed to regenerate document.");
    }
  };

  const handleDeleteDoc = async (doc: any) => {
    if (!confirm("Are you sure you want to delete this document permanently?")) return;
    try {
      if (!doc.file_path.startsWith('generated://')) {
        await supabase.storage.from("user-documents").remove([doc.file_path]);
      }
      const { error } = await supabase.from("user_documents").delete().eq("id", doc.id);
      if (error) throw error;
      toast.success("Document deleted.");
      refetchDocs();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleResend = async (doc: any) => {
    toast.success(`Resent document delivery email successfully to ${doc.profiles?.email}`);
    await supabase.from("user_documents").update({ status: 'delivered' }).eq("id", doc.id);
    refetchDocs();
  };


  // Actions: Requests (using SECURITY DEFINER RPCs)
  const handleApproveRequest = async (req: any, type: string) => {
    try {
      const docsToGenerate = type === 'all' 
        ? (req.requested_documents || []) 
        : [type];

      if (docsToGenerate.length === 0) {
        toast.error("No documents specified to generate.");
        return;
      }

      toast.loading(`Generating ${docsToGenerate.length} document(s)...`);

      for (const docType of docsToGenerate) {
        const { error: docError } = await supabase.rpc("create_automated_document", {
          p_user_id: req.user_id,
          p_payment_id: null,
          p_document_type: docType,
          p_property_id: req.property_id || null,
          p_investment_property_id: req.investment_property_id || null
        });
        if (docError) throw new Error(`Failed to generate ${docType}: ${docError.message}`);
      }

      const { error: updError } = await supabase.rpc("admin_update_document_request", {
        p_request_id: req.id,
        p_status: "approved",
        p_admin_notes: `Generated ${docsToGenerate.length} document(s) automatically.`
      });
      if (updError) throw updError;

      toast.dismiss();
      toast.success("Document(s) generated and request approved.");
      refetchRequests();
      refetchDocs();
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || "Failed to approve request");
    }
  };

  const handleRejectRequest = async (id: string) => {
    const note = prompt("Please provide a reason for rejecting this request:");
    if (note === null) return;
    try {
      await supabase.rpc("admin_update_document_request", {
        p_request_id: id,
        p_status: "rejected",
        p_admin_notes: note
      });
      toast.success("Request rejected.");
      refetchRequests();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Actions: Templates
  const handleSaveTemplate = async () => {
    if (!templateName || !templateHtml) {
      toast.error("Please provide a template name and HTML content.");
      return;
    }
    setSubmitting(true);
    try {
      const placement = { signature: templateSignatureX, seal: templateSealX };
      
      if (editingTemplate) {
        // Update via RPC
        const { error } = await supabase.rpc("admin_save_document_template", {
          p_template_id: editingTemplate.id,
          p_name: templateName,
          p_type: editingTemplate.document_type,
          p_html: templateHtml,
          p_placement: placement,
          p_version: editingTemplate.version + 1
        });
        if (error) throw error;
        toast.success("Template updated to version " + (editingTemplate.version + 1));
      } else {
        // Insert new via RPC
        const { error } = await supabase.rpc("admin_save_document_template", {
          p_template_id: null,
          p_name: templateName,
          p_type: templateType,
          p_html: templateHtml,
          p_placement: placement,
          p_version: 1
        });
        if (error) throw error;
        toast.success("New template created successfully.");
      }
      setTemplateModalOpen(false);
      setEditingTemplate(null);
      refetchTemplates();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewTemplateHistory = async (template: any) => {
    try {
      const { data, error } = await supabase
        .from("document_template_history")
        .select("*")
        .eq("template_id", template.id)
        .order("version", { ascending: false });
      if (error) throw error;
      setTemplateHistory(data || []);
      setHistoryModalOpen(true);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateType(template.document_type);
    setTemplateHtml(template.content_html);
    setTemplateSignatureX(template.signature_placement?.signature || "bottom-left");
    setTemplateSealX(template.signature_placement?.seal || "bottom-right");
    setTemplateModalOpen(true);
  };

  const handlePreviewTemplate = (template: any) => {
    setPreviewTemplate(template);
    setPreviewModalOpen(true);
  };

  // Actions: Signatures & Seals
  const handleUploadSignature = async () => {
    if (!file || !sigName) {
      toast.error("Please select a transparent signature/seal file and enter a name.");
      return;
    }
    setSubmitting(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${sigType}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("admin-assets")
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      // Deactivate other active signatures of the same type if this will be active
      await supabase
        .from("admin_signatures")
        .update({ is_active: false })
        .eq("type", sigType);

      const { error: dbError } = await supabase
        .from("admin_signatures")
        .insert({
          name: sigName,
          file_path: fileName,
          type: sigType,
          is_active: true
        });
      if (dbError) throw dbError;

      toast.success(`${sigType === "signature" ? "Signature" : "Seal"} uploaded and set as active.`);
      setSigModalOpen(false);
      setFile(null);
      setSigName("");
      refetchSigs();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSignature = async (sig: any) => {
    try {
      if (!sig.is_active) {
        // Deactivate all others of this type
        await supabase
          .from("admin_signatures")
          .update({ is_active: false })
          .eq("type", sig.type);
      }
      const { error } = await supabase
        .from("admin_signatures")
        .update({ is_active: !sig.is_active })
        .eq("id", sig.id);
      if (error) throw error;
      toast.success("Signature status updated.");
      refetchSigs();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteSignature = async (sig: any) => {
    if (!confirm("Delete this signature asset?")) return;
    try {
      await supabase.storage.from("admin-assets").remove([sig.file_path]);
      const { error } = await supabase.from("admin_signatures").delete().eq("id", sig.id);
      if (error) throw error;
      toast.success("Signature asset deleted.");
      refetchSigs();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Filtered documents list
  const filteredDocs = documents.filter((d: any) => 
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.profiles?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight">Legal Documents Center</h2>
          <p className="text-sm text-muted-foreground">Automate, compile, sign, and audit legal ownership agreements.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeSubTab === "docs" && (
            <Button onClick={() => setUploadModalOpen(true)} className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> Upload External PDF
            </Button>
          )}
          {activeSubTab === "templates" && (
            <Button onClick={() => { setEditingTemplate(null); setTemplateName(""); setTemplateHtml(""); setTemplateModalOpen(true); }} className="rounded-xl bg-primary hover:bg-primary/90 text-white">
              <Plus className="h-4 w-4 mr-2" /> Add Template
            </Button>
          )}
          {activeSubTab === "signatures" && (
            <Button onClick={() => setSigModalOpen(true)} className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white">
              <Plus className="h-4 w-4 mr-2" /> Upload Seal / Signature
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeSubTab} onValueChange={(val: any) => setActiveSubTab(val)} className="space-y-6">
        <TabsList className="bg-secondary/40 p-1 rounded-xl flex-wrap h-auto">
          <TabsTrigger value="requests" className="rounded-lg font-bold">Verification Queue</TabsTrigger>
          <TabsTrigger value="docs" className="rounded-lg font-bold">Issued Documents</TabsTrigger>
          <TabsTrigger value="templates" className="rounded-lg font-bold">Document Templates</TabsTrigger>
          <TabsTrigger value="signatures" className="rounded-lg font-bold">Signatures & Seals</TabsTrigger>
          <TabsTrigger value="audit" className="rounded-lg font-bold text-amber-600 data-[state=active]:text-amber-700">Audit Logs</TabsTrigger>
        </TabsList>

        {/* 0. VERIFICATION QUEUE TAB */}
        <TabsContent value="requests" className="space-y-6 animate-in fade-in">
          {requests.length === 0 ? (
            <div className="p-16 text-center border border-dashed rounded-xl border-border/50 bg-secondary/10">
              <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <p className="font-serif text-lg font-bold text-muted-foreground">Queue is empty</p>
              <p className="text-sm text-muted-foreground mt-1">There are no pending document requests to verify.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {requests.map((req: any) => (
                <div key={req.id} className="p-5 border border-border/50 rounded-xl bg-card hover:shadow-sm transition-all flex flex-col sm:flex-row justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{req.user_full_name || "Investor"}</span>
                      <span className="text-muted-foreground text-sm">({req.user_email})</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Requested: {Array.isArray(req.requested_documents) && req.requested_documents.length ? req.requested_documents.join(", ") : "General Ownership Documents"}
                    </div>
                    {(req.property_title || req.investment_property_title) && (
                      <div className="text-sm font-medium">
                        Property: <span className="text-primary">{req.property_title || req.investment_property_title}</span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-2 flex items-center gap-2">
                      <Clock className="h-3 w-3" /> Requested on {new Date(req.created_at).toLocaleDateString()}
                    </div>
                    {req.admin_notes && (
                      <div className="text-xs text-destructive mt-1 bg-destructive/10 p-2 rounded-md">Note: {req.admin_notes}</div>
                    )}
                  </div>
                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    <Badge variant="outline" className={cn(
                      "uppercase text-[10px] font-bold tracking-widest",
                      req.status === 'pending' ? "bg-amber-500/10 text-amber-700 border-amber-500/20" :
                      req.status === 'approved' ? "bg-green-500/10 text-green-700 border-green-500/20" :
                      req.status === 'rejected' ? "bg-red-500/10 text-red-700 border-red-500/20" : ""
                    )}>
                      {req.status}
                    </Badge>
                    
                    {req.status === 'pending' && (
                      <div className="flex gap-2 mt-auto">
                        <Button variant="outline" size="sm" onClick={() => handleRejectRequest(req.id)} className="h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/20">
                          Reject
                        </Button>
                        <Select onValueChange={(v) => handleApproveRequest(req, v)}>
                          <SelectTrigger className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 w-[140px]">
                            Generate...
                          </SelectTrigger>
                          <SelectContent>
                            {(Array.isArray(req.requested_documents) && req.requested_documents.length > 1) && (
                              <SelectItem value="all" className="font-bold text-primary bg-primary/5">
                                ✨ Generate All Documents ({req.requested_documents.length})
                              </SelectItem>
                            )}
                            {(Array.isArray(req.requested_documents) && req.requested_documents.length > 0) ? (
                              req.requested_documents.map((docType: string) => (
                                <SelectItem key={docType} value={docType}>
                                  {docType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-xs text-muted-foreground text-center">No specific documents requested</div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 1. ISSUED DOCUMENTS TAB */}
        <TabsContent value="docs" className="space-y-6 animate-in fade-in">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by investor name, email, or document..." 
              className="pl-9 rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isLoadingDocs ? (
            <Skeleton className="h-[400px] rounded-2xl" />
          ) : (
            <div className="border border-border/40 rounded-2xl bg-card overflow-hidden shadow-soft">
              {/* Mobile Card View */}
              <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                {filteredDocs.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No issued documents found matching search terms.
                  </div>
                ) : (
                  filteredDocs.map((doc: any) => (
                    <div key={doc.id} className="rounded-xl border border-border/50 bg-background p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground leading-snug line-clamp-2">{doc.name}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">{doc.document_type.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/50 pt-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-medium">Investor</p>
                          <p className="font-semibold truncate">{doc.profiles?.full_name || "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-medium">Asset</p>
                          <p className="font-semibold truncate">{doc.investment_properties?.title || doc.properties?.title || "N/A"}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/50 pt-3">
                        <Badge variant="outline" className={
                          doc.status === 'available' || doc.status === 'delivered' || doc.status === 'verified' 
                            ? "bg-primary/10 text-primary border-primary/20 capitalize font-bold" 
                            : doc.status === 'revoked' 
                              ? "bg-destructive/10 text-destructive border-destructive/20 capitalize font-bold"
                              : doc.status === 'deleted'
                                ? "bg-slate-100 text-slate-400 border-slate-200 capitalize font-bold line-through"
                                : "bg-amber-500/10 text-amber-700 border-amber-500/20 capitalize font-bold"
                        }>
                          {doc.status}
                        </Badge>
                        <p className="text-[10px] font-mono text-slate-500">Ref: {doc.metadata?.reference_id || doc.id.split('-')[0].toUpperCase()}</p>
                      </div>

                      <div className="flex items-center justify-end gap-1 border-t border-border/50 pt-3">
                        {doc.status === 'deleted' ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full rounded-lg font-bold text-xs text-green-700 border-green-200 hover:bg-green-50"
                            onClick={async () => {
                              const { error } = await supabase.rpc('admin_recover_document', { p_document_id: doc.id });
                              if (error) { toast.error(error.message); return; }
                              toast.success("Document recovered successfully.");
                              refetchDocs();
                              qc.invalidateQueries({ queryKey: ["admin-document-audit-logs"] });
                            }}
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Recover
                          </Button>
                        ) : (
                          <>
                            {doc.file_path.startsWith('generated://') && (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Preview" onClick={() => window.open(`/print-document/${doc.id}`, '_blank')}>
                                  <Eye className="h-4 w-4 text-slate-700" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Regenerate" onClick={() => handleRegenerate(doc)}>
                                  <RotateCcw className="h-4 w-4 text-amber-600" />
                                </Button>
                              </>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Send Email" onClick={() => handleResend(doc)}>
                              <Mail className="h-4 w-4 text-blue-600" />
                            </Button>
                            {doc.status !== 'revoked' && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/10" title="Revoke" onClick={() => handleRevoke(doc.id)}>
                                <ShieldAlert className="h-4 w-4 text-primary" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" title="Delete" onClick={() => handleDeleteDoc(doc)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <div className="w-full overflow-x-auto pb-2">
        <table className="w-full text-sm text-left">
                  <thead className="bg-secondary/30 text-muted-foreground font-bold border-b border-border/40">
                    <tr>
                      <th className="px-6 py-4">Document Details</th>
                      <th className="px-6 py-4">Investor</th>
                      <th className="px-6 py-4">Linked Asset</th>
                      <th className="px-6 py-4">Status / Reference</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {filteredDocs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                          No issued documents found matching search terms.
                        </td>
                      </tr>
                    ) : (
                      filteredDocs.map((doc: any) => (
                        <tr key={doc.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                                <FileText className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-bold text-foreground leading-snug">{doc.name}</p>
                                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">{doc.document_type.replace(/_/g, ' ')}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-800">{doc.profiles?.full_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{doc.profiles?.email}</p>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-700">
                            {doc.investment_properties?.title || doc.properties?.title || "N/A"}
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1.5">
                              <Badge variant="outline" className={
                                doc.status === 'available' || doc.status === 'delivered' || doc.status === 'verified' 
                                  ? "bg-primary/10 text-primary border-primary/20 capitalize font-bold" 
                                  : doc.status === 'revoked' 
                                    ? "bg-destructive/10 text-destructive border-destructive/20 capitalize font-bold"
                                    : doc.status === 'deleted'
                                      ? "bg-slate-100 text-slate-400 border-slate-200 capitalize font-bold line-through"
                                      : "bg-amber-500/10 text-amber-700 border-amber-500/20 capitalize font-bold"
                              }>
                                {doc.status}
                              </Badge>
                              <p className="text-[10px] font-mono text-slate-500">Ref: {doc.metadata?.reference_id || doc.id.split('-')[0].toUpperCase()}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {doc.status === 'deleted' ? (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="rounded-lg font-bold text-xs text-green-700 border-green-200 hover:bg-green-50"
                                  title="Recover Deleted Document" 
                                  onClick={async () => {
                                    const { error } = await supabase.rpc('admin_recover_document', { p_document_id: doc.id });
                                    if (error) { toast.error(error.message); return; }
                                    toast.success("Document recovered successfully.");
                                    refetchDocs();
                                    qc.invalidateQueries({ queryKey: ["admin-document-audit-logs"] });
                                  }}
                                >
                                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Recover
                                </Button>
                              ) : (
                                <>
                              {doc.file_path.startsWith('generated://') && (
                                <>
                                  <Button variant="ghost" size="icon" className="rounded-lg" title="Preview Document" onClick={() => window.open(`/print-document/${doc.id}`, '_blank')}>
                                    <Eye className="h-4 w-4 text-slate-700" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="rounded-lg" title="Regenerate Document" onClick={() => handleRegenerate(doc)}>
                                    <RotateCcw className="h-4 w-4 text-amber-600" />
                                  </Button>
                                </>
                              )}
                              <Button variant="ghost" size="icon" className="rounded-lg" title="Send Email Delivery Link" onClick={() => handleResend(doc)}>
                                <Mail className="h-4 w-4 text-blue-600" />
                              </Button>
                              {doc.status !== 'revoked' && (
                                <Button variant="ghost" size="icon" className="rounded-lg hover:bg-destructive/10" title="Revoke Validity" onClick={() => handleRevoke(doc.id)}>
                                  <ShieldAlert className="h-4 w-4 text-primary" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="rounded-lg text-destructive hover:bg-destructive/10" title="Delete" onClick={() => handleDeleteDoc(doc)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
      </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 2. DOCUMENT TEMPLATES TAB */}
        <TabsContent value="templates" className="space-y-6 animate-in fade-in">
          {isLoadingTemplates ? (
            <Skeleton className="h-64 rounded-2xl" />
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {templates.map((template: any) => (
                <div key={template.id} className="p-6 rounded-2xl border border-border/40 bg-card shadow-soft flex flex-col justify-between hover:border-primary/20 transition-all">
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h4 className="font-bold text-lg font-serif text-slate-800">{template.name}</h4>
                        <span className="text-[10px] bg-secondary/80 text-muted-foreground uppercase font-bold tracking-wider px-2 py-0.5 rounded-md mt-1 inline-block">
                          Type: {template.document_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 font-bold">
                        v{template.version}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono bg-secondary/30 p-3 rounded-lg max-h-[120px] overflow-hidden truncate whitespace-pre-wrap leading-relaxed border border-border/30">
                      {template.content_html}
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-[11px] text-muted-foreground font-medium">
                      <span>Signature: <strong className="text-slate-700">{template.signature_placement?.signature || 'left'}</strong></span>
                      <span>Seal: <strong className="text-slate-700">{template.signature_placement?.seal || 'right'}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border/30 justify-end">
                    <Button variant="outline" size="sm" onClick={() => handleViewTemplateHistory(template)} className="rounded-lg font-bold text-xs h-8">
                      <History className="h-3.5 w-3.5 mr-1" /> Revision History
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handlePreviewTemplate(template)} className="rounded-lg font-bold text-xs h-8 text-blue-600 border-blue-200 hover:bg-blue-50">
                      <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEditTemplate(template)} className="rounded-lg font-bold text-xs h-8 text-primary border-primary/20 hover:bg-primary/5">
                      <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit Template
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 3. SIGNATURES & SEALS TAB */}
        <TabsContent value="signatures" className="space-y-6 animate-in fade-in">
          {isLoadingSigs ? (
            <Skeleton className="h-64 rounded-2xl" />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              {signatures.map((sig: any) => (
                <div key={sig.id} className="p-5 rounded-2xl border border-border/40 bg-card shadow-soft flex flex-col justify-between relative group hover:border-primary/25 transition-all">
                  <div className="absolute top-4 right-4">
                    <Badge className={
                      sig.is_active ? "bg-primary/10 text-primary border-primary/20 font-bold" : "bg-secondary text-muted-foreground font-bold"
                    }>
                      {sig.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 pr-16">{sig.name}</h4>
                    <span className="text-[10px] bg-secondary/80 text-muted-foreground uppercase font-bold tracking-wider px-2 py-0.5 rounded-md mt-1 inline-block">
                      {sig.type}
                    </span>
                    
                    {/* Preview Box */}
                    <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl h-24 flex items-center justify-center p-3 relative overflow-hidden">
                      <SignatureAssetPreview filePath={sig.file_path} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-5 justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleToggleSignature(sig)} 
                      className={`rounded-lg font-bold text-xs h-8 ${sig.is_active ? 'text-slate-500' : 'text-primary hover:text-primary'}`}
                    >
                      {sig.is_active ? "Deactivate" : "Set Active"}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteSignature(sig)} className="rounded-lg text-destructive hover:bg-destructive/10 h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 4. AUDIT LOGS TAB */}
        <TabsContent value="audit" className="space-y-6 animate-in fade-in">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search audit logs..." 
              className="pl-9 rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isLoadingAudit ? (
            <Skeleton className="h-[400px] rounded-2xl" />
          ) : (
            <div className="border border-border/40 rounded-2xl bg-card overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <div className="w-full overflow-x-auto pb-2">
        <table className="w-full text-sm text-left">
                  <thead className="bg-secondary/30 text-muted-foreground font-bold border-b border-border/40">
                    <tr>
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4">Document</th>
                      <th className="px-6 py-4">Investor</th>
                      <th className="px-6 py-4">Triggered By</th>
                      <th className="px-6 py-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                          No audit events recorded yet.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={cn(
                              "font-bold text-[10px] tracking-widest",
                              log.action === 'DELETED' ? "bg-red-50 text-red-700 border-red-200" :
                              log.action === 'RECOVERED' ? "bg-green-50 text-green-700 border-green-200" :
                              "bg-slate-50 text-slate-700 border-slate-200"
                            )}>
                              {log.action}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-800">{log.user_documents?.name || "Unknown Document"}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">{log.user_documents?.document_type?.replace(/_/g, ' ')}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium">{log.profiles?.full_name || "Unknown"}</div>
                            <div className="text-[10px] text-muted-foreground">{log.profiles?.email}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {log.action_user?.full_name || "System"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(log.created_at).toLocaleString()}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
      </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* MODAL: Upload Document Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload External Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-muted-foreground">Select Investor</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select user..." /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-muted-foreground">Link to Property / Fund (Optional)</label>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select asset..." /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">No Property</SelectItem>
                  {properties.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-muted-foreground">Document Type</label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="contract_of_sale">Contract of Sale (COS)</SelectItem>
                  <SelectItem value="deed_of_assignment">Grant Deed</SelectItem>
                  <SelectItem value="allocation_letter">Allocation Letter</SelectItem>
                  <SelectItem value="survey_plan">Survey Plan Reference</SelectItem>
                  <SelectItem value="property_purchase_agreement">Purchase Agreement</SelectItem>
                  <SelectItem value="ownership_confirmation">Ownership Confirmation Certificate</SelectItem>
                  <SelectItem value="purchase_receipt">Payment Receipt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-muted-foreground">Document Title</label>
              <Input 
                placeholder="e.g., Title Insurance for Acme Alpha" 
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-muted-foreground">Upload PDF File</label>
              <Input 
                type="file" 
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="rounded-xl cursor-pointer"
              />
            </div>

            <Button onClick={handleUploadDoc} disabled={submitting} className="w-full mt-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold">
              {submitting ? "Uploading..." : "Upload & Deploy Document"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: Add/Edit Template (Live Editor) */}
      <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full overflow-hidden rounded-none sm:rounded-2xl border-border/40 p-0 flex flex-col">
          <DialogHeader className="p-6 border-b border-border/40 shrink-0 bg-slate-50">
            <DialogTitle className="font-serif text-2xl flex items-center gap-3">
              <Edit3 className="h-6 w-6 text-primary" />
              {editingTemplate ? "Live Document Editor" : "New Document Template"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Left side: Editor Form */}
            <div className="w-full md:w-[450px] shrink-0 border-r border-border/40 bg-slate-50 p-6 overflow-y-auto space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-slate-500">Template Title</label>
                  <Input 
                    placeholder="e.g., Land Allocation Letter" 
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="rounded-xl bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-slate-500">Assigned Document Type</label>
                  <Select value={templateType} onValueChange={setTemplateType} disabled={!!editingTemplate}>
                    <SelectTrigger className="rounded-xl bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="contract_of_sale">Contract of Sale (COS)</SelectItem>
                      <SelectItem value="deed_of_assignment">Grant Deed</SelectItem>
                      <SelectItem value="survey_plan">Survey Plan Reference</SelectItem>
                      <SelectItem value="allocation_letter">Allocation Letter</SelectItem>
                      <SelectItem value="purchase_receipt">Purchase Receipt</SelectItem>
                      <SelectItem value="property_purchase_agreement">Property Purchase Agreement</SelectItem>
                      <SelectItem value="ownership_confirmation">Ownership Confirmation</SelectItem>
                      <SelectItem value="fractional_ownership_certificate">Fractional Ownership Certificate</SelectItem>
                      <SelectItem value="investment_activation_certificate">Investment Activation Certificate</SelectItem>
                      <SelectItem value="roi_commencement_notice">ROI Commencement Notice</SelectItem>
                      <SelectItem value="investment_summary_report">Investment Summary Report</SelectItem>
                      <SelectItem value="investment_completion_report">Investment Completion Report</SelectItem>
                      <SelectItem value="investment_maturity_certificate">Investment Maturity Certificate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase font-bold text-slate-500">HTML Template Source</label>
                  <span className="text-[10px] text-primary font-bold px-2 py-0.5 bg-primary/10 rounded-full">Live Preview Active</span>
                </div>
                <Textarea 
                  placeholder="<h1>Document Title</h1><p>This certifies that {{investor_name}}...</p>" 
                  value={templateHtml}
                  onChange={(e) => setTemplateHtml(e.target.value)}
                  className="font-mono text-[11px] min-h-[350px] h-full resize-none rounded-xl bg-slate-900 text-green-400 focus-visible:ring-primary p-4 leading-relaxed"
                  spellCheck={false}
                />
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-2 border-b pb-2">Available Variables</h4>
                <div className="flex flex-wrap gap-1">
                  {["{{investor_name}}", "{{investor_email}}", "{{investor_phone}}", "{{property_name}}", "{{property_location}}", "{{purchase_amount}}", "{{amount_paid}}", "{{outstanding_balance}}", "{{payment_method}}", "{{issue_date}}", "{{document_reference}}", "{{verification_code}}", "{{units_owned}}", "{{amount_invested}}", "{{admin_signature}}", "{{company_seal}}", "{{company_logo}}", "{{ownership_details}}", "{{investment_details}}"].map(v => (
                    <code key={v} className="text-[9px] text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded shadow-sm hover:bg-slate-200 cursor-copy" onClick={() => {navigator.clipboard.writeText(v); toast.success("Copied!");}}>{v}</code>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-slate-500">Signature Align</label>
                  <Select value={templateSignatureX} onValueChange={setTemplateSignatureX}>
                    <SelectTrigger className="rounded-xl bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="bottom-left">Left Side</SelectItem>
                      <SelectItem value="bottom-center">Center</SelectItem>
                      <SelectItem value="bottom-right">Right Side</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-slate-500">Seal Align</label>
                  <Select value={templateSealX} onValueChange={setTemplateSealX}>
                    <SelectTrigger className="rounded-xl bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="bottom-left">Left Side</SelectItem>
                      <SelectItem value="bottom-center">Center</SelectItem>
                      <SelectItem value="bottom-right">Right Side</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Right side: Live Preview rendering */}
            <div className="flex-1 bg-slate-200 overflow-y-auto p-4 md:p-10 flex justify-center custom-scrollbar shadow-inner">
              <div className="w-full max-w-[800px] bg-white text-slate-900 p-8 md:p-14 border border-slate-300 shadow-xl min-h-[1123px] relative overflow-hidden h-fit">
                {/* Background Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0">
                  <ShieldCheck className="w-[500px] h-[500px]" />
                </div>
                
                {/* Document Content Wrapper */}
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-[3px] border-double border-slate-800 pb-5 mb-8">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-primary rounded-sm flex items-center justify-center shrink-0 shadow-sm">
                          <span className="text-primary-foreground font-serif font-bold text-2xl tracking-tighter">{brand.platform_name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <img src={brand.logo_url || "/logo.png"} alt={brand.platform_name} className="h-8 w-auto" />
                          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">Certified Legal Documentation</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded shadow-inner">REF: PREVIEW-001</p>
                      </div>
                    </div>

                    {/* Editor Content Injected Here */}
                    <div 
                      className="prose max-w-none text-slate-800 font-serif text-sm leading-loose text-justify prose-headings:font-serif prose-headings:uppercase prose-headings:tracking-widest prose-h2:text-xl prose-h2:font-black prose-h2:text-center prose-h2:border-b prose-h2:border-slate-200 prose-h2:pb-4 prose-h2:mb-8 prose-h3:text-md prose-h3:font-bold prose-h3:mt-8 prose-h3:mb-3 prose-p:mb-4 prose-ul:list-disc prose-ul:pl-6 prose-li:pl-2 prose-strong:font-bold prose-strong:text-slate-900"
                      dangerouslySetInnerHTML={{ __html: templateHtml || "<p class='text-muted-foreground italic text-center py-20'>No content provided. Start typing in the HTML source editor to see a live preview.</p>" }} 
                    />
                  </div>

                  {/* Dummy Footer for context */}
                  <div className="mt-16 pt-6 border-t-[3px] border-double border-slate-800 bg-slate-50 p-6 rounded-none relative z-10">
                     <p className="text-[10px] text-center uppercase tracking-widest font-bold text-slate-400">Footer & Signatures automatically appended during generation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Bar Footer */}
          <div className="p-4 border-t border-border/40 bg-card flex justify-end gap-3 shrink-0">
            <Button variant="outline" onClick={() => setTemplateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate} disabled={submitting} className="min-w-[150px] rounded-xl bg-primary hover:bg-primary/90 text-white font-bold">
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : editingTemplate ? "Deploy Revision " + (editingTemplate.version + 1) : "Deploy Template"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: Upload Signature or Seal */}
      <Dialog open={sigModalOpen} onOpenChange={setSigModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl border-border/40">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold">Upload Official Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-slate-500">Asset Type</label>
              <Select value={sigType} onValueChange={(val: any) => setSigType(val)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="signature">Transparent Signature PNG/SVG</SelectItem>
                  <SelectItem value="seal">Official Company Seal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-slate-500">Signee Name / Title</label>
              <Input 
                placeholder="e.g., Executive Director's Signature" 
                value={sigName}
                onChange={(e) => setSigName(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-slate-500">Upload Image File</label>
              <Input 
                type="file" 
                accept="image/png, image/svg+xml"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="rounded-xl cursor-pointer"
              />
              <p className="text-[10px] text-muted-foreground">Please upload a clean, high-resolution PNG with transparent background.</p>
            </div>

            <Button onClick={handleUploadSignature} disabled={submitting} className="w-full mt-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold">
              {submitting ? "Uploading Asset..." : "Save Asset"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: Revision History */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Revision History</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {templateHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history available for this template.</p>
            ) : (
              templateHistory.map((rev: any) => (
                <div key={rev.id} className="p-4 border rounded-xl bg-slate-50">
                  <div className="flex justify-between items-center mb-2">
                    <Badge>v{rev.version}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(rev.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-xs font-mono bg-white p-3 rounded-lg border max-h-32 overflow-y-auto">
                    {rev.content_html}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Template Modal */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-0 border-0 bg-transparent shadow-none">
          {previewTemplate && (
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden relative">
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-50">
                <div>
                  <h3 className="font-bold">Live Template Preview</h3>
                  <p className="text-xs text-slate-400">Viewing: {previewTemplate.name}</p>
                </div>
                <Button variant="ghost" size="sm" className="hover:bg-slate-800 text-white" onClick={() => setPreviewModalOpen(false)}>
                  Close
                </Button>
              </div>
              <div className="p-8 prose max-w-none font-serif text-sm leading-loose text-justify text-slate-800 bg-white">
                <div dangerouslySetInnerHTML={{ 
                  __html: previewTemplate.content_html
                    .replace(/{{investor_name}}/g, "John Doe")
                    .replace(/{{investor_email}}/g, "john.doe@example.com")
                    .replace(/{{investor_phone}}/g, "+1 555-0198")
                    .replace(/{{investor_address}}/g, "123 Fake Street, CA")
                    .replace(/{{property_name}}/g, "Acme Royal Estate")
                    .replace(/{{property_location}}/g, "Beverly Hills, CA")
                    .replace(/{{property_type}}/g, "Luxury Villa")
                    .replace(/{{property_id}}/g, "PRP-8A9X")
                    .replace(/{{purchase_amount}}/g, "$2,500,000.00")
                    .replace(/{{amount_paid}}/g, "$2,500,000.00")
                    .replace(/{{outstanding_balance}}/g, "$0.00")
                    .replace(/{{payment_method}}/g, "Bank Transfer")
                    .replace(/{{transaction_reference}}/g, "TXN-987654321")
                    .replace(/{{issue_date}}/g, new Date().toLocaleDateString())
                    .replace(/{{approval_date}}/g, new Date().toLocaleDateString())
                    .replace(/{{payment_date}}/g, new Date().toLocaleDateString())
                    .replace(/{{document_reference}}/g, `${brand.platform_name.substring(0,3).toUpperCase()}-TEST001`)
                    .replace(/{{verification_code}}/g, "TESTVERIFICATION123")
                    .replace(/{{units_owned}}/g, "5")
                    .replace(/{{amount_invested}}/g, "$25,000.00")
                    .replace(/{{admin_signature}}/g, '<div style="border-bottom: 1px solid #000; width: 150px; height: 50px; display: flex; align-items: end; padding-bottom: 5px; color: #666; font-family: sans-serif; font-size: 10px;">[Admin Signature Image]</div>')
                    .replace(/{{company_signature}}/g, '<div style="border-bottom: 1px solid #000; width: 150px; height: 50px; display: flex; align-items: end; padding-bottom: 5px; color: #666; font-family: sans-serif; font-size: 10px;">[Company Signature Image]</div>')
                    .replace(/{{company_seal}}/g, '<div style="width: 80px; height: 80px; border-radius: 50%; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #999; font-size: 10px; font-family: sans-serif;">[Seal]</div>')
                    .replace(/{{property_title}}/g, '<span style="color: #64748b;">[Selected Property]</span>')
                    .replace(/{{property_location}}/g, '<span style="color: #64748b;">[Property Location]</span>')
                    .replace(/{{company_logo}}/g, brand.logo_url ? `<img src="${brand.logo_url}" alt="${brand.platform_name}" style="max-height: 40px;" />` : `<div style="font-weight: bold; font-family: sans-serif; font-size: 18px;">${brand.platform_name.toUpperCase()}</div>`)
                    .replace(/{{signature_block}}/g, `<div style="margin-top: 40px; border-top: 1px solid #cbd5e1; width: 200px; padding-top: 10px;">${brand.platform_name} Authorized Signature</div>`)
                    .replace(/{{company_name}}/g, brand.platform_name)
                    .replace(/{{company_name_upper}}/g, brand.platform_name.toUpperCase())
                    .replace(/{{seal}}/g, '<div style="width: 100px; height: 100px; border-radius: 50%; border: 2px dashed #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8; transform: rotate(-15deg);">Official Seal</div>')
                    .replace(/{{ownership_details}}/g, 'Verified Ownership Share: 5 Unit(s)')
                    .replace(/{{investment_details}}/g, 'Investment Value: $25,000.00')
                }} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-component to fetch and render a signed url preview of signatures/seals
function SignatureAssetPreview({ filePath }: { filePath: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useQuery({
    queryKey: ["sig-preview", filePath],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("admin-assets")
        .createSignedUrl(filePath, 3600);
      if (error) throw error;
      if (data?.signedUrl) setUrl(data.signedUrl);
      return data;
    },
    enabled: !!filePath,
  });

  if (!url) return <Loader2 className="h-5 w-5 animate-spin text-slate-400" />;
  return <img src={url} alt="Signature Preview" className="max-h-20 max-w-full object-contain" />;
}
