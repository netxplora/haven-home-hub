import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRealtimeSync() {
  const qc = useQueryClient();

  useEffect(() => {
    // Subscribe to all key tables so both User and Admin dashboards
    // immediately reflect changes without manual refresh.

    const tables = [
      "payments",
      "withdrawal_requests",
      "investment_properties",
      "user_investments",
      "investment_schedules",
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
    ];

    const channels = tables.map((table) => {
      return supabase
        .channel(`public:${table}`)
        .on(
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
            }

            // --- Withdrawals ---
            if (table === "withdrawal_requests") {
              qc.invalidateQueries({ queryKey: ["withdrawals"] });
              qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
              qc.invalidateQueries({ queryKey: ["available-balance"] });
            }

            // --- Investments ---
            if (table === "investment_properties") {
              qc.invalidateQueries({ queryKey: ["admin-invest"] });
              qc.invalidateQueries({ queryKey: ["admin-invest-stats"] });
              qc.invalidateQueries({ queryKey: ["admin-invest-list"] });
              qc.invalidateQueries({ queryKey: ["admin-overview-counts"] });
              qc.invalidateQueries({ queryKey: ["dashboard-overview-stats"] });
            }
            if (table === "user_investments") {
              qc.invalidateQueries({ queryKey: ["investments"] });
              qc.invalidateQueries({ queryKey: ["my-investments"] });
              qc.invalidateQueries({ queryKey: ["admin-investors"] });
              qc.invalidateQueries({ queryKey: ["admin-investments"] });
              qc.invalidateQueries({ queryKey: ["dashboard-overview-stats"] });
              qc.invalidateQueries({ queryKey: ["admin-overview-counts"] });
              qc.invalidateQueries({ queryKey: ["portfolio"] });
            }

            // --- Investment Schedules ---
            if (table === "investment_schedules") {
              qc.invalidateQueries({ queryKey: ["investment-schedules"] });
              qc.invalidateQueries({ queryKey: ["admin-schedules"] });
            }

            // --- Receipts ---
            if (table === "receipts") {
              qc.invalidateQueries({ queryKey: ["admin-receipts"] });
              qc.invalidateQueries({ queryKey: ["my-receipts"] });
            }

            // --- Returns & Payouts ---
            if (table === "returns") {
              qc.invalidateQueries({ queryKey: ["my-returns"] });
              qc.invalidateQueries({ queryKey: ["dashboard-overview-stats"] });
              qc.invalidateQueries({ queryKey: ["available-balance"] });
            }
            if (table === "payouts") {
              qc.invalidateQueries({ queryKey: ["admin-payouts"] });
            }

            // --- Bookings ---
            if (table === "bookings") {
              qc.invalidateQueries({ queryKey: ["my-bookings"] });
              qc.invalidateQueries({ queryKey: ["admin-bookings"] });
              qc.invalidateQueries({ queryKey: ["agent-bookings"] });
              qc.invalidateQueries({ queryKey: ["admin-overview-counts"] });
            }

            // --- Inquiries ---
            if (table === "inquiries") {
              qc.invalidateQueries({ queryKey: ["my-inquiries"] });
              qc.invalidateQueries({ queryKey: ["admin-inquiries"] });
              qc.invalidateQueries({ queryKey: ["agent-inquiries"] });
              qc.invalidateQueries({ queryKey: ["admin-overview-counts"] });
            }

            // --- Properties ---
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

            // --- Reservations ---
            if (table === "reservations") {
              qc.invalidateQueries({ queryKey: ["my-reservations"] });
              qc.invalidateQueries({ queryKey: ["my-purchases"] });
              qc.invalidateQueries({ queryKey: ["admin-reservations"] });
              qc.invalidateQueries({ queryKey: ["admin-overview-counts"] });
              qc.invalidateQueries({ queryKey: ["user-reservation"] });
              qc.invalidateQueries({ queryKey: ["property"] });
              qc.invalidateQueries({ queryKey: ["properties"] });
            }

            // --- Users, Roles, Agents ---
            if (table === "profiles" || table === "user_roles") {
              qc.invalidateQueries({ queryKey: ["admin-users"] });
              qc.invalidateQueries({ queryKey: ["admin-overview-counts"] });
              qc.invalidateQueries({ queryKey: ["profile"] });
            }
            if (table === "agents") {
              qc.invalidateQueries({ queryKey: ["admin-agents"] });
              qc.invalidateQueries({ queryKey: ["admin-agents-list"] });
              qc.invalidateQueries({ queryKey: ["admin-overview-counts"] });
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
            }

            // --- Notifications ---
            if (table === "notifications") {
              qc.invalidateQueries({ queryKey: ["notifications"] });
            }

            // --- Reservations (additional cross-invalidation) ---
            if (table === "reservations") {
              qc.invalidateQueries({ queryKey: ["dashboard-overview-stats"] });
              qc.invalidateQueries({ queryKey: ["agent-reservations"] });
              qc.invalidateQueries({ queryKey: ["related"] });
            }
          }
        )
        .subscribe();
    });

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [qc]);
}
