import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  useSupport,
  SupportTicket,
  SupportMessage,
  SupportNote,
  SupportEvent,
  TicketStatus,
  TicketPriority,
} from "@/hooks/useSupport";
import {
  MessageSquare,
  Send,
  Paperclip,
  Search,
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Loader2,
  Clock,
  Check,
  CheckCheck,
  User,
  Users,
  Tag,
  AlertTriangle,
  ShieldCheck,
  StickyNote,
  History,
  ChevronDown,
  ChevronRight,
  X,
  Star,
  MoreHorizontal,
  Filter,
  Inbox,
  ArrowUpDown,
  RefreshCw,
  Eye,
  Building2,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(status: string) {
  switch (status) {
    case "open":
      return "bg-blue-500/10 text-blue-600 border-blue-200";
    case "pending":
      return "bg-amber-500/10 text-amber-600 border-amber-200";
    case "awaiting_user":
      return "bg-purple-500/10 text-purple-600 border-purple-200";
    case "resolved":
      return "bg-green-500/10 text-green-600 border-green-200";
    case "closed":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function priorityColor(priority: string) {
  switch (priority) {
    case "critical":
      return "bg-red-500/10 text-red-600 border-red-200";
    case "high":
      return "bg-orange-500/10 text-orange-600 border-orange-200";
    case "medium":
      return "bg-amber-500/10 text-amber-600 border-amber-200";
    case "low":
      return "bg-slate-500/10 text-slate-600 border-slate-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Component ────────────────────────────────────────────────────────────────

export function AdminSupportCenter() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // Right panel tab
  const [detailTab, setDetailTab] = useState<"details" | "notes" | "events">(
    "details"
  );

  // Message & Note composing
  const [messageText, setMessageText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Data from hook ─────────────────────────────────────────────────────────
  const {
    ticket,
    ticketLoading,
    messages,
    messagesLoading,
    notes,
    events,
    staff,
    sendMessage,
    sendMessagePending,
    updateTicket,
    updateTicketPending,
    addNote,
    addNotePending,
    uploadAttachment,
  } = useSupport(selectedTicketId || undefined, true);

  // ── All Tickets Query (admin-scoped) ───────────────────────────────────────
  const allTicketsQuery = useQuery({
    queryKey: ["admin-support-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*, support_categories(name)")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SupportTicket[];
    },
  });

  // Realtime subscription for ticket list updates
  useEffect(() => {
    const channel = supabase
      .channel("admin-support-tickets-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        () => {
          qc.invalidateQueries({ queryKey: ["admin-support-tickets"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const allTickets = allTicketsQuery.data ?? [];

  // ── Filtered + Sorted Tickets ──────────────────────────────────────────────
  const filteredTickets = allTickets
    .filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter)
        return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.support_categories?.name || "").toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.last_message_at).getTime();
      const dateB = new Date(b.last_message_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const statCounts = {
    total: allTickets.length,
    open: allTickets.filter((t) => t.status === "open").length,
    pending: allTickets.filter(
      (t) => t.status === "pending" || t.status === "awaiting_user"
    ).length,
    resolved: allTickets.filter(
      (t) => t.status === "resolved" || t.status === "closed"
    ).length,
  };

  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedTicketId) return;
    const text = messageText;
    setMessageText("");
    try {
      await sendMessage({
        ticket_id: selectedTicketId,
        message_text: text.trim(),
        sender_type: "agent",
        sender_name:
          user?.user_metadata?.full_name || user?.email || "Support Agent",
      });
    } catch (err: any) {
      toast({
        title: "Failed to send",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !selectedTicketId) return;
    const text = noteText;
    setNoteText("");
    try {
      await addNote({ ticket_id: selectedTicketId, note_text: text.trim() });
      toast({ title: "Private note added" });
    } catch (err: any) {
      toast({
        title: "Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!selectedTicketId) return;
    try {
      await updateTicket({ id: selectedTicketId, status: newStatus });
      toast({ title: `Ticket marked as ${newStatus}` });
    } catch (err: any) {
      toast({
        title: "Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handlePriorityChange = async (newPriority: TicketPriority) => {
    if (!selectedTicketId) return;
    try {
      await updateTicket({ id: selectedTicketId, priority: newPriority });
      toast({ title: `Priority set to ${newPriority}` });
    } catch (err: any) {
      toast({
        title: "Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleAssignAgent = async (agentId: string) => {
    if (!selectedTicketId) return;
    try {
      await updateTicket({
        id: selectedTicketId,
        assigned_agent_id: agentId === "unassigned" ? null : agentId,
      });
      toast({ title: "Agent assignment updated" });
    } catch (err: any) {
      toast({
        title: "Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTicketId) return;
    setUploadingFile(true);
    try {
      const attachment = await uploadAttachment(selectedTicketId, file);
      await sendMessage({
        ticket_id: selectedTicketId,
        message_text: `Sent file: ${file.name}`,
        sender_type: "agent",
        sender_name:
          user?.user_metadata?.full_name || user?.email || "Support Agent",
        attachments: [attachment],
      });
      toast({ title: "File shared" });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Support Center
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage customer support tickets, respond to inquiries, and track
          resolutions.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Total Tickets",
            value: statCounts.total,
            color: "text-foreground",
          },
          {
            label: "Open",
            value: statCounts.open,
            color: "text-blue-600",
          },
          {
            label: "Pending",
            value: statCounts.pending,
            color: "text-amber-600",
          },
          {
            label: "Resolved",
            value: statCounts.resolved,
            color: "text-green-600",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border/60 bg-card p-4 text-center"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {s.label}
            </p>
            <p className={cn("text-2xl font-bold mt-1 font-serif", s.color)}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Main Layout: 3-column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border border-border/60 rounded-xl overflow-hidden bg-card min-h-[700px]">
        {/* ═══════════════════════════════════════════════════════════════════
            COLUMN 1 — Ticket Inbox List
        ═══════════════════════════════════════════════════════════════════ */}
        <div
          className={cn(
            "lg:col-span-3 border-r border-border/50 flex flex-col bg-accent/5",
            selectedTicketId && "hidden lg:flex"
          )}
        >
          {/* Search & Filters */}
          <div className="p-3 border-b border-border/40 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tickets..."
                className="pl-9 h-9 text-xs bg-card border-border/60 rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-[10px] bg-card border-border/60 rounded-lg flex-1">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="awaiting_user">Awaiting User</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-8 text-[10px] bg-card border-border/60 rounded-lg flex-1">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() =>
                  setSortOrder((p) => (p === "newest" ? "oldest" : "newest"))
                }
                title={`Sort: ${sortOrder}`}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Ticket List */}
          <div className="flex-1 overflow-y-auto">
            {allTicketsQuery.isLoading ? (
              <div className="flex items-center justify-center h-40 text-xs text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading tickets...
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-xs text-muted-foreground gap-2">
                <Inbox className="h-8 w-8 text-muted-foreground/30" />
                <p>No tickets found</p>
              </div>
            ) : (
              filteredTickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTicketId(t.id);
                    setDetailTab("details");
                  }}
                  className={cn(
                    "w-full text-left p-3.5 border-b border-border/30 hover:bg-accent/40 transition-colors",
                    selectedTicketId === t.id && "bg-accent/60 border-l-2 border-l-primary"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">
                        {t.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {t.email}
                      </p>
                    </div>
                    <span className="text-[9px] text-muted-foreground/70 font-medium whitespace-nowrap">
                      {timeAgo(t.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[8px] uppercase tracking-wider font-bold rounded px-1.5 py-0",
                        statusColor(t.status)
                      )}
                    >
                      {t.status.replace("_", " ")}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[8px] uppercase tracking-wider font-bold rounded px-1.5 py-0",
                        priorityColor(t.priority)
                      )}
                    >
                      {t.priority}
                    </Badge>
                    {t.support_categories?.name && (
                      <span className="text-[9px] text-muted-foreground/60 truncate">
                        · {t.support_categories.name}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Ticket Count Footer */}
          <div className="px-3 py-2 border-t border-border/40 text-[10px] text-muted-foreground font-medium flex items-center justify-between bg-card">
            <span>
              {filteredTickets.length} ticket
              {filteredTickets.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => allTicketsQuery.refetch()}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            COLUMN 2 — Message Thread
        ═══════════════════════════════════════════════════════════════════ */}
        <div
          className={cn(
            "lg:col-span-5 flex flex-col min-h-0",
            !selectedTicketId && "hidden lg:flex"
          )}
        >
          {selectedTicketId ? (
            <>
              {/* Thread Header */}
              <div className="bg-card px-4 py-3 border-b border-border/40 flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setSelectedTicketId(null)}
                  className="lg:hidden flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {ticket?.name || "Loading..."}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    #{selectedTicketId.substring(0, 8)} ·{" "}
                    {ticket?.support_categories?.name || "Uncategorized"}
                  </p>
                </div>
                {ticket && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] uppercase tracking-wider font-bold rounded px-1.5 py-0.5",
                      statusColor(ticket.status)
                    )}
                  >
                    {ticket.status.replace("_", " ")}
                  </Badge>
                )}
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-accent/5"
              >
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />{" "}
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-12">
                    No messages yet in this conversation.
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isAgent = msg.sender_type === "agent";
                    const isSystem = msg.sender_type === "system";

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <div className="bg-accent/40 border border-border/30 rounded-xl px-3.5 py-2 max-w-[85%] text-[10px] text-muted-foreground text-center leading-relaxed">
                            {msg.message_text}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-2",
                          isAgent ? "flex-row-reverse" : "flex-row"
                        )}
                      >
                        <Avatar className="h-7 w-7 shrink-0 border border-border/60">
                          <AvatarFallback
                            className={cn(
                              "text-[9px] font-bold",
                              isAgent
                                ? "bg-primary/15 text-primary"
                                : "bg-secondary/15 text-secondary"
                            )}
                          >
                            {initials(msg.sender_name || "U")}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-soft",
                            isAgent
                              ? "bg-primary text-white rounded-tr-none"
                              : "bg-card border border-border/60 text-foreground rounded-tl-none"
                          )}
                        >
                          <p className={cn(
                            "text-[9px] font-bold mb-1 uppercase tracking-wider",
                            isAgent ? "text-white/70" : "text-muted-foreground/70"
                          )}>
                            {msg.sender_name}
                          </p>
                          {msg.message_text && <p>{msg.message_text}</p>}

                          {/* Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1.5 border-t border-white/20 pt-2">
                              {msg.attachments.map(
                                (file: any, idx: number) => (
                                  <a
                                    key={idx}
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 p-1.5 rounded bg-black/10 hover:bg-black/15 transition-all text-[10px] truncate max-w-full font-semibold"
                                  >
                                    {file.type?.startsWith("image/") ? (
                                      <ImageIcon className="h-4 w-4 shrink-0" />
                                    ) : (
                                      <FileText className="h-4 w-4 shrink-0" />
                                    )}
                                    <span className="truncate flex-1">
                                      {file.name}
                                    </span>
                                  </a>
                                )
                              )}
                            </div>
                          )}

                          {/* Timestamp & Read */}
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span
                              className={cn(
                                "text-[9px] uppercase tracking-wider font-semibold opacity-60",
                                isAgent
                                  ? "text-white/80"
                                  : "text-muted-foreground"
                              )}
                            >
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {isAgent &&
                              (msg.is_read ? (
                                <CheckCheck className="h-3.5 w-3.5 text-white/90" />
                              ) : (
                                <Check className="h-3.5 w-3.5 text-white/60" />
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* File upload progress */}
              {uploadingFile && (
                <div className="px-4 py-2 bg-card border-t border-border/40 text-[10px] text-muted-foreground flex items-center gap-2 shrink-0">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Uploading file...
                </div>
              )}

              {/* Compose Input */}
              <div className="p-3 bg-card border-t border-border/40 flex items-center gap-2 shrink-0">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-accent border border-border/60 text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                  title="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".jpg,.jpeg,.png,.pdf,.docx,.txt,.xlsx"
                />
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your reply as agent..."
                  className="flex-1 bg-accent/40 border-border/60 h-10 text-xs rounded-xl focus-visible:ring-primary/20"
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendMessagePending}
                  size="icon"
                  className="h-10 w-10 rounded-xl bg-primary hover:bg-primary/95 text-white shrink-0 shadow-sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* Quick Actions */}
              <div className="px-3 py-2 bg-card border-t border-border/30 flex items-center gap-2 shrink-0 flex-wrap">
                {ticket?.status !== "resolved" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-7 rounded-lg text-green-600 border-green-200 hover:bg-green-50"
                    onClick={() => handleStatusChange("resolved")}
                    disabled={updateTicketPending}
                  >
                    <Check className="h-3 w-3 mr-1" /> Resolve
                  </Button>
                )}
                {ticket?.status !== "closed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-7 rounded-lg"
                    onClick={() => handleStatusChange("closed")}
                    disabled={updateTicketPending}
                  >
                    <X className="h-3 w-3 mr-1" /> Close
                  </Button>
                )}
                {(ticket?.status === "resolved" ||
                  ticket?.status === "closed") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-7 rounded-lg text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={() => handleStatusChange("open")}
                    disabled={updateTicketPending}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Reopen
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-7 rounded-lg"
                  onClick={() => handleStatusChange("awaiting_user")}
                  disabled={updateTicketPending}
                >
                  <Clock className="h-3 w-3 mr-1" /> Await User
                </Button>
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 p-8">
              <Inbox className="h-16 w-16 text-muted-foreground/20" />
              <p className="text-sm font-medium">
                Select a ticket to view the conversation
              </p>
              <p className="text-xs text-muted-foreground/60">
                Choose from the inbox on the left
              </p>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            COLUMN 3 — Ticket Details / Notes / Events Panel
        ═══════════════════════════════════════════════════════════════════ */}
        <div
          className={cn(
            "lg:col-span-4 border-l border-border/50 flex flex-col bg-accent/5",
            !selectedTicketId && "hidden lg:flex"
          )}
        >
          {selectedTicketId && ticket ? (
            <>
              {/* Panel Tabs */}
              <div className="flex border-b border-border/40 shrink-0">
                {(
                  [
                    { id: "details", label: "Details", icon: Eye },
                    { id: "notes", label: "Notes", icon: StickyNote },
                    { id: "events", label: "Activity", icon: History },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setDetailTab(tab.id)}
                    className={cn(
                      "flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1.5 transition-colors border-b-2",
                      detailTab === tab.id
                        ? "text-primary border-primary bg-primary/5"
                        : "text-muted-foreground border-transparent hover:text-foreground hover:bg-accent/40"
                    )}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* ── Details Tab ────────────────────────────────────────── */}
                {detailTab === "details" && (
                  <>
                    {/* Contact Info */}
                    <div className="space-y-3">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Contact Information
                      </Label>
                      <div className="bg-card rounded-xl border border-border/50 p-3.5 space-y-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-10 w-10 border border-border/60">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                              {initials(ticket.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-bold">{ticket.name}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">
                              {ticket.user_type}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{ticket.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Created{" "}
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Control */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Status
                      </Label>
                      <Select
                        value={ticket.status}
                        onValueChange={(v) =>
                          handleStatusChange(v as TicketStatus)
                        }
                      >
                        <SelectTrigger className="h-9 text-xs bg-card border-border/60 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="awaiting_user">
                            Awaiting User
                          </SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Priority Control */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Priority
                      </Label>
                      <Select
                        value={ticket.priority}
                        onValueChange={(v) =>
                          handlePriorityChange(v as TicketPriority)
                        }
                      >
                        <SelectTrigger className="h-9 text-xs bg-card border-border/60 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Agent Assignment */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Assigned Agent
                      </Label>
                      <Select
                        value={ticket.assigned_agent_id || "unassigned"}
                        onValueChange={handleAssignAgent}
                      >
                        <SelectTrigger className="h-9 text-xs bg-card border-border/60 rounded-lg">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="unassigned">
                            Unassigned
                          </SelectItem>
                          {staff.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Category
                      </Label>
                      <div className="bg-card rounded-lg border border-border/50 px-3 py-2 text-xs text-foreground">
                        {ticket.support_categories?.name || "Uncategorized"}
                      </div>
                    </div>

                    {/* Property Context */}
                    {ticket.properties && (
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Related Property
                        </Label>
                        <div className="bg-card rounded-xl border border-border/50 p-3.5 space-y-1.5">
                          <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-primary" />
                            {ticket.properties.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground capitalize">
                            {ticket.properties.category} ·{" "}
                            {ticket.properties.status}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Satisfaction Rating */}
                    {ticket.satisfaction_rating !== null && (
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Customer Satisfaction
                        </Label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                "h-5 w-5",
                                star <= (ticket.satisfaction_rating || 0)
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-border"
                              )}
                            />
                          ))}
                          <span className="text-xs text-muted-foreground ml-2 font-medium">
                            {ticket.satisfaction_rating}/5
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── Notes Tab ──────────────────────────────────────────── */}
                {detailTab === "notes" && (
                  <>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <StickyNote className="h-3.5 w-3.5" />
                        Internal Notes (Staff Only)
                      </Label>

                      {/* Existing Notes */}
                      {notes.length === 0 ? (
                        <p className="text-xs text-muted-foreground/60 italic py-4 text-center">
                          No internal notes yet for this ticket.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {notes.map((note) => (
                            <div
                              key={note.id}
                              className="bg-amber-50 border border-amber-200/60 rounded-xl p-3 space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold text-amber-800">
                                  {note.admin?.full_name || "Staff"}
                                </p>
                                <span className="text-[9px] text-amber-600/70">
                                  {new Date(
                                    note.created_at
                                  ).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-xs text-amber-900 leading-relaxed">
                                {note.note_text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Note */}
                      <div className="space-y-2 pt-2 border-t border-border/30">
                        <Textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Add private note (visible to staff only)..."
                          className="min-h-[80px] text-xs bg-card border-border/60 rounded-xl resize-none"
                        />
                        <Button
                          onClick={handleAddNote}
                          disabled={!noteText.trim() || addNotePending}
                          size="sm"
                          className="w-full h-9 text-xs rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          {addNotePending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : (
                            <StickyNote className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Save Private Note
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* ── Events Tab ─────────────────────────────────────────── */}
                {detailTab === "events" && (
                  <>
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5" />
                      Activity Timeline
                    </Label>

                    {events.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 italic py-4 text-center">
                        No activity events recorded yet.
                      </p>
                    ) : (
                      <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border/60" />

                        <div className="space-y-4">
                          {events.map((evt) => (
                            <div
                              key={evt.id}
                              className="flex items-start gap-3 relative"
                            >
                              <div className="h-6 w-6 rounded-full bg-accent border border-border/60 flex items-center justify-center shrink-0 z-10">
                                <History className="h-3 w-3 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground">
                                  {evt.event_type
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {evt.creator?.full_name || "System"} ·{" "}
                                  {new Date(
                                    evt.created_at
                                  ).toLocaleString()}
                                </p>
                                {evt.details &&
                                  Object.keys(evt.details).length > 0 && (
                                    <pre className="text-[9px] mt-1 bg-accent/30 rounded p-1.5 overflow-x-auto text-muted-foreground">
                                      {JSON.stringify(evt.details, null, 2)}
                                    </pre>
                                  )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            /* Empty Context Panel */
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2 p-8">
              <Eye className="h-10 w-10 text-muted-foreground/20" />
              <p className="text-xs font-medium">Ticket details appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
