import { useCurrency } from "./useCurrency";
import { formatPrice as baseFormatPrice } from "@/lib/format";

export function useFormatPrice() {
  const { currency, convert } = useCurrency();

  return (price: number | null | undefined, baseCurrency = "USD", type?: string) => {
    if (!price) return baseFormatPrice(price, currency, type);
    
    const converted = convert(price, baseCurrency, currency);
    return baseFormatPrice(converted, currency, type);
  };
}
