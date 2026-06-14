import { useQuery } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function HomeTestimonials() {
  const [emblaRef] = useEmblaCarousel({ loop: true, align: "start" });

  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ["homepage-testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("featured", true)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 bg-card border border-border/50 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (testimonials.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border border-dashed rounded-xl border-border bg-card">
        No testimonials available yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden cursor-grab active:cursor-grabbing" ref={emblaRef}>
      <div className="flex touch-pan-y -ml-4">
        {testimonials.map((item: any) => (
          <div key={item.id} className="min-w-0 shrink-0 basis-full sm:basis-1/2 md:basis-1/3 pl-4">
            <div className="bg-card p-6 rounded-2xl border border-border/40 shadow-soft flex flex-col justify-between h-full select-none">
              <div>
                <div className="flex gap-1 text-primary mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < item.rating ? "fill-current" : "fill-transparent text-muted-foreground/30"}`} />
                  ))}
                </div>
                <p className="text-muted-foreground italic mb-6 leading-relaxed text-xs">"{item.content}"</p>
              </div>
              <div className="flex items-center gap-3">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="h-10 w-10 rounded-full object-cover border border-border/50" draggable={false} />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {item.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-foreground text-sm">{item.name}</h4>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{item.user_type}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
