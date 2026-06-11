import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { PenTool, CheckCircle2 } from "lucide-react";
import DOMPurify from "dompurify";

interface ESignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: "investment_agreement" | "property_purchase" | "lease_agreement" | "kyc_declaration";
  referenceId?: string;
  onSuccess?: () => void;
}

export function ESignatureModal({ open, onOpenChange, documentType, referenceId, onSuccess }: ESignatureModalProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [signMode, setSignMode] = useState<"draw" | "type">("type");
  const [hasSignature, setHasSignature] = useState(false);

  const { data: template, isLoading } = useQuery({
    queryKey: ["document-template", documentType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates" as any)
        .select("*")
        .eq("document_type", documentType)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return (data as any) || null;
    },
    enabled: open,
  });

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasSignature(false);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  useEffect(() => {
    if (open && signMode === "draw" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#000000";
      }
    }
  }, [open, signMode]);

  const sign = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in.");
      if (signMode === "type" && !typedName.trim()) throw new Error("Please type your name to sign.");
      if (signMode === "draw" && !hasSignature) throw new Error("Please draw your signature.");
      
      let signatureData = "";
      if (signMode === "draw" && canvasRef.current) {
        signatureData = canvasRef.current.toDataURL("image/png");
      } else {
        signatureData = `TYPED:${typedName.trim()}`;
      }

      const snapshot = template?.content_html || "Default System Agreement";

      const { error } = await supabase.from("signed_documents" as any).insert({
        user_id: user.id,
        template_id: template?.id,
        document_type: documentType,
        reference_id: referenceId,
        signature_data: signatureData,
        document_snapshot: snapshot,
        user_agent: navigator.userAgent
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Document signed successfully!" });
      qc.invalidateQueries({ queryKey: ["signed-docs"] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: any) => {
      toast({ title: "Failed to sign", description: err.message, variant: "destructive" });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border bg-card shrink-0">
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <PenTool className="h-5 w-5 text-primary" />
            Electronic Signature Required
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 bg-muted/30">
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
            </div>
          ) : (
            <div 
              className="prose prose-sm dark:prose-invert max-w-none p-4 bg-background border border-border rounded-xl shadow-sm text-foreground/80"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(template?.content_html || "<p>Please sign to acknowledge terms and conditions.</p>") }}
            />
          )}
        </div>

        <div className="p-6 border-t border-border bg-card shrink-0 space-y-4">
          <div className="flex items-center gap-4 border-b border-border/50 pb-4">
            <Button
              variant={signMode === "type" ? "default" : "outline"}
              size="sm"
              onClick={() => setSignMode("type")}
              className="rounded-full"
            >
              Type Signature
            </Button>
            <Button
              variant={signMode === "draw" ? "default" : "outline"}
              size="sm"
              onClick={() => { setSignMode("draw"); setTimeout(clearSignature, 50); }}
              className="rounded-full"
            >
              Draw Signature
            </Button>
          </div>

          {signMode === "type" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Type your full legal name</label>
              <Input
                placeholder="John Doe"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                className="font-serif text-lg italic"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Draw your signature</label>
                <Button variant="ghost" size="sm" onClick={clearSignature} className="h-6 text-xs text-muted-foreground">Clear</Button>
              </div>
              <canvas
                ref={canvasRef}
                width={500}
                height={150}
                className="w-full bg-background border border-border rounded-lg cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
          )}

          <div className="bg-accent/50 p-3 rounded-lg text-xs text-muted-foreground flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p>
              By clicking "Sign Document", I agree that this electronic signature is the legally binding equivalent to my handwritten signature.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => sign.mutate()} disabled={sign.isPending}>
              {sign.isPending ? "Signing..." : "Sign Document"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
