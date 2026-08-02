import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// InTouch (IntouchPay) credentials — set these as Supabase secrets:
//   INTOUCH_USERNAME, INTOUCH_ACCOUNT_NO, INTOUCH_PARTNER_PASSWORD
// The test set from their docs is username "testa", accountno "250160000011",
// partnerpassword "pass123456789".
const INTOUCH_USERNAME = Deno.env.get("INTOUCH_USERNAME") || "";
const INTOUCH_ACCOUNT_NO = Deno.env.get("INTOUCH_ACCOUNT_NO") || "";
const INTOUCH_PARTNER_PASSWORD = Deno.env.get("INTOUCH_PARTNER_PASSWORD") || "";
const INTOUCH_BASE_URL = Deno.env.get("INTOUCH_BASE_URL") || "https://www.intouchpay.co.rw/api";
// Booking totals are stored in USD; InTouch charges RWF. Set the rate you want
// to bill at (defaults to a placeholder — confirm before going live).
const USD_TO_RWF = Number(Deno.env.get("INTOUCH_USD_TO_RWF") || "1300");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// yyyymmddhhmmss in UTC
function intouchTimestamp(): string {
  const d = new Date();
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return (
    d.getUTCFullYear() +
    p(d.getUTCMonth() + 1) +
    p(d.getUTCDate()) +
    p(d.getUTCHours()) +
    p(d.getUTCMinutes()) +
    p(d.getUTCSeconds())
  );
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Normalise a Rwandan number to the 2507******** form InTouch expects.
function normalisePhone(raw: string): string {
  const p = (raw || "").replace(/\D/g, "");
  if (p.startsWith("250")) return p;
  if (p.startsWith("0")) return "250" + p.slice(1);
  if (p.length === 9) return "250" + p; // 78xxxxxxx
  return p;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { booking_id, booking_ref, amount_usd, mobile_phone, network } = await req.json();

    if (!booking_id || !booking_ref || !amount_usd || !mobile_phone) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: booking_id, booking_ref, amount_usd, mobile_phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!INTOUCH_USERNAME || !INTOUCH_ACCOUNT_NO || !INTOUCH_PARTNER_PASSWORD) {
      return new Response(
        JSON.stringify({ error: "Mobile money is not configured yet. Please set the InTouch credentials." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const timestamp = intouchTimestamp();
    const password = await sha256Hex(
      INTOUCH_USERNAME + INTOUCH_ACCOUNT_NO + INTOUCH_PARTNER_PASSWORD + timestamp
    );
    const requestTransactionId = `${booking_ref}-${Date.now()}`.replace(/[^A-Za-z0-9-]/g, "");
    const amountRwf = Math.max(1, Math.round(Number(amount_usd) * USD_TO_RWF));
    const callbackUrl = `${SUPABASE_URL}/functions/v1/intouch-callback`;

    const body = {
      username: INTOUCH_USERNAME,
      timestamp,
      amount: amountRwf,
      password,
      mobilephone: normalisePhone(mobile_phone),
      requesttransactionid: requestTransactionId,
      accountno: INTOUCH_ACCOUNT_NO,
      callbackurl: callbackUrl,
    };

    const res = await fetch(`${INTOUCH_BASE_URL}/requestpayment/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    // InTouch returns success=true with responsecode "1000" (Pending) once the
    // subscriber has been prompted on their phone.
    const pending = data?.success === true || String(data?.responsecode) === "1000";

    if (!res.ok || !pending) {
      return new Response(
        JSON.stringify({
          error: data?.message || "Mobile money request was declined. Please check the number and try again.",
          responsecode: data?.responsecode ?? null,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record the pending payment; the callback flips it to completed/failed.
    await supabase.from("payments").insert({
      booking_id,
      booking_ref,
      provider: "intouch",
      intouch_request_id: requestTransactionId,
      intouch_transaction_id: data?.transactionid ? String(data.transactionid) : null,
      amount: amountRwf,
      currency: "RWF",
      status: "pending",
      mobile_phone: normalisePhone(mobile_phone),
      requested_payment_method: network || "mobile_money",
      description: `InTouch ${network || "mobile money"} for ${booking_ref}`,
    });

    await supabase.from("bookings").update({ payment_status: "pending" }).eq("id", booking_id);

    return new Response(
      JSON.stringify({
        success: true,
        request_transaction_id: requestTransactionId,
        transaction_id: data?.transactionid ?? null,
        amount_rwf: amountRwf,
        status: "pending",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
