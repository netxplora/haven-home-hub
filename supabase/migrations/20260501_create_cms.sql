-- Create CMS tables
CREATE TABLE public.blog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT,
    excerpt TEXT,
    cover_image_url TEXT,
    category_id UUID REFERENCES public.blog_categories(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    author_id UUID REFERENCES public.profiles(id),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Categories: readable by everyone, writable by admins
CREATE POLICY "Categories are viewable by everyone." ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "Categories are insertable by admins." ON public.blog_categories FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Categories are updatable by admins." ON public.blog_categories FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Categories are deletable by admins." ON public.blog_categories FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Posts: published posts readable by everyone, drafts readable by author/admin, writable by admins
CREATE POLICY "Published posts are viewable by everyone." ON public.blog_posts FOR SELECT USING (status = 'published');
CREATE POLICY "Admins can view all posts." ON public.blog_posts FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authors can view their own posts." ON public.blog_posts FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "Admins can insert posts." ON public.blog_posts FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update posts." ON public.blog_posts FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete posts." ON public.blog_posts FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
