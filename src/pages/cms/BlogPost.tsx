import { useParams, Navigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, Clock, User, Tag, Share2, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SEO } from "@/components/site/SEO";
import { BlogPostJsonLd } from "@/components/site/JsonLd";
import { toast } from "@/hooks/use-toast";

export default function BlogPost() {
  const { slug } = useParams();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["public-blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*, blog_categories(name), profiles(full_name)")
        .eq("slug", slug as string)
        .eq("status", "published")
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch related posts
  const { data: relatedPosts = [] } = useQuery({
    queryKey: ["related-posts", post?.category_id, post?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, cover_image_url, published_at, blog_categories(name)")
        .eq("status", "published")
        .neq("id", post!.id)
        .order("published_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
    enabled: !!post,
  });

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="container-wide py-8">
          <Skeleton className="h-5 w-48 mb-8" />
        </div>
        <div className="container-wide">
          <Skeleton className="aspect-[21/9] w-full rounded-xl mb-10" />
        </div>
        <div className="container-tight py-12">
          <div className="max-w-3xl mx-auto space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (error || !post) {
    return <Navigate to="/blog" replace />;
  }

  const publishedDate = new Date(post.published_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Estimate reading time (~200 words per minute)
  const wordCount = (post.content || "").split(/\s+/).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <SiteLayout>
      {post && (
        <SEO
          title={post.title}
          description={post.excerpt || post.title}
          image={post.cover_image_url}
          type="article"
        />
      )}
      {post && <BlogPostJsonLd post={post} />}

      <article>
        {/* Breadcrumb Navigation */}
        <div className="container-wide pt-8 pb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <Link to="/blog" className="hover:text-primary transition-colors">Blog</Link>
            <span>/</span>
            <span className="text-foreground font-medium truncate max-w-[250px]">{post.title}</span>
          </div>
        </div>

        {/* Featured Image — Full-width in container */}
        {post.cover_image_url && (
          <div className="container-wide pb-10">
            <div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl border border-border/50 shadow-card">
              <img
                src={post.cover_image_url}
                alt={post.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </div>
          </div>
        )}

        {/* Article Header + Content — Centered narrow container */}
        <div className="container-tight">
          <div className="max-w-3xl mx-auto">
            {/* Article Header */}
            <header className="pb-10">
              {/* Meta: Category & Date */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                {post.blog_categories?.name && (
                  <Badge variant="secondary" className="font-medium text-xs px-3 py-1">
                    <Tag className="h-3 w-3 mr-1.5" />
                    {post.blog_categories.name}
                  </Badge>
                )}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <time>{publishedDate}</time>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{readingTime} min read</span>
                </div>
              </div>

              {/* Title */}
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight leading-[1.15] text-foreground">
                {post.title}
              </h1>

              {/* Excerpt */}
              {post.excerpt && (
                <p className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed font-light">
                  {post.excerpt}
                </p>
              )}

              {/* Author & Share Row */}
              <div className="mt-8 flex items-center justify-between flex-wrap gap-4">
                {post.profiles?.full_name && (
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-serif font-bold text-base">
                      {post.profiles.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{post.profiles.full_name}</p>
                      <p className="text-xs text-muted-foreground">Author</p>
                    </div>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg font-medium text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast({ title: "Link Copied", description: "Article link copied to clipboard." });
                  }}
                >
                  <Share2 className="h-3.5 w-3.5 mr-2" /> Share Article
                </Button>
              </div>
            </header>

            <Separator className="mb-10" />

            {/* Article Body */}
            <div className="prose prose-lg dark:prose-invert max-w-none
              prose-headings:font-serif prose-headings:tracking-tight prose-headings:text-foreground
              prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-12 prose-h2:mb-5
              prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-10 prose-h3:mb-4
              prose-p:text-foreground/85 prose-p:leading-[1.85] prose-p:mb-6 prose-p:text-base
              prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline
              prose-strong:text-foreground prose-strong:font-semibold
              prose-blockquote:border-l-primary prose-blockquote:bg-accent/50 prose-blockquote:rounded-r-xl prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:not-italic prose-blockquote:text-foreground/80
              prose-img:rounded-xl prose-img:border prose-img:border-border/50 prose-img:shadow-card
              prose-ul:space-y-2 prose-ol:space-y-2
              prose-li:text-foreground/85 prose-li:leading-relaxed
              prose-code:bg-accent prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal
              prose-pre:bg-accent prose-pre:border prose-pre:border-border/50 prose-pre:rounded-xl
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {post.content || ""}
              </ReactMarkdown>
            </div>

            {/* Article Footer */}
            <div className="mt-16 pt-8 border-t border-border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  {post.blog_categories?.name && (
                    <Badge variant="secondary" className="font-medium text-xs">
                      {post.blog_categories.name}
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">Published {publishedDate}</span>
                </div>
                <Button asChild variant="ghost" size="sm" className="text-primary hover:bg-primary/5 font-medium">
                  <Link to="/blog">
                    <ArrowLeft className="mr-2 h-4 w-4" /> All Articles
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Related Articles Section */}
        {relatedPosts.length > 0 && (
          <section className="mt-20 bg-accent/40 border-t border-border/50">
            <div className="container-wide py-16 sm:py-20">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-2">Keep Reading</p>
                  <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground">More Articles</h2>
                </div>
                <Button asChild variant="ghost" className="rounded-lg font-medium text-primary hover:bg-primary/5">
                  <Link to="/blog">View all <BookOpen className="ml-2 h-3.5 w-3.5" /></Link>
                </Button>
              </div>
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {relatedPosts.map((related: any) => (
                  <Link
                    key={related.id}
                    to={`/blog/${related.slug}`}
                    className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1"
                  >
                    {related.cover_image_url ? (
                      <div className="aspect-[16/10] overflow-hidden bg-secondary">
                        <img
                          src={related.cover_image_url}
                          alt={related.title}
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
                        {related.blog_categories?.name && (
                          <Badge variant="secondary" className="font-medium text-[10px]">
                            {related.blog_categories.name}
                          </Badge>
                        )}
                        <time className="text-xs text-muted-foreground">
                          {new Date(related.published_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </time>
                      </div>
                      <h3 className="font-serif text-lg font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                        {related.title}
                      </h3>
                      {related.excerpt && (
                        <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                          {related.excerpt}
                        </p>
                      )}
                      <div className="mt-auto pt-5 text-sm font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                        Read article &rarr;
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <section className="container-wide py-16 sm:py-20">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground">
              Ready to start your property journey?
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Browse our marketplace for properties available for purchase, rental, or fractional investment opportunities.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="rounded-xl h-12 px-8 font-semibold shadow-sm">
                <Link to="/properties">Browse Properties</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl h-12 px-8 font-semibold">
                <Link to="/invest/opportunities">View Investments</Link>
              </Button>
            </div>
          </div>
        </section>
      </article>
    </SiteLayout>
  );
}
