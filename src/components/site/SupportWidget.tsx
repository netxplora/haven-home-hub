import { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  X, 
  Send, 
  Paperclip, 
  Search, 
  ChevronRight, 
  ArrowLeft, 
  FileText, 
  Image as ImageIcon, 
  Loader2, 
  HelpCircle,
  Clock,
  Check,
  CheckCheck,
  ShieldCheck,
  Building2,
  Phone,
  Calendar,
  Wallet,
  MoreHorizontal,
  Smile
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSupport, SupportTicket, SupportMessage } from "@/hooks/useSupport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Common Emojis for quick reactions
const QUICK_EMOJIS = ["👋", "👍", "🙏", "❤️", "😊", "❓"];

export function SupportWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFaqId, setSelectedFaqId] = useState<string | null>(null);
  const [showNewChatForm, setShowNewChatForm] = useState(false);
  
  // Local guest user credentials
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [userType, setUserType] = useState("guest");

  const [messageText, setMessageText] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hook instantiations
  const {
    faqs,
    categories,
    myTickets,
    ticket,
    messages,
    messagesLoading,
    createTicket,
    createTicketPending,
    sendMessage,
    sendMessagePending,
    uploadAttachment,
    updateTicket,
    activeUsers,
    typingUsers,
    setTyping
  } = useSupport(activeTicketId || undefined, false);

  // Load guest details or registered user data
  useEffect(() => {
    if (user) {
      setGuestName(user.user_metadata?.full_name || "");
      setGuestEmail(user.email || "");
      setUserType("user");
    } else {
      const savedName = localStorage.getItem("support_guest_name");
      const savedEmail = localStorage.getItem("support_guest_email");
      if (savedName) setGuestName(savedName);
      if (savedEmail) setGuestEmail(savedEmail);
      setUserType("guest");
    }
  }, [user]);

  // Keep track of Guest tickets in local storage
  const [guestTicketIds, setGuestTicketIds] = useState<string[]>([]);
  useEffect(() => {
    const ids = JSON.parse(localStorage.getItem("support_guest_ticket_ids") || "[]");
    setGuestTicketIds(ids);
  }, []);

  // Filtered tickets
  const [localTickets, setLocalTickets] = useState<SupportTicket[]>([]);
  useEffect(() => {
    if (user) {
      setLocalTickets(myTickets);
    } else {
      if (guestTicketIds.length > 0) {
        const fetchGuestTickets = async () => {
          const { data } = await supabase
            .from("support_tickets")
            .select("*, support_categories(name)")
            .in("id", guestTicketIds)
            .order("last_message_at", { ascending: false });
          if (data) setLocalTickets(data as any);
        };
        fetchGuestTickets();
      } else {
        setLocalTickets(prev => prev.length === 0 ? prev : []);
      }
    }
  }, [user, myTickets, guestTicketIds]);

  // Auto Scroll chat threads
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  // Count overall unread messages for minimized badge
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    if (localTickets.length > 0) {
      const fetchUnread = async () => {
        const ticketIds = localTickets.map(t => t.id);
        const { count } = await supabase
          .from("support_messages")
          .select("id", { count: "exact", head: true })
          .in("ticket_id", ticketIds)
          .eq("is_read", false)
          .eq("sender_type", "agent");
        setUnreadCount(count ?? 0);
      };
      fetchUnread();
    }
  }, [localTickets]);

  // FAQ Search
  const filteredFaqs = faqs.filter(faq => {
    if (!searchQuery) return faq.is_published;
    const q = searchQuery.toLowerCase();
    return faq.is_published && (faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q) || faq.category.toLowerCase().includes(q));
  });

  const handleStartChat = async (e?: React.FormEvent, directCategoryId?: string) => {
    if (e) e.preventDefault();
    if (!guestName.trim() || !guestEmail.trim()) {
      toast({ title: "Required", description: "Name and Email are required to initiate chat.", variant: "destructive" });
      return;
    }

    try {
      const newTicket = await createTicket({
        name: guestName.trim(),
        email: guestEmail.trim(),
        user_type: userType,
        category_id: directCategoryId || categories[0]?.id || null,
        priority: "medium"
      });

      if (!user) {
        localStorage.setItem("support_guest_name", guestName.trim());
        localStorage.setItem("support_guest_email", guestEmail.trim());
        const updatedIds = [...guestTicketIds, newTicket.id];
        localStorage.setItem("support_guest_ticket_ids", JSON.stringify(updatedIds));
        setGuestTicketIds(updatedIds);
      }

      setActiveTicketId(newTicket.id);
      setShowNewChatForm(false);
      toast({ title: "Conversation Started", description: "A support agent is being assigned." });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleSend = async (textToSend?: string) => {
    const content = textToSend || messageText;
    if (!content.trim() && !activeTicketId) return;

    const currentTicketId = activeTicketId!;
    setMessageText("");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTyping(false);

    try {
      if (ticket && (ticket.status === "resolved" || ticket.status === "closed")) {
        await updateTicket({ id: currentTicketId, status: "open" });
      }

      await sendMessage({
        ticket_id: currentTicketId,
        message_text: content.trim(),
        sender_type: user ? "user" : "guest",
        sender_name: guestName || "Client User"
      });
    } catch (err: any) {
      toast({ title: "Message not sent", description: err.message, variant: "destructive" });
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    
    // Typing indicator logic
    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeTicketId) return;

    setUploadingFile(true);
    setUploadProgress(10);
    try {
      const interval = setInterval(() => {
        setUploadProgress((p) => (p < 80 ? p + 15 : p));
      }, 100);

      const attachment = await uploadAttachment(activeTicketId, file);
      clearInterval(interval);
      setUploadProgress(100);

      await sendMessage({
        ticket_id: activeTicketId,
        message_text: `Shared file: ${file.name}`,
        sender_type: user ? "user" : "guest",
        sender_name: guestName || "Client User",
        attachments: [attachment]
      });

    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Agent Presence Logic
  const isAgentOnline = Object.values(activeUsers).some(u => u.user_type === 'agent');
  const typingAgentNames = Object.keys(typingUsers)
    .filter(k => typingUsers[k] && activeUsers[k]?.user_type === 'agent')
    .map(k => activeUsers[k]?.name || "Agent");

  // Hide widget on admin dashboard
  if (location.pathname.startsWith("/admin")) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[45] h-14 w-14 rounded-full bg-primary hover:bg-primary/95 text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 group"
        aria-label="Open support chat"
      >
        <span className="relative">
          <MessageSquare className="h-6 w-6 animate-pulse" />
          <span className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-green-500 border border-primary shadow-sm" title="Online Status" />
          {unreadCount > 0 && (
            <span className="absolute -top-3 -left-3 bg-red-500 text-white text-[10px] font-bold h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center shadow-sm animate-bounce">
              {unreadCount}
            </span>
          )}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-[45] w-full h-[100dvh] sm:w-[350px] sm:h-[580px] sm:rounded-2xl bg-card sm:border border-border/80 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300 font-sans">
      
      {/* ── HEADER ── */}
      <div className="bg-primary px-4 py-3 flex items-center justify-between shrink-0 text-white shadow-sm z-10">
        <div className="flex items-center gap-3">
          {activeTicketId && (ticket?.assigned_agent || ticket?.assigned_agent_name) ? (
            <div className="relative">
              <Avatar className="h-9 w-9 border-2 border-white/20">
                <AvatarFallback className="bg-white/20 font-bold text-white">
                  {(ticket.assigned_agent_name || ticket.assigned_agent?.full_name || "A").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className={cn(
                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-primary",
                isAgentOnline ? "bg-green-400" : "bg-amber-400"
              )} />
            </div>
          ) : (
            <div className="relative">
              <Avatar className="h-9 w-9 border-2 border-white/20 bg-white/10">
                <AvatarImage src="/favicon.ico" className="object-contain p-1.5" />
                <AvatarFallback className="bg-transparent font-bold font-serif text-white">H</AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-primary animate-pulse" />
            </div>
          )}
          
          <div>
            {activeTicketId && (ticket?.assigned_agent || ticket?.assigned_agent_name) ? (
              <>
                <h4 className="font-semibold text-sm leading-tight flex items-center gap-1.5">
                  {ticket.assigned_agent_name || ticket.assigned_agent?.full_name || "Support Agent"}
                </h4>
                <p className="text-[10px] text-white/80 font-medium">Support Agent · {ticket.support_categories?.name || 'General'}</p>
              </>
            ) : (
              <>
                <h4 className="font-serif text-sm font-bold leading-tight">
                  Haven Support
                </h4>
                <p className="text-[10px] text-white/80 font-medium">
                  {isAgentOnline ? "We typically reply in a few minutes" : "Leave a message, we'll be back soon"}
                </p>
              </>
            )}
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)} 
          className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-white/20 text-white/90 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── CORE VIEWPORT ── */}
      <div className="flex-1 overflow-hidden bg-[#f8f9fa] dark:bg-background flex flex-col relative">
        
        {/* ── VIEW 1: CHAT THREAD ── */}
        {activeTicketId ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Thread Navigation Header */}
            <div className="bg-white dark:bg-card px-4 py-2.5 border-b border-border/40 flex items-center justify-between shadow-sm shrink-0 z-10">
              <button 
                onClick={() => setActiveTicketId(null)}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to menu
              </button>
              {ticket && (
                <Badge variant="secondary" className={cn(
                  "text-[9px] uppercase tracking-wider font-bold rounded-md px-2 py-0.5 border",
                  ticket.status === 'open' && "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30",
                  ticket.status === 'pending' && "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30",
                  ticket.status === 'awaiting_user' && "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/30",
                  ticket.status === 'resolved' && "bg-green-50 text-green-600 border-green-200 dark:bg-green-950/30",
                  ticket.status === 'closed' && "bg-muted text-muted-foreground border-border"
                )}>
                  {ticket.status.replace("_", " ")}
                </Badge>
              )}
            </div>

            {/* Messages Scrollbox */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground mb-1">Start the conversation</h3>
                  <p className="text-xs text-muted-foreground">Send a message and an agent will be with you shortly.</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isUser = msg.sender_type === "user" || msg.sender_type === "guest";
                  const isSystem = msg.sender_type === "system";
                  
                  // Grouping logic
                  const prevMsg = index > 0 ? messages[index - 1] : null;
                  const isGrouped = prevMsg && prevMsg.sender_type === msg.sender_type && prevMsg.sender_name === msg.sender_name && (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 5 * 60000); // 5 mins threshold

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
                    <div key={msg.id} className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
                      <div className={cn("flex max-w-[85%] items-end gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
                        
                        {/* Avatar (hide if grouped) */}
                        {!isUser && (
                          <div className="w-6 shrink-0 flex flex-col justify-end pb-1">
                            {!isGrouped && (
                              <Avatar className="h-6 w-6 shadow-sm border border-border/50">
                                <AvatarFallback className="bg-secondary/20 text-[9px] font-bold text-secondary-foreground">
                                  {msg.sender_name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        )}

                        <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
                          {/* Sender Name (hide if grouped) */}
                          {!isGrouped && !isUser && (
                            <span className="text-[10px] font-bold text-muted-foreground ml-1">
                              {msg.sender_name || "Support Agent"}
                            </span>
                          )}

                          {/* Message Bubble */}
                          <div className={cn(
                            "px-4 py-2.5 text-[13px] leading-relaxed shadow-sm",
                            isUser 
                              ? "bg-primary text-white rounded-2xl rounded-br-sm" 
                              : "bg-white dark:bg-card border border-border/50 text-foreground rounded-2xl rounded-bl-sm"
                          )}>
                            {/* Text Content */}
                            {msg.message_text && <p className="whitespace-pre-wrap">{msg.message_text}</p>}

                            {/* Attachments */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className={cn("mt-2 space-y-2", msg.message_text && "border-t border-border/10 pt-2")}>
                                {msg.attachments.map((file, idx) => (
                                  <a 
                                    key={idx} 
                                    href={file.url} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className={cn(
                                      "flex items-center gap-3 p-2 rounded-xl transition-all border",
                                      isUser 
                                        ? "bg-black/10 border-white/10 hover:bg-black/20 text-white" 
                                        : "bg-accent/40 border-border/50 hover:bg-accent/60 text-foreground"
                                    )}
                                  >
                                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", isUser ? "bg-white/20" : "bg-card shadow-sm")}>
                                      {file.type.startsWith("image/") ? (
                                        <ImageIcon className="h-4 w-4" />
                                      ) : (
                                        <FileText className="h-4 w-4" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[11px] font-semibold truncate">{file.name}</p>
                                      <p className={cn("text-[9px]", isUser ? "text-white/70" : "text-muted-foreground")}>
                                        {(file.size / 1024).toFixed(1)} KB • Click to open
                                      </p>
                                    </div>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* Message Meta (Time & Status) */}
                          <div className="flex items-center gap-1 mt-0.5 px-1">
                            <span className="text-[9px] font-medium text-muted-foreground/80">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {isUser && (
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
              {typingAgentNames.length > 0 && (
                <div className="flex w-full justify-start mt-2">
                  <div className="flex max-w-[85%] items-end gap-2">
                    <div className="w-6 shrink-0 flex flex-col justify-end pb-1">
                      <Avatar className="h-6 w-6 shadow-sm border border-border/50">
                        <AvatarFallback className="bg-secondary/20 text-[9px] font-bold text-secondary-foreground">
                          {typingAgentNames[0].charAt(0).toUpperCase()}
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
              <div className="h-2" /> {/* Scroll padding */}
            </div>

            {/* Upload Progress */}
            {uploadingFile && (
              <div className="px-4 py-2.5 bg-card/80 backdrop-blur border-t border-border/40 text-[10px] text-muted-foreground flex items-center justify-between shrink-0 z-10">
                <span className="flex items-center gap-2 font-medium">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> 
                  Encrypting & uploading... ({uploadProgress}%)
                </span>
              </div>
            )}

            {/* Chat Input form */}
            <div className="bg-white dark:bg-card border-t border-border/50 p-2.5 shrink-0 z-10">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile || ticket?.status === "closed"}
                  className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-accent/60 text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                  title="Attach file"
                >
                  <Paperclip className="h-4.5 w-4.5" />
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
                  disabled={ticket?.status === "closed"}
                  placeholder={ticket?.status === "closed" ? "Conversation closed" : "Write a reply..."}
                  className="flex-1 bg-accent/30 border-transparent hover:border-border/60 focus:border-primary/50 focus:bg-background h-10 text-[13px] rounded-lg transition-all shadow-none px-3"
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />

                <Button
                  onClick={() => handleSend()}
                  disabled={!messageText.trim() || sendMessagePending || ticket?.status === "closed"}
                  size="icon"
                  className="h-10 w-10 rounded-lg bg-primary hover:bg-primary/95 text-white shrink-0 shadow-sm"
                >
                  <Send className="h-4 w-4 ml-0.5" />
                </Button>
              </div>
              <div className="text-center mt-2">
                <span className="text-[9px] font-medium text-muted-foreground/60 flex items-center justify-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Secure & Encrypted
                </span>
              </div>
            </div>
          </div>

        ) : showNewChatForm ? (
          /* ── VIEW 2: NEW CHAT TICKET FORM ── */
          <div className="flex-1 overflow-y-auto bg-white dark:bg-card">
            <div className="p-4 border-b border-border/40 bg-accent/10">
              <button type="button" onClick={() => setShowNewChatForm(false)} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-4">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <h3 className="font-serif text-xl font-bold text-foreground">How can we help?</h3>
              <p className="text-xs text-muted-foreground mt-1">Fill out the details below so we can connect you with the right expert.</p>
            </div>
            <form onSubmit={(e) => handleStartChat(e)} className="p-5 space-y-4">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-foreground">Full Name</Label>
                  <Input
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Enter your name"
                    className="h-11 rounded-xl bg-accent/20 border-border/80 text-sm shadow-none"
                    disabled={!!user}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-foreground">Email Address</Label>
                  <Input
                    type="email"
                    required
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="h-11 rounded-xl bg-accent/20 border-border/80 text-sm shadow-none"
                    disabled={!!user}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-foreground">Support Category</Label>
                  <Select defaultValue={categories[0]?.id || "none"}>
                    <SelectTrigger className="h-11 rounded-xl bg-accent/20 border-border/80 text-sm text-foreground shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/60">
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-sm">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={createTicketPending}
                className="w-full h-12 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl mt-6 shadow-sm text-sm"
              >
                {createTicketPending ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Connecting...</span>
                ) : "Start Chatting"}
              </Button>
            </form>
          </div>

        ) : (
          /* ── VIEW 3: WELCOME SCREEN ── */
          <div className="flex-1 flex flex-col bg-white dark:bg-card">
            <div className="px-5 pt-8 pb-6 bg-gradient-to-b from-primary/5 to-transparent">
              <h2 className="text-2xl font-serif font-bold text-foreground leading-tight mb-2">
                Hello there! <Smile className="inline h-6 w-6 text-amber-500 mb-1" />
              </h2>
              <p className="text-sm text-muted-foreground">What brings you to Haven Home Hub today?</p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-6">
              
              {/* Quick Actions Map */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => {
                    const cat = categories.find(c => c.name.includes("Investments"));
                    setShowNewChatForm(true);
                    if (cat) setTimeout(() => handleStartChat(undefined, cat.id), 100);
                  }}
                  className="p-4 border border-border/60 rounded-2xl hover:border-primary/40 hover:bg-primary/5 transition-all text-left group shadow-sm bg-card"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Wallet className="h-4 w-4 text-primary" />
                  </div>
                  <h4 className="text-xs font-bold text-foreground">Investments</h4>
                  <p className="text-[10px] text-muted-foreground mt-1">Portfolio & yields</p>
                </button>

                <button 
                  onClick={() => {
                    const cat = categories.find(c => c.name.includes("Property"));
                    setShowNewChatForm(true);
                    if (cat) setTimeout(() => handleStartChat(undefined, cat.id), 100);
                  }}
                  className="p-4 border border-border/60 rounded-2xl hover:border-primary/40 hover:bg-primary/5 transition-all text-left group shadow-sm bg-card"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Building2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <h4 className="text-xs font-bold text-foreground">Properties</h4>
                  <p className="text-[10px] text-muted-foreground mt-1">Purchases & tours</p>
                </button>
              </div>

              {/* Start General Chat */}
              <div className="p-4 bg-accent/20 border border-border/50 rounded-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex -space-x-2">
                    <Avatar className="h-8 w-8 border-2 border-background">
                      <AvatarImage src="https://i.pravatar.cc/100?img=47" />
                    </Avatar>
                    <Avatar className="h-8 w-8 border-2 border-background">
                      <AvatarImage src="https://i.pravatar.cc/100?img=33" />
                    </Avatar>
                    <Avatar className="h-8 w-8 border-2 border-background">
                      <AvatarImage src="https://i.pravatar.cc/100?img=12" />
                    </Avatar>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-bold text-foreground block">Our team is online</span>
                    Ready to help you
                  </div>
                </div>
                <Button 
                  onClick={() => setShowNewChatForm(true)}
                  className="w-full bg-primary hover:bg-primary/95 text-white font-bold shadow-sm"
                >
                  Send us a message <Send className="h-3.5 w-3.5 ml-2" />
                </Button>
              </div>

              {/* Recent Conversations */}
              {localTickets.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" /> Recent Conversations
                  </Label>
                  <div className="space-y-2">
                    {localTickets.slice(0, 3).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTicketId(t.id)}
                        className="w-full text-left p-4 border border-border/50 bg-card hover:border-primary/30 rounded-2xl shadow-sm flex items-center justify-between gap-3 group transition-all"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">
                            {t.support_categories?.name || "Support Ticket"}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-medium mt-1 flex items-center gap-1.5">
                            <span className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              t.status === 'resolved' ? "bg-green-500" : "bg-blue-500"
                            )} />
                            {t.status.replace("_", " ")} · {new Date(t.last_message_at).toLocaleDateString()}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* FAQ Search */}
              <div className="space-y-3 pt-2">
                <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" /> Find an answer
                </Label>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles..."
                  className="h-11 bg-accent/20 border-border/80 rounded-xl text-sm shadow-none"
                />
                
                {searchQuery && (
                  <div className="space-y-2 mt-3">
                    {filteredFaqs.slice(0, 4).map((faq) => (
                      <div key={faq.id} className="border border-border/50 bg-card rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setSelectedFaqId(selectedFaqId === faq.id ? null : faq.id)}
                          className="w-full text-left p-3.5 text-xs font-bold text-foreground flex items-center justify-between gap-3 hover:bg-accent/40 transition-colors"
                        >
                          <span className="leading-snug">{faq.question}</span>
                          <ChevronRight className={cn(
                            "h-4 w-4 text-muted-foreground/60 shrink-0 transition-transform duration-200",
                            selectedFaqId === faq.id && "rotate-90"
                          )} />
                        </button>
                        {selectedFaqId === faq.id && (
                          <div className="px-4 pb-4 pt-1 text-xs text-muted-foreground leading-relaxed bg-accent/10 border-t border-border/30">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
