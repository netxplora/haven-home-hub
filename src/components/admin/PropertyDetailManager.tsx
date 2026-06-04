import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, FileText, Route, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function PropertyDetailManager({ propertyId, propertyTitle, open, onOpenChange }: { propertyId: string, propertyTitle: string, open: boolean, onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="bg-primary p-6 shrink-0 text-white">
          <DialogTitle className="font-serif text-2xl">Manage Details: {propertyTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-accent/20">
          <Tabs defaultValue="liquidity" className="w-full h-full flex flex-col">
            <div className="px-6 pt-4 bg-background border-b border-border/50">
              <TabsList className="bg-transparent gap-4">
                <TabsTrigger value="liquidity" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2"><ShieldCheck className="h-4 w-4 mr-2"/>Liquidity Rules</TabsTrigger>
                <TabsTrigger value="journey" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2"><Route className="h-4 w-4 mr-2"/>Investment Journey</TabsTrigger>
                <TabsTrigger value="documents" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2"><FileText className="h-4 w-4 mr-2"/>Documents</TabsTrigger>
              </TabsList>
            </div>
            
            <div className="p-6 flex-1 overflow-auto">
              <TabsContent value="liquidity" className="m-0 h-full"><LiquidityTab propertyId={propertyId} /></TabsContent>
              <TabsContent value="journey" className="m-0 h-full"><JourneyTab propertyId={propertyId} /></TabsContent>
              <TabsContent value="documents" className="m-0 h-full"><DocumentsTab propertyId={propertyId} /></TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LiquidityTab({ propertyId }: { propertyId: string }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-prop-liquidity", propertyId],
    queryFn: async () => {
      const { data } = await supabase.from("investment_properties").select("liquidity_rules").eq("id", propertyId).single();
      setRules(data?.liquidity_rules || "");
      return data;
    }
  });

  async function handleSave() {
    setLoading(true);
    const { error } = await supabase.from("investment_properties").update({ liquidity_rules: rules }).eq("id", propertyId);
    setLoading(false);
    if (error) toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Liquidity rules updated" });
      qc.invalidateQueries({ queryKey: ["admin-prop-liquidity", propertyId] });
    }
  }

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-serif font-bold">Liquidity & Secondary Market Rules</h3>
        <p className="text-sm text-muted-foreground mb-4">Explain the exit options, lock-up periods, and secondary market availability for this property. This will be shown to investors on the property details page.</p>
        <Textarea 
          rows={10} 
          placeholder="e.g. 12-month lock-up period. After 12 months, units can be traded on the secondary market..."
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          className="resize-none bg-background rounded-xl font-medium"
        />
      </div>
      <Button onClick={handleSave} disabled={loading} className="rounded-xl font-bold px-8">
        {loading ? "Saving..." : "Save Rules"}
      </Button>
    </div>
  );
}

function JourneyTab({ propertyId }: { propertyId: string }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ stage_name: "", description: "", expected_date: "", completed_date: "", status: "pending", sort_order: 0 });
  const [saving, setSaving] = useState(false);

  const { data: journey = [], isLoading } = useQuery({
    queryKey: ["admin-prop-journey", propertyId],
    queryFn: async () => {
      const { data } = await supabase.from("property_journey").select("*").eq("property_id", propertyId).order("sort_order", { ascending: true });
      return data || [];
    }
  });

  async function handleAdd() {
    setSaving(true);
    const { error } = await supabase.from("property_journey").insert({
      property_id: propertyId,
      stage_name: form.stage_name,
      description: form.description || null,
      expected_date: form.expected_date || null,
      completed_date: form.completed_date || null,
      status: form.status,
      sort_order: Number(form.sort_order)
    });
    setSaving(false);
    if (error) toast({ title: "Failed to add", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Journey stage added" });
      setAdding(false);
      setForm({ stage_name: "", description: "", expected_date: "", completed_date: "", status: "pending", sort_order: 0 });
      qc.invalidateQueries({ queryKey: ["admin-prop-journey", propertyId] });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this stage?")) return;
    const { error } = await supabase.from("property_journey").delete().eq("id", id);
    if (error) toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    else qc.invalidateQueries({ queryKey: ["admin-prop-journey", propertyId] });
  }

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-serif font-bold">Investment Journey</h3>
          <p className="text-sm text-muted-foreground">Define the timeline of acquisition, development, and operation.</p>
        </div>
        <Button onClick={() => setAdding(!adding)} variant="outline" className="rounded-xl"><Plus className="h-4 w-4 mr-2"/> Add Stage</Button>
      </div>

      {adding && (
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm grid gap-4 grid-cols-2">
          <div className="space-y-2 col-span-2 sm:col-span-1">
            <Label>Stage Name</Label>
            <Input value={form.stage_name} onChange={e => setForm({...form, stage_name: e.target.value})} placeholder="e.g. Property Acquisition" className="rounded-xl" />
          </div>
          <div className="space-y-2 col-span-2 sm:col-span-1">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
              <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 col-span-2 sm:col-span-1">
            <Label>Expected Date</Label>
            <Input type="date" value={form.expected_date} onChange={e => setForm({...form, expected_date: e.target.value})} className="rounded-xl" />
          </div>
          <div className="space-y-2 col-span-2 sm:col-span-1">
            <Label>Completed Date</Label>
            <Input type="date" value={form.completed_date} onChange={e => setForm({...form, completed_date: e.target.value})} className="rounded-xl" />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="rounded-xl resize-none" rows={2} />
          </div>
          <div className="space-y-2 col-span-2 sm:col-span-1">
            <Label>Sort Order</Label>
            <Input type="number" value={form.sort_order} onChange={e => setForm({...form, sort_order: Number(e.target.value)})} className="rounded-xl" />
          </div>
          <div className="col-span-2 flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setAdding(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !form.stage_name} className="rounded-xl">Save Stage</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {journey.map((stage: any) => (
          <div key={stage.id} className="bg-card p-4 rounded-xl border border-border shadow-sm flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold">{stage.stage_name}</span>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md font-bold ${
                  stage.status === 'completed' ? 'bg-green-500/10 text-green-600' :
                  stage.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600' : 'bg-gray-500/10 text-gray-500'
                }`}>{stage.status}</span>
                <span className="text-xs text-muted-foreground">Order: {stage.sort_order}</span>
              </div>
              <p className="text-sm text-muted-foreground">{stage.description}</p>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground font-medium">
                {stage.expected_date && <span>Expected: {stage.expected_date}</span>}
                {stage.completed_date && <span>Completed: {stage.completed_date}</span>}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg" onClick={() => handleDelete(stage.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {journey.length === 0 && !adding && (
          <div className="text-center p-8 border border-dashed border-border rounded-xl text-muted-foreground">
            No journey stages added yet.
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentsTab({ propertyId }: { propertyId: string }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", document_type: "prospectus", document_date: "", size_bytes: 0 });
  const [saving, setSaving] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["admin-prop-docs", propertyId],
    queryFn: async () => {
      const { data } = await supabase.from("property_documents").select("*").eq("property_id", propertyId).order("created_at", { ascending: true });
      return data || [];
    }
  });

  async function handleAdd() {
    setSaving(true);
    const { error } = await supabase.from("property_documents").insert({
      property_id: propertyId,
      title: form.title,
      url: form.url,
      document_type: form.document_type,
      document_date: form.document_date || null,
      size_bytes: Number(form.size_bytes)
    });
    setSaving(false);
    if (error) toast({ title: "Failed to add", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Document added" });
      setAdding(false);
      setForm({ title: "", url: "", document_type: "prospectus", document_date: "", size_bytes: 0 });
      qc.invalidateQueries({ queryKey: ["admin-prop-docs", propertyId] });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this document?")) return;
    const { error } = await supabase.from("property_documents").delete().eq("id", id);
    if (error) toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    else qc.invalidateQueries({ queryKey: ["admin-prop-docs", propertyId] });
  }

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-serif font-bold">Property Documents</h3>
          <p className="text-sm text-muted-foreground">Manage files like prospectus, financial reports, and valuation certificates.</p>
        </div>
        <Button onClick={() => setAdding(!adding)} variant="outline" className="rounded-xl"><Plus className="h-4 w-4 mr-2"/> Add Document</Button>
      </div>

      {adding && (
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm grid gap-4 grid-cols-2">
          <div className="space-y-2 col-span-2 sm:col-span-1">
            <Label>Document Title</Label>
            <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Q3 Valuation Report" className="rounded-xl" />
          </div>
          <div className="space-y-2 col-span-2 sm:col-span-1">
            <Label>Document URL</Label>
            <Input value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://..." className="rounded-xl" />
          </div>
          <div className="space-y-2 col-span-2 sm:col-span-1">
            <Label>Type</Label>
            <Select value={form.document_type} onValueChange={(v) => setForm({...form, document_type: v})}>
              <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="prospectus">Prospectus</SelectItem>
                <SelectItem value="financial_report">Financial Report</SelectItem>
                <SelectItem value="valuation">Valuation Report</SelectItem>
                <SelectItem value="certificate">Legal Certificate</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 col-span-2 sm:col-span-1">
            <Label>Date</Label>
            <Input type="date" value={form.document_date} onChange={e => setForm({...form, document_date: e.target.value})} className="rounded-xl" />
          </div>
          <div className="space-y-2 col-span-2 sm:col-span-1">
            <Label>Size (Bytes) - Optional</Label>
            <Input type="number" value={form.size_bytes} onChange={e => setForm({...form, size_bytes: Number(e.target.value)})} className="rounded-xl" />
          </div>
          <div className="col-span-2 flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setAdding(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !form.title || !form.url} className="rounded-xl">Save Document</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {docs.map((doc: any) => (
          <div key={doc.id} className="bg-card p-4 rounded-xl border border-border shadow-sm flex justify-between items-center group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary rounded-lg text-muted-foreground"><FileText className="h-5 w-5" /></div>
              <div>
                <a href={doc.url} target="_blank" rel="noreferrer" className="font-bold hover:text-primary transition-colors">{doc.title}</a>
                <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                  <span className="capitalize">{doc.document_type.replace('_', ' ')}</span>
                  {doc.document_date && <span>• {doc.document_date}</span>}
                  {doc.size_bytes > 0 && <span>• {(doc.size_bytes / 1024 / 1024).toFixed(1)} MB</span>}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 rounded-lg" onClick={() => handleDelete(doc.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {docs.length === 0 && !adding && (
          <div className="text-center p-8 border border-dashed border-border rounded-xl text-muted-foreground">
            No documents added yet.
          </div>
        )}
      </div>
    </div>
  );
}
