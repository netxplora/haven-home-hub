import { Building2, Wallet, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PaymentMethod = string; // Now dynamic, e.g. "bank_transfer", "digital_currency", "third_party_provider"

interface PaymentMethodRecord {
  id: string;
  payment_category: string;
  method_name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
  icon_url: string | null;
}

const CATEGORY_ICONS: Record<string, any> = {
  bank_transfer: Building2,
  digital_currency: Wallet,
  third_party_provider: Globe,
};

export function PaymentMethodPicker({ 
  value, 
  onChange,
}: { 
  value: PaymentMethod; 
  onChange: (v: PaymentMethod) => void;
}) {
  const { data: methods = [] } = useQuery({
    queryKey: ["active-payment-method-categories"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("payment_methods")
        .select("id, payment_category, method_name, description, is_active, is_default, display_order, icon_url")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      return (data || []) as PaymentMethodRecord[];
    },
  });

  // Group by category and deduplicate — show one option per category
  const categories = new Map<string, { label: string; desc: string; icon: any; count: number }>();
  for (const m of methods) {
    if (m.payment_category === "third_party_provider") continue;

    if (!categories.has(m.payment_category)) {
      const Icon = CATEGORY_ICONS[m.payment_category] || Wallet;
      const label = m.payment_category === "bank_transfer" ? "Bank Transfer"
        : m.payment_category === "digital_currency" ? "Digital Currency"
        : m.method_name;
      
      const desc = m.payment_category === "bank_transfer" ? "Direct transfer to our official bank account"
        : m.payment_category === "digital_currency" ? "Pay securely with digital assets"
        : m.description || "Direct payment method";
      
      categories.set(m.payment_category, { label, desc, icon: Icon, count: 1 });
    } else {
      categories.get(m.payment_category)!.count++;
    }
  }

  const options = Array.from(categories.entries());

  // Auto-select first available if current value is not available
  if (options.length > 0 && !categories.has(value)) {
    const firstCategory = options[0][0];
    // Schedule for next tick to avoid state update during render
    setTimeout(() => onChange(firstCategory), 0);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Payment method</p>
      {options.length === 0 ? (
        <p className="text-sm text-destructive font-medium">No payment methods currently available. Please contact support.</p>
      ) : (
        <div className="grid gap-2">
          {options.map(([category, opt]) => {
            const active = value === category;
            
            return (
              <div key={category} className="space-y-2">
                <button
                  type="button"
                  onClick={() => onChange(category)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 w-full text-left transition hover:shadow-sm",
                    active ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/10"
                  )}
                >
                  <span className={cn(
                    "grid h-9 w-9 place-items-center rounded-lg transition-colors shrink-0",
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}>
                    <opt.icon className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium">{opt.label}</p>
                      {opt.count > 1 && (
                        <span className="text-[10px] text-muted-foreground">{opt.count} options</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </div>
                </button>
                {/* Removed the inline Buy Digital Currency With Card option as requested */}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}