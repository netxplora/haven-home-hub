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

    const property = record;

    // Fetch all saved searches that match this property and have alerts enabled
    const { data: savedSearches, error: searchError } = await supabase
      .from("saved_searches")
      .select("*, profiles(email, full_name)")
      .eq("email_alerts", true);

    if (searchError) throw searchError;

    const matchedUsers = new Map();

    for (const search of (savedSearches || [])) {
      if (!search.profiles?.email) continue;
      
      const filters = search.filters || {};
      let matches = true;

      if (filters.property_type && filters.property_type !== property.property_type) matches = false;
      if (filters.status && filters.status !== property.status) matches = false;
      if (filters.min_price && property.price < filters.min_price) matches = false;
      if (filters.max_price && property.price > filters.max_price) matches = false;
      if (filters.bedrooms && property.bedrooms < filters.bedrooms) matches = false;
      
      // Basic location matching
      if (filters.location && property.city && !property.city.toLowerCase().includes(filters.location.toLowerCase())) {
        matches = false;
      }

      if (matches) {
        matchedUsers.set(search.user_id, {
          email: search.profiles.email,
          name: search.profiles.full_name || "User",
          searchName: search.name
        });
      }
    }

    const emailsToSend = Array.from(matchedUsers.values());

    if (emailsToSend.length > 0) {
      // Create system notifications for matched users
      const notificationsToInsert = Array.from(matchedUsers.entries()).map(([userId, user]) => ({
        user_id: userId,
        type: 'system',
        title: 'New Property Alert',
        message: `A new property matching your saved search "${user.searchName}" has just been listed: ${property.title}.`,
        link: `/properties/${property.slug}`,
        read: false
      }));

      await supabase.from("notifications").insert(notificationsToInsert);

      // In a real environment, you would call Resend/SendGrid here to dispatch the emails.
      console.log(`Dispatched alerts to ${emailsToSend.length} users for property ${property.title}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      alertsGenerated: emailsToSend.length 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Error generating property alerts:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
