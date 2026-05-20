import React from "react";
import { Link } from "react-router-dom";
import { useCompare } from "@/hooks/useCompare";
import { X, Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/invest";
import { resolveImage } from "@/lib/format";

export function CompareWidget() {
  const { compareList, removeFromCompare, clearCompare, isOpen, setIsOpen } = useCompare();

  if (compareList.length === 0) return null;

  if (!isOpen) {
    return (
      <Button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 rounded-full h-14 px-6 bg-secondary text-secondary-foreground shadow-2xl hover:bg-secondary/90 transition-all font-bold group animate-in slide-in-from-bottom-10"
      >
        <Scale className="mr-2 h-5 w-5" />
        Compare ({compareList.length})
      </Button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] p-4 animate-in slide-in-from-bottom-full duration-300">
      <div className="container-wide flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-6 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar">
          {compareList.map((p) => (
            <div key={p.id} className="flex items-center gap-3 shrink-0 bg-secondary/10 pr-3 rounded-lg border border-secondary/20">
              <img 
                src={resolveImage(p.cover_image_url)} 
                alt={p.title} 
                className="h-14 w-14 object-cover rounded-l-lg"
              />
              <div className="w-32">
                <p className="text-xs font-bold truncate text-foreground">{p.title}</p>
                <p className="text-[10px] font-bold text-secondary">{formatMoney(p.price, p.currency)}</p>
              </div>
              <button 
                onClick={() => removeFromCompare(p.id)}
                className="h-6 w-6 flex items-center justify-center rounded-full bg-background border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {compareList.length < 4 && (
            <div className="flex items-center justify-center h-14 w-40 shrink-0 border border-dashed border-border rounded-lg bg-accent/30 text-xs font-medium text-muted-foreground">
              Add up to 4
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
          <Button variant="ghost" size="icon" onClick={clearCompare} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button asChild className="h-12 px-8 font-bold bg-secondary hover:bg-secondary/90 rounded-xl w-full sm:w-auto">
            <Link to="/compare" onClick={() => setIsOpen(false)}>
              <Scale className="mr-2 h-4 w-4" /> Compare Now
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
