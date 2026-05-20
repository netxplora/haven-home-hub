import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { View, X } from "lucide-react";

interface VirtualTourProps {
  url: string;
  title?: string;
}

export function VirtualTourButton({ url, title = "3D Virtual Tour" }: VirtualTourProps) {
  const [open, setOpen] = useState(false);

  // Ensure the URL is embeddable (add necessary params for Matterport)
  const embedUrl = url.includes("matterport.com") && !url.includes("m=")
    ? url
    : url;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all"
        >
          <View className="h-4 w-4 text-primary" />
          <span className="font-medium">3D Tour</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl w-[95vw] h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-serif text-lg">{title}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="flex-1 w-full h-full min-h-0">
          <iframe
            src={embedUrl}
            title={title}
            className="w-full h-[calc(85vh-72px)] border-0"
            allow="fullscreen; vr; xr"
            allowFullScreen
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Inline embed version for use directly on the page */
export function VirtualTourEmbed({ url, title = "3D Virtual Tour" }: VirtualTourProps) {
  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-soft">
      <div className="flex items-center gap-2 px-4 py-3 bg-accent border-b border-border">
        <View className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      <div className="aspect-video w-full">
        <iframe
          src={url}
          title={title}
          className="w-full h-full border-0"
          allow="fullscreen; vr; xr"
          allowFullScreen
        />
      </div>
    </div>
  );
}
