import { Link } from "react-router-dom";
import { useCompare } from "@/hooks/useCompare";
import { X, Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveImage, formatPrice } from "@/lib/format";

export function CompareWidget() {
  const { compareList, removeFromCompare, clearCompare, isOpen, setIsOpen } = useCompare();

  if (compareList.length === 0) return null;

  if (!isOpen) {
    return (
      <Button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 rounded-full h-14 px-6 bg-secondary text-secondary-foreground shadow-2xl hover:bg-secondary/95 hover:scale-102 active:scale-98 transition-all font-bold group animate-in slide-in-from-bottom-10"
      >
        <Scale className="mr-2 h-5 w-5" />
        Compare ({compareList.length})
      </Button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md bg-card/95 border-t border-border/80 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.15)] p-4 sm:p-5 animate-in slide-in-from-bottom-full duration-300">
      <div className="container-wide flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Properties rail */}
        <div className="flex items-center gap-4 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar">
          {compareList.map((p) => (
            <div 
              key={p.id} 
              className="flex items-center gap-3 shrink-0 bg-secondary/15 pr-1.5 rounded-xl border border-secondary/20 shadow-sm"
            >
              <img 
                src={resolveImage(p.cover_image_url)} 
                alt={p.title} 
                className="h-14 w-14 object-cover rounded-l-xl"
              />
              <div className="w-28 sm:w-32">
                <p className="text-xs font-bold truncate text-foreground">{p.title}</p>
                <p className="text-[10px] font-bold text-primary mt-0.5">
                  {formatPrice(p.price, p.currency, p.property_type)}
                </p>
              </div>
              
              {/* Touch Target 44px+ for deletion */}
              <button 
                onClick={() => removeFromCompare(p.id)}
                className="h-11 w-11 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive transition-colors shrink-0 touch-manipulation"
                title="Remove"
              >
                <div className="h-6 w-6 flex items-center justify-center rounded-full bg-background border border-border shadow-sm hover:border-destructive/30 transition-colors">
                  <X className="h-3 w-3" />
                </div>
              </button>
            </div>
          ))}
          
          {compareList.length < 4 && (
            <div className="flex items-center justify-center h-14 w-36 shrink-0 border border-dashed border-border/60 rounded-xl bg-accent/20 text-[11px] font-bold text-muted-foreground/80">
              Add up to 4 items
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/60">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={clearCompare} 
            className="text-muted-foreground hover:text-destructive h-11 w-11 rounded-xl shrink-0"
            title="Clear all comparison queue"
          >
            <Trash2 className="h-4.5 w-4.5" />
          </Button>
          
          <Button 
            asChild 
            className="h-12 px-8 font-bold bg-secondary hover:bg-secondary/95 text-secondary-foreground rounded-xl w-full sm:w-auto shadow-sm"
          >
            <Link to="/compare" onClick={() => setIsOpen(false)}>
              <Scale className="mr-2 h-4 w-4" /> Compare Now
            </Link>
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsOpen(false)} 
            className="rounded-xl h-11 w-11 text-muted-foreground hover:text-foreground shrink-0"
            title="Close panel"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
      </div>
    </div>
  );
}
