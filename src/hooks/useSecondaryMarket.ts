import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

export interface SecondaryMarketListing {
  id: string;
  seller_id: string;
  property_id: string;
  investment_id: string;
  units_to_sell: number;
  units_sold: number;
  units_available: number;
  price_per_unit: number;
  status: "pending" | "approved" | "rejected" | "cancelled" | "sold";
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  property?: {
    title: string;
    location: string;
    currency: string;
    unit_price: number;
    cover_image_url?: string;
  };
  seller?: {
    full_name: string;
  };
}

export function useSecondaryMarket() {
  const queryClient = useQueryClient();

  // Fetch all approved + available listings from the server-side view
  const { data: listings = [], isLoading: isLoadingListings, refetch } = useQuery({
    queryKey: ["secondary_market_listings"],
    queryFn: async () => {
      // Use the server-side view which already filters: approved, units_available>0, property active, not expired
      const { data: records, error } = await supabase
        .from("available_market_listings" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!records || records.length === 0) return [] as SecondaryMarketListing[];

      // Fetch seller profiles in one batch (view doesn't expose profiles directly)
      const sellerIds = [...new Set(records.map((r: any) => r.seller_id).filter(Boolean))];
      let sellersMap: Record<string, any> = {};
      if (sellerIds.length > 0) {
        const { data: sellersData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", sellerIds);
        if (sellersData) {
          sellersMap = sellersData.reduce((acc: Record<string, any>, s: any) => {
            acc[s.id] = { full_name: s.full_name };
            return acc;
          }, {});
        }
      }

      return records.map((r: any) => ({
        id: r.id,
        seller_id: r.seller_id,
        property_id: r.property_id,
        investment_id: r.investment_id,
        units_to_sell: r.units_to_sell,
        units_sold: r.units_sold ?? 0,
        units_available: r.units_available ?? (r.units_to_sell - (r.units_sold ?? 0)),
        price_per_unit: r.price_per_unit,
        status: r.status,
        expires_at: r.expires_at ?? null,
        created_at: r.created_at,
        updated_at: r.updated_at,
        property: {
          title: r.property_title,
          location: r.property_location,
          currency: r.currency,
          unit_price: r.original_unit_price,
          cover_image_url: r.cover_image_url,
        },
        seller: sellersMap[r.seller_id] || null,
      })) as SecondaryMarketListing[];
    },
  });

  // Fetch user's own listings (all statuses)
  const { data: myListings = [], isLoading: isLoadingMyListings } = useQuery({
    queryKey: ["my_secondary_listings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: records, error } = await supabase
        .from("secondary_market_listings" as any)
        .select("*, investment_properties!property_id(title, location, currency, unit_price, cover_image_url)")
        .eq("seller_id", user.id)
        .not("status", "in", '("sold","cancelled")')
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!records || records.length === 0) return [] as SecondaryMarketListing[];

      return records.map((r: any) => ({
        ...r,
        units_available: (r.units_to_sell ?? 0) - (r.units_sold ?? 0),
        property: r.investment_properties
          ? {
              title: r.investment_properties.title,
              location: r.investment_properties.location,
              currency: r.investment_properties.currency,
              unit_price: r.investment_properties.unit_price,
              cover_image_url: r.investment_properties.cover_image_url,
            }
          : null,
      })) as SecondaryMarketListing[];
    },
  });

  // Purchase listing — supports partial quantity
  const purchaseListing = useMutation({
    mutationFn: async ({ listingId, unitsToBuy }: { listingId: string; unitsToBuy?: number }) => {
      const { data, error } = await supabase.rpc("purchase_listing_with_wallet" as any, {
        p_listing_id: listingId,
        p_units_to_buy: unitsToBuy ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secondary_market_listings"] });
      queryClient.invalidateQueries({ queryKey: ["my_secondary_listings"] });
      queryClient.invalidateQueries({ queryKey: ["user-investments"] });
      queryClient.invalidateQueries({ queryKey: ["my-investments"] });
      queryClient.invalidateQueries({ queryKey: ["available-balance"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
      toast({
        title: "Purchase Successful",
        description: "The shares have been added to your portfolio.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to execute trade.",
        variant: "destructive",
      });
    },
  });

  // Create listing — now returns pending
  const createListing = useMutation({
    mutationFn: async ({ investmentId, units, price }: { investmentId: string; units: number; price: number }) => {
      const { data, error } = await supabase.rpc("create_secondary_market_listing" as any, {
        p_investment_id: investmentId,
        p_units_to_sell: units,
        p_price_per_unit: price,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secondary_market_listings"] });
      queryClient.invalidateQueries({ queryKey: ["my_secondary_listings"] });
      queryClient.invalidateQueries({ queryKey: ["my-secondary-listings"] });
      toast({
        title: "Listing Submitted",
        description: "Your listing is pending admin approval. You will be notified when it goes live.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Listing Failed",
        description: error.message || "Failed to create listing.",
        variant: "destructive",
      });
    },
  });

  // Cancel listing (seller)
  const cancelListing = useMutation({
    mutationFn: async (listingId: string) => {
      const { error } = await supabase.rpc("cancel_secondary_market_listing" as any, {
        p_listing_id: listingId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secondary_market_listings"] });
      queryClient.invalidateQueries({ queryKey: ["my_secondary_listings"] });
      queryClient.invalidateQueries({ queryKey: ["my-secondary-listings"] });
      toast({
        title: "Listing Cancelled",
        description: "Your listing has been removed from the market.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Action Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    listings,
    myListings,
    isLoadingListings,
    isLoadingMyListings,
    refetch,
    purchaseListing: purchaseListing.mutateAsync,
    isPurchasing: purchaseListing.isPending,
    createListing: createListing.mutateAsync,
    isCreating: createListing.isPending,
    cancelListing: cancelListing.mutateAsync,
    isCancelling: cancelListing.isPending,
  };
}
