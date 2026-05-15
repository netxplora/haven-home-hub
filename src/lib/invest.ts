import type { Database } from "@/integrations/supabase/types";

export type InvestmentProperty = Database["public"]["Tables"]["investment_properties"]["Row"] & {
  city?: string | null;
  state?: string | null;
  country?: string | null;
  property_category?: string | null;
  installment_available?: boolean;
  min_down_payment_pct?: number;
};
export type UserInvestment = Database["public"]["Tables"]["user_investments"]["Row"];

export function formatMoney(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
}

export function fundingPercent(p: Pick<InvestmentProperty, "units_sold" | "total_units">) {
  if (!p.total_units) return 0;
  return Math.min(100, Math.round((p.units_sold / p.total_units) * 100));
}

export function availableUnits(p: Pick<InvestmentProperty, "units_sold" | "total_units">) {
  return Math.max(0, p.total_units - p.units_sold);
}

export function unitsForAmount(amount: number, unitPrice: number) {
  if (!unitPrice || unitPrice <= 0) return 0;
  return Math.floor(amount / unitPrice);
}