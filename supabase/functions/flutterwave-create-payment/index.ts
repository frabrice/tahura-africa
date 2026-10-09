import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { originFromRequest } from "../_shared/origins.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FLUTTERWAVE_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY") || "";
const FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const APP_URL = Deno.env.get("APP_URL") || "https://tahuraafrica.com";
// Flutterwave's Rwanda Mobile Money channel only appears on checkout when the
// transaction currency is RWF — offering it alongside card under a USD charge
// gets it silently dropped. Booking totals are stored in USD, so convert here,
// same pattern as intouch-request-payment.
const USD_TO_RWF = Number(Deno.env.get("FLUTTERWAVE_USD_TO_RWF") || "1300");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (!FLUTTERWAVE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Flutterwave is not configured yet. Please set FLUTTERWAVE_SECRET_KEY." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      booking_id,
      booking_ref,
      description,
      traveler_name,
      traveler_email,
      traveler_phone,
      payment_option,
    } = await req.json();

    // Traveler pre-selected card or mobile money (most people don't know
    // Flutterwave's hosted page lets you switch tabs) - show only that
    // channel instead of the default "both" so the checkout page opens
    // straight to what they already chose.
    const paymentOptions = payment_option === "card" ? "card"
      : payment_option === "mobilemoneyrwanda" ? "mobilemoneyrwanda"
      : "card,mobilemoneyrwanda";

    if (!booking_id || !booking_ref) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: booking_id, booking_ref" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The amount charged is always looked up server-side from the real
    // booking record — never trust a client-supplied amount here. A caller
    // could otherwise request a Flutterwave checkout for $0.01 against a
    // real booking_id, pay that, and have flutterwave-verify mark the real
    // (much larger) booking as paid, since verify only checks that the
    // *transaction* succeeded, not that the *amount* matches.
    const { data: bookingRow, error: bookingErr } = await supabase
      .from("bookings")
      .select("total_amount")
      .eq("id", booking_id)
      .maybeSingle();

    if (bookingErr || !bookingRow || !bookingRow.total_amount) {
      return new Response(
        JSON.stringify({ error: "Booking not found or has no total_amount" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Booking totals are stored in USD; Flutterwave itself is always charged
    // in RWF (see USD_TO_RWF note above) so card + mobile money can appear
    // together on one checkout.
    const amountRwf = Math.max(1, Math.round(Number(bookingRow.total_amount) * USD_TO_RWF));

    // Idempotency: reuse an existing non-failed payment for this exact booking/amount
    // instead of opening a second checkout (mirrors the Pesapal create-order behaviour).
    // Also matched on payment_method - otherwise switching from card to mobile
    // money (or back) on a retry would silently reopen the old checkout link,
    // showing the wrong channel instead of the one just chosen.
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, status, flutterwave_tx_ref")
      .eq("booking_ref", booking_ref)
      .eq("amount", amountRwf)
      .eq("provider", "flutterwave")
      .eq("payment_method", paymentOptions)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPayment && existingPayment.status !== "failed" && existingPayment.status !== "cancelled" && existingPayment.flutterwave_tx_ref) {
      return new Response(
        JSON.stringify({ tx_ref: existingPayment.flutterwave_tx_ref, cached: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const txRef = `${booking_ref}-${Date.now()}`;
    const nameParts = (traveler_name || "Guest").split(" ");

    const paymentRes = await fetch(`${FLUTTERWAVE_BASE_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: amountRwf,
        currency: "RWF",
        redirect_url: `${originFromRequest(req, APP_URL)}/payment/callback`,
        payment_options: paymentOptions,
        customer: {
          email: traveler_email || "guest@example.com",
          phonenumber: traveler_phone || "",
          name: `${nameParts[0] || "Guest"} ${nameParts.slice(1).join(" ") || ""}`.trim(),
        },
        customizations: {
          title: "Tahura Africa",
          description: description || `Booking ${booking_ref}`,
        },
      }),
    });

    if (!paymentRes.ok) {
      const errText = await paymentRes.text();
      return new Response(
        JSON.stringify({ error: `Flutterwave payment creation failed: ${paymentRes.status}`, detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentData = await paymentRes.json();
    const link = paymentData?.data?.link;

    if (!link) {
      return new Response(
        JSON.stringify({ error: "Flutterwave did not return a checkout link", detail: paymentData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("payments").insert({
      booking_id,
      booking_ref,
      provider: "flutterwave",
      flutterwave_tx_ref: txRef,
      amount: amountRwf,
      currency: "RWF",
      description: description || `Tahura Africa Booking ${booking_ref}`,
      status: "pending",
      payment_method: paymentOptions,
    });

    await supabase
      .from("bookings")
      .update({ flutterwave_tx_ref: txRef, payment_status: "pending" })
      .eq("id", booking_id);

    return new Response(
      JSON.stringify({ link, tx_ref: txRef }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
