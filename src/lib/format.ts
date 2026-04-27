export function formatPrice(price: number, currency = "USD", type?: string) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  const base = formatter.format(price);
  return type === "rent" ? `${base}/mo` : base;
}

export function formatNumber(n?: number | null) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}

export function propertyTypeLabel(type: string) {
  switch (type) {
    case "buy": return "For Sale";
    case "rent": return "For Rent";
    case "land": return "Land";
    default: return type;
  }
}

export function statusLabel(status: string) {
  switch (status) {
    case "available": return "Available";
    case "reserved": return "Reserved";
    case "sold": return "Sold";
    default: return status;
  }
}

/** Resolve cover image URLs that may be local /src/assets paths to bundled URLs. */
const localImages = import.meta.glob("/src/assets/*.{jpg,png,jpeg,webp}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

export function resolveImage(url?: string | null): string {
  if (!url) return "/placeholder.svg";
  if (url.startsWith("/src/assets/")) {
    return localImages[url] ?? url;
  }
  return url;
}