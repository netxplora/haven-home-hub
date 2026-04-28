// Confirms a payment (admin action or manual-bank self-mark) and finalizes investment/booking.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { payment_id, action } = await req.json().catch(() => ({}));
    if (!payment_id) return json({ error: "payment_id required" }, 400);

    const { data: pay } = await admin.from("payments").select("*").eq("id", payment_id).maybeSingle();
    if (!pay) return json({ error: "Payment not found" }, 404);

    // Check if user is admin
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });

    // Owners can mark their own manual_bank payment as "processing". Only admins can mark success/failed.
    const setAction = action ?? (isAdmin ? "success" : pay.user_id === user.id && pay.provider === "manual_bank" ? "processing" : null);
    if (!setAction) return json({ error: "Forbidden" }, 403);

    if (setAction === "success" && !isAdmin) return json({ error: "Admins only" }, 403);
    if (setAction === "failed" && !isAdmin) return json({ error: "Admins only" }, 403);

    if (pay.status === "success") return json({ ok: true, already: true });

    const newStatus = setAction === "success" ? "success" : setAction === "failed" ? "failed" : "processing";

    const { error: updErr } = await admin.from("payments").update({ status: newStatus }).eq("id", payment_id);
    if (updErr) return json({ error: updErr.message }, 500);

    // Finalize linked records
    if (newStatus === "success" && pay.payment_type === "investment" && pay.investment_id) {
      await admin.from("user_investments").update({ status: "confirmed" }).eq("id", pay.investment_id);
    }
    if (newStatus === "success" && pay.payment_type === "booking" && pay.booking_id) {
      await admin.from("bookings").update({ status: "confirmed" }).eq("id", pay.booking_id);
    }
    if (newStatus === "failed" && pay.payment_type === "investment" && pay.investment_id) {
      const { data: inv } = await admin.from("user_investments").select("units_owned, investment_property_id:property_id").eq("id", pay.investment_id).maybeSingle();
      if (inv) {
        await admin.rpc("release_investment_units", { _property_id: inv.investment_property_id, _units: inv.units_owned });
        await admin.from("user_investments").update({ status: "cancelled" }).eq("id", pay.investment_id);
      }
    }

    return json({ ok: true, status: newStatus });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}