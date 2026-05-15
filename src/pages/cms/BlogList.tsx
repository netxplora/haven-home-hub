import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/site/SEO";

export default function BlogList() {
  const { data: posts, isLoading } = useQuery({
    queryKey: ["public-blog-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("*, blog_categories(name)")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <SiteLayout>
      <SEO title="Blog — Insights & News" description="Market analysis, investment guides, property buying tips, and platform updates from the Verdant Estate team." />
      {/* Hero Header */}
      <div className="relative overflow-hidden min-h-[350px] sm:min-h-[400px] flex items-center bg-black">
        <img 
          src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1920&q=80" 
          alt="Insights and News" 
          className="absolute inset-0 h-full w-full object-cover"
          crossOrigin="anonymous"
        />
        <div className="absolute inset-0 bg-gradient-hero-emerald mix-blend-multiply opacity-60 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 z-[2]" />
        
        <div className="container-wide relative z-10 text-primary-foreground text-center">
          <p className="mb-3 text-sm font-medium tracking-wider uppercase text-primary">Blog</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl text-white">Insights & News</h1>
          <p className="mt-5 text-lg text-white/80 max-w-2xl mx-auto leading-relaxed font-light">
            Market analysis, investment guides, property buying tips, and platform updates from the Verdant Estate team.
          </p>
        </div>
      </div>

      <div className="container-wide py-12 md:py-20">
        {isLoading ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[16/10] w-full rounded-xl" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : posts?.length === 0 ? (
          <div className="text-center py-20 bg-secondary/20 rounded-xl border border-border">
            <h2 className="text-2xl font-serif font-semibold">No articles yet</h2>
            <p className="mt-2 text-muted-foreground">Check back soon for our latest insights.</p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {posts?.map((post) => (
              <Link 
                key={post.id} 
                to={`/blog/${post.slug}`}
                className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1"
              >
                {post.cover_image_url ? (
                  <div className="aspect-[16/10] overflow-hidden bg-secondary">
                    <img 
                      src={post.cover_image_url} 
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/10] bg-accent flex items-center justify-center">
                    <span className="text-muted-foreground font-serif text-xl">Verdant Estate</span>
                  </div>
                )}
                
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center gap-3 mb-3">
                    {post.blog_categories?.name && (
                      <Badge variant="secondary" className="font-medium">
                        {post.blog_categories.name}
                      </Badge>
                    )}
                    <time className="text-xs text-muted-foreground">
                      {new Date(post.published_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </time>
                  </div>
                  
                  <h3 className="font-serif text-xl font-semibold leading-tight group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  
                  {post.excerpt && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}
                  
                  <div className="mt-auto pt-6 text-sm font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                    Read article &rarr;
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
