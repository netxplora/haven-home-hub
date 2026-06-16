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
  primary_color: "#B8860B",
  secondary_color: "#0F172A",
  support_email: "support@havenhomehub.com",
  legal_name: "Haven Home Hub LLC",
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

    return data || BrandDefaults;
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
