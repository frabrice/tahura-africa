import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FLUTTERWAVE_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY") || "";
const FLUTTERWAVE_WEBHOOK_SECRET_HASH = Deno.env.get("FLUTTERWAVE_WEBHOOK_SECRET_HASH") || "";
const FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const STATUS_MAP: Record<string, string> = {
  successful: "completed",
  failed: "failed",
  cancelled: "failed",
};

// Re-verifies a transaction against Flutterwave's own API (never trusts a
// caller-supplied status, webhook body included) and applies the result.
async function verifyAndApply(txRef: string): Promise<{ status: string }> {
  const res = await fetch(
    `${FLUTTERWAVE_BASE_URL}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
    { headers: { "Authorization": `Bearer ${FLUTTERWAVE_SECRET_KEY}` } }
  );

  if (!res.ok) {
    throw new Error(`Status check failed: ${res.status}`);
  }

  const body = await res.json();
  const txData = body?.data;
  let normalizedStatus = STATUS_MAP[txData?.status] || "pending";

  // Defense in depth: even though flutterwave-create-payment now derives the
  // charge amount from the real booking server-side (never from the
  // client), double-check the amount Flutterwave actually processed matches
  // what we recorded for this tx_ref before ever marking a booking paid.
  // A mismatch here would mean something upstream is still trusting a
  // caller-supplied amount — treat it as failed rather than confirm.
  if (normalizedStatus === "completed") {
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("amount, currency")
      .eq("flutterwave_tx_ref", txRef)
      .maybeSingle();

    const expectedAmount = existingPayment ? Number(existingPayment.amount) : null;
    const chargedAmount = Number(txData?.amount);
    const chargedCurrency = txData?.currency;

    if (
      expectedAmount == null ||
      chargedCurrency !== (existingPayment?.currency || "RWF") ||
      Math.abs(chargedAmount - expectedAmount) > 1
    ) {
      normalizedStatus = "failed";
    }
  }

  await supabase
    .from("payments")
    .update({
      status: normalizedStatus,
      flutterwave_transaction_id: txData?.id ? String(txData.id) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("flutterwave_tx_ref", txRef);

  if (normalizedStatus === "completed" || normalizedStatus === "failed") {
    const { data: payment } = await supabase
      .from("payments")
      .select("booking_id")
      .eq("flutterwave_tx_ref", txRef)
      .maybeSingle();

    if (payment?.booking_id) {
      await supabase
        .from("bookings")
        .update(
          normalizedStatus === "completed"
            ? { payment_status: "paid", status: "confirmed" }
            : { payment_status: "failed" }
        )
        .eq("id", payment.booking_id);
    }
  }

  return { status: normalizedStatus };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (!FLUTTERWAVE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Flutterwave is not configured yet." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const verifHash = req.headers.get("verif-hash");

    if (req.method === "POST" && verifHash) {
      // Real Flutterwave webhook — validate the shared secret hash before
      // trusting anything in the body, then re-verify server-to-server.
      if (!FLUTTERWAVE_WEBHOOK_SECRET_HASH || verifHash !== FLUTTERWAVE_WEBHOOK_SECRET_HASH) {
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json().catch(() => ({}));
      const txRef = body?.data?.tx_ref;
      if (!txRef) {
        return new Response(JSON.stringify({ error: "Missing tx_ref" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await verifyAndApply(txRef);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client-driven manual check (post-checkout redirect, or a "check again" button).
    let txRef: string | null = null;
    if (req.method === "GET") {
      txRef = new URL(req.url).searchParams.get("tx_ref");
    } else if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      txRef = body?.tx_ref || null;
    }

    if (!txRef) {
      return new Response(JSON.stringify({ error: "Missing tx_ref" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await verifyAndApply(txRef);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
