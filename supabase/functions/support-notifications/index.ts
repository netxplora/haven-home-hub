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
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { record, type, table } = await req.json();

    if (!record || !type || !table) {
      return new Response(JSON.stringify({ message: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing support webhook for table: ${table}, type: ${type}`);

    // Helper: Send email via Resend
    const sendEmail = async (to: string, subject: string, html: string) => {
      if (!resendApiKey) {
        console.log(`[Email Mock] To: ${to}, Subject: ${subject}`);
        console.log(`[Email Content]: ${html}`);
        return { mock: true };
      }

      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Haven Support <support@havenhomehub.com>",
            to,
            subject,
            html,
          }),
        });
        const res = await response.json();
        console.log("Resend API response:", res);
        return res;
      } catch (err) {
        console.error("Failed to send email via Resend:", err);
        return null;
      }
    };

    // ── SUPPORT TICKETS FLOW ──
    if (table === "support_tickets") {
      if (type === "INSERT") {
        // Send email to client
        await sendEmail(
          record.email,
          "Support Ticket Received",
          `<h3>Hello ${record.name},</h3>
           <p>Your support ticket has been received by our customer care desk.</p>
           <p><strong>Ticket ID:</strong> ${record.id}</p>
           <p><strong>Subject/User Type:</strong> ${record.user_type}</p>
           <p>We typically reply within a few minutes. Thank you for choosing Haven Home Hub.</p>`
        );

        // Notify agents in-app
        // Fetch all support agents/admins
        const { data: staff } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        if (staff && staff.length > 0) {
          const notifications = staff.map((s) => ({
            user_id: s.user_id,
            type: "system",
            title: "New Support Ticket",
            body: `New ticket created by ${record.name} (${record.email})`,
            link: "/admin?tab=support-center",
            metadata: { ticket_id: record.id },
            read_at: null,
          }));
          await supabase.from("notifications").insert(notifications);
        }
      } else if (type === "UPDATE") {
        const { data: ticket } = await supabase
          .from("support_tickets")
          .select("*")
          .eq("id", record.id)
          .single();

        if (ticket && ticket.status === "resolved") {
          await sendEmail(
            ticket.email,
            "Support Ticket Resolved",
            `<h3>Hello ${ticket.name},</h3>
             <p>Your support ticket (ID: ${ticket.id}) has been marked as resolved.</p>
             <p>Thank you for letting us assist you. If you still require help, simply reply to this email or reopen the ticket in your dashboard.</p>`
          );
        }
      }
    }

    // ── SUPPORT MESSAGES FLOW ──
    if (table === "support_messages") {
      if (type === "INSERT") {
        // Fetch the corresponding ticket
        const { data: ticket, error: tErr } = await supabase
          .from("support_tickets")
          .select("*")
          .eq("id", record.ticket_id)
          .single();

        if (tErr || !ticket) {
          throw new Error("Failed to fetch ticket for message");
        }

        if (record.sender_type === "agent") {
          // Send notification to user
          await sendEmail(
            ticket.email,
            "New Message from Support",
            `<h3>Hello ${ticket.name},</h3>
             <p>Our support agent, ${record.sender_name}, sent you a message:</p>
             <blockquote style="background:#f4f4f4;padding:10px;border-left:4px solid #000;">${record.message_text}</blockquote>
             <p>You can view and reply to this message directly in your Support Dashboard.</p>`
          );

          // Insert an in-app notification if the user is registered
          if (ticket.user_id) {
            await supabase.from("notifications").insert({
              user_id: ticket.user_id,
              type: "system",
              title: "New Support Reply",
              body: `${record.sender_name}: ${record.message_text.substring(0, 50)}...`,
              link: "/dashboard?tab=inquiries",
              metadata: { ticket_id: ticket.id },
            });
          }
        } else if (record.sender_type === "user" || record.sender_type === "guest") {
          // Message from client: Notify assigned agent or all agents if unassigned
          const agentId = ticket.assigned_agent_id;
          
          if (agentId) {
            // Get agent email
            const { data: agentProfile } = await supabase
              .from("profiles")
              .select("email, full_name")
              .eq("id", agentId)
              .single();

            if (agentProfile && agentProfile.email) {
              await sendEmail(
                agentProfile.email,
                `New Message on Ticket #${ticket.id.substring(0, 8)}`,
                `<h3>Hi ${agentProfile.full_name},</h3>
                 <p>User ${record.sender_name} sent a new message on ticket #${ticket.id}:</p>
                 <blockquote style="background:#f4f4f4;padding:10px;border-left:4px solid #000;">${record.message_text}</blockquote>
                 <p>Open the Admin Support Center to reply.</p>`
              );
            }

            // In-app agent notification
            await supabase.from("notifications").insert({
              user_id: agentId,
              type: "system",
              title: "Ticket Update",
              body: `${record.sender_name}: ${record.message_text.substring(0, 50)}...`,
              link: "/admin?tab=support-center",
              metadata: { ticket_id: ticket.id },
            });
          } else {
            // Notify all admins if unassigned
            const { data: staff } = await supabase
              .from("user_roles")
              .select("user_id")
              .eq("role", "admin");

            if (staff && staff.length > 0) {
              const notifications = staff.map((s) => ({
                user_id: s.user_id,
                type: "system",
                title: "New Message on Unassigned Ticket",
                body: `${record.sender_name}: ${record.message_text.substring(0, 50)}...`,
                link: "/admin?tab=support-center",
                metadata: { ticket_id: ticket.id },
                read_at: null,
              }));
              await supabase.from("notifications").insert(notifications);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Error in support-notifications edge function:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
