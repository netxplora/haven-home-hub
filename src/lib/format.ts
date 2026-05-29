export function formatPrice(price: number | null | undefined, currency = "USD", type?: string) {
  const p = Number(price || 0);
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  });
  const base = formatter.format(p);
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

export function enrichProperty(property: any) {
  if (!property) return property;
  // Use property.id or title to create stable mock data
  const idStr = property.id ? String(property.id) : String(property.title || "");
  let idNum = 0;
  for (let i = 0; i < idStr.length; i++) {
    idNum += idStr.charCodeAt(i);
  }
  
  const addressStr = (property.city || property.address || property.title || "").toLowerCase();
  const isAustin = addressStr.includes("austin");
  const isMiami = addressStr.includes("miami");
  const isNY = addressStr.includes("new york") || addressStr.includes("brooklyn") || addressStr.includes("manhattan");
  const isLA = addressStr.includes("los angeles") || addressStr.includes("beverly");

  let walkScore = 50 + (idNum % 40); // 50-89
  let transitScore = 40 + (idNum % 40);
  let schoolRating = 6 + (idNum % 5); // 6-10

  if (isNY) {
    walkScore = 90 + (idNum % 10);
    transitScore = 85 + (idNum % 15);
  } else if (isMiami || isLA) {
    walkScore = 75 + (idNum % 20);
  } else if (isAustin) {
    schoolRating = 8 + (idNum % 3);
  }

  // FEMA Flood Risk
  let floodRisk = "Zone X (Minimal Risk)";
  let isFloodSafe = true;
  if (isMiami && (idNum % 3 === 0)) {
    floodRisk = "Zone AE (High Risk)";
    isFloodSafe = false;
  } else if (isAustin && (idNum % 5 === 0)) {
    floodRisk = "Zone A (100-Year Flood)";
    isFloodSafe = false;
  }

  // US Market Metrics
  const capRate = (4.5 + ((idNum % 40) / 10)).toFixed(1); // 4.5% - 8.4%
  const hoaFees = 150 + (idNum % 450); // $150 - $599
  const taxRate = (0.8 + ((idNum % 15) / 10)).toFixed(2); // 0.8% - 2.2%

  // Neighborhood Score
  const neighborhoodScore = (7.8 + ((idNum % 20) / 10)).toFixed(1); // 7.8 - 9.7

  // Verification
  const isVerified = (idNum % 8 !== 0); 

  // Days on Market
  const daysOnMarket = 1 + (idNum % 45);

  return {
    ...property,
    walkScore,
    transitScore,
    schoolRating,
    floodRisk,
    isFloodSafe,
    capRate,
    hoaFees,
    taxRate,
    neighborhoodScore,
    isVerified,
    daysOnMarket
  };
}