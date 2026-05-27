import { useRef, useState } from "react";
import { Upload, X, Star, Link } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { resolveImage } from "@/lib/format";

interface Props {
  propertyId: string;
}

export function ImageUploader({ propertyId }: Props) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [externalUrl, setExternalUrl] = useState("");

  const { data: images = [] } = useQuery({
    queryKey: ["property_images_admin", propertyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("property_images")
        .select("*")
        .eq("property_id", propertyId)
        .order("sort_order", { ascending: true });
      return data ?? [];
    },
  });

  async function handleAddExternalUrl() {
    if (!externalUrl) return;
    
    // Validate simple URL format
    try {
      new URL(externalUrl);
    } catch {
      toast({ title: "Invalid URL", description: "Please enter a valid URL.", variant: "destructive" });
      return;
    }

    setUploading(true);
    let order = images.length;
    
    const { error: insErr } = await supabase.from("property_images").insert({
      property_id: propertyId,
      url: externalUrl,
      sort_order: order,
      is_cover: false,
    });
    
    setUploading(false);
    
    if (insErr) {
      toast({ title: "Could not add image", description: insErr.message, variant: "destructive" });
    } else {
      setExternalUrl("");
      qc.invalidateQueries({ queryKey: ["property_images_admin", propertyId] });
      toast({ title: "Image added from URL" });
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    let order = images.length;
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} exceeds 10MB`, variant: "destructive" });
        continue;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${propertyId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("property-media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) {
        toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
        continue;
      }
      const { data: pub } = supabase.storage.from("property-media").getPublicUrl(path);
      const { error: insErr } = await supabase.from("property_images").insert({
        property_id: propertyId,
        url: pub.publicUrl,
        sort_order: order++,
        is_cover: false,
      });
      if (insErr) {
        toast({ title: "Could not save image", description: insErr.message, variant: "destructive" });
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    qc.invalidateQueries({ queryKey: ["property_images_admin", propertyId] });
  }

  async function remove(id: string) {
    await supabase.from("property_images").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["property_images_admin", propertyId] });
  }

  async function setCover(id: string, url: string) {
    // Clear existing cover flag, set new one
    await supabase.from("property_images").update({ is_cover: false }).eq("property_id", propertyId);
    await supabase.from("property_images").update({ is_cover: true }).eq("id", id);
    await supabase.from("properties").update({ cover_image_url: url }).eq("id", propertyId);
    qc.invalidateQueries({ queryKey: ["property_images_admin", propertyId] });
    toast({ title: "Cover updated" });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{images.length} image{images.length === 1 ? "" : "s"}</p>
          <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
            <Upload className="mr-1.5 h-4 w-4" />
            {uploading ? "Uploading..." : "Upload files"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
        
        <div className="flex gap-2">
          <Input 
            value={externalUrl} 
            onChange={(e) => setExternalUrl(e.target.value)} 
            placeholder="Or paste external image URL..." 
            className="flex-1 bg-accent/50 h-10 border-none rounded-lg"
          />
          <Button type="button" onClick={handleAddExternalUrl} disabled={!externalUrl || uploading} className="h-10 rounded-lg">
            <Link className="h-4 w-4 mr-2" />
            Add URL
          </Button>
        </div>
      </div>
      
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((img: any) => (
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
              <img 
                src={resolveImage(img.url)} 
                alt="" 
                className="h-full w-full object-cover" 
                onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
              />
              {img.is_cover && (
                <span className="absolute left-1 top-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
                  Cover
                </span>
              )}
              <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setCover(img.id, img.url)}
                  className="rounded bg-background/90 p-1 text-foreground shadow-sm hover:bg-background"
                  aria-label="Set as cover"
                >
                  <Star className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(img.id)}
                  className="rounded bg-destructive/90 p-1 text-destructive-foreground shadow-sm hover:bg-destructive"
                  aria-label="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
