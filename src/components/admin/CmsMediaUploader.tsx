import { useCallback, useRef, useState } from "react";
import { Upload, X, Link as LinkIcon, ImageIcon, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */
const ACCEPTED_FORMATS = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BUCKET = "cms-media";

/* ─────────────────────────────────────────────
   Props
   ───────────────────────────────────────────── */
interface CmsMediaUploaderProps {
  /** Current image URL (external or uploaded) */
  value: string;
  /** Called when the URL changes (set or cleared) */
  onChange: (url: string) => void;
  /** Subfolder path within the cms-media bucket (e.g. "broadcasts" or "ads") */
  folder?: string;
  /** Optional label shown above the uploader */
  label?: string;
}

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */
export function CmsMediaUploader({
  value,
  onChange,
  folder = "general",
  label = "Image",
}: CmsMediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [imgError, setImgError] = useState(false);

  // ── Validate external URL ──
  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    try {
      new URL(urlInput.trim());
    } catch {
      toast({ title: "Invalid URL", description: "Please enter a valid image URL.", variant: "destructive" });
      return;
    }
    setImgError(false);
    onChange(urlInput.trim());
    setUrlInput("");
  };

  // ── Validate and upload a local file ──
  const uploadFile = useCallback(
    async (file: File) => {
      // Format check
      if (!ACCEPTED_FORMATS.includes(file.type)) {
        toast({
          title: "Unsupported format",
          description: "Only JPG, PNG, and WEBP files are accepted.",
          variant: "destructive",
        });
        return;
      }
      // Size check
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: "Maximum file size is 5MB. Please use a smaller image.",
          variant: "destructive",
        });
        return;
      }

      setUploading(true);
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: "31536000", upsert: false });

      if (upErr) {
        toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
        setUploading(false);
        return;
      }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setImgError(false);
      onChange(pub.publicUrl);
      setUploading(false);
      toast({ title: "Image uploaded" });
    },
    [folder, onChange]
  );

  // ── File input handler ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  // ── Drag & Drop ──
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  // ── Clear current image ──
  const handleClear = () => {
    onChange("");
    setImgError(false);
    setUrlInput("");
  };

  return (
    <div className="space-y-3">
      {label && (
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
          {label}
        </Label>
      )}

      {/* ── Preview ── */}
      {value && (
        <div className="relative rounded-xl overflow-hidden border border-border bg-muted group">
          {imgError ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
              <AlertCircle className="h-8 w-8 opacity-40" />
              <p className="text-xs">Image failed to load</p>
            </div>
          ) : (
            <img
              src={value}
              alt="Preview"
              className="w-full h-40 object-cover"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          )}
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute top-2 right-2 h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            onClick={handleClear}
            aria-label="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* ── Drag & Drop Zone ── */}
      {!value && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all duration-200",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border/60 bg-accent/20 hover:border-border hover:bg-accent/40"
          )}
        >
          {uploading ? (
            <>
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-xs text-muted-foreground font-medium">Uploading...</p>
            </>
          ) : (
            <>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Drop an image here or click to browse
              </p>
              <p className="text-[11px] text-muted-foreground">
                JPG, PNG, or WEBP — max 5MB
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── External URL Input ── */}
      <div className="flex gap-2">
        <Input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddUrl())}
          placeholder="Or paste an external image URL..."
          className="flex-1 h-10 rounded-lg bg-accent/30 border-border/40"
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleAddUrl}
          disabled={!urlInput.trim() || uploading}
          className="h-10 rounded-lg shrink-0"
        >
          <LinkIcon className="h-4 w-4 mr-1.5" />
          Add URL
        </Button>
      </div>
    </div>
  );
}
