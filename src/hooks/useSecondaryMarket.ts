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
  price_per_unit: number;
  status: "active" | "sold" | "cancelled";
  created_at: string;
  property?: {
    title: string;
    location: string;
    currency: string;
    unit_price: number;
  };
  seller?: {
    full_name: string;
  };
}

export function useSecondaryMarket() {
  const queryClient = useQueryClient();

  // Fetch all active listings
  const { data: listings = [], isLoading: isLoadingListings, refetch } = useQuery({
    queryKey: ["secondary_market_listings"],
    queryFn: async () => {
      const { data: records, error } = await supabase
        .from("secondary_market_listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!records || records.length === 0) return [] as SecondaryMarketListing[];

      // Fetch related investment_properties
      const propertyIds = [...new Set(records.map((r: any) => r.property_id).filter(Boolean))];
      let propertiesMap: Record<string, any> = {};
      if (propertyIds.length > 0) {
        const { data: propsData } = await supabase
          .from("investment_properties")
          .select("id, title, location, currency, unit_price, cover_image_url")
          .in("id", propertyIds);
        if (propsData) {
          propertiesMap = propsData.reduce((acc: Record<string, any>, p: any) => {
            acc[p.id] = { title: p.title, location: p.location, currency: p.currency, unit_price: p.unit_price };
            return acc;
          }, {});
        }
      }

      // Fetch related seller profiles
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
        ...r,
        property: propertiesMap[r.property_id] || null,
        seller: sellersMap[r.seller_id] || null,
      })) as SecondaryMarketListing[];
    },
  });

  // Fetch user's own active listings
  const { data: myListings = [], isLoading: isLoadingMyListings } = useQuery({
    queryKey: ["my_secondary_listings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: records, error } = await supabase
        .from("secondary_market_listings")
        .select("*")
        .eq("seller_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!records || records.length === 0) return [] as SecondaryMarketListing[];

      // Fetch related investment_properties
      const propertyIds = [...new Set(records.map((r: any) => r.property_id).filter(Boolean))];
      let propertiesMap: Record<string, any> = {};
      if (propertyIds.length > 0) {
        const { data: propsData } = await supabase
          .from("investment_properties")
          .select("id, title, location, currency, unit_price, cover_image_url")
          .in("id", propertyIds);
        if (propsData) {
          propertiesMap = propsData.reduce((acc: Record<string, any>, p: any) => {
            acc[p.id] = { title: p.title, location: p.location, currency: p.currency, unit_price: p.unit_price };
            return acc;
          }, {});
        }
      }

      return records.map((r: any) => ({
        ...r,
        property: propertiesMap[r.property_id] || null,
      })) as SecondaryMarketListing[];
    },
  });

  // Purchase Listing Mutation
  const purchaseListing = useMutation({
    mutationFn: async (listingId: string) => {
      const { data, error } = await supabase.rpc("purchase_listing_with_wallet", {
        p_listing_id: listingId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secondary_market_listings"] });
      queryClient.invalidateQueries({ queryKey: ["user-investments"] });
      queryClient.invalidateQueries({ queryKey: ["available-balance"] });
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

  // Create Listing Mutation
  const createListing = useMutation({
    mutationFn: async ({ investmentId, units, price }: { investmentId: string; units: number; price: number }) => {
      const { data, error } = await supabase.rpc("create_secondary_market_listing", {
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
      toast({
        title: "Listing Created",
        description: "Your shares are now live on the secondary market.",
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

  // Cancel Listing Mutation
  const cancelListing = useMutation({
    mutationFn: async (listingId: string) => {
      const { error } = await supabase.rpc("cancel_secondary_market_listing", {
        p_listing_id: listingId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secondary_market_listings"] });
      queryClient.invalidateQueries({ queryKey: ["my_secondary_listings"] });
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
