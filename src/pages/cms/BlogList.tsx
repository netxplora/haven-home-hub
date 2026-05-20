import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/site/SEO";
import { BookOpen, Calendar } from "lucide-react";

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
      <div className="relative overflow-hidden min-h-[340px] sm:min-h-[400px] flex items-center justify-center bg-black">
        <img
          src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1920&q=80"
          alt="Insights and News"
          className="absolute inset-0 h-full w-full object-cover"
          crossOrigin="anonymous"
        />
        <div className="absolute inset-0 bg-gradient-hero-emerald mix-blend-multiply opacity-60 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 z-[2]" />

        <div className="container-wide relative z-10 text-center py-16 sm:py-20">
          <p className="mb-3 text-sm font-medium tracking-wider uppercase text-primary">Blog</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl text-white">
            Insights & News
          </h1>
          <p className="mt-5 text-lg text-white/80 max-w-2xl mx-auto leading-relaxed font-light">
            Market analysis, investment guides, property buying tips, and platform updates from the Verdant Estate team.
          </p>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="container-wide py-14 md:py-20">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-2">Latest Articles</p>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground">
              {isLoading ? "Loading..." : `${posts?.length || 0} Articles Published`}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Browse all topics</span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[16/10] w-full rounded-xl" />
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : posts?.length === 0 ? (
          <div className="text-center py-24 bg-accent/50 rounded-xl border border-border/50">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-2xl font-serif font-semibold text-foreground">No articles yet</h2>
            <p className="mt-3 text-muted-foreground max-w-md mx-auto leading-relaxed">
              We're working on creating helpful content. Check back soon for market insights and property guides.
            </p>
            <Button asChild variant="outline" className="mt-8 rounded-xl font-medium">
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Featured Post (first post) */}
            {posts && posts.length > 0 && (
              <Link
                to={`/blog/${posts[0].slug}`}
                className="group block mb-12 rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-lg"
              >
                <div className="grid md:grid-cols-2 gap-0">
                  <div className="aspect-[16/10] md:aspect-auto overflow-hidden bg-secondary">
                    {posts[0].cover_image_url ? (
                      <img
                        src={posts[0].cover_image_url}
                        alt={posts[0].title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-accent flex items-center justify-center min-h-[280px]">
                        <span className="text-muted-foreground font-serif text-2xl">Verdant Estate</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-12">
                    <div className="flex items-center gap-3 mb-4">
                      {posts[0].blog_categories?.name && (
                        <Badge variant="secondary" className="font-medium text-xs">
                          {posts[0].blog_categories.name}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <time>
                          {new Date(posts[0].published_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </time>
                      </div>
                    </div>
                    <h3 className="font-serif text-2xl sm:text-3xl font-semibold leading-tight text-foreground group-hover:text-primary transition-colors">
                      {posts[0].title}
                    </h3>
                    {posts[0].excerpt && (
                      <p className="mt-4 text-muted-foreground leading-relaxed line-clamp-3">
                        {posts[0].excerpt}
                      </p>
                    )}
                    <div className="mt-6 text-sm font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                      Read full article &rarr;
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Remaining Posts Grid */}
            {posts && posts.length > 1 && (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {posts.slice(1).map((post) => (
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
                          <Badge variant="secondary" className="font-medium text-[10px]">
                            {post.blog_categories.name}
                          </Badge>
                        )}
                        <time className="text-xs text-muted-foreground">
                          {new Date(post.published_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </time>
                      </div>

                      <h3 className="font-serif text-lg font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h3>

                      {post.excerpt && (
                        <p className="mt-3 text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                          {post.excerpt}
                        </p>
                      )}

                      <div className="mt-auto pt-5 text-sm font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                        Read article &rarr;
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </SiteLayout>
  );
}
