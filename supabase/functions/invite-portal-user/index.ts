import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { originFromRequest } from "../_shared/origins.ts";

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
const APP_URL = Deno.env.get("APP_URL") || "https://tahuraafrica.com";

// Who an ops admin is allowed to invite. (Hosts/guides join in Phase 3.)
const ALLOWED_TYPES = ["partner", "operations"];

// portal_users.user_id_code is NOT NULL and is a required login field
// (see OperationsLoginPage's "User ID Code" input) — generate one
// server-side so the client never has to know this logic exists.
async function generateUserIdCode(admin: ReturnType<typeof createClient>, portalType: string): Promise<string> {
  const prefix = portalType.substring(0, 2).toUpperCase();
  const { data: rows } = await admin
    .from("portal_users")
    .select("user_id_code")
    .eq("portal_type", portalType)
    .order("created_at", { ascending: false })
    .limit(1);
  let next = 1;
  const last = rows?.[0]?.user_id_code as string | undefined;
  if (last) {
    const lastNum = parseInt(last.replace(/\D/g, ""), 10);
    if (!isNaN(lastNum)) next = lastNum + 1;
  }
  return `${prefix}${String(next).padStart(6, "0")}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // --- Authorize the caller: must be an active operations admin on Supabase Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized", message: "Missing authorization header." }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await userClient.auth.getUser();
    if (callerErr || !caller) return json({ error: "unauthorized", message: "Invalid or expired session." }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: callerRow } = await admin
      .from("portal_users")
      .select("id, portal_type, is_active")
      .eq("auth_user_id", caller.id)
      .maybeSingle();

    if (!callerRow || callerRow.portal_type !== "operations" || !callerRow.is_active) {
      return json({ error: "forbidden", message: "Only operations admins can invite accounts." }, 403);
    }

    // --- Validate input ---
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const portal_type = String(body.portal_type || "");
    if (!email) return json({ error: "bad_request", message: "Email is required." }, 400);
    if (!ALLOWED_TYPES.includes(portal_type)) {
      return json({ error: "bad_request", message: "Invalid portal type." }, 400);
    }

    const { data: existing } = await admin
      .from("portal_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existing) return json({ error: "conflict", message: "An account with this email already exists." }, 409);

    // Return to the site the admin is on (allow-listed), never a caller-supplied address.
    const redirectTo = `${originFromRequest(req, APP_URL)}/portal/activate`;

    // --- Create the Supabase Auth identity + invite link (they set their own password) ---
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo, data: { portal_type, name: body.name || "" } },
    });
    if (linkErr || !linkData?.user) {
      return json({ error: "invite_failed", message: linkErr?.message || "Could not create the invite." }, 500);
    }
    const authUserId = linkData.user.id;
    const actionLink = linkData.properties?.action_link || "";

    const userIdCode = body.user_id_code || await generateUserIdCode(admin, portal_type);

    // --- Create the linked portal profile (no local password_hash — auth owns the password) ---
    const { error: insErr } = await admin.from("portal_users").insert({
      portal_type,
      email,
      name: body.name || null,
      phone: body.phone || null,
      contact_person: body.contact_person || null,
      country: body.country || null,
      province: body.province || null,
      specific_location: body.specific_location || null,
      specialty: body.specialty || null,
      tags: Array.isArray(body.tags) && body.tags.length ? body.tags : null,
      user_id_code: userIdCode,
      auth_user_id: authUserId,
      is_active: true,
    });
    if (insErr) {
      // Roll back the auth user so we never leave an orphaned identity.
      await admin.auth.admin.deleteUser(authUserId).catch(() => {});
      return json({ error: "profile_failed", message: insErr.message }, 500);
    }

    // --- Send the branded invite email via the send-email function ---
    let emailSent = false;
    try {
      const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE}`,
          "apikey": SERVICE,
        },
        body: JSON.stringify({
          template: "portal_invite",
          recipient_email: email,
          recipient_name: body.name || "",
          data: {
            name: body.name || "",
            portal_type,
            user_id_code: userIdCode,
            email,
            action_link: actionLink,
          },
        }),
      });
      emailSent = emailRes.ok;
    } catch (_) {
      emailSent = false;
    }

    return json({ success: true, email_sent: emailSent, auth_user_id: authUserId, user_id_code: userIdCode });
  } catch (err) {
    return json({ error: "server_error", message: (err as Error).message || "Unexpected error." }, 500);
  }
});
