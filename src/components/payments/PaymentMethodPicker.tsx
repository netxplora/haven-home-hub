import { Bitcoin, Building2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentMethod = "paystack" | "flutterwave" | "crypto" | "manual_bank";

const options: { id: PaymentMethod; label: string; desc: string; icon: any }[] = [
  { id: "paystack", label: "Card / Bank (Paystack)", desc: "Pay with card or bank via Paystack", icon: CreditCard },
  { id: "flutterwave", label: "Card / Bank (Flutterwave)", desc: "Pay with card or bank via Flutterwave", icon: CreditCard },
  { id: "crypto", label: "Pay with crypto", desc: "BTC, ETH, USDT and more", icon: Bitcoin },
  { id: "manual_bank", label: "Manual bank transfer", desc: "Wire funds and we verify within 24h", icon: Building2 },
];

export function PaymentMethodPicker({ value, onChange }: { value: PaymentMethod; onChange: (v: PaymentMethod) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Payment method</p>
      <div className="grid gap-2">
        {options.map((o) => {
          const active = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3 text-left transition",
                active ? "border-[hsl(var(--gold))] bg-[hsl(var(--gold-soft)/0.4)] shadow-soft" : "border-border hover:bg-secondary/50",
              )}
            >
              <span className={cn(
                "grid h-9 w-9 place-items-center rounded-lg",
                active ? "bg-gradient-gold text-[hsl(var(--gold-foreground))]" : "bg-secondary text-foreground",
              )}>
                <o.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{o.label}</p>
                <p className="text-xs text-muted-foreground">{o.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}