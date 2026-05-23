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

async function testPayoutDistribution() {
  console.log("1. Finding or creating a property for testing payouts...");
  let { data: prop } = await supabase.from("investment_properties").select("*").limit(1).single();
  if (!prop) {
    throw new Error("No investment property found");
  }
  console.log(`Using property: ${prop.title} (ID: ${prop.id})`);

  console.log("2. Finding/creating two test users...");
  const { data: users } = await supabase.from("profiles").select("id, email").limit(2);
  if (!users || users.length < 2) {
    throw new Error("Need at least 2 profiles in database to run this test");
  }
  const [userA, userB] = users;
  console.log(`User A: ${userA.email} (${userA.id})`);
  console.log(`User B: ${userB.email} (${userB.id})`);

  console.log("3. Creating mock active investments for User A (2 units) and User B (3 units)...");
  
  // Clean up any existing active investments for this test property to ensure clean math
  await supabase.from("user_investments").delete().eq("property_id", prop.id);

  const { data: invA, error: errA } = await supabase.from("user_investments").insert({
    user_id: userA.id,
    property_id: prop.id,
    units_owned: 2,
    amount_invested: Number(prop.unit_price) * 2,
    status: "active",
    investment_type: "full"
  }).select().single();
  if (errA) throw errA;

  const { data: invB, error: errB } = await supabase.from("user_investments").insert({
    user_id: userB.id,
    property_id: prop.id,
    units_owned: 3,
    amount_invested: Number(prop.unit_price) * 3,
    status: "active",
    investment_type: "full"
  }).select().single();
  if (errB) throw errB;

  console.log(`Mock investments created. Total units: 5`);

  console.log("4. Declaring a payout of $10,000...");
  const { data: payout, error: payErr } = await supabase.from("payouts").insert({
    property_id: prop.id,
    amount: 10000.00,
    distribution_date: new Date().toISOString().slice(0, 10),
    notes: "Test ROI distribution"
  }).select().single();
  if (payErr) throw payErr;
  console.log(`Payout recorded ID: ${payout.id}`);

  console.log("5. Running distribute_property_payout RPC...");
  const { error: rpcErr } = await supabase.rpc("distribute_property_payout", {
    p_payout_id: payout.id
  });
  if (rpcErr) throw rpcErr;
  console.log("RPC ran successfully.");

  console.log("6. Verifying returns table for pro-rata distribution...");
  const { data: returns, error: retErr } = await supabase.from("returns").select("*").eq("payout_id", payout.id);
  if (retErr) throw retErr;

  console.log("Returns generated:", returns);
  
  const returnA = returns.find(r => r.user_id === userA.id);
  const returnB = returns.find(r => r.user_id === userB.id);

  if (!returnA || !returnB) {
    throw new Error("Missing expected returns for test users");
  }

  console.log(`User A return: ${returnA.amount_received} (Expected: 4000.00)`);
  console.log(`User B return: ${returnB.amount_received} (Expected: 6000.00)`);

  if (Number(returnA.amount_received) !== 4000.00 || Number(returnB.amount_received) !== 6000.00) {
    throw new Error("Math verification failed! Pro-rata calculation incorrect.");
  }
  console.log("✅ Math check passed!");

  console.log("7. Verifying notification generation...");
  const { data: notificationsA } = await supabase.from("notifications").select("*").eq("user_id", userA.id).order("created_at", { ascending: false }).limit(1);
  const { data: notificationsB } = await supabase.from("notifications").select("*").eq("user_id", userB.id).order("created_at", { ascending: false }).limit(1);

  console.log("User A latest notification:", notificationsA?.[0]?.title, "-", notificationsA?.[0]?.body);
  console.log("User B latest notification:", notificationsB?.[0]?.title, "-", notificationsB?.[0]?.body);

  if (!notificationsA?.[0]?.title.includes("Dividend Received") || !notificationsB?.[0]?.title.includes("Dividend Received")) {
    throw new Error("Notification check failed!");
  }
  console.log("✅ Notifications check passed!");

  // Clean up
  console.log("8. Cleaning up test data...");
  await supabase.from("returns").delete().eq("payout_id", payout.id);
  await supabase.from("payouts").delete().eq("id", payout.id);
  await supabase.from("user_investments").delete().eq("id", invA.id);
  await supabase.from("user_investments").delete().eq("id", invB.id);
  console.log("Cleanup finished.");

  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY.");
}

testPayoutDistribution().catch(console.error);
