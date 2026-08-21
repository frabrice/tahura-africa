import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Travelers only exist as Supabase Auth identities (no public traveler table),
// so resolving "the traveler on this conversation"'s email requires the
// admin API and the service-role key — something client code can never do
// safely. That gap is why host/guide replies to a traveler were silently
// never emailing: the client-side code was querying a table that doesn't
// exist. Centralizing recipient resolution here, server-side, fixes every
// direction (traveler->host/guide already worked from the client, but is
// routed through here too now for one consistent, correct code path).
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { conversation_id, sender_type, sender_name, message_text } = await req.json();
    if (!conversation_id || !sender_type || !message_text) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .select("traveler_id, traveler_name, host_id, host_name, guide_id, guide_name, listing_title")
      .eq("id", conversation_id)
      .maybeSingle();

    if (convError || !conv) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let recipientEmail: string | null = null;
    let recipientName = "";

    if (sender_type === "traveler") {
      if (conv.host_id) {
        const { data } = await supabase.from("partner_hosts").select("email, name").eq("id", conv.host_id).maybeSingle();
        recipientEmail = data?.email || null;
        recipientName = data?.name || conv.host_name || "";
      } else if (conv.guide_id) {
        const { data } = await supabase.from("guides").select("email, name").eq("id", conv.guide_id).maybeSingle();
        recipientEmail = data?.email || null;
        recipientName = data?.name || conv.guide_name || "";
      }
    } else if (conv.traveler_id) {
      const { data, error } = await supabase.auth.admin.getUserById(conv.traveler_id);
      if (!error && data.user) {
        recipientEmail = data.user.email || null;
        recipientName = (data.user.user_metadata?.full_name as string) || conv.traveler_name || "";
      }
    }

    if (!recipientEmail) {
      return new Response(JSON.stringify({ skipped: true, reason: "No recipient email found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template: "new_message",
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        data: {
          sender_name: sender_name || "Someone",
          message_preview: String(message_text).slice(0, 150),
          listing_title: conv.listing_title,
        },
      }),
    });

    if (!emailRes.ok) {
      const body = await emailRes.text();
      return new Response(JSON.stringify({ error: `send-email failed: ${body}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
