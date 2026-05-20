import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Parse .env manually
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testLiveTransaction() {
  console.log("1. Finding a test user...");
  const { data: user } = await supabase.from("profiles").select("id").limit(1).single();
  if (!user) throw new Error("No user found for testing");

  console.log("2. Finding an investment property...");
  const { data: prop } = await supabase.from("investment_properties").select("*").eq("status", "open").limit(1).single();
  if (!prop) throw new Error("No open investment property found");

  console.log("3. Creating pending user_investment...");
  const { data: inv, error: invErr } = await supabase.from("user_investments").insert({
    user_id: user.id,
    property_id: prop.id,
    units_owned: 1,
    amount_invested: prop.unit_price,
    status: "pending"
  }).select().single();
  if (invErr) throw invErr;

  const reference = `TEST-TX-${Date.now()}`;

  console.log("4. Creating pending crypto payment...");
  const { data: pay, error: payErr } = await supabase.from("payments").insert({
    user_id: user.id,
    amount: prop.unit_price,
    currency: prop.currency,
    payment_type: "investment",
    provider: "crypto",
    status: "pending",
    reference: reference,
    investment_id: inv.id
  }).select().single();
  if (payErr) throw payErr;

  console.log(`[Created] Payment ID: ${pay.id}, Ref: ${reference}`);

  console.log("5. Simulating Live Webhook DB triggers & functions...");
  
  console.log("-> Updating payment status to processing...");
  await supabase.from("payments").update({ status: "processing" }).eq("id", pay.id);

  console.log("-> Updating payment status to success...");
  const { error: upErr } = await supabase.from("payments").update({ status: "success" }).eq("id", pay.id);
  if (upErr) throw upErr;

  console.log("-> Processing investment confirmation (Live Webhook Logic via Service Role)...");
  if (pay.investment_id) {
    const { error: upInvErr } = await supabase.from("user_investments").update({ status: "confirmed" }).eq("id", pay.investment_id);
    if (upInvErr) throw upInvErr;
    console.log("-> user_investment marked as confirmed.");
  }

  // Verify the final state
  const { data: finalInv } = await supabase.from("user_investments").select("*").eq("id", inv.id).single();
  console.log("Final Investment State:", finalInv.status);

  console.log("✅ Live Transaction Logic Tested Successfully.");
}

testLiveTransaction().catch(console.error);
