import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Send, ArrowLeft } from "lucide-react";

/** Start or open a conversation with an agent about a property */
export function MessageAgentButton({
  agentUserId,
  agentName,
  propertyId,
  propertyTitle,
}: {
  agentUserId: string;
  agentName: string;
  propertyId?: string;
  propertyTitle?: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const startConversation = async () => {
    if (!user) return;

    // Check if conversation already exists between user and agent for this property
    const { data: existing } = await (supabase
      .from("conversation_participants" as any)
      .select("conversation_id")
      .eq("user_id", user.id) as any);

    if (existing && existing.length > 0) {
      const convIds = existing.map((e: any) => e.conversation_id);

      // Find conversation that also has the agent
      const { data: agentConvs } = await (supabase
        .from("conversation_participants" as any)
        .select("conversation_id")
        .eq("user_id", agentUserId)
        .in("conversation_id", convIds) as any);

      if (agentConvs && agentConvs.length > 0) {
        // If there's a property-specific conversation, prefer it
        if (propertyId) {
          const { data: propConv } = await (supabase
            .from("conversations" as any)
            .select("id")
            .eq("property_id", propertyId)
            .in("id", agentConvs.map((c: any) => c.conversation_id))
            .maybeSingle() as any);
          if (propConv) {
            setConversationId(propConv.id);
            setOpen(true);
            return;
          }
        }
        // Use first existing conversation
        setConversationId(agentConvs[0].conversation_id);
        setOpen(true);
        return;
      }
    }

    // Create new conversation
    const { data: conv, error: convErr } = await (supabase
      .from("conversations" as any)
      .insert({ property_id: propertyId || null })
      .select("id")
      .single() as any);

    if (convErr || !conv) return;

    // Add both participants
    await (supabase.from("conversation_participants" as any).insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: agentUserId },
    ]) as any);

    setConversationId(conv.id);
    setOpen(true);
  };

  if (!user) return null;

  return (
    <>
      <Button
        variant="outline"
        className="gap-2 border-primary/20 hover:border-primary/40"
        onClick={startConversation}
      >
        <MessageSquare className="h-4 w-4 text-primary" />
        Message {agentName?.split(" ")[0] || "Agent"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg h-[70vh] flex flex-col p-0">
          <DialogHeader className="px-5 py-4 border-b border-border shrink-0">
            <DialogTitle className="font-serif text-lg">
              {propertyTitle ? `About: ${propertyTitle}` : `Chat with ${agentName}`}
            </DialogTitle>
          </DialogHeader>
          {conversationId && (
            <ChatThread conversationId={conversationId} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Chat thread that displays messages and handles sending */
function ChatThread({ conversationId }: { conversationId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("messages" as any)
        .select("*, profiles:sender_id(full_name, avatar_url)")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }) as any);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["messages", conversationId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, qc]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark unread messages as read
  useEffect(() => {
    if (!user || messages.length === 0) return;
    const unread = messages.filter((m: any) => m.sender_id !== user.id && !m.read);
    if (unread.length > 0) {
      (supabase
        .from("messages" as any)
        .update({ read: true })
        .in("id", unread.map((m: any) => m.id)) as any)
        .then(() => {});
    }
  }, [messages, user]);

  const sendMsg = useMutation({
    mutationFn: async () => {
      if (!msg.trim() || !user) return;
      const { error } = await (supabase.from("messages" as any).insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: msg.trim(),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setMsg("");
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });

  return (
    <>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-12 w-2/3 ml-auto" />
            <Skeleton className="h-12 w-3/4" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((m: any) => {
            const isMine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-accent text-foreground rounded-bl-md"
                  }`}
                >
                  {!isMine && (
                    <p className="text-[10px] font-bold mb-0.5 opacity-70">
                      {m.profiles?.full_name || "Agent"}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed">{m.content}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3 shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMsg.mutate(); }}
          className="flex items-center gap-2"
        >
          <Input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border-border"
            autoFocus
          />
          <Button
            type="submit"
            size="icon"
            disabled={!msg.trim() || sendMsg.isPending}
            className="shrink-0 h-10 w-10 rounded-xl"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </>
  );
}

/** Conversation list for the user dashboard */
export function ConversationList() {
  const { user } = useAuth();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      // Get conversations user participates in
      const { data: parts } = await (supabase
        .from("conversation_participants" as any)
        .select("conversation_id")
        .eq("user_id", user!.id) as any);

      if (!parts || parts.length === 0) return [];

      const convIds = parts.map((p: any) => p.conversation_id);

      const { data: convs } = await (supabase
        .from("conversations" as any)
        .select("*, properties(title, slug, cover_image_url)")
        .in("id", convIds)
        .order("updated_at", { ascending: false }) as any);

      // For each conversation, get last message and other participant
      const enriched = await Promise.all(
        (convs ?? []).map(async (c: any) => {
          const [lastMsg, otherPart] = await Promise.all([
            (supabase
              .from("messages" as any)
              .select("content, created_at, sender_id, read")
              .eq("conversation_id", c.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle() as any),
            (supabase
              .from("conversation_participants" as any)
              .select("user_id, profiles:user_id(full_name, avatar_url)")
              .eq("conversation_id", c.id)
              .neq("user_id", user!.id)
              .maybeSingle() as any),
          ]);

          const unreadCount = await (supabase
            .from("messages" as any)
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", c.id)
            .neq("sender_id", user!.id)
            .eq("read", false) as any);

          return {
            ...c,
            lastMessage: lastMsg.data,
            otherUser: otherPart.data?.profiles,
            unreadCount: unreadCount.count ?? 0,
          };
        })
      );

      return enriched;
    },
    enabled: !!user,
  });

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;

  if (conversations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No conversations yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((c: any) => (
        <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4 hover:border-border transition-all cursor-pointer">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">
              {c.otherUser?.full_name?.charAt(0) || "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium truncate">{c.otherUser?.full_name || "User"}</p>
              {c.lastMessage && (
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(c.lastMessage.created_at).toLocaleDateString()}
                </span>
              )}
            </div>
            {c.properties?.title && (
              <p className="text-[10px] text-primary font-medium truncate">Re: {c.properties.title}</p>
            )}
            {c.lastMessage && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage.content}</p>
            )}
          </div>
          {c.unreadCount > 0 && (
            <span className="h-5 min-w-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5">
              {c.unreadCount}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
