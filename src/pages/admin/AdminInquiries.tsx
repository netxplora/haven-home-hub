import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, User, Mail, Phone, Trash2, CheckCircle2, Clock, AlertCircle, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AdminInquiries() {
  const qc = useQueryClient();
  const { data: inquiries = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-inquiries"],
    queryFn: async () => (await (supabase as any).from("inquiries").select("*, properties(title, slug), agents(full_name)").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: agents = [] } = useQuery({ 
    queryKey: ["admin-agents-list"], 
    queryFn: async () => (await (supabase as any).from("agents").select("id, full_name").order("full_name")).data ?? [] 
  });

  async function updateInquiry(id: string, payload: any) {
    const { error } = await (supabase as any).from("inquiries").update(payload).eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Inquiry updated" });
      refetch();
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this inquiry?")) return;
    const { error } = await (supabase as any).from("inquiries").delete().eq("id", id);
    if (!error) {
      toast({ title: "Inquiry removed" });
      refetch();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold">General Inquiries</h2>
        <p className="text-sm text-muted-foreground">Monitor and respond to property questions and lead inquiries.</p>
      </div>

      <div className="space-y-4">
        {inquiries.map((i: any) => (
          <div key={i.id} className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-6 transition-all hover:shadow-lg hover:border-primary/20">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex-1 min-w-[300px] space-y-4">
                <div className="flex items-center justify-between">
                  {i.properties ? (
                    <Link to={`/properties/${i.properties?.slug}`} className="font-serif text-lg font-bold hover:text-primary transition-colors">
                      {i.properties?.title}
                    </Link>
                  ) : (
                    <span className="font-serif text-lg font-bold text-muted-foreground italic flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" /> General Inquiry
                    </span>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                    <Clock className="h-3 w-3" />
                    {new Date(i.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center text-muted-foreground">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider leading-none mb-1">Sender</p>
                      <p className="text-sm font-medium">{i.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider leading-none mb-1">Contact</p>
                      <p className="text-sm font-medium truncate">{i.email}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-secondary/20 p-4 text-sm text-foreground/80 leading-relaxed border border-border/30 shadow-inner">
                  {i.message}
                </div>

                {/* Existing admin response */}
                {i.admin_response && (
                  <div className="rounded-xl bg-primary/5 p-4 text-sm text-foreground/80 leading-relaxed border border-primary/20">
                    <p className="text-xs font-medium text-primary uppercase tracking-wider mb-2">Admin Response</p>
                    {i.admin_response}
                  </div>
                )}

                {/* Reply form */}
                <InquiryReplyForm inquiryId={i.id} existingResponse={i.admin_response} onSave={updateInquiry} />
              </div>

              <div className="flex flex-col gap-3 w-full sm:w-auto sm:items-end">
                <Badge variant={
                  i.status === "resolved" ? "default" : 
                  i.status === "in_progress" ? "secondary" : 
                  i.status === "closed" ? "outline" : "outline"
                } className={`h-6 rounded-md uppercase text-[9px] tracking-widest font-bold px-3 ${i.status === 'new' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : ''}`}>
                  {i.status}
                </Badge>

                <div className="space-y-2 w-full sm:w-[200px]">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Follow-up Agent</Label>
                    <Select defaultValue={i.agent_id ?? "none"} onValueChange={(v) => updateInquiry(i.id, { agent_id: v === "none" ? null : v })}>
                      <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue placeholder="Assign" /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="none">Unassigned</SelectItem>
                        {agents.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Status</Label>
                    <Select defaultValue={i.status} onValueChange={(v) => updateInquiry(i.id, { status: v as any })}>
                      <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="new">New Inquiry</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => remove(i.id)} 
                  className="h-8 text-xs text-muted-foreground hover:text-destructive self-end group-hover:opacity-100 opacity-0 transition-opacity"
                >
                  <Trash2 className="mr-2 h-3 w-3" /> Remove Inquiry
                </Button>
              </div>
            </div>
          </div>
        ))}
        {inquiries.length === 0 && !isLoading && (
          <div className="p-16 text-center rounded-xl border border-dashed border-border/50 bg-secondary/10">
            <MessageSquare className="h-14 w-14 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="font-serif text-xl text-muted-foreground italic">No inquiries found.</p>
            <p className="text-sm text-muted-foreground mt-1">Direct questions from site visitors will be listed here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InquiryReplyForm({ inquiryId, existingResponse, onSave }: { inquiryId: string; existingResponse?: string; onSave: (id: string, payload: any) => Promise<void> }) {
  const [reply, setReply] = useState(existingResponse ?? "");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSend = async () => {
    if (!reply.trim()) return;
    setSending(true);
    await onSave(inquiryId, { admin_response: reply.trim(), status: "resolved" });
    setSending(false);
    setOpen(false);
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl self-start" onClick={() => setOpen(true)}>
        <Send className="mr-2 h-3 w-3" /> {existingResponse ? "Edit Response" : "Write Response"}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder="Type your response to this inquiry..."
        className="min-h-[80px] rounded-xl text-sm bg-accent/50 border-border/50 focus:border-primary/30"
      />
      <div className="flex gap-2">
        <Button size="sm" className="h-8 text-xs rounded-xl" onClick={handleSend} disabled={sending || !reply.trim()}>
          <Send className="mr-2 h-3 w-3" /> {sending ? "Sending..." : "Send & Resolve"}
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs rounded-xl" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
