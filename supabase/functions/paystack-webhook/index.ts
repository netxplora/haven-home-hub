import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createHmac } from "node:crypto";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
  if (!secret) return new Response("Missing secret", { status: 500 });

  const expected = createHmac("sha512", secret).update(body).digest("hex");
  if (expected !== signature) return new Response("Invalid signature", { status: 401 });

  const evt = JSON.parse(body);
  const reference = evt?.data?.reference;
  const ok = evt?.event === "charge.success" && evt?.data?.status === "success";
  if (!reference) return new Response("ok");

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: pay } = await admin.from("payments").select("*").eq("reference", reference).maybeSingle();
  if (!pay || pay.status === "success") return new Response("ok");

  await finalize(admin, pay, ok ? "success" : "failed");
  return new Response("ok");
});

async function finalize(admin: any, pay: any, status: "success" | "failed") {
  await admin.from("payments").update({ status }).eq("id", pay.id);
  if (status === "success" && pay.investment_id) {
    await admin.from("user_investments").update({ status: "confirmed" }).eq("id", pay.investment_id);
  }
  if (status === "success" && pay.booking_id) {
    await admin.from("bookings").update({ status: "confirmed" }).eq("id", pay.booking_id);
  }
  if (status === "failed" && pay.investment_id) {
    const { data: inv } = await admin.from("user_investments").select("units_owned, property_id").eq("id", pay.investment_id).maybeSingle();
    if (inv) {
      await admin.rpc("release_investment_units", { _property_id: inv.property_id, _units: inv.units_owned });
      await admin.from("user_investments").update({ status: "cancelled" }).eq("id", pay.investment_id);
    }
  }
}