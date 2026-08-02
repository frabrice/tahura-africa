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
const APP_URL = Deno.env.get("APP_URL") || "https://tahuraafrica.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Circuit breaker state
let circuitState: "closed" | "open" | "half-open" = "closed";
let lastFailureTime = 0;
let failureCount = 0;
const FAILURE_THRESHOLD = 5;
const RECOVERY_TIMEOUT_MS = 30000;

function isCircuitOpen(): boolean {
  if (circuitState === "open") {
    if (Date.now() - lastFailureTime > RECOVERY_TIMEOUT_MS) {
      circuitState = "half-open";
      return false;
    }
    return true;
  }
  return false;
}

function recordSuccess() {
  circuitState = "closed";
  failureCount = 0;
}

function recordFailure() {
  failureCount++;
  if (failureCount >= FAILURE_THRESHOLD) {
    circuitState = "open";
    lastFailureTime = Date.now();
  }
}

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

async function registerIPN(token: string): Promise<string> {
  const ipnUrl = `${SUPABASE_URL}/functions/v1/pesapal-ipn`;
  const res = await fetch(`${PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ url: ipnUrl, ipn_notification_type: "POST" }),
  });
  if (!res.ok) throw new Error(`IPN registration failed: ${res.status}`);
  const data = await res.json();
  return data.ipn_id;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Circuit breaker check
  if (isCircuitOpen()) {
    return new Response(
      JSON.stringify({ error: "Payment service temporarily unavailable. Please try again shortly.", code: "CIRCUIT_OPEN" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "30" } }
    );
  }

  try {
    const {
      booking_id,
      booking_ref,
      amount,
      currency = "USD",
      description,
      traveler_name,
      traveler_email,
      traveler_phone,
      idempotency_key,
      payment_method,
    } = await req.json();

    if (!booking_id || !booking_ref || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: booking_id, booking_ref, amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotency check
    const idempotencyKey = idempotency_key || `${booking_ref}-${amount}`;
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, status, pesapal_order_tracking_id, pesapal_merchant_reference")
      .eq("booking_ref", booking_ref)
      .eq("amount", Number(amount))
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingPayment) {
      // Check if existing payment is still valid
      if (existingPayment.status !== "failed" && existingPayment.status !== "cancelled") {
        return new Response(
          JSON.stringify({
            order_tracking_id: existingPayment.pesapal_order_tracking_id,
            merchant_reference: existingPayment.pesapal_merchant_reference,
            cached: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const token = await getPesapalToken();
    const ipnId = await registerIPN(token);

    const merchantRef = `${booking_ref}-${Date.now()}`;
    const callbackUrl = `${APP_URL}/payment/callback`;

    const nameParts = (traveler_name || "Guest").split(" ");
    const firstName = nameParts[0] || "Guest";
    const lastName = nameParts.slice(1).join(" ") || "User";

    const orderPayload = {
      id: merchantRef,
      currency,
      amount: Number(amount),
      description: description || `Tahura Africa Booking ${booking_ref}`,
      callback_url: callbackUrl,
      notification_id: ipnId,
      billing_address: {
        email_address: traveler_email || "guest@example.com",
        phone_number: traveler_phone || "",
        first_name: firstName,
        last_name: lastName,
      },
    };

    const orderRes = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!orderRes.ok) {
      recordFailure();
      const errText = await orderRes.text();
      return new Response(
        JSON.stringify({ error: `Order submission failed: ${orderRes.status}`, detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    recordSuccess();
    const orderData = await orderRes.json();
    const { order_tracking_id, redirect_url } = orderData;

    await supabase.from("payments").insert({
      booking_id,
      booking_ref,
      pesapal_order_tracking_id: order_tracking_id,
      pesapal_merchant_reference: merchantRef,
      amount: Number(amount),
      currency,
      description: description || `Tahura Africa Booking ${booking_ref}`,
      status: "pending",
      idempotency_key: idempotencyKey,
      requested_payment_method: payment_method || null,
    });

    await supabase
      .from("bookings")
      .update({ pesapal_tracking_id: order_tracking_id, payment_status: "pending" })
      .eq("id", booking_id);

    return new Response(
      JSON.stringify({ order_tracking_id, redirect_url, merchant_reference: merchantRef }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    recordFailure();
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
