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
  Smile
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
      return "bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800";
    case "pending":
      return "bg-amber-500/10 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800";
    case "awaiting_user":
      return "bg-purple-500/10 text-purple-600 border-purple-200 dark:bg-purple-900/30 dark:border-purple-800";
    case "resolved":
      return "bg-green-500/10 text-green-600 border-green-200 dark:bg-green-900/30 dark:border-green-800";
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [customAgentName, setCustomAgentName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Data from hook ─────────────────────────────────────────────────────────
  const {
    ticket,
    ticketLoading,
    customerProfile,
    customerProfileLoading,
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
    activeUsers,
    typingUsers,
    setTyping
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

  // Auto-select first ticket
  useEffect(() => {
    if (!selectedTicketId && filteredTickets.length > 0) {
      setSelectedTicketId(filteredTickets[0].id);
    }
  }, [selectedTicketId, filteredTickets]);

  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  // Sync custom agent name
  useEffect(() => {
    if (ticket) {
      setCustomAgentName(ticket.assigned_agent_name || "");
    }
  }, [ticket]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedTicketId) return;
    const text = messageText;
    setMessageText("");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTyping(false);

    try {
      await sendMessage({
        ticket_id: selectedTicketId,
        message_text: text.trim(),
        sender_type: "agent",
        sender_name:
          ticket?.assigned_agent_name || user?.user_metadata?.full_name || user?.email || "Support Agent",
      });
    } catch (err: any) {
      toast({
        title: "Failed to send",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    
    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 2000);
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

  const handleCustomAgentNameBlur = async () => {
    if (!selectedTicketId || !ticket) return;
    if (customAgentName !== (ticket.assigned_agent_name || "")) {
      try {
        await updateTicket({ id: selectedTicketId, assigned_agent_name: customAgentName || null });
        toast({ title: "Custom agent name updated" });
      } catch (err: any) {
        toast({
          title: "Failed",
          description: err.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleAssignAgent = async (agentId: string) => {
    if (!selectedTicketId) return;
    try {
      await updateTicket({ id: selectedTicketId, assigned_agent_id: agentId === "unassigned" ? null : agentId });
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
    setUploadProgress(10);
    try {
      const interval = setInterval(() => {
        setUploadProgress((p) => (p < 80 ? p + 15 : p));
      }, 100);

      const attachment = await uploadAttachment(selectedTicketId, file);
      clearInterval(interval);
      setUploadProgress(100);

      await sendMessage({
        ticket_id: selectedTicketId,
        message_text: `Shared file: ${file.name}`,
        sender_type: "agent",
        sender_name:
          ticket?.assigned_agent_name || user?.user_metadata?.full_name || user?.email || "Support Agent",
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
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Presence Logic
  const isClientOnline = Object.values(activeUsers).some(u => u.user_type === 'user' || u.user_type === 'guest');
  const typingClientNames = Object.keys(typingUsers)
    .filter(k => typingUsers[k] && (activeUsers[k]?.user_type === 'user' || activeUsers[k]?.user_type === 'guest'))
    .map(k => activeUsers[k]?.name || "Client");

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold flex items-center gap-2 text-foreground">
            <MessageSquare className="h-6 w-6 text-primary" />
            Support Inbox
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage customer conversations, assign tickets, and view history.
          </p>
        </div>
        
        {/* Stats Row Compact */}
        <div className="flex gap-2 text-xs">
          <Badge variant="outline" className="px-3 py-1 font-semibold rounded-md border-border/80">
            {statCounts.open} Open
          </Badge>
          <Badge variant="outline" className="px-3 py-1 font-semibold rounded-md border-border/80 text-amber-600 bg-amber-50">
            {statCounts.pending} Pending
          </Badge>
        </div>
      </div>

      {/* Main Layout: 3-column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border border-border/60 rounded-xl overflow-hidden bg-white dark:bg-card min-h-[750px] shadow-sm">
        {/* ═══════════════════════════════════════════════════════════════════
            COLUMN 1 — Ticket Inbox List
        ═══════════════════════════════════════════════════════════════════ */}
        <div
          className={cn(
            "lg:col-span-3 border-r border-border/50 flex flex-col bg-[#fafafa] dark:bg-accent/5",
            selectedTicketId && "hidden lg:flex"
          )}
        >
          {/* Search & Filters */}
          <div className="p-3 border-b border-border/40 space-y-2 bg-white dark:bg-card shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, #ID..."
                className="pl-9 h-9 text-xs bg-accent/20 border-border/60 rounded-lg shadow-none"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-[10px] bg-accent/20 border-border/60 rounded-lg flex-1 shadow-none">
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
                <SelectTrigger className="h-8 text-[10px] bg-accent/20 border-border/60 rounded-lg flex-[0.8] shadow-none">
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
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-lg border-border/60 shadow-none"
                onClick={() =>
                  setSortOrder((p) => (p === "newest" ? "oldest" : "newest"))
                }
                title={`Sort: ${sortOrder}`}
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>

          {/* Ticket List */}
          <div className="flex-1 overflow-y-auto">
            {allTicketsQuery.isLoading ? (
              <div className="flex items-center justify-center h-40 text-xs text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-xs text-muted-foreground gap-3">
                <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center">
                  <Inbox className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <p className="font-medium text-muted-foreground">No conversations found</p>
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
                    "w-full text-left p-3.5 border-b border-border/30 hover:bg-black/5 dark:hover:bg-accent/40 transition-all",
                    selectedTicketId === t.id && "bg-white dark:bg-card border-l-[3px] border-l-primary shadow-sm"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {t.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {t.support_categories?.name || "General"}
                      </p>
                    </div>
                    <span className="text-[9px] text-muted-foreground font-semibold whitespace-nowrap mt-1">
                      {timeAgo(t.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                    <span className={cn(
                      "text-[9px] uppercase tracking-wider font-bold rounded-sm px-1.5 py-0.5 border",
                      statusColor(t.status)
                    )}>
                      {t.status.replace("_", " ")}
                    </span>
                    {t.priority === 'high' || t.priority === 'critical' ? (
                      <span className={cn(
                        "text-[9px] uppercase tracking-wider font-bold rounded-sm px-1.5 py-0.5 border",
                        priorityColor(t.priority)
                      )}>
                        {t.priority}
                      </span>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            COLUMN 2 — Message Thread
        ═══════════════════════════════════════════════════════════════════ */}
        <div
          className={cn(
            "lg:col-span-5 flex flex-col min-h-0 bg-white dark:bg-card border-r border-border/50",
            !selectedTicketId && "hidden lg:flex"
          )}
        >
          {selectedTicketId ? (
            <>
              {/* Thread Header */}
              <div className="bg-white dark:bg-card px-4 py-3 border-b border-border/40 flex items-center justify-between shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedTicketId(null)}
                    className="lg:hidden h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent text-muted-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="relative">
                    <Avatar className="h-10 w-10 border border-border/60 shadow-sm">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                        {initials(ticket?.name || "C")}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-card",
                      isClientOnline ? "bg-green-500" : "bg-muted-foreground/30"
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-none mb-1">
                      {ticket?.name || "Loading..."}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                      {isClientOnline ? <span className="text-green-600">Online now</span> : "Offline"}
                      <span>·</span>
                      <span>#{selectedTicketId.substring(0, 8)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {ticket?.status !== "resolved" && ticket?.status !== "closed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-[11px] rounded-lg text-green-600 border-green-200 hover:bg-green-50 shadow-none font-bold"
                      onClick={() => handleStatusChange("resolved")}
                      disabled={updateTicketPending}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Mark Resolved
                    </Button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-[#f8f9fa] dark:bg-accent/5"
              >
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Loading conversation...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm font-bold">No messages yet</p>
                    <p className="text-xs text-muted-foreground">Send the first message to start the conversation.</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isAgent = msg.sender_type === "agent";
                    const isSystem = msg.sender_type === "system";

                    // Grouping logic
                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const isGrouped = prevMsg && prevMsg.sender_type === msg.sender_type && prevMsg.sender_name === msg.sender_name && (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 5 * 60000);

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-4">
                          <div className="bg-accent/50 border border-border/40 rounded-full px-4 py-1.5 max-w-[85%] text-[10px] font-medium text-muted-foreground text-center">
                            {msg.message_text}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className={cn("flex w-full", isAgent ? "justify-end" : "justify-start")}>
                        <div className={cn("flex max-w-[85%] items-end gap-2", isAgent ? "flex-row-reverse" : "flex-row")}>
                          
                          {/* Avatar */}
                          {!isAgent && (
                            <div className="w-6 shrink-0 flex flex-col justify-end pb-1">
                              {!isGrouped && (
                                <Avatar className="h-6 w-6 shadow-sm border border-border/50">
                                  <AvatarFallback className="bg-secondary/20 text-[9px] font-bold text-secondary-foreground">
                                    {initials(msg.sender_name || "U")}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          )}

                          <div className={cn("flex flex-col gap-1", isAgent ? "items-end" : "items-start")}>
                            {/* Sender Name */}
                            {!isGrouped && !isAgent && (
                              <span className="text-[10px] font-bold text-muted-foreground ml-1">
                                {msg.sender_name || "Client"}
                              </span>
                            )}

                            {/* Message Bubble */}
                            <div className={cn(
                              "px-4 py-2.5 text-[13px] leading-relaxed shadow-sm",
                              isAgent 
                                ? "bg-primary text-white rounded-2xl rounded-br-sm" 
                                : "bg-white dark:bg-card border border-border/50 text-foreground rounded-2xl rounded-bl-sm"
                            )}>
                              {msg.message_text && <p className="whitespace-pre-wrap">{msg.message_text}</p>}

                              {/* Attachments */}
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className={cn("mt-2 space-y-2", msg.message_text && "border-t border-border/10 pt-2")}>
                                  {msg.attachments.map((file: any, idx: number) => (
                                    <a 
                                      key={idx} 
                                      href={file.url} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className={cn(
                                        "flex items-center gap-3 p-2 rounded-xl transition-all border",
                                        isAgent 
                                          ? "bg-black/10 border-white/10 hover:bg-black/20 text-white" 
                                          : "bg-accent/40 border-border/50 hover:bg-accent/60 text-foreground"
                                      )}
                                    >
                                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", isAgent ? "bg-white/20" : "bg-card shadow-sm")}>
                                        {file.type?.startsWith("image/") ? (
                                          <ImageIcon className="h-4 w-4" />
                                        ) : (
                                          <FileText className="h-4 w-4" />
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-semibold truncate">{file.name}</p>
                                        <p className={cn("text-[9px]", isAgent ? "text-white/70" : "text-muted-foreground")}>
                                          Click to open
                                        </p>
                                      </div>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {/* Metadata */}
                            <div className="flex items-center gap-1 mt-0.5 px-1">
                              <span className="text-[9px] font-medium text-muted-foreground/80">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {isAgent && (
                                msg.is_read ? (
                                  <CheckCheck className="h-3 w-3 text-blue-500" />
                                ) : (
                                  <Check className="h-3 w-3 text-muted-foreground/60" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Typing Indicator */}
                {typingClientNames.length > 0 && (
                  <div className="flex w-full justify-start mt-2">
                    <div className="flex max-w-[85%] items-end gap-2">
                      <div className="w-6 shrink-0 flex flex-col justify-end pb-1">
                        <Avatar className="h-6 w-6 shadow-sm border border-border/50">
                          <AvatarFallback className="bg-secondary/20 text-[9px] font-bold text-secondary-foreground">
                            {initials(typingClientNames[0])}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="bg-white dark:bg-card border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1 shadow-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div className="h-2" />
              </div>

              {/* Upload progress */}
              {uploadingFile && (
                <div className="px-4 py-2.5 bg-card/80 backdrop-blur border-t border-border/40 text-[10px] text-muted-foreground flex items-center gap-2 shrink-0 z-10">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Uploading secure attachment ({uploadProgress}%)...
                </div>
              )}

              {/* Compose Input */}
              <div className="p-3 bg-white dark:bg-card border-t border-border/50 flex flex-col gap-2 shrink-0 z-10">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-accent/60 text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                    title="Attach file"
                  >
                    <Paperclip className="h-5 w-5" />
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
                    onChange={handleTextChange}
                    placeholder="Type a reply..."
                    className="flex-1 bg-accent/30 border-transparent hover:border-border/60 focus:border-primary/50 h-11 text-sm rounded-xl transition-all shadow-none px-4"
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sendMessagePending}
                    size="icon"
                    className="h-11 w-11 rounded-xl bg-primary hover:bg-primary/95 text-white shrink-0 shadow-sm"
                  >
                    <Send className="h-4 w-4 ml-0.5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center bg-[#f8f9fa] dark:bg-accent/5">
              <div className="h-24 w-24 rounded-full bg-white dark:bg-card border border-border/50 shadow-sm flex items-center justify-center mb-6">
                <MessageSquare className="h-10 w-10 text-primary/40" />
              </div>
              <h3 className="text-xl font-serif font-bold text-foreground mb-2">Support Workspace</h3>
              <p className="text-sm text-muted-foreground max-w-sm text-center">
                Select a conversation from the left to view messages and assist customers.
              </p>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            COLUMN 3 — Customer Info & Internal Notes
        ═══════════════════════════════════════════════════════════════════ */}
        <div
          className={cn(
            "lg:col-span-4 flex flex-col bg-[#fafafa] dark:bg-accent/5",
            !selectedTicketId && "hidden lg:flex"
          )}
        >
          {selectedTicketId && ticket ? (
            <>
              {/* Panel Tabs */}
              <div className="flex border-b border-border/40 shrink-0 bg-white dark:bg-card px-2 pt-2">
                {(
                  [
                    { id: "details", label: "Details" },
                    { id: "notes", label: "Internal Notes" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setDetailTab(tab.id)}
                    className={cn(
                      "flex-1 py-3 text-xs font-bold transition-all border-b-[3px] relative -bottom-px",
                      detailTab === tab.id
                        ? "text-primary border-primary"
                        : "text-muted-foreground border-transparent hover:text-foreground"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto p-5">
                
                {/* ── Details Tab ────────────────────────────────────────── */}
                {detailTab === "details" && (
                  <div className="space-y-6">
                    {/* Customer Profile Card */}
                    <div className="bg-white dark:bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="relative">
                          <Avatar className="h-14 w-14 border-2 border-border/50 shadow-sm">
                            {customerProfile?.avatar_url ? (
                              <AvatarImage src={customerProfile.avatar_url} alt={ticket.name} />
                            ) : null}
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                              {initials(customerProfile?.full_name || ticket.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className={cn(
                            "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-card",
                            isClientOnline ? "bg-green-500" : "bg-muted-foreground/30"
                          )} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-base font-bold text-foreground leading-tight truncate">
                            {customerProfile?.full_name || ticket.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <Badge variant="secondary" className="text-[9px] font-bold bg-accent/60 uppercase tracking-wider">
                              {ticket.user_type}
                            </Badge>
                            {customerProfile?.roles?.map((role: string) => (
                              <Badge key={role} variant="outline" className="text-[9px] font-bold uppercase tracking-wider border-primary/30 text-primary">
                                {role}
                              </Badge>
                            ))}
                            {isClientOnline && (
                              <span className="text-[9px] font-bold text-green-600 uppercase tracking-wider">Online</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-2.5 pt-3.5 border-t border-border/40">
                        <div className="flex items-center gap-3 text-sm">
                          <Mail className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                          <span className="truncate text-foreground">{ticket.email}</span>
                        </div>
                        {customerProfile?.phone && (
                          <div className="flex items-center gap-3 text-sm">
                            <Phone className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                            <span className="text-foreground">{customerProfile.phone}</span>
                          </div>
                        )}
                        {customerProfile?.country && (
                          <div className="flex items-center gap-3 text-sm">
                            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                            <span className="text-foreground capitalize">
                              {[customerProfile.city, customerProfile.state, customerProfile.country].filter(Boolean).join(", ")}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-sm">
                          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                          <span className="text-muted-foreground">
                            Account created {new Date(customerProfile?.created_at || ticket.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    {customerProfile && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white dark:bg-card rounded-xl border border-border/50 p-3.5 shadow-sm text-center">
                          <p className="text-2xl font-bold text-foreground">{customerProfile.total_tickets}</p>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Total Tickets</p>
                        </div>
                        <div className="bg-white dark:bg-card rounded-xl border border-border/50 p-3.5 shadow-sm text-center">
                          <p className="text-2xl font-bold text-foreground">
                            {ticket.satisfaction_rating !== null ? `${ticket.satisfaction_rating}/5` : "—"}
                          </p>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Satisfaction</p>
                        </div>
                      </div>
                    )}

                    {/* Ticket Settings */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Ticket Settings</h4>
                      
                      <div className="bg-white dark:bg-card rounded-2xl border border-border/50 p-4 space-y-4 shadow-sm">
                        <div className="space-y-2">
                          <Label className="text-[11px] font-semibold text-muted-foreground">Status</Label>
                          <Select
                            value={ticket.status}
                            onValueChange={(v) => handleStatusChange(v as TicketStatus)}
                          >
                            <SelectTrigger className="h-10 text-sm bg-accent/20 border-border/60 shadow-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="awaiting_user">Awaiting User</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[11px] font-semibold text-muted-foreground">Priority</Label>
                          <Select
                            value={ticket.priority}
                            onValueChange={(v) => handlePriorityChange(v as TicketPriority)}
                          >
                            <SelectTrigger className="h-10 text-sm bg-accent/20 border-border/60 shadow-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[11px] font-semibold text-muted-foreground">Assigned Agent (Display Name)</Label>
                          <Input
                            value={customAgentName}
                            onChange={(e) => setCustomAgentName(e.target.value)}
                            onBlur={handleCustomAgentNameBlur}
                            placeholder="e.g. Support Team Alpha"
                            className="h-10 text-sm bg-accent/20 border-border/60 shadow-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[11px] font-semibold text-muted-foreground">Assigned Staff Account</Label>
                          <Select
                            value={ticket.assigned_agent_id || "unassigned"}
                            onValueChange={handleAssignAgent}
                          >
                            <SelectTrigger className="h-10 text-sm bg-accent/20 border-border/60 shadow-none">
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {staff.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-[11px] font-semibold text-muted-foreground">Category</Label>
                          <div className="h-10 px-3 bg-accent/10 border border-border/40 rounded-md flex items-center text-sm text-foreground">
                            {ticket.support_categories?.name || "General"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Related Property Context */}
                    {ticket.properties && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Related Context</h4>
                        <div className="bg-white dark:bg-card rounded-xl border border-border/50 p-4 shadow-sm flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                            <Building2 className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground leading-snug">
                              {ticket.properties.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
                              {ticket.properties.property_category} · {ticket.properties.status}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Notes Tab ──────────────────────────────────────────── */}
                {detailTab === "notes" && (
                  <div className="space-y-6 h-full flex flex-col">
                    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-500 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50">
                      <ShieldCheck className="h-5 w-5 shrink-0" />
                      <p className="text-xs font-medium">Notes are strictly internal and completely invisible to the customer.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                      {notes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-3">
                          <StickyNote className="h-8 w-8 text-muted-foreground/30" />
                          <p className="text-sm">No internal notes yet</p>
                        </div>
                      ) : (
                        notes.map((note) => (
                          <div key={note.id} className="bg-white dark:bg-card border border-border/60 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="bg-primary/10 text-[9px] font-bold text-primary">
                                    {initials(note.admin?.full_name || "S")}
                                  </AvatarFallback>
                                </Avatar>
                                <p className="text-xs font-bold text-foreground">{note.admin?.full_name || "Staff"}</p>
                              </div>
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {new Date(note.created_at).toLocaleDateString()} {new Date(note.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap pl-8">
                              {note.note_text}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="pt-4 border-t border-border/40 space-y-3 shrink-0">
                      <Textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Write a private note..."
                        className="min-h-[100px] text-sm bg-white dark:bg-card border-border/80 rounded-xl resize-none shadow-sm focus-visible:ring-amber-500/30 focus-visible:border-amber-500"
                      />
                      <Button
                        onClick={handleAddNote}
                        disabled={!noteText.trim() || addNotePending}
                        className="w-full h-11 text-sm font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                      >
                        {addNotePending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <StickyNote className="h-4 w-4 mr-2" />
                        )}
                        Save Private Note
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 p-8">
              <User className="h-12 w-12 text-muted-foreground/20" />
              <p className="text-sm font-medium">Customer details will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
