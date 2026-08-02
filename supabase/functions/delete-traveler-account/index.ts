import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "unauthorized", message: "Missing authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "unauthorized", message: "Invalid or expired session" }, 401);
    }

    const userId = user.id;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Only genuinely upcoming, *confirmed* (paid) trips block deletion. Unpaid
    // "pending" bookings and past trips should never trap a user in their account.
    const today = new Date().toISOString().split("T")[0];
    const { data: activeBookings, error: bookingsError } = await adminClient
      .from("bookings")
      .select("id")
      .eq("traveler_id", userId)
      .eq("status", "confirmed")
      .gte("booking_date", today);

    if (bookingsError) {
      return jsonResponse({ error: "server_error", message: "Failed to check bookings" }, 500);
    }

    if (activeBookings && activeBookings.length > 0) {
      return jsonResponse(
        {
          error: "active_bookings",
          count: activeBookings.length,
          message: `You have ${activeBookings.length} upcoming trip(s). Please cancel them before deleting your account.`,
        },
        400
      );
    }

    const [hostResult, guideResult] = await Promise.all([
      adminClient
        .from("partner_hosts")
        .select("id")
        .eq("traveler_user_id", userId)
        .eq("status", "active")
        .limit(1),
      adminClient
        .from("guides")
        .select("id")
        .eq("traveler_user_id", userId)
        .eq("available", true)
        .limit(1),
    ]);

    const isHost = !hostResult.error && hostResult.data && hostResult.data.length > 0;
    const isGuide = !guideResult.error && guideResult.data && guideResult.data.length > 0;

    if (isHost || isGuide) {
      const roles: string[] = [];
      if (isHost) roles.push("host");
      if (isGuide) roles.push("guide");

      return jsonResponse(
        {
          error: "linked_host_or_guide",
          isHost,
          isGuide,
          message: `Your account is linked as a ${roles.join(" and ")}. Please ask your ${isHost ? "partner" : ""}${isHost && isGuide ? " and " : ""}${isGuide ? "institution" : ""} administrator to remove you first, then try again.`,
        },
        400
      );
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      return jsonResponse({ error: "delete_failed", message: "Failed to delete account. Please try again." }, 500);
    }

    return jsonResponse({ success: true, message: "Account deleted successfully" });
  } catch (_err) {
    return jsonResponse({ error: "server_error", message: "An unexpected error occurred" }, 500);
  }
});
