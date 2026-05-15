import { useParams, Navigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SEO } from "@/components/site/SEO";

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

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="container-narrow py-16">
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/4 mb-8" />
          <Skeleton className="aspect-[2/1] w-full rounded-xl mb-12" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (error || !post) {
    return <Navigate to="/blog" replace />;
  }

  return (
    <SiteLayout>
      <article className="pb-24">
        {post && <SEO title={post.title} description={post.excerpt || post.title} image={post.cover_image_url} type="article" />}
      {/* Hero Header */}
      <div className="relative overflow-hidden min-h-[400px] flex items-center bg-black">
        {post.cover_image_url && (
          <img 
            src={post.cover_image_url} 
            alt={post.title}
            className="absolute inset-0 h-full w-full object-cover"
            crossOrigin="anonymous"
          />
        )}
        <div className="absolute inset-0 bg-gradient-hero-emerald mix-blend-multiply opacity-60 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 z-[2]" />
        
        <div className="container-narrow relative z-10 text-primary-foreground py-16">
          <Link to="/blog" className="inline-flex items-center text-sm font-medium text-white/70 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to all articles
          </Link>
          
          <div className="flex items-center gap-3 mb-6">
            {post.blog_categories?.name && (
              <Badge variant="secondary" className="font-medium bg-primary/20 text-primary-foreground border-primary/30 backdrop-blur-sm">
                {post.blog_categories.name}
              </Badge>
            )}
            <time className="text-sm text-white/70">
              {new Date(post.published_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
          </div>
          
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] text-white">
            {post.title}
          </h1>
          
          {post.excerpt && (
            <p className="mt-6 text-xl text-white/80 leading-relaxed font-light">
              {post.excerpt}
            </p>
          )}
          
          {post.profiles?.full_name && (
            <div className="mt-8 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-white font-serif font-bold backdrop-blur-sm">
                {post.profiles.full_name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{post.profiles.full_name}</p>
                <p className="text-xs text-white/60">Author</p>
              </div>
            </div>
          )}
        </div>
      </div>


        {/* Content */}
        <div className="container-narrow">
          <div className="prose prose-lg dark:prose-invert max-w-none font-serif leading-relaxed text-foreground/90">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content || ""}
            </ReactMarkdown>
          </div>
        </div>
      </article>
    </SiteLayout>
  );
}
