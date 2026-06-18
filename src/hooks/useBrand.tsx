import { createContext, useContext, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BrandService, BrandSettings, BrandDefaults } from "@/lib/brandService";
import { Helmet } from "react-helmet-async";
import { hexToHslTailwind } from "@/lib/utils";

interface BrandContextType {
  brand: BrandSettings;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType | null>(null);

export const BrandProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();

  const { data: brand = BrandDefaults, isLoading } = useQuery({
    queryKey: ["brand-settings"],
    queryFn: async () => {
      const data = await BrandService.getBrand();
      // Cache for immediate synchronous load on next refresh (prevents skeleton flash)
      if (typeof window !== "undefined") {
        localStorage.setItem("haven_brand_settings", JSON.stringify(data));
      }
      return data;
    },
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    gcTime: 60 * 60 * 1000, // Keep in garbage collection for 1 hour
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["brand-settings"] });
  };

  // Null-safe helper — if a color is somehow null/undefined, skip conversion
  const safeHsl = (hex: string | null | undefined) => hex ? hexToHslTailwind(hex) : undefined;

  return (
    <BrandContext.Provider value={{ brand, isLoading, refresh }}>
      {/* Inject CSS variables for primary and secondary colors globally */}
      <Helmet>
        <meta name="theme-color" content={brand.primary_color} />
        <style>
          {`
            :root {
              --brand-primary: ${brand.primary_color};
              --brand-secondary: ${brand.secondary_color};
              --brand-accent: ${brand.accent_color ?? ''};
              --brand-background: ${brand.background_color ?? ''};
              --brand-card: ${brand.card_color ?? ''};
              --brand-dashboard: ${brand.dashboard_color ?? ''};
              --brand-nav: ${brand.navigation_color ?? ''};
              --brand-loading: ${brand.loading_color ?? ''};
              --brand-skeleton: ${brand.skeleton_color ?? ''};
              --brand-notification: ${brand.notification_color ?? ''};
              --brand-progress: ${brand.progress_bar_color ?? ''};
              --brand-document-accent: ${brand.document_accent_color ?? ''};
              
              /* Overwrite tailwind core tokens using HSL derived from DB Hex */
              --primary: ${safeHsl(brand.primary_color) ?? '160 84% 39%'};
              --secondary: ${safeHsl(brand.secondary_color) ?? '222 47% 11%'};
              --accent: ${safeHsl(brand.accent_color) ?? '152 76% 96%'};
              --background: ${safeHsl(brand.background_color) ?? '210 40% 98%'};
            }
          `}
        </style>
      </Helmet>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = (): BrandContextType => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error("useBrand must be used within a BrandProvider");
  }
  return context;
};
