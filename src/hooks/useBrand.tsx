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
      return await BrandService.getBrand();
    },
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    gcTime: 60 * 60 * 1000, // Keep in garbage collection for 1 hour
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["brand-settings"] });
  };

  return (
    <BrandContext.Provider value={{ brand, isLoading, refresh }}>
      {/* Inject CSS variables for primary and secondary colors globally */}
      <Helmet>
        <style>
          {`
            :root {
              --brand-primary: ${brand.primary_color};
              --brand-secondary: ${brand.secondary_color};
              
              /* Overwrite tailwind core tokens using HSL derived from DB Hex */
              --primary: ${hexToHslTailwind(brand.primary_color)};
              --secondary: ${hexToHslTailwind(brand.secondary_color)};
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
