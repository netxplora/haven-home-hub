import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(5, "Please share at least a few words").max(1000),
});

type Target = { propertyId?: string; agentId?: string };

export function Reviews({ target }: { target: Target }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["reviews", target.propertyId ?? null, target.agentId ?? null];

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = supabase
        .from("reviews")
        .select("id, rating, title, body, created_at, user_id, profiles:profiles!reviews_user_id_fkey(full_name, avatar_url)" as any)
        .order("created_at", { ascending: false });
      if (target.propertyId) q = q.eq("property_id", target.propertyId);
      if (target.agentId) q = q.eq("agent_id", target.agentId);
      const { data, error } = await q;
      if (error) {
        // fallback without profile join (no FK relationship in PostgREST cache)
        let q2 = supabase.from("reviews").select("id, rating, title, body, created_at, user_id").order("created_at", { ascending: false });
        if (target.propertyId) q2 = q2.eq("property_id", target.propertyId);
        if (target.agentId) q2 = q2.eq("agent_id", target.agentId);
        const { data: d2 } = await q2;
        return (d2 ?? []) as any[];
      }
      return (data ?? []) as any[];
    },
  });

  const avg = reviews.length ? reviews.reduce((s, r: any) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-serif text-xl font-semibold">Reviews</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Stars value={Math.round(avg)} />
            <span><strong className="text-foreground">{avg.toFixed(1)}</strong> · {reviews.length} review{reviews.length === 1 ? "" : "s"}</span>
          </div>
        )}
      </div>

      {user ? (
        <ReviewForm target={target} onDone={() => qc.invalidateQueries({ queryKey: key })} />
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          <Link to="/auth" className="text-primary underline">Sign in</Link> to leave a review.
        </p>
      )}

      <div className="mt-6 space-y-4">
        {isLoading && <Skeleton className="h-24 rounded-xl" />}
        {!isLoading && reviews.length === 0 && (
          <p className="text-sm text-muted-foreground">No reviews yet. Be the first to share your experience.</p>
        )}
        {reviews.map((r: any) => (
          <article key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <Stars value={r.rating} />
              <time className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</time>
            </div>
            {r.title && <h3 className="mt-2 font-medium">{r.title}</h3>}
            <p className="mt-1 whitespace-pre-line text-sm text-foreground/85">{r.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function ReviewForm({ target, onDone }: { target: Target; onDone: () => void }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = reviewSchema.safeParse({ rating, title: title || undefined, body });
    if (!parsed.success) {
      toast({ title: "Please check your review", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("reviews").insert({
      user_id: user.id,
      property_id: target.propertyId ?? null,
      agent_id: target.agentId ?? null,
      rating: parsed.data.rating,
      title: parsed.data.title ?? null,
      body: parsed.data.body,
    });
    setBusy(false);
    if (error) {
      const dup = error.message.includes("duplicate");
      toast({
        title: dup ? "You've already reviewed this" : "Could not submit",
        description: dup ? "You can only post one review per item." : error.message,
        variant: "destructive",
      });
      return;
    }
    setTitle(""); setBody(""); setRating(5);
    toast({ title: "Review posted", description: "Thanks for sharing your feedback." });
    onDone();
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl border border-border bg-card p-4 shadow-soft">
      <Label className="text-sm">Your rating</Label>
      <div className="mt-1 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star${n === 1 ? "" : "s"}`}>
            <Star className={`h-6 w-6 ${n <= rating ? "fill-accent text-accent" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        <Label htmlFor="rev-title">Title (optional)</Label>
        <Input id="rev-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Summary of your experience" />
      </div>
      <div className="mt-3 space-y-1.5">
        <Label htmlFor="rev-body">Review</Label>
        <Textarea id="rev-body" value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={1000} placeholder="Tell others what you thought..." />
      </div>
      <Button type="submit" disabled={busy} className="mt-3 bg-primary text-primary-foreground hover:bg-primary/90">
        {busy ? "Posting..." : "Post review"}
      </Button>
    </form>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-4 w-4 ${n <= value ? "fill-accent text-accent" : "text-muted-foreground/40"}`} />
      ))}
    </div>
  );
}