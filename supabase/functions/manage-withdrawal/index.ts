import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action = "approve" | "reject" | "complete" | "fail";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admins only" }, 403);

    const body = await req.json().catch(() => ({}));
    const { withdrawal_id, action, transaction_reference, admin_notes, rejection_reason } = body as {
      withdrawal_id?: string;
      action?: Action;
      transaction_reference?: string;
      admin_notes?: string;
      rejection_reason?: string;
    };
    if (!withdrawal_id || !action) return json({ error: "Missing fields" }, 400);
    if (!["approve", "reject", "complete", "fail"].includes(action)) {
      return json({ error: "Invalid action" }, 400);
    }

    const { data: w } = await admin.from("withdrawal_requests").select("*").eq("id", withdrawal_id).maybeSingle();
    if (!w) return json({ error: "Not found" }, 404);

    const now = new Date().toISOString();
    const update: Record<string, unknown> = {
      reviewed_by: user.id,
      reviewed_at: now,
      admin_notes: admin_notes ?? w.admin_notes,
    };

    let notifType = "withdrawal_approved";
    let notifTitle = "";
    let notifBody = "";

    if (action === "approve") {
      if (w.status !== "pending") return json({ error: `Cannot approve ${w.status}` }, 400);
      update.status = "approved";
      notifTitle = "Withdrawal approved";
      notifBody = `Your ${w.method.replace("_", " ")} withdrawal of ${w.amount} ${w.currency} has been approved and is being processed.`;
    } else if (action === "reject") {
      if (w.status !== "pending" && w.status !== "approved") return json({ error: `Cannot reject ${w.status}` }, 400);
      update.status = "rejected";
      update.rejection_reason = rejection_reason ?? "No reason provided";
      notifType = "withdrawal_rejected";
      notifTitle = "Withdrawal rejected";
      notifBody = `Your withdrawal of ${w.amount} ${w.currency} was rejected. Reason: ${update.rejection_reason}`;
    } else if (action === "complete") {
      if (!["approved", "processing"].includes(w.status)) return json({ error: `Cannot complete ${w.status}` }, 400);
      update.status = "completed";
      update.completed_at = now;
      update.transaction_reference = transaction_reference ?? w.transaction_reference;
      notifType = "withdrawal_completed";
      notifTitle = "Withdrawal completed";
      notifBody = `Your withdrawal of ${w.amount} ${w.currency} has been paid out.${update.transaction_reference ? ` Reference: ${update.transaction_reference}` : ""}`;
    } else if (action === "fail") {
      update.status = "failed";
      update.rejection_reason = rejection_reason ?? null;
      notifType = "withdrawal_rejected";
      notifTitle = "Withdrawal failed";
      notifBody = `Your withdrawal of ${w.amount} ${w.currency} could not be processed.${rejection_reason ? ` ${rejection_reason}` : ""}`;
    }

    const { error: updErr } = await admin.from("withdrawal_requests").update(update).eq("id", withdrawal_id);
    if (updErr) return json({ error: updErr.message }, 500);

    await admin.rpc("create_notification", {
      _user_id: w.user_id,
      _type: notifType,
      _title: notifTitle,
      _body: notifBody,
      _link: "/dashboard?tab=withdrawals",
      _metadata: { withdrawal_id },
    });

    return json({ ok: true, status: update.status });
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