import { supabase } from "@/integrations/supabase/client";

export interface BrandSettings {
  id?: string;
  platform_name: string;
  tagline: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  support_email: string;
  legal_name: string;
  accent_color: string;
  background_color: string;
  card_color: string;
  button_style: string;
  navigation_color: string;
  dashboard_color: string;
  loading_color: string;
  skeleton_color: string;
  chart_palette: string[];
  notification_color: string;
  progress_bar_color: string;
  document_accent_color: string;
  updated_at?: string;
}

/**
 * Hardcoded fallbacks used while the DB is loading,
 * or if the DB row is somehow missing.
 */
export const BrandDefaults: BrandSettings = {
  platform_name: "Haven Home Hub",
  tagline: "Smart Property Investment",
  logo_url: null,
  favicon_url: null,
  primary_color: "#10B981", // Emerald Green
  secondary_color: "#0F172A", // Navy/Slate
  support_email: "support@havenhomehub.com",
  legal_name: "Haven Home Hub LLC",
  accent_color: "#D1FAE5",
  background_color: "#F8FAFC",
  card_color: "#FFFFFF",
  button_style: "rounded-md",
  navigation_color: "#FFFFFF",
  dashboard_color: "#F1F5F9",
  loading_color: "#10B981",
  skeleton_color: "#E2E8F0",
  chart_palette: ["#10B981", "#34D399", "#6EE7B7", "#059669", "#047857"],
  notification_color: "#10B981",
  progress_bar_color: "#10B981",
  document_accent_color: "#10B981",
};

/**
 * Core abstraction layer for branding.
 * Components should never query the brand_settings table directly.
 */
export class BrandService {
  /**
   * Fetches the current brand settings from the database.
   * If no row exists, it returns the default fallback settings.
   */
  static async getBrand(): Promise<BrandSettings> {
    const { data, error } = await supabase
      .from("brand_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch brand settings:", error);
      return BrandDefaults;
    }

    if (!data) return BrandDefaults;

    // Merge with defaults so any NULL DB columns fall back gracefully
    // (e.g. newly added columns that haven't been populated yet)
    const merged: Record<string, unknown> = { ...BrandDefaults };
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        merged[key] = value;
      }
    }
    return merged as BrandSettings;
  }

  /**
   * Updates the brand settings in the database.
   * @param updates Partial settings to update
   */
  static async updateBrand(updates: Partial<BrandSettings>): Promise<void> {
    const { data: existing } = await supabase
      .from("brand_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from("brand_settings")
        .update(updates)
        .eq("id", existing.id);
      
      if (error) throw error;
    } else {
      // Fallback if somehow the row was deleted
      const { error } = await supabase
        .from("brand_settings")
        .insert([{ ...BrandDefaults, ...updates }]);
        
      if (error) throw error;
    }
  }
}
