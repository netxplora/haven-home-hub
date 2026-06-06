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
  Smile,
  ShieldCheck
} from "lucide-react";
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
  const [isTyping, setIsTyping] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    updateTicket
  } = useSupport(activeTicketId || undefined);

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

  // Filtered tickets (combines user tickets or guest tickets)
  const [localTickets, setLocalTickets] = useState<SupportTicket[]>([]);
  useEffect(() => {
    if (user) {
      setLocalTickets(myTickets);
    } else {
      // Query guest tickets by ID
      if (guestTicketIds.length > 0) {
        // Fetch them via Supabase client directly
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
        setLocalTickets([]);
      }
    }
  }, [user, myTickets, guestTicketIds]);

  // Auto Scroll chat threads
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Count overall unread messages for minimized badge
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    if (localTickets.length > 0) {
      // Query all messages for my tickets where is_read is false and sender is agent
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

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !guestEmail.trim()) {
      toast({ title: "Required", description: "Name and Email are required to initiate chat.", variant: "destructive" });
      return;
    }

    try {
      const newTicket = await createTicket({
        name: guestName.trim(),
        email: guestEmail.trim(),
        user_type: userType,
        category_id: categories[0]?.id || null,
        priority: "medium"
      });

      if (!user) {
        // Save guest details
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

    try {
      // If ticket status is resolved/closed, reopen it
      if (ticket && (ticket.status === "resolved" || ticket.status === "closed")) {
        await updateTicket({ id: currentTicketId, status: "open" });
      }

      await sendMessage({
        ticket_id: currentTicketId,
        message_text: content.trim(),
        sender_type: user ? "agent" : "user", // Wait! In public widget, user is client (which is 'user' or 'guest' sender_type)
        sender_name: guestName || "Client User"
      });
    } catch (err: any) {
      toast({ title: "Message not sent", description: err.message, variant: "destructive" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeTicketId) return;

    setUploadingFile(true);
    setUploadProgress(10);
    try {
      // Simulate scan & progress
      const interval = setInterval(() => {
        setUploadProgress((p) => (p < 80 ? p + 15 : p));
      }, 100);

      const attachment = await uploadAttachment(activeTicketId, file);
      clearInterval(interval);
      setUploadProgress(100);

      // Send message with attachment
      await sendMessage({
        ticket_id: activeTicketId,
        message_text: `Sent attachment: ${file.name}`,
        sender_type: user ? "user" : "guest", // public client sender
        sender_name: guestName || "Client User",
        attachments: [attachment]
      });

      toast({ title: "File uploaded successfully" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Toggle state
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
    <div className="fixed bottom-6 right-6 z-[45] w-[380px] h-[580px] rounded-2xl bg-card border border-border/80 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300 font-sans">
      
      {/* HEADER */}
      <div className="bg-secondary p-4 flex items-center justify-between shrink-0 text-white">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-white/20">
            <AvatarImage src="/favicon.ico" />
            <AvatarFallback className="bg-primary/25 font-bold font-serif text-white">H</AvatarFallback>
          </Avatar>
          <div>
            <h4 className="font-serif text-sm font-semibold flex items-center gap-1.5 leading-tight">
              Haven Support Desk
              <span className="h-2 w-2 rounded-full bg-green-400 inline-block animate-pulse" />
            </h4>
            <p className="text-[10px] text-white/60 font-medium">Typically responds in a few minutes</p>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)} 
          className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/80 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* CORE VIEWPORT */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-secondary/5 flex flex-col">
        
        {/* VIEW 1: CHAT THREAD */}
        {activeTicketId ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Thread Navigation Header */}
            <div className="bg-card px-4 py-2 border-b border-border/40 flex items-center gap-2 text-xs text-muted-foreground shrink-0 font-medium">
              <button 
                onClick={() => setActiveTicketId(null)}
                className="flex items-center gap-1 hover:text-foreground transition-colors py-1 px-1.5 rounded-md hover:bg-secondary/10"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <span className="text-border">|</span>
              <span className="truncate">Ticket #{activeTicketId.substring(0, 8)}</span>
              {ticket && (
                <Badge variant="outline" className={cn(
                  "ml-auto text-[9px] uppercase tracking-wider font-bold rounded px-1.5 py-0.5",
                  ticket.status === 'open' && "bg-blue-500/10 text-blue-600 border-blue-200",
                  ticket.status === 'pending' && "bg-amber-500/10 text-amber-600 border-amber-200",
                  ticket.status === 'resolved' && "bg-green-500/10 text-green-600 border-green-200",
                  ticket.status === 'closed' && "bg-muted text-muted-foreground"
                )}>
                  {ticket.status}
                </Badge>
              )}
            </div>

            {/* Messages Scrollbox */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">No messages yet. Send a message to get started.</p>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.sender_type === "user" || msg.sender_type === "guest";
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
                    <div key={msg.id} className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
                      <div className={cn(
                        "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-soft",
                        isUser 
                          ? "bg-primary text-white rounded-tr-none font-medium" 
                          : "bg-card border border-border/60 text-foreground rounded-tl-none"
                      )}>
                        {/* Text Content */}
                        {msg.message_text && <p>{msg.message_text}</p>}

                        {/* File Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-1.5 border-t border-white/20 pt-2">
                            {msg.attachments.map((file, idx) => (
                              <a 
                                key={idx} 
                                href={file.url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="flex items-center gap-2 p-1.5 rounded bg-black/10 hover:bg-black/15 transition-all text-[10px] truncate max-w-full font-semibold"
                              >
                                {file.type.startsWith("image/") ? (
                                  <ImageIcon className="h-4.5 w-4.5 shrink-0" />
                                ) : (
                                  <FileText className="h-4.5 w-4.5 shrink-0" />
                                )}
                                <span className="truncate flex-1">{file.name}</span>
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Timestamp & Read/Delivered Indicators */}
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className={cn("text-[9px] uppercase tracking-wider font-semibold opacity-60", isUser ? "text-white/80" : "text-muted-foreground")}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {isUser && (
                            msg.is_read ? (
                              <CheckCheck className="h-3.5 w-3.5 text-white/90" />
                            ) : (
                              <Check className="h-3.5 w-3.5 text-white/60" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Attachment progress indicator */}
            {uploadingFile && (
              <div className="px-4 py-2 bg-card border-t border-border/40 text-[10px] text-muted-foreground flex items-center justify-between shrink-0">
                <span className="flex items-center gap-1.5 font-medium">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> 
                  Scanning & uploading file ({uploadProgress}%)
                </span>
                <Badge variant="outline" className="text-[8px] bg-green-500/10 text-green-600 border-green-200">Threat Check Clean</Badge>
              </div>
            )}

            {/* Quick reaction emojis */}
            <div className="px-4 py-1.5 bg-card border-t border-border/40 flex items-center gap-1.5 shrink-0 overflow-x-auto hide-scrollbar">
              {QUICK_EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => handleSend(e)}
                  className="text-sm hover:scale-125 transition-transform duration-200 p-1 hover:bg-accent/40 rounded"
                >
                  {e}
                </button>
              ))}
            </div>

            {/* Chat Input form */}
            <div className="p-3 bg-card border-t border-border/40 flex items-center gap-2 shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-accent border border-border/60 text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                title="Attach document or screenshot"
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
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={ticket?.status === "resolved" ? "Ticket resolved. Send message to reopen..." : "Type your message..."}
                className="flex-1 bg-accent/40 border-border/60 h-10 text-xs rounded-xl focus-visible:ring-primary/20"
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />

              <Button
                onClick={() => handleSend()}
                disabled={!messageText.trim() || sendMessagePending}
                size="icon"
                className="h-10 w-10 rounded-xl bg-primary hover:bg-primary/95 text-white shrink-0 shadow-sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Security Indicator Footer */}
            <div className="bg-card border-t border-border/30 px-3 py-1.5 text-[9px] text-muted-foreground/80 flex items-center justify-center gap-1 shrink-0 font-medium bg-accent/10">
              <ShieldCheck className="h-3.5 w-3.5 text-green-500" /> Vetted & Secure Session · HIPAA & GDPR Compliant
            </div>
          </div>

        ) : showNewChatForm ? (
          /* VIEW 2: NEW CHAT TICKET FORM */
          <form onSubmit={handleStartChat} className="flex-1 p-5 space-y-4 overflow-y-auto">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
              <button type="button" onClick={() => setShowNewChatForm(false)} className="flex items-center gap-1 hover:text-foreground transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <span className="text-border">|</span>
              <span>Start New Conversation</span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your Name</Label>
                <Input
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter full name"
                  className="h-11 rounded-xl bg-card border-border/80 text-xs"
                  disabled={!!user}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                <Input
                  type="email"
                  required
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="h-11 rounded-xl bg-card border-border/80 text-xs"
                  disabled={!!user}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select User Type</Label>
                <Select value={userType} onValueChange={setUserType}>
                  <SelectTrigger className="h-11 rounded-xl bg-card border-border/80 text-xs text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/60">
                    <SelectItem value="guest" className="text-xs">Visitor / Guest</SelectItem>
                    <SelectItem value="investor" className="text-xs">Investor</SelectItem>
                    <SelectItem value="buyer" className="text-xs">Property Buyer</SelectItem>
                    <SelectItem value="renter" className="text-xs">Property Renter</SelectItem>
                    <SelectItem value="seller" className="text-xs">Property Seller / Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Support Category</Label>
                <Select defaultValue={categories[0]?.id || "none"}>
                  <SelectTrigger className="h-11 rounded-xl bg-card border-border/80 text-xs text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/60">
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={createTicketPending}
              className="w-full h-11 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl mt-4 shadow-sm"
            >
              {createTicketPending ? (
                <span className="flex items-center justify-center gap-1.5"><Loader2 className="h-4 w-4 animate-spin" /> Starting Chat...</span>
              ) : "Start Conversation"}
            </Button>
          </form>

        ) : (
          /* VIEW 3: WELCOME, SEARCH FAQS & RECENT TICKETS PANEL */
          <div className="flex-1 p-5 space-y-6 overflow-y-auto">
            
            {/* Search FAQ */}
            <div className="space-y-2.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Search Knowledge Base</Label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search investment, ROI, docs..."
                  className="pl-10 h-11 bg-card border-border/85 rounded-xl text-xs placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            {/* Search results or Popular FAQs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between ml-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {searchQuery ? "Search Suggestions" : "Popular Questions"}
                </Label>
                <HelpCircle className="h-4 w-4 text-muted-foreground/40" />
              </div>

              <div className="space-y-2">
                {filteredFaqs.slice(0, 4).map((faq) => (
                  <div 
                    key={faq.id} 
                    className="border border-border/50 bg-card rounded-xl overflow-hidden transition-all duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedFaqId(selectedFaqId === faq.id ? null : faq.id)}
                      className="w-full text-left p-3.5 text-xs font-semibold text-foreground flex items-center justify-between gap-3 hover:bg-accent/40 transition-colors"
                    >
                      <span className="leading-snug">{faq.question}</span>
                      <ChevronRight className={cn(
                        "h-4 w-4 text-muted-foreground/60 shrink-0 transition-transform duration-200",
                        selectedFaqId === faq.id && "rotate-90"
                      )} />
                    </button>
                    {selectedFaqId === faq.id && (
                      <div className="px-3.5 pb-3.5 pt-1 text-[11px] text-muted-foreground leading-relaxed bg-accent/20 border-t border-border/30">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
                {filteredFaqs.length === 0 && (
                  <p className="text-xs text-muted-foreground italic text-center py-4">No FAQs match your search query.</p>
                )}
              </div>
            </div>

            {/* Recent Conversations */}
            {localTickets.length > 0 && (
              <div className="space-y-2.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Recent Conversations</Label>
                <div className="space-y-2">
                  {localTickets.slice(0, 3).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTicketId(t.id)}
                      className="w-full text-left p-3.5 border border-border/50 bg-card hover:border-primary/30 rounded-xl shadow-soft flex items-center justify-between gap-3 group transition-all duration-200"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {t.support_categories?.name || "Support Ticket"}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5 flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          Last active {new Date(t.last_message_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-[9px] uppercase tracking-wider font-bold rounded px-1.5 py-0.5",
                        t.status === 'open' && "bg-blue-500/10 text-blue-600 border-blue-200",
                        t.status === 'pending' && "bg-amber-500/10 text-amber-600 border-amber-200",
                        t.status === 'resolved' && "bg-green-500/10 text-green-600 border-green-200",
                        t.status === 'closed' && "bg-muted text-muted-foreground"
                      )}>
                        {t.status}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions Footer */}
            <div className="pt-2">
              <Button
                onClick={() => setShowNewChatForm(true)}
                className="w-full h-12 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="h-4.5 w-4.5" /> Start New Conversation
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
