// @ts-nocheck
declare const Deno: any;
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(supabaseUrl, serviceKey);

    // Optional: verify the caller is admin or a cron service
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await userClient.auth.getUser();
      
      if (user) {
        // Check if user is admin
        const { data: role } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (!role) {
          return new Response(
            JSON.stringify({ error: "Admin access required" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Call the expire function
    const { data, error } = await admin.rpc("expire_stale_reservations");

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also check for overdue installments while we're at it
    const today = new Date().toISOString().split("T")[0];
    const { data: overdueSchedules } = await admin
      .from("investment_schedules")
      .update({ status: "overdue", updated_at: new Date().toISOString() })
      .eq("status", "pending")
      .lt("due_date", today)
      .select("id, investment_id");

    const overdueCount = overdueSchedules?.length ?? 0;

    // Mark parent investments as overdue if they have overdue installments
    if (overdueCount > 0) {
      const overdueInvestmentIds = [...new Set(
        (overdueSchedules ?? []).map((s: any) => s.investment_id).filter(Boolean)
      )];

      if (overdueInvestmentIds.length > 0) {
        await admin
          .from("user_investments")
          .update({ status: "overdue", updated_at: new Date().toISOString() })
          .in("id", overdueInvestmentIds)
          .in("status", ["confirmed", "active"]);
      }
    }

    return new Response(
      JSON.stringify({
        expired_reservations: data ?? 0,
        overdue_installments: overdueCount,
        timestamp: new Date().toISOString(),
        message: "Maintenance tasks completed"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
