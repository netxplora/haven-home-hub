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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const {
      property_id,
      amount,
      units,
      provider,
      investment_type = "full",
      total_amount,
      down_payment_amount,
      duration_months,
      monthly_installment_amount,
      signature_data,
    } = body;

    if (!property_id || !amount || !units || !provider) return json({ error: "Missing fields" }, 400);
    if (amount <= 0 || units <= 0) return json({ error: "Invalid amount" }, 400);
    const allowedProviders = ["paystack", "flutterwave", "crypto", "manual_bank", "wallet", "digital_currency", "bank_transfer", "third_party_provider"];
    if (!allowedProviders.includes(provider)) return json({ error: "Invalid provider" }, 400);

    // Load property
    const { data: prop, error: pErr } = await admin
      .from("investment_properties")
      .select("*")
      .eq("id", property_id)
      .maybeSingle();
    if (pErr) return json({ error: "DB error loading property: " + pErr.message }, 500);
    if (!prop) return json({ error: "Property not found" }, 404);
    if (prop.status !== "open") return json({ error: "Not open for investment (current status: " + prop.status + ")" }, 400);

    // Validate that at least 1 unit is purchased
    const investmentTotal = investment_type === "installment" ? Number(total_amount ?? amount) : Number(amount);
    if (units < 1) return json({ error: "Must purchase at least 1 unit" }, 400);

    const expected = Math.floor(investmentTotal / Number(prop.unit_price));
    if (expected !== Number(units)) return json({ error: "Amount does not match units at unit price" }, 400);
    if (units > (prop.total_units - prop.units_sold)) return json({ error: "Not enough units available" }, 400);

    // Validate installment-specific constraints
    if (investment_type === "installment") {
      if (!prop.installment_available) return json({ error: "This property does not support installment payments" }, 400);
      if (!total_amount || !down_payment_amount || !duration_months || !monthly_installment_amount) {
        return json({ error: "Missing installment details" }, 400);
      }
      const minDownPct = Number(prop.min_down_payment_pct ?? 20);
      const maxMonths = Number(prop.max_installment_months ?? 24);
      const actualDownPct = (Number(down_payment_amount) / Number(total_amount)) * 100;
      if (actualDownPct < minDownPct - 0.5) return json({ error: `Down payment must be at least ${minDownPct}%` }, 400);
      if (Number(duration_months) > maxMonths) return json({ error: `Maximum installment duration is ${maxMonths} months` }, 400);
      if (Number(duration_months) < 1) return json({ error: "Duration must be at least 1 month" }, 400);
    }

    // Atomically reserve units
    const { data: allocOk, error: allocErr } = await admin.rpc("allocate_investment_units", {
      _property_id: property_id,
      _units: units,
    });
    if (allocErr) return json({ error: "Unit allocation failed: " + allocErr.message }, 500);
    if (!allocOk) return json({ error: "Units were just taken. Try a smaller amount." }, 409);

    const reference = `INV-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();

    // Build user_investment record
    const investmentRecord: Record<string, any> = {
      user_id: user.id,
      property_id,
      amount_invested: investmentTotal,
      units_owned: units,
      status: "awaiting_payment",
      investment_type,
    };

    if (investment_type === "installment") {
      investmentRecord.total_amount = Number(total_amount);
      investmentRecord.down_payment_amount = Number(down_payment_amount);
      investmentRecord.monthly_installment_amount = Number(monthly_installment_amount);
      investmentRecord.duration_months = Number(duration_months);
      investmentRecord.amount_paid = 0;
      investmentRecord.remaining_balance = Number(total_amount);
      investmentRecord.completion_percentage = 0;
      investmentRecord.start_date = new Date().toISOString().split("T")[0];
    } else {
      investmentRecord.total_amount = investmentTotal;
      investmentRecord.amount_paid = 0;
      investmentRecord.remaining_balance = investmentTotal;
      investmentRecord.completion_percentage = 0;
    }

    // Create user_investment
    const { data: inv, error: iErr } = await admin.from("user_investments").insert(investmentRecord).select().single();
    if (iErr) {
      await admin.rpc("release_investment_units", { _property_id: property_id, _units: units });
      return json({ error: "Failed to create investment record: " + iErr.message }, 500);
    }

    // For installment investments, generate the payment schedule
    if (investment_type === "installment") {
      const schedules: Record<string, any>[] = [];
      const startDate = new Date();
      const numMonths = Number(duration_months);
      const monthlyAmt = Number(monthly_installment_amount);
      const downAmt = Number(down_payment_amount);

      // Down payment schedule entry
      schedules.push({
        investment_id: inv.id,
        due_date: startDate.toISOString().split("T")[0],
        amount_due: downAmt,
        status: "awaiting_payment",
      });

      for (let i = 1; i <= numMonths; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        let installmentAmt = monthlyAmt;
        if (i === numMonths) {
          const paidSoFar = downAmt + (monthlyAmt * (numMonths - 1));
          installmentAmt = Number(total_amount) - paidSoFar;
          if (installmentAmt < 0) installmentAmt = 0;
        }
        schedules.push({
          investment_id: inv.id,
          due_date: dueDate.toISOString().split("T")[0],
          amount_due: Math.round(installmentAmt * 100) / 100,
          status: "awaiting_payment",
        });
      }

      const { error: schedErr } = await admin.from("investment_schedules").insert(schedules);
      if (schedErr) {
        console.error("Schedule creation failed:", schedErr.message);
        // Non-fatal: investment was created, schedules can be regenerated
      }

      const { error: updateErr } = await admin.from("user_investments").update({
        next_payment_due: startDate.toISOString().split("T")[0],
      }).eq("id", inv.id);
      if (updateErr) {
        console.error("Next payment due update failed:", updateErr.message);
      }
    }

    // Process E-Signature if provided
    if (signature_data) {
      try {
        // Find active template
        const { data: template } = await admin
          .from("document_templates")
          .select("id, content_html")
          .eq("document_type", "investment_agreement")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (template) {
          const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
          const userAgent = req.headers.get("user-agent") || "unknown";

          const { error: sigErr } = await admin.from("signed_documents").insert({
            user_id: user.id,
            template_id: template.id,
            document_type: "investment_agreement",
            reference_id: inv.id,
            signature_data,
            ip_address: clientIp,
            user_agent: userAgent,
            document_snapshot: template.content_html
          });
          
          if (sigErr) {
            console.error("Signature insertion failed:", sigErr.message);
          }
        }
      } catch (sigEx) {
        console.error("Signature processing exception:", sigEx);
      }
    }

    // Create notification for the user (non-fatal if it fails)
    try {
      const { error: notifErr } = await admin.from("notifications").insert({
        user_id: user.id,
        type: "system",
        title: "Investment Request Received",
        body: `Your investment application for ${prop.title} has been received and is currently under review. We will notify you once it is approved.`,
      });
      if (notifErr) {
        console.error("Notification insert failed:", notifErr.message);
      }
    } catch (notifEx) {
      console.error("Notification insert exception:", notifEx);
    }

    return json({
      investment_id: inv.id,
      status: "awaiting_payment",
      message: "Investment application submitted and awaiting payment"
    });
  } catch (e) {
    console.error("Unhandled error in create-investment:", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}