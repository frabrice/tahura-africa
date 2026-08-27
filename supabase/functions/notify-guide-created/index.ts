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

// Sends the "you've been added as a guide" email for a guides row that
// was just created. Unlike hosts (created by Ops or by a partner),
// guides are created by Ops only — there is no institution-side create
// flow — so the authorization check here is ops-only, not
// ops-or-owner. All email content is read from the database with the
// service role, never from the request body, so a caller can't spoof
// an email to an arbitrary address or with arbitrary content.
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
    const guideId = String(body.guide_id || "");
    if (!guideId) return json({ error: "bad_request", message: "guide_id is required." }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: callerPortal } = await admin
      .from("portal_users")
      .select("portal_type, is_active")
      .eq("auth_user_id", caller.id)
      .maybeSingle();

    const isActiveOps = !!callerPortal && callerPortal.portal_type === "operations" && callerPortal.is_active;
    if (!isActiveOps) {
      return json({ error: "forbidden", message: "Only operations admins can create guides." }, 403);
    }

    const { data: guide, error: guideErr } = await admin
      .from("guides")
      .select("id, name, email")
      .eq("id", guideId)
      .maybeSingle();
    if (guideErr || !guide) return json({ error: "not_found", message: "Guide not found." }, 404);

    const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        template: "guide_account_created",
        recipient_email: guide.email,
        recipient_name: guide.name,
        data: { guide_name: guide.name, guide_email: guide.email },
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
