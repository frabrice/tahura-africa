import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// InTouch may POST either JSON or url-encoded form data.
async function parseBody(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      return await req.json();
    }
    const text = await req.text();
    const params = new URLSearchParams(text);
    const obj: Record<string, string> = {};
    params.forEach((v, k) => (obj[k] = v));
    // Some callbacks arrive as JSON without the header — try that too.
    if (Object.keys(obj).length === 0 && text.trim().startsWith("{")) {
      return JSON.parse(text);
    }
    return obj;
  } catch {
    return {};
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await parseBody(req);
    const requestId = String(body.requesttransactionid || body.requestTransactionId || "");
    const transactionId = body.transactionid || body.transactionId || null;
    const responseCode = String(body.responsecode ?? body.responseCode ?? "");
    const statusText = String(body.status || body.statusdesc || "");

    if (!requestId) {
      return new Response(JSON.stringify({ message: "missing requesttransactionid", success: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // InTouch success indicators: responsecode 01 / 2001, or a "success" status.
    const isSuccess = ["01", "2001"].includes(responseCode) || /success/i.test(statusText);
    const isFailure = !isSuccess && (/fail|declin|cancel|insufficient|invalid/i.test(statusText) || (!!responseCode && responseCode !== "1000"));

    const { data: payment } = await supabase
      .from("payments")
      .select("id, booking_id")
      .eq("intouch_request_id", requestId)
      .maybeSingle();

    if (payment) {
      if (isSuccess) {
        await supabase
          .from("payments")
          .update({ status: "completed", intouch_transaction_id: transactionId ? String(transactionId) : null, updated_at: new Date().toISOString() })
          .eq("id", payment.id);
        if (payment.booking_id) {
          await supabase.from("bookings").update({ payment_status: "paid", status: "confirmed" }).eq("id", payment.booking_id);
        }
      } else if (isFailure) {
        await supabase
          .from("payments")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", payment.id);
        if (payment.booking_id) {
          await supabase.from("bookings").update({ payment_status: "failed" }).eq("id", payment.booking_id);
        }
      }
      // responsecode 1000 (still pending) → leave as-is.
    }

    // Acknowledge to InTouch.
    return new Response(
      JSON.stringify({ message: "success", success: true, request_id: requestId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ message: err?.message || "error", success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
