import { Bitcoin, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PaymentMethod = "crypto" | "manual_bank";

const allOptions: { id: PaymentMethod; label: string; desc: string; icon: any }[] = [
  { id: "crypto", label: "Digital Currency", desc: "Pay securely with digital assets", icon: Bitcoin },
  { id: "manual_bank", label: "Bank Transfer", desc: "Direct transfer to our official bank account", icon: Building2 },
];

export function PaymentMethodPicker({ 
  value, 
  onChange,
}: { 
  value: PaymentMethod; 
  onChange: (v: PaymentMethod) => void;
}) {
  const { data: configs } = useQuery({
    queryKey: ["payment-configs"],
    queryFn: async () => {
      const { data } = await supabase.from("system_configs").select("key, value");
      if (!data) return {};
      return data.reduce((acc: any, curr) => ({ ...acc, [curr.key]: curr.value }), {});
    }
  });

  const cryptoEnabled = configs?.enable_crypto_payments !== false; // default true if not set
  const bankEnabled = configs?.enable_bank_transfers !== false;

  const options = allOptions.filter(o => {
    if (o.id === "crypto") return cryptoEnabled;
    if (o.id === "manual_bank") return bankEnabled;
    return false;
  });

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Payment method</p>
      {options.length === 0 ? (
        <p className="text-sm text-destructive font-medium">No payment methods currently available. Please contact support.</p>
      ) : (
        <div className="grid gap-2">
          {options.map((o) => {
            const active = value === o.id;
            
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onChange(o.id)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition hover:shadow-sm",
                  active ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/10"
                )}
              >
                <span className={cn(
                  "grid h-9 w-9 place-items-center rounded-lg transition-colors",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:text-foreground",
                )}>
                  <o.icon className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">{o.label}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{o.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}