import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createHmac } from "node:crypto";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const raw = await req.text();
  const sig = req.headers.get("x-nowpayments-sig") ?? "";
  const ipn = Deno.env.get("NOWPAYMENTS_IPN_SECRET") ?? "";
  if (ipn) {
    // Sort JSON keys before HMAC per NOWPayments docs
    const obj = JSON.parse(raw);
    const sorted = JSON.stringify(obj, Object.keys(obj).sort());
    const expected = createHmac("sha512", ipn).update(sorted).digest("hex");
    if (expected !== sig) return new Response("Invalid signature", { status: 401 });
  }
  const evt = JSON.parse(raw);
  const reference = evt?.order_id;
  const status = evt?.payment_status;
  if (!reference) return new Response("ok");

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: pay } = await admin.from("payments").select("*").eq("reference", reference).maybeSingle();
  if (!pay) return new Response("ok");

  let newStatus: string | null = null;
  if (["finished", "confirmed"].includes(status)) newStatus = "success";
  else if (["failed", "expired", "refunded"].includes(status)) newStatus = "failed";
  else if (["waiting", "confirming", "sending", "partially_paid"].includes(status)) newStatus = "processing";

  if (!newStatus || newStatus === pay.status) return new Response("ok");
  await admin.from("payments").update({ status: newStatus }).eq("id", pay.id);
  if (newStatus === "success" && pay.investment_id) {
    await admin.from("user_investments").update({ status: "confirmed" }).eq("id", pay.investment_id);
  }
  if (newStatus === "success" && pay.booking_id) {
    await admin.from("bookings").update({ status: "confirmed" }).eq("id", pay.booking_id);
  }
  if (newStatus === "failed" && pay.investment_id) {
    const { data: inv } = await admin.from("user_investments").select("units_owned, property_id").eq("id", pay.investment_id).maybeSingle();
    if (inv) {
      await admin.rpc("release_investment_units", { _property_id: inv.property_id, _units: inv.units_owned });
      await admin.from("user_investments").update({ status: "cancelled" }).eq("id", pay.investment_id);
    }
  }
  return new Response("ok");
});