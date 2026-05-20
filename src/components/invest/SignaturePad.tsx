import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function SignaturePad({
  onSign,
  onCancel,
}: {
  onSign: (signatureBase64: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set white background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    setHasSignature(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const save = () => {
    if (!hasSignature) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSign(dataUrl);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">E-Signature</Label>
        <p className="text-[10px] text-muted-foreground ml-1 mt-1">Please sign below to confirm your investment agreement.</p>
      </div>
      <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-white touch-none">
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          className="w-full h-[200px] cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="flex justify-between items-center">
        <Button variant="ghost" size="sm" onClick={clear} className="text-muted-foreground h-8 text-xs">
          Clear Signature
        </Button>
      </div>
      <div className="flex gap-4 pt-4 border-t border-border/40">
        <Button variant="outline" className="flex-1 rounded-xl" onClick={onCancel}>
          Back
        </Button>
        <Button 
          className="flex-[2] bg-primary text-primary-foreground rounded-xl shadow-sm" 
          disabled={!hasSignature} 
          onClick={save}
        >
          Sign & Proceed
        </Button>
      </div>
    </div>
  );
}
