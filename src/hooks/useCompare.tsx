import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CompareProperty {
  id: string;
  title: string;
  cover_image_url: string | null;
  price: number;
  currency: string;
  property_type: string;
}

interface CompareContextType {
  compareList: CompareProperty[];
  addToCompare: (property: CompareProperty) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareList, setCompareList] = useState<CompareProperty[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("amira_gold_compare");
    if (saved) {
      try {
        setCompareList(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse compare list", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("amira_gold_compare", JSON.stringify(compareList));
  }, [compareList]);

  const addToCompare = (property: CompareProperty) => {
    setCompareList((prev) => {
      if (prev.find((p) => p.id === property.id)) return prev;
      if (prev.length >= 4) {
        // Replace oldest if full
        return [...prev.slice(1), property];
      }
      return [...prev, property];
    });
    setIsOpen(true); // Open the drawer when an item is added
  };

  const removeFromCompare = (id: string) => {
    setCompareList((prev) => prev.filter((p) => p.id !== id));
  };

  const clearCompare = () => {
    setCompareList([]);
    setIsOpen(false);
  };

  return (
    <CompareContext.Provider value={{ compareList, addToCompare, removeFromCompare, clearCompare, isOpen, setIsOpen }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (context === undefined) {
    throw new Error("useCompare must be used within a CompareProvider");
  }
  return context;
}
