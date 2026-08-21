import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const APP_URL = Deno.env.get("APP_URL") || "https://www.tahuraafrica.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { ticket_id } = await req.json();
    if (!ticket_id) {
      return new Response(JSON.stringify({ error: "Missing ticket_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const closedAt = new Date().toISOString();
    const { data: ticket, error: updateError } = await supabase
      .from("support_tickets")
      .update({ status: "closed", closed_at: closedAt })
      .eq("id", ticket_id)
      .select("ticket_ref, subject, category, created_by_name, created_by_email, created_by_role, created_at, closed_at")
      .single();

    if (updateError || !ticket) {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: messages } = await supabase
      .from("ticket_messages")
      .select("sender_type, sender_name, message_text, created_at")
      .eq("ticket_id", ticket_id)
      .order("created_at", { ascending: true });

    let pdfBase64: string | null = null;
    try {
      const pdfRes = await fetch(`${APP_URL}/api/ticket-transcript-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket, messages: messages || [] }),
      });
      if (pdfRes.ok) {
        const buf = await pdfRes.arrayBuffer();
        pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      }
    } catch {
      // PDF generation is best-effort - the ticket still closes and the
      // requester still gets notified even if the transcript attachment fails.
    }

    if (ticket.created_by_email) {
      await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          template: "support_ticket_closed",
          recipient_email: ticket.created_by_email,
          recipient_name: ticket.created_by_name,
          data: { subject: ticket.subject, ticket_ref: ticket.ticket_ref },
          ...(pdfBase64 ? { attachments: [{ filename: `${ticket.ticket_ref}-transcript.pdf`, content: pdfBase64 }] } : {}),
        }),
      });
    }

    return new Response(JSON.stringify({ success: true, pdf_attached: !!pdfBase64 }), {
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
