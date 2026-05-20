import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function AdminReviews() {
  const qc = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          *,
          profiles(full_name, email),
          agents(full_name),
          properties(title)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const updateReview = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "published" | "rejected" }) => {
      const { error } = await supabase
        .from("reviews" as any)
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Review updated" });
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      // Invalidate public review queries too
      qc.invalidateQueries({ queryKey: ["agent-reviews"] });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif">Reviews & Testimonials</h2>
          <p className="text-muted-foreground text-sm">Moderate agent and property reviews.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Reviewer</th>
                <th className="px-6 py-4">Target</th>
                <th className="px-6 py-4">Rating</th>
                <th className="px-6 py-4 min-w-[250px]">Content</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reviews.map((r: any) => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    {r.status === "pending" && <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20"><Clock className="w-3 h-3 mr-1"/> Pending</Badge>}
                    {r.status === "published" && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1"/> Published</Badge>}
                    {r.status === "rejected" && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="w-3 h-3 mr-1"/> Rejected</Badge>}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-foreground">{r.profiles?.full_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{r.profiles?.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    {r.agent_id && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase">Agent:</span>
                        <p className="font-medium">{r.agents?.full_name}</p>
                      </div>
                    )}
                    {r.property_id && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase">Property:</span>
                        <p className="font-medium">{r.properties?.title}</p>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-current" : "fill-transparent text-muted-foreground/30"}`} />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="line-clamp-2 text-foreground/80" title={r.comment}>{r.comment}</p>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {r.status === "pending" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => updateReview.mutate({ id: r.id, status: "published" })}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => updateReview.mutate({ id: r.id, status: "rejected" })}>Reject</Button>
                      </>
                    )}
                    {r.status === "published" && (
                      <Button size="sm" variant="outline" onClick={() => updateReview.mutate({ id: r.id, status: "rejected" })}>Revoke</Button>
                    )}
                    {r.status === "rejected" && (
                      <Button size="sm" variant="outline" onClick={() => updateReview.mutate({ id: r.id, status: "published" })}>Approve</Button>
                    )}
                  </td>
                </tr>
              ))}
              {reviews.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No reviews found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
