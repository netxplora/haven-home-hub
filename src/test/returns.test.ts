import { describe, it, expect } from "vitest";

// Mock helper function to calculate returns by property
function calculateReturnsByProperty(returns: any[]) {
  return returns.reduce((acc: Record<string, number>, r: any) => {
    if (r.property_id) {
      acc[r.property_id] = (acc[r.property_id] || 0) + Number(r.amount_received || 0);
    }
    return acc;
  }, {});
}

describe("returns calculations", () => {
  it("should sum returns correctly per property_id", () => {
    const mockReturns = [
      { property_id: "prop-1", amount_received: 100 },
      { property_id: "prop-1", amount_received: 50 },
      { property_id: "prop-2", amount_received: 200 },
      { property_id: "prop-3", amount_received: 0 },
      { property_id: null, amount_received: 300 }, // invalid property
    ];

    const result = calculateReturnsByProperty(mockReturns);

    expect(result).toEqual({
      "prop-1": 150,
      "prop-2": 200,
      "prop-3": 0,
    });
  });

  it("should return empty object for empty returns", () => {
    const result = calculateReturnsByProperty([]);
    expect(result).toEqual({});
  });
});
