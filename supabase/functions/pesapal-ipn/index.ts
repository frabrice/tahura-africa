import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PESAPAL_CONSUMER_KEY = Deno.env.get("PESAPAL_CONSUMER_KEY") || "";
const PESAPAL_CONSUMER_SECRET = Deno.env.get("PESAPAL_CONSUMER_SECRET") || "";
// Use PESAPAL_BASE_URL env var: production = "https://pay.pesapal.com/v3", sandbox = "https://cybqa.pesapal.com/pesapalv3"
const PESAPAL_BASE_URL = Deno.env.get("PESAPAL_BASE_URL") || "https://cybqa.pesapal.com/pesapalv3";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getPesapalToken(): Promise<string> {
  const res = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({
      consumer_key: PESAPAL_CONSUMER_KEY,
      consumer_secret: PESAPAL_CONSUMER_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Pesapal auth failed: ${res.status}`);
  const data = await res.json();
  return data.token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    let orderTrackingId: string | null = null;

    if (req.method === "GET") {
      const url = new URL(req.url);
      orderTrackingId = url.searchParams.get("OrderTrackingId");
    } else if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      orderTrackingId = body.OrderTrackingId || body.order_tracking_id || null;
    }

    if (!orderTrackingId) {
      return new Response(
        JSON.stringify({ error: "Missing OrderTrackingId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = await getPesapalToken();

    const statusRes = await fetch(
      `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
      {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    if (!statusRes.ok) {
      const errText = await statusRes.text();
      return new Response(
        JSON.stringify({ error: `Status check failed: ${statusRes.status}`, detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statusData = await statusRes.json();
    const {
      payment_status_description,
      payment_method,
      payment_account,
      merchant_reference,
    } = statusData;

    const statusMap: Record<string, string> = {
      Completed: "completed",
      Failed: "failed",
      Invalid: "invalid",
      Pending: "pending",
    };
    const normalizedStatus = statusMap[payment_status_description] || "pending";

    await supabase
      .from("payments")
      .update({
        status: normalizedStatus,
        payment_method: payment_method || null,
        payment_account: payment_account || null,
        updated_at: new Date().toISOString(),
      })
      .eq("pesapal_order_tracking_id", orderTrackingId);

    if (normalizedStatus === "completed") {
      const { data: payment } = await supabase
        .from("payments")
        .select("booking_id")
        .eq("pesapal_order_tracking_id", orderTrackingId)
        .maybeSingle();

      if (payment?.booking_id) {
        await supabase
          .from("bookings")
          .update({ payment_status: "paid", status: "confirmed" })
          .eq("id", payment.booking_id);
      }
    } else if (normalizedStatus === "failed" || normalizedStatus === "invalid") {
      const { data: payment } = await supabase
        .from("payments")
        .select("booking_id")
        .eq("pesapal_order_tracking_id", orderTrackingId)
        .maybeSingle();

      if (payment?.booking_id) {
        await supabase
          .from("bookings")
          .update({ payment_status: "failed" })
          .eq("id", payment.booking_id);
      }
    }

    return new Response(
      JSON.stringify({ orderNotificationType: "IPNCHANGE", orderTrackingId, orderMerchantReference: merchant_reference }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
