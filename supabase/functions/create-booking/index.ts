import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RWF_TO_USD_RATE = 1300;

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function toRad(v: number): number {
  return (v * Math.PI) / 180;
}

// Haversine straight-line distance — used only as a cheap, dependency-free
// lower-bound estimate to sanity-check a client-submitted transport fare.
// Real road distance (which the client computed via OSRM) is legitimately
// longer than this, sometimes considerably — this is deliberately a floor
// check, not an attempt to reproduce the client's number exactly.
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Mirrors src/lib/mobilityService.ts's calculateSurgeMultiplier exactly, so
// the server's floor estimate uses the same rules the client used.
function surgeMultiplier(surgeRules: any): number {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hour = now.getHours();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (surgeRules?.peak_hours?.length) {
    for (const peak of surgeRules.peak_hours) {
      const [start, end] = String(peak).split("-");
      const startHour = parseInt(start.split(":")[0], 10);
      const endHour = parseInt(end.split(":")[0], 10);
      if (hour >= startHour && hour < endHour) return 1.25;
    }
  }
  if (isWeekend && surgeRules?.weekend_multiplier > 1) return surgeRules.weekend_multiplier;
  if ((hour >= 22 || hour < 5) && surgeRules?.night_surcharge > 0) return 1.15;
  return surgeRules?.event_multiplier || 1.0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      booking_type: requestedBookingType,
      item_id,
      guests,
      booking_date,
      duration_days,
      session,
      program_ids,
      guide_id,
      host_id,
      custom_quote_id,
      traveler_name,
      traveler_email,
      traveler_profile_picture,
      special_requests,
      transport,
    } = body;

    if (!guests || !booking_date) {
      return json({ error: "Missing required fields: guests, booking_date" }, 400);
    }

    // Determine the real traveler_id from the caller's own session, never
    // from anything the client claims — a guest checkout (anon key only)
    // gets traveler_id: null, exactly like today.
    let travelerId: string | null = null;
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token) {
      const { data: userData } = await admin.auth.getUser(token);
      if (userData?.user) travelerId = userData.user.id;
    }

    // Live commission rate — read fresh every time, never hardcoded, so
    // changing system_rules takes effect immediately with no deploy.
    const { data: rateRow } = await admin
      .from("system_rules")
      .select("value")
      .eq("category", "financial")
      .eq("name", "Commission Rate")
      .maybeSingle();
    const commissionRate = (Number(rateRow?.value) || 0) / 100;

    let bookingType = requestedBookingType;
    let itemTitle = "";
    let partnerId: string | null = null;
    let institutionId: string | null = null;
    let resolvedHostId: string | null = host_id || null;
    let resolvedGuideId: string | null = guide_id || null;
    let packageName: string | null = null;
    let guideName: string | null = null;
    let subtotal = 0;
    let serviceFee = 0;
    let entryFeeAmount = 0;
    let tipAmount = 0;
    let programRowsForInsert: { program_id: string; program_title: string; price_snapshot: number; is_free: boolean }[] = [];

    if (custom_quote_id) {
      const { data: quote, error: quoteErr } = await admin
        .from("custom_quotes")
        .select("quote_type, title, client_total, partner_id, host_id, guide_id")
        .eq("id", custom_quote_id)
        .maybeSingle();
      if (quoteErr || !quote) return json({ error: "Quote not found" }, 404);

      bookingType = quote.quote_type;
      itemTitle = quote.title;
      partnerId = quote.partner_id;
      resolvedHostId = quote.host_id;
      resolvedGuideId = quote.guide_id;
      subtotal = Number(quote.client_total);
      serviceFee = 0; // Matches QuotePage.tsx's existing behavior — commission was already accounted for when the quote's net_amount/client_total were set.
    } else if (bookingType === "attraction") {
      if (!item_id) return json({ error: "Missing item_id for attraction booking" }, 400);

      const { data: institution, error: instErr } = await admin
        .from("institution_profiles")
        .select("portal_user_id, name, entry_fee_amount, entry_fee_is_free")
        .eq("portal_user_id", item_id)
        .maybeSingle();
      if (instErr || !institution) return json({ error: "Attraction not found" }, 404);

      institutionId = item_id;
      itemTitle = institution.name;
      entryFeeAmount = institution.entry_fee_is_free ? 0 : Number(institution.entry_fee_amount || 0);

      const programIds: string[] = Array.isArray(program_ids) ? program_ids : [];
      if (programIds.length > 0) {
        const { data: programs, error: progErr } = await admin
          .from("programs")
          .select("id, title, price_per_person")
          .in("id", programIds)
          .eq("portal_user_id", item_id);
        if (progErr) return json({ error: "Failed to load programs" }, 500);
        if (!programs || programs.length !== programIds.length) {
          return json({ error: "One or more selected programs are invalid for this attraction" }, 400);
        }
        programRowsForInsert = programs.map((p: any) => ({
          program_id: p.id,
          program_title: p.title,
          price_snapshot: Number(p.price_per_person),
          is_free: Number(p.price_per_person) === 0,
        }));
        packageName = programs.map((p: any) => p.title).join(", ");
      }
      const programsSubtotal = programRowsForInsert.reduce((sum, p) => sum + p.price_snapshot * Number(guests), 0);

      if (resolvedGuideId) {
        const { data: guide } = await admin.from("guides").select("id, name, tip").eq("id", resolvedGuideId).maybeSingle();
        if (!guide) return json({ error: "Selected guide not found" }, 400);
        guideName = guide.name;
        tipAmount = Number(guide.tip || 0);
      }

      subtotal = entryFeeAmount + programsSubtotal + tipAmount;
      serviceFee = round2(subtotal * commissionRate);
    } else if (["experience", "homestay", "itinerary"].includes(bookingType)) {
      if (!item_id) return json({ error: "Missing item_id for listing booking" }, 400);

      const { data: listing, error: listErr } = await admin
        .from("partner_listings")
        .select("id, title, listing_type, pricing, host_id, partner_id")
        .eq("id", item_id)
        .maybeSingle();
      if (listErr || !listing) return json({ error: "Listing not found" }, 404);
      if (listing.listing_type !== bookingType) {
        return json({ error: "booking_type does not match the referenced listing" }, 400);
      }

      itemTitle = listing.title;
      const basePrice = Number(listing.pricing?.base_price || 0);
      subtotal = basePrice * Number(guests);
      serviceFee = Math.round(subtotal * commissionRate);

      // Host implies partner — re-derive server-side rather than trust the
      // client's resolved partner id, same invariant the rest of the app
      // already enforces (HostPicker never lets partner be set independently).
      if (resolvedHostId) {
        const { data: hostRow } = await admin.from("partner_hosts").select("partner_id").eq("id", resolvedHostId).maybeSingle();
        partnerId = hostRow?.partner_id ?? null;
      } else {
        partnerId = listing.partner_id;
      }
    } else {
      return json({ error: "Invalid or missing booking_type" }, 400);
    }

    // Transport: validated, not trusted outright. The client's route distance
    // comes from a live OSRM call this function doesn't repeat — instead it
    // computes a cheap straight-line floor and rejects only if the client's
    // submitted fare is implausibly low for that floor (the actual tampering
    // risk), leaving normal routing/timing variance alone.
    let transportUsd = 0;
    let transportInsert: Record<string, unknown> | null = null;
    if (transport?.zone_id && transport?.pickup?.lat != null && transport?.dropoff?.lat != null) {
      const { data: zone } = await admin.from("transport_zones").select("*").eq("id", transport.zone_id).maybeSingle();
      if (!zone) return json({ error: "Invalid transport zone" }, 400);

      const distanceKm = haversineKm(transport.pickup.lat, transport.pickup.lng, transport.dropoff.lat, transport.dropoff.lng);
      const distanceFare = distanceKm * Number(zone.per_km_rate);
      let floorSubtotal = Number(zone.base_fare) + distanceFare;
      if (floorSubtotal < Number(zone.min_fare)) floorSubtotal = Number(zone.min_fare);
      const surge = surgeMultiplier(zone.surge_rules);
      const isRoundtrip = transport.is_roundtrip !== false;
      const floorFareRwf = isRoundtrip ? floorSubtotal * surge * 2 : floorSubtotal * surge;

      const clientTotalFareRwf = Number(transport.client_total_fare || 0);
      if (clientTotalFareRwf < floorFareRwf * 0.75) {
        return json({ error: "Transport fare could not be validated — please recalculate and try again." }, 400);
      }

      transportUsd = Math.round(clientTotalFareRwf / RWF_TO_USD_RATE);
      transportInsert = {
        transport_type: isRoundtrip ? "roundtrip" : "one_way",
        pickup_location: { name: transport.pickup.label || "", address: "", coordinates: { lat: transport.pickup.lat, lng: transport.pickup.lng }, landmark: "" },
        dropoff_location: { name: transport.dropoff.label || "", address: "", coordinates: { lat: transport.dropoff.lat, lng: transport.dropoff.lng }, landmark: "" },
        scheduled_pickup_time: new Date(`${booking_date}T00:00:00`).toISOString(),
        distance_km: Number(transport.client_distance_km) || round2(distanceKm),
        base_fare: Number(zone.base_fare),
        total_fare: round2(clientTotalFareRwf),
        surge_multiplier: surge,
        status: "pending_dispatch",
      };
    }

    const totalAmount = round2(subtotal + serviceFee + transportUsd);
    const bookingRef = `BK-${Math.floor(100000 + Math.random() * 900000)}`;

    const { data: bookingData, error: insertError } = await admin
      .from("bookings")
      .insert({
        booking_ref: bookingRef,
        traveler_id: travelerId,
        traveler_name: traveler_name || "Guest",
        traveler_email: traveler_email || "guest@example.com",
        traveler_profile_picture: traveler_profile_picture || "",
        booking_type: bookingType,
        item_id: custom_quote_id ? null : (institutionId || item_id || null),
        item_title: itemTitle,
        partner_id: partnerId,
        institution_id: institutionId,
        host_id: resolvedHostId,
        guide_id: resolvedGuideId,
        program_id: programRowsForInsert[0]?.program_id || null,
        package_name: packageName,
        guide_name: guideName,
        booking_date,
        duration_days: duration_days || null,
        guests,
        session: session || null,
        subtotal,
        service_fee: serviceFee,
        total_amount: totalAmount,
        entry_fee_amount: entryFeeAmount,
        tip_amount: tipAmount,
        special_requests: special_requests || "",
        custom_quote_id: custom_quote_id || null,
        status: totalAmount > 0 ? "pending" : "confirmed",
        payment_status: totalAmount > 0 ? "pending" : "paid",
      })
      .select()
      .single();

    if (insertError || !bookingData) {
      return json({ error: insertError?.message || "Failed to create booking" }, 500);
    }

    if (programRowsForInsert.length > 0) {
      await admin.from("booking_programs").insert(
        programRowsForInsert.map((p) => ({ booking_id: bookingData.id, ...p }))
      );
    }

    if (transportInsert) {
      const { data: transportRow } = await admin
        .from("transports")
        .insert({ ...transportInsert, booking_id: bookingData.id })
        .select("id")
        .single();
      if (transportRow) {
        await admin.from("bookings").update({ transport_requested: true, transport_id: transportRow.id }).eq("id", bookingData.id);
      }
    }

    return json({
      booking_id: bookingData.id,
      booking_ref: bookingRef,
      subtotal,
      service_fee: serviceFee,
      total_amount: totalAmount,
      status: bookingData.status,
      payment_status: bookingData.payment_status,
    });
  } catch (err: any) {
    return json({ error: err?.message || "Internal server error" }, 500);
  }
});
