import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Star, ShieldCheck, ThumbsUp } from "lucide-react";

interface AgentReviewsProps {
  agentId: string;
  agentName?: string;
  propertyId?: string;
}

export function AgentReviews({ agentId, agentName, propertyId }: AgentReviewsProps) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["agent-reviews", agentId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("agent_reviews" as any)
        .select("*, profiles:user_id(full_name)")
        .eq("agent_id", agentId)
        .eq("status", "approved")
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return data ?? [];
    },
  });

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-5">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${star <= Math.round(Number(avgRating)) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
              />
            ))}
          </div>
          <span className="text-sm font-bold">{avgRating}</span>
          <span className="text-xs text-muted-foreground">({reviews.length} reviews)</span>
        </div>
        {user && (
          <WriteReviewDialog
            agentId={agentId}
            agentName={agentName}
            propertyId={propertyId}
            userId={user.id}
          />
        )}
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Star className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No reviews yet. Be the first to share your experience.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review: any) => (
            <div key={review.id} className="rounded-xl border border-border/50 bg-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">
                      {review.profiles?.full_name?.charAt(0) || "?"}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{review.profiles?.full_name || "User"}</p>
                      {review.verified && (
                        <Badge variant="outline" className="text-[10px] gap-1 text-orange-600 border-orange-200 bg-orange-50">
                          <ShieldCheck className="h-2.5 w-2.5" /> Verified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3 w-3 ${star <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {review.title && (
                <p className="mt-3 text-sm font-bold text-foreground">{review.title}</p>
              )}
              {review.content && (
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{review.content}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Dialog to write a new review */
function WriteReviewDialog({
  agentId,
  agentName,
  propertyId,
  userId,
}: {
  agentId: string;
  agentName?: string;
  propertyId?: string;
  userId: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      if (rating === 0) throw new Error("Please select a rating");
      const { error } = await (supabase.from("agent_reviews" as any).insert({
        agent_id: agentId,
        user_id: userId,
        property_id: propertyId || null,
        rating,
        title: title.trim() || null,
        content: content.trim() || null,
      }) as any);
      if (error) {
        if (error.code === "23505") throw new Error("You have already reviewed this agent for this property.");
        throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Review submitted", description: "Your review is pending approval." });
      qc.invalidateQueries({ queryKey: ["agent-reviews"] });
      setOpen(false);
      setRating(0);
      setTitle("");
      setContent("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold">
          <Star className="h-3.5 w-3.5" /> Write a Review
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">
            Review {agentName || "Agent"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          {/* Star Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Your Rating</label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-7 w-7 transition-colors ${
                      star <= (hoverRating || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/20"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Title (optional)</label>
            <Input
              placeholder="Summarize your experience"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Your Review (optional)</label>
            <textarea
              placeholder="Share details about your experience..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          <Button
            onClick={() => submit.mutate()}
            disabled={rating === 0 || submit.isPending}
            className="w-full h-12 font-bold"
          >
            {submit.isPending ? "Submitting..." : "Submit Review"}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            Reviews are moderated before being published.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Compact rating display for agent cards */
export function AgentRatingBadge({ avgRating, reviewCount }: { avgRating: number; reviewCount: number }) {
  if (reviewCount === 0) return null;
  return (
    <div className="inline-flex items-center gap-1.5 text-xs">
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span className="font-bold">{Number(avgRating).toFixed(1)}</span>
      <span className="text-muted-foreground">({reviewCount})</span>
    </div>
  );
}
