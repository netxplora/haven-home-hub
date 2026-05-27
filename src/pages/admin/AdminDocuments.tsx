import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle2, AlertCircle, Upload, Trash2, Search, Plus, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function AdminDocuments() {
  const qc = useQueryClient();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  // Form state
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState("none");
  const [documentType, setDocumentType] = useState("c_of_o");
  const [documentName, setDocumentName] = useState("");
  const [search, setSearch] = useState("");

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["admin-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_documents" as any)
        .select(`
          *,
          profiles:user_id(full_name, email),
          investment_properties(title),
          properties(title)
        `)
        .order("created_at", { ascending: false });
      if (error && error.code !== '42P01') throw error;
      return data || [];
    },
  });

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
      const merged = [...(invProps.data || []), ...(regProps.data || [])];
      return merged.sort((a, b) => a.title.localeCompare(b.title));
    },
  });

  const handleUpload = async () => {
    if (!file || !selectedUserId || !documentType || !documentName) {
      toast({ title: "Validation Error", description: "Please fill all required fields and select a file.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedUserId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("user-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("user_documents" as any)
        .insert({
          user_id: selectedUserId,
          property_id: selectedPropertyId === "none" ? null : selectedPropertyId,
          document_type: documentType,
          name: documentName,
          file_path: fileName,
          status: 'available'
        });

      if (dbError) throw dbError;

      toast({ title: "Success", description: "Document uploaded successfully." });
      setUploadModalOpen(false);
      setFile(null);
      setDocumentName("");
      qc.invalidateQueries({ queryKey: ["admin-documents"] });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: any) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    
    try {
      // 1. Delete from storage
      await supabase.storage.from("user-documents").remove([doc.file_path]);
      
      // 2. Delete from DB
      const { error } = await supabase.from("user_documents" as any).delete().eq("id", doc.id);
      if (error) throw error;
      
      toast({ title: "Deleted", description: "Document removed." });
      qc.invalidateQueries({ queryKey: ["admin-documents"] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleSimulateEmail = async (doc: any) => {
    toast({ title: "Email Dispatched", description: `Sent ${doc.name} to ${doc.profiles?.email}` });
    await supabase.from("user_documents" as any).update({ status: 'delivered' }).eq("id", doc.id);
    qc.invalidateQueries({ queryKey: ["admin-documents"] });
  };

  const filteredDocs = documents.filter((d: any) => 
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.profiles?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold">Document Management</h2>
          <p className="text-sm text-muted-foreground">Upload and manage investor documents.</p>
        </div>
        <Button onClick={() => setUploadModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Upload Document
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search by user or document name..." 
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-[400px] rounded-xl" />
      ) : (
        <div className="border border-border/50 rounded-xl bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/30 text-muted-foreground font-semibold border-b border-border/50">
                <tr>
                  <th className="px-5 py-3">Document</th>
                  <th className="px-5 py-3">Investor</th>
                  <th className="px-5 py-3">Property</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                      No documents found.
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((doc: any) => (
                    <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{doc.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">{doc.document_type.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium">{doc.profiles?.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{doc.profiles?.email}</p>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {doc.investment_properties?.title || doc.properties?.title || "N/A"}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="outline" className={
                          doc.status === 'available' || doc.status === 'verified' || doc.status === 'delivered' ? "bg-orange-500/10 text-orange-600 border-orange-500/20 capitalize" : "bg-amber-500/10 text-amber-600 border-amber-500/20 capitalize"
                        }>
                          {doc.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleSimulateEmail(doc)} className="text-blue-600 hover:bg-blue-50" title="Resend to Investor">
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)} className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Select Investor</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                <SelectContent>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold">Link to Property (Optional)</label>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger><SelectValue placeholder="Select property..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Property</SelectItem>
                  {properties.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Document Type</label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="c_of_o">Certificate of Occupancy (C of O)</SelectItem>
                  <SelectItem value="deed">Deed of Assignment</SelectItem>
                  <SelectItem value="allocation_letter">Allocation Letter</SelectItem>
                  <SelectItem value="survey">Survey Plan</SelectItem>
                  <SelectItem value="contract">Contract of Sale</SelectItem>
                  <SelectItem value="other">Other Document</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Document Name</label>
              <Input 
                placeholder="e.g., C of O for Haven Alpha" 
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Upload File (PDF)</label>
              <Input 
                type="file" 
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            <Button onClick={handleUpload} disabled={uploading} className="w-full mt-4">
              {uploading ? "Uploading..." : "Upload Document"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
