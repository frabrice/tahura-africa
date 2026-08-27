import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Sends the "you've been added as a host" email for a partner_hosts row
// that was just created. All content (host name/email, who added them)
// is read straight from the database with the service role — never
// taken from the request body — so a caller can't spoof an email to an
// arbitrary address or with arbitrary "added by" text. The only input
// that matters is host_id, and it's only usable if the caller actually
// owns (or administers) that specific host row.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized", message: "Missing authorization header." }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller }, error: callerErr } = await userClient.auth.getUser();
    if (callerErr || !caller) return json({ error: "unauthorized", message: "Invalid or expired session." }, 401);

    const body = await req.json().catch(() => ({}));
    const hostId = String(body.host_id || "");
    if (!hostId) return json({ error: "bad_request", message: "host_id is required." }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: host, error: hostErr } = await admin
      .from("partner_hosts")
      .select("id, name, email, partner_id")
      .eq("id", hostId)
      .maybeSingle();
    if (hostErr || !host) return json({ error: "not_found", message: "Host not found." }, 404);

    const { data: callerPortal } = await admin
      .from("portal_users")
      .select("id, portal_type, is_active, name")
      .eq("auth_user_id", caller.id)
      .maybeSingle();

    const isOwningPartner = !!callerPortal && callerPortal.id === host.partner_id;
    const isActiveOps = !!callerPortal && callerPortal.portal_type === "operations" && callerPortal.is_active;
    if (!isOwningPartner && !isActiveOps) {
      return json({ error: "forbidden", message: "You don't have access to this host." }, 403);
    }

    const addedBy = isActiveOps ? "Tahura Africa Operations" : (callerPortal?.name || "Your partner");

    const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        template: "host_account_created",
        recipient_email: host.email,
        recipient_name: host.name,
        data: { host_name: host.name, added_by: addedBy, host_email: host.email },
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text().catch(() => "");
      return json({ error: "email_failed", message: errBody || "Could not send the notification email." }, 502);
    }

    return json({ success: true });
  } catch (err: any) {
    return json({ error: "internal_error", message: err?.message || "Internal server error" }, 500);
  }
});
