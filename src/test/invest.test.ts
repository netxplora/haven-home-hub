import { describe, it, expect } from "vitest";
import { formatMoney, fundingPercent, availableUnits, unitsForAmount } from "@/lib/invest";

describe("formatMoney", () => {
  it("should format USD amounts with no decimals", () => {
    expect(formatMoney(1500, "USD")).toBe("$1,500");
  });

  it("should format large amounts correctly", () => {
    expect(formatMoney(2500000, "USD")).toBe("$2,500,000");
  });

  it("should format zero", () => {
    expect(formatMoney(0, "USD")).toBe("$0");
  });

  it("should default to USD when no currency given", () => {
    expect(formatMoney(999)).toBe("$999");
  });

  it("should handle GBP currency", () => {
    expect(formatMoney(1000, "GBP")).toBe("£1,000");
  });

  it("should handle EUR currency", () => {
    expect(formatMoney(1000, "EUR")).toBe("€1,000");
  });

  it("should fallback gracefully for invalid currency codes", () => {
    const result = formatMoney(500, "INVALID");
    // Should not throw; fallback format is "CURRENCY amount"
    expect(result).toContain("500");
  });
});

describe("fundingPercent", () => {
  it("should calculate correct percentage", () => {
    expect(fundingPercent({ units_sold: 50, total_units: 100 })).toBe(50);
  });

  it("should return 0 when no units sold", () => {
    expect(fundingPercent({ units_sold: 0, total_units: 100 })).toBe(0);
  });

  it("should cap at 100% even if oversold", () => {
    expect(fundingPercent({ units_sold: 150, total_units: 100 })).toBe(100);
  });

  it("should return 0 when total_units is 0", () => {
    expect(fundingPercent({ units_sold: 0, total_units: 0 })).toBe(0);
  });

  it("should round to nearest integer", () => {
    expect(fundingPercent({ units_sold: 1, total_units: 3 })).toBe(33);
  });
});

describe("availableUnits", () => {
  it("should calculate remaining units", () => {
    expect(availableUnits({ units_sold: 30, total_units: 100 })).toBe(70);
  });

  it("should return 0 when fully sold", () => {
    expect(availableUnits({ units_sold: 100, total_units: 100 })).toBe(0);
  });

  it("should never go negative", () => {
    expect(availableUnits({ units_sold: 120, total_units: 100 })).toBe(0);
  });
});

describe("unitsForAmount", () => {
  it("should calculate correct number of units", () => {
    expect(unitsForAmount(5000, 100)).toBe(50);
  });

  it("should floor partial units", () => {
    expect(unitsForAmount(550, 100)).toBe(5);
  });

  it("should return 0 for zero unit price", () => {
    expect(unitsForAmount(1000, 0)).toBe(0);
  });

  it("should return 0 for negative unit price", () => {
    expect(unitsForAmount(1000, -50)).toBe(0);
  });

  it("should return 0 for zero amount", () => {
    expect(unitsForAmount(0, 100)).toBe(0);
  });
});
