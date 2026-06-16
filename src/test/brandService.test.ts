import { describe, it, expect } from "vitest";
import { BrandDefaults } from "@/lib/brandService";
import type { BrandSettings } from "@/lib/brandService";

describe("BrandDefaults", () => {
  it("should have a platform_name", () => {
    expect(BrandDefaults.platform_name).toBeTruthy();
    expect(typeof BrandDefaults.platform_name).toBe("string");
  });

  it("should have a legal_name", () => {
    expect(BrandDefaults.legal_name).toBeTruthy();
    expect(typeof BrandDefaults.legal_name).toBe("string");
  });

  it("should have a support_email", () => {
    expect(BrandDefaults.support_email).toContain("@");
  });

  it("should have valid hex color for primary_color", () => {
    expect(BrandDefaults.primary_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("should have valid hex color for secondary_color", () => {
    expect(BrandDefaults.secondary_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("should have null logo_url and favicon_url as defaults", () => {
    expect(BrandDefaults.logo_url).toBeNull();
    expect(BrandDefaults.favicon_url).toBeNull();
  });

  it("should conform to BrandSettings interface shape", () => {
    const settings: BrandSettings = BrandDefaults;
    expect(settings).toHaveProperty("platform_name");
    expect(settings).toHaveProperty("tagline");
    expect(settings).toHaveProperty("logo_url");
    expect(settings).toHaveProperty("favicon_url");
    expect(settings).toHaveProperty("primary_color");
    expect(settings).toHaveProperty("secondary_color");
    expect(settings).toHaveProperty("support_email");
    expect(settings).toHaveProperty("legal_name");
  });
});
