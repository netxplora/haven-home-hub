// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { record, type } = await req.json();

    if (type !== "INSERT" || !record || !record.id) {
      return new Response(JSON.stringify({ message: "Not an insert or invalid record" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = record;

    // Get the conversation participants
    const { data: participants, error: pError } = await supabase
      .from("participants")
      .select("user_id, profiles(full_name, email)")
      .eq("conversation_id", message.conversation_id);

    if (pError) throw pError;

    // Get the sender's details
    const sender = participants?.find((p) => p.user_id === message.sender_id);
    const senderName = sender?.profiles?.full_name || "Someone";

    // Notify all participants except the sender
    const recipients = participants?.filter((p) => p.user_id !== message.sender_id) || [];

    const notificationsToInsert = recipients.map((r) => ({
      user_id: r.user_id,
      type: 'system', // or a dedicated 'message' type if defined
      title: 'New Message',
      message: `${senderName} sent you a message.`,
      link: `/inbox/${message.conversation_id}`,
      read: false
    }));

    if (notificationsToInsert.length > 0) {
      await supabase.from("notifications").insert(notificationsToInsert);
      // In production, trigger Resend email here for users who have email notifications enabled.
      console.log(`Generated message notifications for ${recipients.length} users.`);
    }

    return new Response(JSON.stringify({ success: true, notified: notificationsToInsert.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Error generating message notifications:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
