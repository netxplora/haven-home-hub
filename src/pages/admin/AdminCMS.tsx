import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function AdminCMS() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: posts = [] } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("blog_posts").select("*, blog_categories(name)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-blog-categories"],
    queryFn: async () => (await (supabase as any).from("blog_categories").select("*").order("name")).data ?? [],
  });

  async function remove(id: string) {
    if (!confirm("Delete this post?")) return;
    const { error } = await (supabase as any).from("blog_posts").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); qc.invalidateQueries({ queryKey: ["admin-blog-posts"] }); }
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-serif font-semibold">Content Management System</h2>
          <p className="text-sm text-muted-foreground">Manage blog posts, articles, and categories.</p>
        </div>
      </div>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="posts">Blog Posts</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="homepage">Homepage Content</TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> New Post
            </Button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-accent text-left">
                <tr>
                  <th className="p-3 whitespace-nowrap">Title</th>
                  <th className="p-3 whitespace-nowrap">Category</th>
                  <th className="p-3 whitespace-nowrap">Status</th>
                  <th className="p-3 whitespace-nowrap">Published</th>
                  <th className="p-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p: any) => (
                  <tr key={p.id} className="border-t border-border transition-colors hover:bg-secondary/40">
                    <td className="p-3 font-medium">{p.title}</td>
                    <td className="p-3">{p.blog_categories?.name ?? "Uncategorized"}</td>
                    <td className="p-3">
                      <Badge variant={p.status === "published" ? "default" : "secondary"}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {p.published_at ? new Date(p.published_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {posts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      No blog posts found. Create your first post to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <CategoriesTab categories={categories} qc={qc} />
        </TabsContent>

        <TabsContent value="homepage">
          <HomepageContentTab qc={qc} />
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Post" : "New Post"}</DialogTitle>
          </DialogHeader>
          <PostForm initial={editing} categories={categories} onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["admin-blog-posts"] }); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoriesTab({ categories, qc }: any) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [adding, setAdding] = useState(false);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    const finalSlug = slug || slugify(name);
    const { error } = await (supabase as any).from("blog_categories").insert({ name, slug: finalSlug });
    setAdding(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Category added" });
      setName(""); setSlug(""); setDescription("");
      qc.invalidateQueries({ queryKey: ["admin-blog-categories"] });
    }
  }

  async function removeCat(id: string) {
    if (!confirm("Delete category? This might leave posts uncategorized.")) return;
    const { error } = await (supabase as any).from("blog_categories").delete().eq("id", id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); qc.invalidateQueries({ queryKey: ["admin-blog-categories"] }); }
  }

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-1">
        <form onSubmit={addCategory} className="space-y-4 rounded-xl border border-border p-6 bg-card">
          <h3 className="font-semibold">Add Category</h3>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Slug (optional)</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button type="submit" disabled={adding} className="w-full">
            {adding ? "Adding..." : "Add Category"}
          </Button>
        </form>
      </div>
      
      <div className="md:col-span-2">
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-accent text-left">
              <tr>
                <th className="p-3 whitespace-nowrap">Name</th>
                <th className="p-3 whitespace-nowrap">Slug</th>
                <th className="p-3 whitespace-nowrap">Description</th>
                <th className="p-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c: any) => (
                <tr key={c.id} className="border-t border-border transition-colors hover:bg-secondary/40">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 text-muted-foreground">{c.slug}</td>
                  <td className="p-3 text-muted-foreground">{c.description || "—"}</td>
                  <td className="p-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => removeCat(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground">
                    No categories found.
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

function HomepageContentTab({ qc }: any) {
  const [saving, setSaving] = useState(false);

  const { data: siteContent = [] } = useQuery({
    queryKey: ["admin-site-content"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("site_content").select("*");
      return data ?? [];
    },
  });

  const [form, setForm] = useState<Record<string, any>>({});

  // Initialize form when data loads
  useEffect(() => {
    const newForm: Record<string, any> = {};
    siteContent.forEach((c: any) => {
      newForm[c.section_key] = c.content_value;
    });
    setForm(newForm);
  }, [siteContent]);

  const updateSection = (key: string, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [field]: value
      }
    }));
  };

  async function saveHomepageContent(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    // Process each section
    for (const [key, value] of Object.entries(form)) {
      await (supabase as any).from("site_content").upsert({ section_key: key, content_value: value });
    }
    
    setSaving(false);
    toast({ title: "Homepage content updated successfully" });
    qc.invalidateQueries({ queryKey: ["admin-site-content"] });
    qc.invalidateQueries({ queryKey: ["public-site-content"] });
  }

  const hero = form.homepage_hero || {};
  const invest = form.homepage_invest_cta || {};

  return (
    <form onSubmit={saveHomepageContent} className="space-y-8 max-w-4xl">
      <div className="space-y-4 rounded-xl border border-border p-6 bg-card">
        <h3 className="font-semibold font-serif text-xl border-b border-border pb-3">Hero Section</h3>
        <div className="space-y-2">
          <Label>Badge Text</Label>
          <Input value={hero.badge || ""} onChange={(e) => updateSection("homepage_hero", "badge", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={hero.title || ""} onChange={(e) => updateSection("homepage_hero", "title", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Subtitle</Label>
          <Textarea value={hero.subtitle || ""} onChange={(e) => updateSection("homepage_hero", "subtitle", e.target.value)} />
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border p-6 bg-card">
        <h3 className="font-semibold font-serif text-xl border-b border-border pb-3">Invest Call to Action</h3>
        <div className="space-y-2">
          <Label>Badge Text</Label>
          <Input value={invest.badge || ""} onChange={(e) => updateSection("homepage_invest_cta", "badge", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={invest.title || ""} onChange={(e) => updateSection("homepage_invest_cta", "title", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={invest.description || ""} onChange={(e) => updateSection("homepage_invest_cta", "description", e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90 px-8">
          {saving ? "Saving Changes..." : "Save Homepage Content"}
        </Button>
      </div>
    </form>
  );
}

function PostForm({ initial, categories, onClose }: any) {
  const [f, setF] = useState(() => ({
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    content: initial?.content ?? "",
    excerpt: initial?.excerpt ?? "",
    cover_image_url: initial?.cover_image_url ?? "",
    category_id: initial?.category_id ?? "",
    status: initial?.status ?? "draft",
    meta_title: initial?.meta_title ?? "",
    meta_description: initial?.meta_description ?? "",
    meta_keywords: initial?.meta_keywords ?? "",
  }));
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    // Auto-slug if empty
    const slug = f.slug || slugify(f.title);
    
    const payload: any = {
      title: f.title,
      slug: slug,
      content: f.content,
      excerpt: f.excerpt,
      cover_image_url: f.cover_image_url || null,
      category_id: f.category_id || null,
      status: f.status,
      meta_title: f.meta_title || null,
      meta_description: f.meta_description || null,
      meta_keywords: f.meta_keywords || null,
    };

    if (f.status === "published" && initial?.status !== "published") {
      payload.published_at = new Date().toISOString();
    }

    const { error } = initial
      ? await (supabase as any).from("blog_posts").update(payload).eq("id", initial.id)
      : await (supabase as any).from("blog_posts").insert(payload);
      
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Saved successfully" }); onClose(); }
  }

  return (
    <form onSubmit={save} className="flex flex-col h-full overflow-hidden">
      <DialogBody className="space-y-6 py-6">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Title</Label>
          <Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="h-12 rounded-xl" placeholder="Enter post title..." />
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Category</Label>
            <Select value={f.category_id || "none"} onValueChange={(v) => setF({ ...f, category_id: v === "none" ? "" : v })}>
              <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                <SelectItem value="none">Uncategorized</SelectItem>
                {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Status</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Cover Image URL</Label>
          <Input value={f.cover_image_url} onChange={(e) => setF({ ...f, cover_image_url: e.target.value })} placeholder="https://..." className="h-12 rounded-xl" />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Excerpt (Short summary)</Label>
          <Textarea rows={2} value={f.excerpt} onChange={(e) => setF({ ...f, excerpt: e.target.value })} className="rounded-xl resize-none" />
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-secondary/10 p-5">
          <h4 className="font-serif font-semibold text-lg">SEO Settings</h4>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Meta Title</Label>
            <Input value={f.meta_title} onChange={(e) => setF({ ...f, meta_title: e.target.value })} className="h-10 rounded-xl" placeholder="SEO Title (defaults to post title)" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Meta Description</Label>
            <Textarea rows={2} value={f.meta_description} onChange={(e) => setF({ ...f, meta_description: e.target.value })} className="rounded-xl resize-none" placeholder="SEO Description (defaults to excerpt)" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Meta Keywords</Label>
            <Input value={f.meta_keywords} onChange={(e) => setF({ ...f, meta_keywords: e.target.value })} className="h-10 rounded-xl" placeholder="real estate, luxury, investments" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Content (Markdown)</Label>
          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="mb-4 bg-accent p-1 rounded-xl">
              <TabsTrigger value="edit" className="rounded-lg data-[state=active]:bg-background">Edit</TabsTrigger>
              <TabsTrigger value="preview" className="rounded-lg data-[state=active]:bg-background">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="mt-0">
              <Textarea 
                rows={12} 
                value={f.content} 
                onChange={(e) => setF({ ...f, content: e.target.value })} 
                className="font-mono text-sm rounded-xl focus:ring-1 transition-all" 
                placeholder="Write your content here using Markdown..."
              />
            </TabsContent>
            <TabsContent value="preview" className="rounded-xl border min-h-[300px] p-6 bg-secondary/5 mt-0 overflow-auto">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {f.content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {f.content}
                  </ReactMarkdown>
                ) : (
                  <p className="text-muted-foreground italic">Nothing to preview yet.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogBody>
      <DialogFooter className="bg-secondary/5 pt-6 pb-6">
        <Button type="submit" disabled={saving} className="w-full h-12 rounded-xl font-bold shadow-sm bg-primary hover:bg-primary/90 transition-all">
          {saving ? "Saving Changes..." : initial ? "Update Blog Post" : "Create Blog Post"}
        </Button>
      </DialogFooter>
    </form>
  );
}
