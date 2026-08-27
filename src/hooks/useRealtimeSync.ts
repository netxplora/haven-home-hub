import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRealtimeSync() {
  const qc = useQueryClient();

  useEffect(() => {
    // Consolidated realtime subscription on a single channel to reduce WebSocket connection churn
    const channel = supabase.channel("public-db-changes");

    const tables = [
      "payments",
      "withdrawal_requests",
      "investment_properties",
      "user_investments",
      "investment_schedules",
      "investment_certificates",
      "receipts",
      "bookings",
      "inquiries",
      "properties",
      "payouts",
      "returns",
      "profiles",
      "user_roles",
      "agents",
      "locations",
      "crypto_assets",
      "notifications",
      "reservations",
      "secondary_market_listings",
      "kyc_verifications",
      "user_documents",
      "document_templates",
      "referrals",
      "referral_rewards",
      "support_tickets",
      "support_messages",
      "brand_settings",
      "agent_reviews",
      "testimonials",
      "broadcast_ads",
      "blog_posts",
      "payment_methods",
    ];

    tables.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          // Always invalidate exact-match key
          qc.invalidateQueries({ queryKey: [table] });

          // --- Payments ---
          if (table === "payments") {
            qc.invalidateQueries({ queryKey: ["transactions"] });
            qc.invalidateQueries({ queryKey: ["admin-payments"] });
            qc.invalidateQueries({ queryKey: ["admin-reservations"] });
            qc.invalidateQueries({ queryKey: ["my-reservations"] });
            qc.invalidateQueries({ queryKey: ["admin-overview-counts"] });
            qc.invalidateQueries({ queryKey: ["admin-revenue-stats"] });
            qc.invalidateQueries({ queryKey: ["dashboard-overview-stats"] });
            qc.invalidateQueries({ queryKey: ["available-balance"] });
          }

          // --- Withdrawals ---
          if (table === "withdrawal_requests") {
            qc.invalidateQueries({ queryKey: ["withdrawals"] });
            qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
            qc.invalidateQueries({ queryKey: ["available-balance"] });
            qc.invalidateQueries({ queryKey: ["dashboard-overview-stats"] });
          }

          // --- Investments & Schedules & Certificates ---
          if (table === "investment_properties") {
            qc.invalidateQueries({ queryKey: ["admin-invest"] });
            qc.invalidateQueries({ queryKey: ["admin-invest-stats"] });
            qc.invalidateQueries({ queryKey: ["admin-invest-list"] });
            qc.invalidateQueries({ queryKey: ["admin-overview-counts"] });
            qc.invalidateQueries({ queryKey: ["dashboard-overview-stats"] });
            qc.invalidateQueries({ queryKey: ["investment-opportunities"] });
            qc.invalidateQueries({ queryKey: ["investment-property"] });
          }
          if (table === "user_investments") {
            qc.invalidateQueries({ queryKey: ["investments"] });
            qc.invalidateQueries({ queryKey: ["my-investments"] });
            qc.invalidateQueries({ queryKey: ["admin-investors"] });
            qc.invalidateQueries({ queryKey: ["admin-investments"] });
            qc.invalidateQueries({ queryKey: ["dashboard-overview-stats"] });
            qc.invalidateQueries({ queryKey: ["admin-overview-counts"] });
            qc.invalidateQueries({ queryKey: ["portfolio"] });
            qc.invalidateQueries({ queryKey: ["user-investment-detail"] });
          }
          if (table === "investment_schedules") {
            qc.invalidateQueries({ queryKey: ["investment-schedules"] });
            qc.invalidateQueries({ queryKey: ["admin-schedules"] });
            qc.invalidateQueries({ queryKey: ["admin-installments"] });
          }
          if (table === "investment_certificates") {
            qc.invalidateQueries({ queryKey: ["investment-certificate"] });
            qc.invalidateQueries({ queryKey: ["my-certificates"] });
          }

          // --- Secondary Marketplace ---
          if (table === "secondary_market_listings") {
            qc.invalidateQueries({ queryKey: ["secondary-market"] });
            qc.invalidateQueries({ queryKey: ["secondary-listings"] });
            qc.invalidateQueries({ queryKey: ["my-secondary-listings"] });
            qc.invalidateQueries({ queryKey: ["admin-secondary-market"] });
          }

          // --- KYC & Verification ---
          if (table === "kyc_verifications") {
            qc.invalidateQueries({ queryKey: ["kyc"] });
            qc.invalidateQueries({ queryKey: ["admin-kyc"] });
            qc.invalidateQueries({ queryKey: ["admin-verification-queue"] });
          }

          // --- Legal Documents ---
          if (table === "user_documents" || table === "document_templates") {
            qc.invalidateQueries({ queryKey: ["user-documents"] });
            qc.invalidateQueries({ queryKey: ["my-documents"] });
            qc.invalidateQueries({ queryKey: ["admin-documents"] });
            qc.invalidateQueries({ queryKey: ["admin-templates"] });
            qc.invalidateQueries({ queryKey: ["document-templates"] });
            qc.invalidateQueries({ queryKey: ["admin-verification-queue"] });
          }

          // --- Receipts ---
          if (table === "receipts") {
            qc.invalidateQueries({ queryKey: ["admin-receipts"] });
            qc.invalidateQueries({ queryKey: ["my-receipts"] });
            qc.invalidateQueries({ queryKey: ["receipt"] });
          }

          // --- Returns & Payouts ---
          if (table === "returns") {
            qc.invalidateQueries({ queryKey: ["my-returns"] });
            qc.invalidateQueries({ queryKey: ["dashboard-overview-stats"] });
            qc.invalidateQueries({ queryKey: ["available-balance"] });
          }
          if (table === "payouts") {
            qc.invalidateQueries({ queryKey: ["admin-payouts"] });
            qc.invalidateQueries({ queryKey: ["dashboard-overview-stats"] });
          }

          // --- Bookings & Inquiries ---
          if (table === "bookings") {
            qc.invalidateQueries({ queryKey: ["my-bookings"] });
            qc.invalidateQueries({ queryKey: ["admin-bookings"] });
            qc.invalidateQueries({ queryKey: ["agent-bookings"] });
            qc.invalidateQueries({ queryKey: ["admin-overview-counts"] });
          }
          if (table === "inquiries") {
            qc.invalidateQueries({ queryKey: ["my-inquiries"] });
            qc.invalidateQueries({ queryKey: ["admin-inquiries"] });
            qc.invalidateQueries({ queryKey: ["agent-inquiries"] });
            qc.invalidateQueries({ queryKey: ["admin-overview-counts"] });
          }

          // --- Properties & Reservations ---
          if (table === "properties") {
            qc.invalidateQueries({ queryKey: ["saved-list"] });
            qc.invalidateQueries({ queryKey: ["admin-properties"] });
            qc.invalidateQueries({ queryKey: ["agent-listings"] });
            qc.invalidateQueries({ queryKey: ["admin-overview-counts"] });
            qc.invalidateQueries({ queryKey: ["properties"] });
            qc.invalidateQueries({ queryKey: ["property"] });
            qc.invalidateQueries({ queryKey: ["my-purchases"] });
            qc.invalidateQueries({ queryKey: ["my-reservations"] });
          }
          if (table === "reservations") {
            qc.invalidateQueries({ queryKey: ["my-reservations"] });
            qc.invalidateQueries({ queryKey: ["my-purchases"] });
            qc.invalidateQueries({ queryKey: ["admin-reservations"] });
            qc.invalidateQueries({ queryKey: ["admin-overview-counts"] });
            qc.invalidateQueries({ queryKey: ["user-reservation"] });
            qc.invalidateQueries({ queryKey: ["property"] });
            qc.invalidateQueries({ queryKey: ["properties"] });
            qc.invalidateQueries({ queryKey: ["dashboard-overview-stats"] });
            qc.invalidateQueries({ queryKey: ["agent-reservations"] });
            qc.invalidateQueries({ queryKey: ["related"] });
          }

          // --- Users, Roles, Profiles, Referrals ---
          if (table === "profiles" || table === "user_roles") {
            qc.invalidateQueries({ queryKey: ["admin-users"] });
            qc.invalidateQueries({ queryKey: ["admin-overview-counts"] });
            qc.invalidateQueries({ queryKey: ["profile"] });
            qc.invalidateQueries({ queryKey: ["user-roles"] });
          }
          if (table === "referrals" || table === "referral_rewards") {
            qc.invalidateQueries({ queryKey: ["referrals"] });
            qc.invalidateQueries({ queryKey: ["referral-rewards"] });
            qc.invalidateQueries({ queryKey: ["admin-referrals"] });
            qc.invalidateQueries({ queryKey: ["my-referrals"] });
          }

          // --- Support Center ---
          if (table === "support_tickets" || table === "support_messages") {
            qc.invalidateQueries({ queryKey: ["support-tickets"] });
            qc.invalidateQueries({ queryKey: ["my-tickets"] });
            qc.invalidateQueries({ queryKey: ["support-messages"] });
            qc.invalidateQueries({ queryKey: ["admin-support-tickets"] });
          }

          // --- Brand Settings & Payment Methods ---
          if (table === "brand_settings") {
            qc.invalidateQueries({ queryKey: ["brand-settings"] });
          }
          if (table === "payment_methods") {
            qc.invalidateQueries({ queryKey: ["all-payment-methods"] });
            qc.invalidateQueries({ queryKey: ["admin-payment-methods"] });
          }

          // --- Reviews & Testimonials ---
          if (table === "agent_reviews" || table === "testimonials") {
            qc.invalidateQueries({ queryKey: ["agent-reviews"] });
            qc.invalidateQueries({ queryKey: ["reviews"] });
            qc.invalidateQueries({ queryKey: ["testimonials"] });
            qc.invalidateQueries({ queryKey: ["admin-reviews"] });
            qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
          }

          // --- Broadcast Ads & Blog ---
          if (table === "broadcast_ads") {
            qc.invalidateQueries({ queryKey: ["broadcast-ads"] });
            qc.invalidateQueries({ queryKey: ["admin-broadcasts"] });
          }
          if (table === "blog_posts") {
            qc.invalidateQueries({ queryKey: ["blog-posts"] });
            qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
          }

          // --- Agents & Locations ---
          if (table === "agents") {
            qc.invalidateQueries({ queryKey: ["admin-agents"] });
            qc.invalidateQueries({ queryKey: ["admin-agents-list"] });
            qc.invalidateQueries({ queryKey: ["admin-overview-counts"] });
            qc.invalidateQueries({ queryKey: ["agents"] });
          }
          if (table === "locations") {
            qc.invalidateQueries({ queryKey: ["admin-locations"] });
            qc.invalidateQueries({ queryKey: ["admin-locations-list"] });
            qc.invalidateQueries({ queryKey: ["admin-overview-counts"] });
            qc.invalidateQueries({ queryKey: ["homepage-locations"] });
            qc.invalidateQueries({ queryKey: ["locations"] });
            qc.invalidateQueries({ queryKey: ["filter-metadata"] });
          }

          // --- Wallets ---
          if (table === "crypto_assets") {
            qc.invalidateQueries({ queryKey: ["admin-wallets"] });
            qc.invalidateQueries({ queryKey: ["crypto-assets"] });
          }

          // --- Notifications ---
          if (table === "notifications") {
            qc.invalidateQueries({ queryKey: ["notifications"] });
          }
        }
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
