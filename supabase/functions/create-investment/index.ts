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

    const body = await req.json().catch(() => ({}));
    const { property_id, amount, units, provider } = body;

    if (!property_id || !amount || !units || !provider) return json({ error: "Missing fields" }, 400);
    if (amount <= 0 || units <= 0) return json({ error: "Invalid amount" }, 400);
    const allowedProviders = ["paystack", "flutterwave", "crypto", "manual_bank"];
    if (!allowedProviders.includes(provider)) return json({ error: "Invalid provider" }, 400);

    // Load property
    const { data: prop, error: pErr } = await admin
      .from("investment_properties")
      .select("*")
      .eq("id", property_id)
      .maybeSingle();
    if (pErr || !prop) return json({ error: "Property not found" }, 404);
    if (prop.status !== "open") return json({ error: "Not open for investment" }, 400);
    if (Number(amount) < Number(prop.min_investment)) return json({ error: "Below minimum" }, 400);

    const expected = Math.floor(Number(amount) / Number(prop.unit_price));
    if (expected !== Number(units)) return json({ error: "Amount does not match units at unit price" }, 400);
    if (units > (prop.total_units - prop.units_sold)) return json({ error: "Not enough units available" }, 400);

    // Atomically reserve units
    const { data: allocOk, error: allocErr } = await admin.rpc("allocate_investment_units", {
      _property_id: property_id,
      _units: units,
    });
    if (allocErr) return json({ error: allocErr.message }, 500);
    if (!allocOk) return json({ error: "Units were just taken. Try a smaller amount." }, 409);

    const reference = `INV-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();

    // Create pending user_investment
    const { data: inv, error: iErr } = await admin.from("user_investments").insert({
      user_id: user.id,
      property_id,
      amount_invested: amount,
      units_owned: units,
      status: "pending",
    }).select().single();
    if (iErr) {
      await admin.rpc("release_investment_units", { _property_id: property_id, _units: units });
      return json({ error: iErr.message }, 500);
    }

    // Create pending payment
    const { data: pay, error: payErr } = await admin.from("payments").insert({
      user_id: user.id,
      amount,
      currency: prop.currency,
      payment_type: "investment",
      provider,
      reference,
      status: "pending",
      investment_id: inv.id,
      investment_property_id: property_id,
      metadata: { units, property_title: prop.title },
    }).select().single();
    if (payErr) {
      await admin.from("user_investments").delete().eq("id", inv.id);
      await admin.rpc("release_investment_units", { _property_id: property_id, _units: units });
      return json({ error: payErr.message }, 500);
    }

    await admin.from("user_investments").update({ payment_id: pay.id }).eq("id", inv.id);

    // Kick off provider-specific session
    let checkout_url: string | undefined;
    let crypto_address: string | undefined;
    let crypto_amount: number | undefined;
    let crypto_currency: string | undefined;

    if (provider === "paystack") {
      const psKey = Deno.env.get("PAYSTACK_SECRET_KEY");
      if (psKey) {
        try {
          const r = await fetch("https://api.paystack.co/transaction/initialize", {
            method: "POST",
            headers: { Authorization: `Bearer ${psKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              email: user.email,
              amount: Math.round(Number(amount) * 100),
              reference,
              callback_url: `${req.headers.get("origin") ?? ""}/payments/${pay.id}`,
              metadata: { payment_id: pay.id },
            }),
          });
          const j = await r.json();
          if (j?.data?.authorization_url) checkout_url = j.data.authorization_url;
        } catch (_) { /* fall through */ }
      }
    } else if (provider === "flutterwave") {
      const fwKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
      if (fwKey) {
        try {
          const r = await fetch("https://api.flutterwave.com/v3/payments", {
            method: "POST",
            headers: { Authorization: `Bearer ${fwKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              tx_ref: reference,
              amount: Number(amount),
              currency: prop.currency,
              redirect_url: `${req.headers.get("origin") ?? ""}/payments/${pay.id}`,
              customer: { email: user.email },
              meta: { payment_id: pay.id },
            }),
          });
          const j = await r.json();
          if (j?.data?.link) checkout_url = j.data.link;
        } catch (_) { /* ignore */ }
      }
    } else if (provider === "crypto") {
      const npKey = Deno.env.get("NOWPAYMENTS_API_KEY");
      if (npKey) {
        try {
          const r = await fetch("https://api.nowpayments.io/v1/payment", {
            method: "POST",
            headers: { "x-api-key": npKey, "Content-Type": "application/json" },
            body: JSON.stringify({
              price_amount: Number(amount),
              price_currency: prop.currency.toLowerCase(),
              pay_currency: "usdttrc20",
              order_id: reference,
              ipn_callback_url: `${supabaseUrl}/functions/v1/nowpayments-webhook`,
            }),
          });
          const j = await r.json();
          if (j?.pay_address) {
            crypto_address = j.pay_address;
            crypto_amount = j.pay_amount;
            crypto_currency = j.pay_currency;
            await admin.from("payments").update({
              crypto_address, crypto_amount, crypto_currency,
              external_reference: String(j.payment_id ?? ""),
            }).eq("id", pay.id);
          }
        } catch (_) { /* ignore */ }
      }
    }

    return json({ payment_id: pay.id, reference, checkout_url, crypto_address, crypto_amount, crypto_currency });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}