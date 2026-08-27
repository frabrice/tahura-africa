import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BRAND = {
  name: "Tahura Africa",
  logo: "https://res.cloudinary.com/dbhyrnypc/image/upload/v1773380061/Tahura_Africa_Logo_edited_again_v8rxtm.png",
  primaryColor: "#EA580C",
  primaryDark: "#C2410C",
  accentColor: "#E39A0B",
  bgColor: "#F5F0E7",
  cardBg: "#FCF9F3",
  textDark: "#241F19",
  textMuted: "#78715F",
  textLight: "#A8A093",
  borderColor: "#E6DDCD",
  successColor: "#059669",
  warningColor: "#d97706",
  errorColor: "#dc2626",
  fromEmail: "Tahura Africa <admin@tahuraafrica.com>",
  replyTo: "tahuraafrica@gmail.com",
  address: "Kigali, Rwanda",
  email1: "tahuraafrica@gmail.com",
  email2: "admin@tahuraafrica.com",
  phone: "0780849228",
  website: "https://tahuraafrica.com",
};

function baseLayout(title: string, preheader: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${BRAND.bgColor}; color: ${BRAND.textDark}; width: 100%; height: 100%; margin: 0; padding: 0; }
    a { color: ${BRAND.primaryColor}; text-decoration: none; }
    .preheader { display: none !important; visibility: hidden; mso-hide: all; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bgColor};">
  <span class="preheader">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bgColor};padding:0;margin:0;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="padding:32px 40px 24px;text-align:center;background:linear-gradient(135deg, ${BRAND.primaryColor} 0%, ${BRAND.primaryDark} 100%);border-radius:16px 16px 0 0;">
              <img src="${BRAND.logo}" alt="Tahura Africa" width="160" height="auto" style="display:inline-block;max-width:160px;height:auto;" />
              <div style="margin-top:8px;height:2px;width:60px;background-color:${BRAND.accentColor};margin-left:auto;margin-right:auto;border-radius:1px;"></div>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background-color:${BRAND.cardBg};padding:40px 40px 32px;">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#0f172a;padding:32px 40px;border-radius:0 0 16px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align:center;padding-bottom:20px;">
                    <img src="${BRAND.logo}" alt="Tahura Africa" width="100" height="auto" style="display:inline-block;max-width:100px;height:auto;opacity:0.9;" />
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center;padding-bottom:16px;border-bottom:1px solid #1e293b;">
                    <p style="font-size:13px;color:#94a3b8;line-height:1.6;margin:0;">
                      ${BRAND.address}<br>
                      <a href="mailto:${BRAND.email1}" style="color:${BRAND.accentColor};">${BRAND.email1}</a> &nbsp;|&nbsp;
                      <a href="mailto:${BRAND.email2}" style="color:${BRAND.accentColor};">${BRAND.email2}</a><br>
                      Tel: <a href="tel:+250780849228" style="color:#94a3b8;">${BRAND.phone}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center;padding-top:16px;">
                    <p style="font-size:11px;color:#475569;line-height:1.5;margin:0;">
                      &copy; ${new Date().getFullYear()} Tahura Africa. All rights reserved.<br>
                      You received this email because of your account activity on Tahura Africa.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h1 style="font-family:'DM Sans',sans-serif;font-size:24px;font-weight:700;color:${BRAND.textDark};margin:0 0 8px;line-height:1.3;">${text}</h1>`;
}

function subtext(text: string): string {
  return `<p style="font-size:15px;color:${BRAND.textMuted};line-height:1.6;margin:0 0 24px;">${text}</p>`;
}

function divider(): string {
  return `<div style="height:1px;background-color:${BRAND.borderColor};margin:24px 0;"></div>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;font-size:14px;color:${BRAND.textMuted};width:140px;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;font-size:14px;font-weight:600;color:${BRAND.textDark};text-align:right;">${value}</td>
  </tr>`;
}

function detailsCard(rows: string): string {
  return `<div style="background-color:#f8fafc;border:1px solid ${BRAND.borderColor};border-radius:12px;padding:24px;margin:24px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${rows}
    </table>
  </div>`;
}

function statusBadge(text: string, color: string): string {
  const bgMap: Record<string, string> = {
    green: "#ecfdf5",
    red: "#fef2f2",
    amber: "#fffbeb",
    blue: "#eff6ff",
    gray: "#f8fafc",
  };
  const textMap: Record<string, string> = {
    green: "#059669",
    red: "#dc2626",
    amber: "#d97706",
    blue: "#2563eb",
    gray: "#64748b",
  };
  return `<span style="display:inline-block;background-color:${bgMap[color] || bgMap.gray};color:${textMap[color] || textMap.gray};font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;letter-spacing:0.3px;">${text}</span>`;
}

function iconCircle(emoji: string, bgColor: string): string {
  return `<div style="width:56px;height:56px;border-radius:50%;background-color:${bgColor};display:inline-block;text-align:center;line-height:56px;font-size:24px;margin-bottom:16px;">${emoji}</div>`;
}

function signoff(): string {
  return `<p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;margin-top:24px;">
    Warm regards,<br>
    <strong style="color:${BRAND.textDark};">The Tahura Africa Team</strong>
  </p>`;
}

function ctaButton(text: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px auto 24px;">
    <tr>
      <td align="center" style="border-radius:10px;background:linear-gradient(135deg, ${BRAND.primaryColor} 0%, ${BRAND.primaryDark} 100%);">
        <a href="${href}" target="_blank" style="display:inline-block;padding:14px 34px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${text}</a>
      </td>
    </tr>
  </table>`;
}

// ============ TEMPLATES ============

function bookingConfirmationTraveler(data: Record<string, any>): { subject: string; html: string } {
  const subject = `Booking Confirmed - ${data.booking_ref}`;
  const dateStr = new Date(data.booking_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const rows = [
    detailRow("Reference", `<span style="font-weight:700;color:${BRAND.primaryColor};">${data.booking_ref}</span>`),
    detailRow(data.booking_type === "attraction" ? "Attraction" : data.booking_type === "homestay" ? "Homestay" : "Experience", data.item_title),
    detailRow("Date", dateStr),
    data.session ? detailRow("Session", data.session) : "",
    data.package_name ? detailRow("Package", data.package_name) : "",
    data.guide_name ? detailRow("Guide", data.guide_name) : "",
    detailRow("Guests", String(data.guests)),
    `<tr><td colspan="2" style="padding:12px 0 8px;"><div style="height:1px;background:${BRAND.borderColor};"></div></td></tr>`,
    detailRow("Subtotal", `$${data.subtotal}`),
    detailRow("Service Fee", `$${data.service_fee}`),
    `<tr>
      <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:${BRAND.textDark};">Total Paid</td>
      <td style="padding:12px 0 0;font-size:20px;font-weight:700;color:${BRAND.primaryColor};text-align:right;">$${data.total_amount}</td>
    </tr>`,
  ].join("");

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#10003;", "#ecfdf5")}
      ${heading("Booking Confirmed!")}
      ${subtext(`Hi ${data.traveler_name}, your booking has been confirmed and is all set.`)}
    </div>
    ${detailsCard(rows)}
    ${data.special_requests ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;margin-bottom:16px;">
      <p style="font-size:12px;font-weight:600;color:#92400e;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px;">Special Requests</p>
      <p style="font-size:14px;color:#78350f;margin:0;line-height:1.5;">${data.special_requests}</p>
    </div>` : ""}
    <div style="background:#FBEADF;border:1px solid #F5D3B8;border-radius:10px;padding:16px;margin-bottom:4px;">
      <p style="font-size:13px;color:#B8420A;margin:0;line-height:1.5;">
        ${data.booking_type === "attraction" ? "Please arrive 15 minutes before your scheduled time." : "Your host will be expecting you on the date above."}
        If you need to make changes, please contact us through our support page.
      </p>
    </div>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, `Your booking ${data.booking_ref} is confirmed`, content) };
}

function newBookingHost(data: Record<string, any>): { subject: string; html: string } {
  const subject = `New Booking Received - ${data.booking_ref}`;
  const dateStr = new Date(data.booking_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const rows = [
    detailRow("Reference", `<span style="font-weight:700;color:${BRAND.primaryColor};">${data.booking_ref}</span>`),
    detailRow("Traveler", data.traveler_name),
    detailRow("Email", data.traveler_email),
    detailRow("Listing", data.item_title),
    detailRow("Date", dateStr),
    data.session ? detailRow("Session", data.session) : "",
    detailRow("Guests", String(data.guests)),
    detailRow("Total Amount", `$${data.total_amount}`),
  ].join("");

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#128276;", "#eff6ff")}
      ${heading("New Booking Received")}
      ${subtext(`You have a new booking from <strong>${data.traveler_name}</strong> for <strong>${data.item_title}</strong>.`)}
    </div>
    ${detailsCard(rows)}
    ${data.special_requests ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;margin-bottom:16px;">
      <p style="font-size:12px;font-weight:600;color:#92400e;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px;">Special Requests from Traveler</p>
      <p style="font-size:14px;color:#78350f;margin:0;line-height:1.5;">${data.special_requests}</p>
    </div>` : ""}
    <div style="background:#FBEADF;border:1px solid #F5D3B8;border-radius:10px;padding:16px;">
      <p style="font-size:13px;color:#B8420A;margin:0;line-height:1.5;">
        This booking is automatically confirmed. Please ensure everything is ready for the guest on the scheduled date.
      </p>
    </div>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, `New booking from ${data.traveler_name}`, content) };
}

function newBookingGuide(data: Record<string, any>): { subject: string; html: string } {
  const subject = `New Tour Booking - ${data.booking_ref}`;
  const dateStr = new Date(data.booking_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const rows = [
    detailRow("Reference", `<span style="font-weight:700;color:${BRAND.primaryColor};">${data.booking_ref}</span>`),
    detailRow("Traveler", data.traveler_name),
    detailRow("Attraction", data.item_title),
    data.package_name ? detailRow("Program", data.package_name) : "",
    detailRow("Date", dateStr),
    detailRow("Group Size", `${data.guests} visitor${data.guests > 1 ? "s" : ""}`),
  ].join("");

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#127963;", "#fef3c7")}
      ${heading("New Tour Booking")}
      ${subtext(`Hi ${data.guide_name || "Guide"}, you have been assigned a new tour booking.`)}
    </div>
    ${detailsCard(rows)}
    ${data.special_requests ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;margin-bottom:16px;">
      <p style="font-size:12px;font-weight:600;color:#92400e;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px;">Special Requests</p>
      <p style="font-size:14px;color:#78350f;margin:0;line-height:1.5;">${data.special_requests}</p>
    </div>` : ""}
    <div style="background:#FBEADF;border:1px solid #F5D3B8;border-radius:10px;padding:16px;">
      <p style="font-size:13px;color:#B8420A;margin:0;line-height:1.5;">
        Please prepare for this tour accordingly. The traveler may message you through the platform to discuss details.
      </p>
    </div>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, `New tour booking assigned to you`, content) };
}

function newMessageNotification(data: Record<string, any>): { subject: string; html: string } {
  const subject = `New Message from ${data.sender_name}`;
  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#128172;", "#eff6ff")}
      ${heading("New Message")}
      ${subtext(`You have a new message from <strong>${data.sender_name}</strong> regarding <strong>${data.listing_title || "your booking"}</strong>.`)}
    </div>
    <div style="background:#f8fafc;border-left:4px solid ${BRAND.primaryColor};border-radius:0 10px 10px 0;padding:20px;margin:24px 0;">
      <p style="font-size:14px;color:${BRAND.textDark};line-height:1.6;margin:0;font-style:italic;">
        "${data.message_preview || "..."}"
      </p>
      <p style="font-size:12px;color:${BRAND.textLight};margin:8px 0 0;">
        &mdash; ${data.sender_name}
      </p>
    </div>
    <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;margin:0 0 8px;">
      Log in to your dashboard to read the full message and reply.
    </p>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, `${data.sender_name} sent you a message`, content) };
}

function reviewReceivedHost(data: Record<string, any>): { subject: string; html: string } {
  const subject = `New Review on ${data.listing_title}`;
  const stars = "&#9733;".repeat(data.rating) + "&#9734;".repeat(5 - data.rating);

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#11088;", "#fef3c7")}
      ${heading("New Review Received")}
      ${subtext(`A traveler has left a review on your listing <strong>${data.listing_title}</strong>.`)}
    </div>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
      <div style="font-size:28px;letter-spacing:4px;margin-bottom:8px;color:#f59e0b;">${stars}</div>
      <p style="font-size:18px;font-weight:700;color:${BRAND.textDark};margin:0;">${data.rating} out of 5</p>
    </div>
    ${data.review_text ? `<div style="background:#f8fafc;border-left:4px solid ${BRAND.accentColor};border-radius:0 10px 10px 0;padding:20px;margin:0 0 24px;">
      <p style="font-size:14px;color:${BRAND.textDark};line-height:1.6;margin:0;font-style:italic;">"${data.review_text}"</p>
      <p style="font-size:12px;color:${BRAND.textLight};margin:8px 0 0;">&mdash; ${data.reviewer_name}</p>
    </div>` : ""}
    <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;">
      Reviews help build trust with future travelers. Thank you for providing great experiences!
    </p>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, `${data.reviewer_name} reviewed ${data.listing_title}`, content) };
}

function reviewReceivedGuide(data: Record<string, any>): { subject: string; html: string } {
  const subject = `New Guide Review - ${data.rating}/5 Stars`;
  const stars = "&#9733;".repeat(data.rating) + "&#9734;".repeat(5 - data.rating);

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#11088;", "#fef3c7")}
      ${heading("You Received a Review")}
      ${subtext(`A traveler has rated your guiding services${data.program_name ? ` for <strong>${data.program_name}</strong>` : ""}.`)}
    </div>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
      <div style="font-size:28px;letter-spacing:4px;margin-bottom:8px;color:#f59e0b;">${stars}</div>
      <p style="font-size:18px;font-weight:700;color:${BRAND.textDark};margin:0;">${data.rating} out of 5</p>
    </div>
    ${data.review_text ? `<div style="background:#f8fafc;border-left:4px solid ${BRAND.accentColor};border-radius:0 10px 10px 0;padding:20px;margin:0 0 24px;">
      <p style="font-size:14px;color:${BRAND.textDark};line-height:1.6;margin:0;font-style:italic;">"${data.review_text}"</p>
      <p style="font-size:12px;color:${BRAND.textLight};margin:8px 0 0;">&mdash; ${data.reviewer_name}</p>
    </div>` : ""}
    <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;">
      Your reviews help you get more bookings. Keep up the great work guiding travelers through amazing experiences!
    </p>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, `You received a ${data.rating}-star review`, content) };
}

function travelerReviewReceived(data: Record<string, any>): { subject: string; html: string } {
  const subject = `You Received a Review from Your ${data.reviewer_type === "host" ? "Host" : "Guide"}`;
  const stars = "&#9733;".repeat(data.rating) + "&#9734;".repeat(5 - data.rating);

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#11088;", "#fef3c7")}
      ${heading("New Review About You")}
      ${subtext(`Your ${data.reviewer_type === "host" ? "host" : "guide"} <strong>${data.reviewer_name}</strong> has left a review about your visit.`)}
    </div>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
      <div style="font-size:28px;letter-spacing:4px;margin-bottom:8px;color:#f59e0b;">${stars}</div>
      <p style="font-size:18px;font-weight:700;color:${BRAND.textDark};margin:0;">${data.rating} out of 5</p>
    </div>
    ${data.review_text ? `<div style="background:#f8fafc;border-left:4px solid ${BRAND.accentColor};border-radius:0 10px 10px 0;padding:20px;margin:0 0 24px;">
      <p style="font-size:14px;color:${BRAND.textDark};line-height:1.6;margin:0;font-style:italic;">"${data.review_text}"</p>
      <p style="font-size:12px;color:${BRAND.textLight};margin:8px 0 0;">&mdash; ${data.reviewer_name}</p>
    </div>` : ""}
    <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;">
      Good reviews from hosts and guides help build your traveler reputation on Tahura Africa. Thank you for being a great guest!
    </p>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, `${data.reviewer_name} reviewed you`, content) };
}

function contentFlagged(data: Record<string, any>): { subject: string; html: string } {
  const typeLabel = data.target_type === "listing" ? "Listing" : "Attraction";
  const subject = `Action Required: Your ${typeLabel} Has Been Flagged`;

  const severityColor: Record<string, string> = {
    minor: "amber",
    major: "red",
    policy_violation: "red",
  };
  const color = severityColor[data.severity] || "amber";

  const rows = [
    detailRow(typeLabel, data.target_title),
    detailRow("Severity", statusBadge(data.severity.replace("_", " ").toUpperCase(), color)),
    detailRow("Status", statusBadge("ACTION REQUIRED", "red")),
  ].join("");

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#9888;", "#fef2f2")}
      ${heading(`${typeLabel} Flagged`)}
      ${subtext(`Your ${typeLabel.toLowerCase()} <strong>"${data.target_title}"</strong> has been flagged by our quality assurance team.`)}
    </div>
    ${detailsCard(rows)}
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:20px;margin:24px 0;">
      <p style="font-size:12px;font-weight:600;color:#991b1b;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Reason</p>
      <p style="font-size:14px;color:#7f1d1d;margin:0;line-height:1.6;">${data.reason}</p>
    </div>
    <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;">
      Please review the issue and make necessary changes to your ${typeLabel.toLowerCase()}. If you believe this was flagged in error, contact our support team.
    </p>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, `Your ${typeLabel.toLowerCase()} has been flagged`, content) };
}

function contentResolved(data: Record<string, any>): { subject: string; html: string } {
  const typeLabel = data.target_type === "listing" ? "Listing" : "Attraction";
  const subject = `Flag Resolved: ${data.target_title}`;

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#10003;", "#ecfdf5")}
      ${heading("Flag Resolved")}
      ${subtext(`The flag on your ${typeLabel.toLowerCase()} <strong>"${data.target_title}"</strong> has been resolved.`)}
    </div>
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:20px;margin:24px 0;text-align:center;">
      <p style="font-size:14px;color:#065f46;margin:0;font-weight:600;">
        Your ${typeLabel.toLowerCase()} is now back in good standing.
      </p>
    </div>
    <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;">
      Thank you for addressing the issue promptly. Your ${typeLabel.toLowerCase()} is visible to travelers again.
    </p>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, `Flag on ${data.target_title} has been resolved`, content) };
}

function contentRemoved(data: Record<string, any>): { subject: string; html: string } {
  const typeLabel = data.target_type === "listing" ? "Listing" : "Attraction";
  const subject = `${typeLabel} Removed: ${data.target_title}`;

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#10060;", "#fef2f2")}
      ${heading(`${typeLabel} Removed`)}
      ${subtext(`Your ${typeLabel.toLowerCase()} <strong>"${data.target_title}"</strong> has been removed from the platform by our operations team.`)}
    </div>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:20px;margin:24px 0;">
      <p style="font-size:12px;font-weight:600;color:#991b1b;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Reason for Removal</p>
      <p style="font-size:14px;color:#7f1d1d;margin:0;line-height:1.6;">${data.reason || "Policy violation or quality standards not met."}</p>
    </div>
    <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;">
      If you have questions or would like to appeal this decision, please contact our support team at <a href="mailto:${BRAND.email1}" style="color:${BRAND.primaryColor};font-weight:600;">${BRAND.email1}</a>.
    </p>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, `Your ${typeLabel.toLowerCase()} has been removed`, content) };
}

function supportTicketConfirmation(data: Record<string, any>): { subject: string; html: string } {
  const subject = `Support Ticket Received: ${data.subject}`;

  const rows = [
    detailRow("Subject", data.subject),
    detailRow("Category", data.category.charAt(0).toUpperCase() + data.category.slice(1)),
    detailRow("Priority", statusBadge(data.priority.toUpperCase(), data.priority === "high" ? "red" : data.priority === "medium" ? "amber" : "gray")),
    detailRow("Status", statusBadge("OPEN", "blue")),
  ].join("");

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#128233;", "#eff6ff")}
      ${heading("Ticket Received")}
      ${subtext(`Hi ${data.created_by_name}, we have received your support ticket and our team will review it shortly.`)}
    </div>
    ${detailsCard(rows)}
    <div style="background:#f8fafc;border-left:4px solid ${BRAND.primaryColor};border-radius:0 10px 10px 0;padding:20px;margin:0 0 24px;">
      <p style="font-size:12px;font-weight:600;color:${BRAND.textMuted};margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Your Message</p>
      <p style="font-size:14px;color:${BRAND.textDark};line-height:1.6;margin:0;">${data.description}</p>
    </div>
    <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;">
      You can track the status of your ticket from the "My Tickets" section. We typically respond within 24 hours.
    </p>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, `We received your support ticket`, content) };
}

function supportTicketStatusUpdate(data: Record<string, any>): { subject: string; html: string } {
  const subject = `Ticket Update: ${data.subject}`;
  const statusColor: Record<string, string> = {
    open: "blue",
    in_progress: "amber",
    resolved: "green",
    closed: "gray",
  };

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#128260;", "#eff6ff")}
      ${heading("Ticket Status Updated")}
      ${subtext(`Your support ticket <strong>"${data.subject}"</strong> has been updated.`)}
    </div>
    <div style="text-align:center;margin:24px 0;">
      <p style="font-size:12px;color:${BRAND.textLight};margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Current Status</p>
      ${statusBadge(data.new_status.replace("_", " ").toUpperCase(), statusColor[data.new_status] || "gray")}
    </div>
    ${data.response_message ? `<div style="background:#FBEADF;border:1px solid #F5D3B8;border-radius:10px;padding:20px;margin:24px 0;">
      <p style="font-size:12px;font-weight:600;color:#B8420A;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Response from Support</p>
      <p style="font-size:14px;color:#134e4a;line-height:1.6;margin:0;">${data.response_message}</p>
    </div>` : ""}
    <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;">
      ${data.new_status === "resolved" ? "If you're satisfied with the resolution, no further action is needed. Otherwise, you can reopen the ticket from your dashboard." : "We're working on your request. You'll be notified of any further updates."}
    </p>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, `Your ticket status is now: ${data.new_status}`, content) };
}

function supportTicketReply(data: Record<string, any>): { subject: string; html: string } {
  const subject = `New reply on your ticket: ${data.subject}`;

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#128172;", "#eff6ff")}
      ${heading("Support Replied")}
      ${subtext(`Our team replied to your ticket <strong>"${data.subject}"</strong>${data.ticket_ref ? ` (${data.ticket_ref})` : ""}.`)}
    </div>
    <div style="background:#FBEADF;border:1px solid #F5D3B8;border-radius:10px;padding:20px;margin:24px 0;">
      <p style="font-size:12px;font-weight:600;color:#B8420A;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Reply</p>
      <p style="font-size:14px;color:#134e4a;line-height:1.6;margin:0;">${data.message_text}</p>
    </div>
    <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;">
      Reply from the "My Tickets" section of your account, or in the chat widget if that's where this conversation started.
    </p>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, "Support replied to your ticket", content) };
}

function supportTicketClosed(data: Record<string, any>): { subject: string; html: string } {
  const subject = `Ticket resolved: ${data.subject}`;

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#9989;", "#f0fdf4")}
      ${heading("Ticket Resolved")}
      ${subtext(`Your ticket <strong>"${data.subject}"</strong>${data.ticket_ref ? ` (${data.ticket_ref})` : ""} has been resolved and closed. A full copy of the conversation is attached as a PDF for your records.`)}
    </div>
    <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;text-align:center;">
      Need anything else? Just start a new conversation any time from the chat icon on the site.
    </p>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, "Your ticket has been resolved", content) };
}

function accountCreated(data: Record<string, any>): { subject: string; html: string } {
  const portalLabels: Record<string, string> = {
    partner: "Partner Console",
    institution: "Institution Platform",
    government: "Government Portal",
  };
  const portalLabel = portalLabels[data.portal_type] || "Portal";
  const subject = `Welcome to Tahura Africa - Your ${portalLabel} Account`;

  const rows = [
    detailRow("Portal", portalLabel),
    detailRow("User ID", `<span style="font-family:monospace;font-weight:700;color:${BRAND.primaryColor};">${data.user_id_code}</span>`),
    detailRow("Email", data.email),
    detailRow("Temp Password", `<span style="font-family:monospace;background:#fef3c7;padding:2px 8px;border-radius:4px;color:#92400e;">${data.password}</span>`),
  ].join("");

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#127881;", "#ecfdf5")}
      ${heading(`Welcome to ${BRAND.name}`)}
      ${subtext(`${data.name ? `Hi ${data.name}, your` : "Your"} <strong>${portalLabel}</strong> account has been created and is ready to use.`)}
    </div>
    ${detailsCard(rows)}
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;margin:0 0 24px;">
      <p style="font-size:13px;color:#991b1b;margin:0;line-height:1.5;">
        <strong>Important:</strong> Please save your credentials securely and change your password after your first login. Do not share these details with anyone.
      </p>
    </div>
    <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;">
      You can access your portal by navigating to the ${portalLabel} login page. If you need help getting started, our support team is here to assist.
    </p>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, `Your ${portalLabel} account is ready`, content) };
}

function portalInvite(data: Record<string, any>): { subject: string; html: string } {
  const portalLabels: Record<string, string> = {
    partner: "Partner Console",
    operations: "Operations Control Room",
    institution: "Attraction Portal",
    host: "Host Portal",
    guide: "Guide Portal",
  };
  const portalLabel = portalLabels[data.portal_type] || "Portal";
  const subject = `Activate your Tahura Africa ${portalLabel} account`;

  const rows = [
    detailRow("Portal", portalLabel),
    data.user_id_code ? detailRow("User ID", `<span style="font-family:monospace;font-weight:700;color:${BRAND.primaryColor};">${data.user_id_code}</span>`) : "",
    detailRow("Email", data.email || ""),
  ].filter(Boolean).join("");

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#128273;", "#ecfdf5")}
      ${heading("You've been invited")}
      ${subtext(`${data.name ? `Hi ${data.name}, you've` : "You've"} been given access to the <strong>${portalLabel}</strong> on Tahura Africa. To activate your account, verify your email and choose your own password.`)}
    </div>
    ${detailsCard(rows)}
    <div style="text-align:center;">
      ${ctaButton("Verify email &amp; set password", data.action_link || "#")}
    </div>
    <p style="font-size:13px;color:${BRAND.textLight};line-height:1.6;text-align:center;margin:0 0 20px;word-break:break-all;">
      Or paste this link into your browser:<br>
      <a href="${data.action_link || "#"}" style="color:${BRAND.primaryColor};">${data.action_link || ""}</a>
    </p>
    <div style="background:#FBEADF;border:1px solid #F5D3B8;border-radius:10px;padding:16px;margin:0 0 8px;">
      <p style="font-size:13px;color:#B8420A;margin:0;line-height:1.5;">
        <strong>For your security:</strong> this link expires in 24 hours and can be used once. If it expires, ask your administrator to resend the invite. If you weren't expecting this, you can safely ignore this email.
      </p>
    </div>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, `Activate your ${portalLabel} account`, content) };
}

function hostAccountCreated(data: Record<string, any>): { subject: string; html: string } {
  const subject = `You've been added as a host on Tahura Africa`;

  const rows = [
    detailRow("Host name", data.host_name || ""),
    detailRow("Added by", data.added_by || "Tahura Africa"),
    detailRow("Email required to switch", `<strong>${data.host_email || ""}</strong>`),
  ].join("");

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#127968;", "#ecfdf5")}
      ${heading("You're now a host")}
      ${subtext(`${data.added_by || "Someone"} added <strong>${data.host_name || "you"}</strong> as a host on ${BRAND.name}.`)}
    </div>
    ${detailsCard(rows)}
    <div style="background:#FBEADF;border:1px solid #F5D3B8;border-radius:10px;padding:16px;margin:0 0 24px;">
      <p style="font-size:13px;color:#B8420A;margin:0;line-height:1.5;">
        <strong>One thing to do first:</strong> to manage your host account, sign in (or create a free account) as a Traveler using this exact email address — <strong>${data.host_email || ""}</strong>. Once you're logged in, open your Profile and tap "Switch to Host".
      </p>
    </div>
    <div style="text-align:center;">
      ${ctaButton("Sign in as a Traveler", `${BRAND.website}/traveler/login`)}
    </div>
    <p style="font-size:13px;color:${BRAND.textLight};line-height:1.6;text-align:center;margin:20px 0 0;">
      Weren't expecting this, or don't recognize this activity? Contact us at <a href="mailto:${BRAND.email1}" style="color:${BRAND.primaryColor};">${BRAND.email1}</a> and we'll look into it.
    </p>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, `You've been added as a host on ${BRAND.name}`, content) };
}

function guideAccountCreated(data: Record<string, any>): { subject: string; html: string } {
  const subject = `You've been added as a guide on Tahura Africa`;

  const rows = [
    detailRow("Guide name", data.guide_name || ""),
    detailRow("Added by", "Tahura Africa Operations"),
    detailRow("Email required to switch", `<strong>${data.guide_email || ""}</strong>`),
  ].join("");

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#128100;", "#ecfdf5")}
      ${heading("You're now a guide")}
      ${subtext(`Tahura Africa Operations added <strong>${data.guide_name || "you"}</strong> as a guide on ${BRAND.name}.`)}
    </div>
    ${detailsCard(rows)}
    <div style="background:#FBEADF;border:1px solid #F5D3B8;border-radius:10px;padding:16px;margin:0 0 24px;">
      <p style="font-size:13px;color:#B8420A;margin:0;line-height:1.5;">
        <strong>One thing to do first:</strong> to manage your guide account, sign in (or create a free account) as a Traveler using this exact email address — <strong>${data.guide_email || ""}</strong>. Once you're logged in, open your Profile and tap "Switch to Host" (it handles guides too).
      </p>
    </div>
    <div style="text-align:center;">
      ${ctaButton("Sign in as a Traveler", `${BRAND.website}/traveler/login`)}
    </div>
    <p style="font-size:13px;color:${BRAND.textLight};line-height:1.6;text-align:center;margin:20px 0 0;">
      Weren't expecting this, or don't recognize this activity? Contact us at <a href="mailto:${BRAND.email1}" style="color:${BRAND.primaryColor};">${BRAND.email1}</a> and we'll look into it.
    </p>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, `You've been added as a guide on ${BRAND.name}`, content) };
}

function bookingReminder(data: Record<string, any>): { subject: string; html: string } {
  const subject = `Reminder: Your Booking Tomorrow - ${data.booking_ref}`;
  const dateStr = new Date(data.booking_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const rows = [
    detailRow("Reference", data.booking_ref),
    detailRow(data.booking_type === "attraction" ? "Attraction" : data.booking_type === "homestay" ? "Homestay" : "Experience", data.item_title),
    detailRow("Date", `<strong style="color:${BRAND.primaryColor};">${dateStr}</strong>`),
    data.session ? detailRow("Session", data.session) : "",
    data.guide_name ? detailRow("Guide", data.guide_name) : "",
    detailRow("Guests", String(data.guests)),
  ].join("");

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#9200;", "#eff6ff")}
      ${heading("Booking Reminder")}
      ${subtext(`Hi ${data.recipient_name}, this is a reminder that your booking is tomorrow!`)}
    </div>
    ${detailsCard(rows)}
    <div style="background:#FBEADF;border:1px solid #F5D3B8;border-radius:10px;padding:16px;margin:0 0 8px;">
      <p style="font-size:13px;color:#B8420A;margin:0;line-height:1.5;">
        ${data.booking_type === "attraction" ? "Please arrive 15 minutes early. Don't forget to bring a valid ID and any items recommended for the program." : "Make sure to confirm your arrival time with your host if you haven't already."}
      </p>
    </div>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, `Your booking is tomorrow`, content) };
}

function accountDeactivated(data: Record<string, any>): { subject: string; html: string } {
  const subject = `Account Deactivated - Tahura Africa`;
  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#128274;", "#f8fafc")}
      ${heading("Account Deactivated")}
      ${subtext(`Your Tahura Africa account (${data.user_id_code}) has been deactivated by the platform administrator.`)}
    </div>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:20px;margin:24px 0;">
      <p style="font-size:14px;color:#7f1d1d;margin:0;line-height:1.6;">
        You will no longer be able to log in to your portal. If you believe this was done in error, please contact our team.
      </p>
    </div>
    <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;">
      For questions or to request reactivation, email us at <a href="mailto:${BRAND.email1}" style="color:${BRAND.primaryColor};font-weight:600;">${BRAND.email1}</a>.
    </p>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, `Your account has been deactivated`, content) };
}

function welcomeTraveler(data: Record<string, any>): { subject: string; html: string } {
  const subject = `Welcome to Tahura Africa!`;
  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#127758;", "#ecfdf5")}
      ${heading(`Welcome, ${data.full_name}!`)}
      ${subtext("Thank you for joining Tahura Africa. Your gateway to unforgettable East African experiences is now open.")}
    </div>
    <div style="margin:24px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="33%" style="text-align:center;padding:16px 8px;">
            <div style="font-size:28px;margin-bottom:8px;">&#127963;</div>
            <p style="font-size:13px;font-weight:600;color:${BRAND.textDark};margin:0;">Explore</p>
            <p style="font-size:12px;color:${BRAND.textMuted};margin:4px 0 0;">Discover tours, homestays & attractions</p>
          </td>
          <td width="33%" style="text-align:center;padding:16px 8px;">
            <div style="font-size:28px;margin-bottom:8px;">&#128197;</div>
            <p style="font-size:13px;font-weight:600;color:${BRAND.textDark};margin:0;">Book</p>
            <p style="font-size:12px;color:${BRAND.textMuted};margin:4px 0 0;">Reserve experiences with ease</p>
          </td>
          <td width="33%" style="text-align:center;padding:16px 8px;">
            <div style="font-size:28px;margin-bottom:8px;">&#10024;</div>
            <p style="font-size:13px;font-weight:600;color:${BRAND.textDark};margin:0;">Experience</p>
            <p style="font-size:12px;color:${BRAND.textMuted};margin:4px 0 0;">Create memories that last forever</p>
          </td>
        </tr>
      </table>
    </div>
    ${divider()}
    <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;">
      Start by browsing our curated collection of experiences across Rwanda and East Africa. From gorilla trekking to cultural homestays, there's something for every explorer.
    </p>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, "Welcome to Tahura Africa - start exploring", content) };
}

function governmentAccountCreated(data: Record<string, any>): { subject: string; html: string } {
  return accountCreated({ ...data, portal_type: "government" });
}

function bookingCancelled(data: Record<string, any>): { subject: string; html: string } {
  const subject = `Booking Cancelled - ${data.booking_ref}`;
  const dateStr = data.booking_date
    ? new Date(data.booking_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "";
  const forHost = data.recipient_role === "host";
  const typeLabel = data.booking_type === "attraction" ? "Attraction" : data.booking_type === "homestay" ? "Homestay" : "Experience";

  const rows = [
    detailRow("Reference", `<span style="font-weight:700;color:${BRAND.primaryColor};">${data.booking_ref}</span>`),
    detailRow(typeLabel, data.item_title),
    dateStr ? detailRow("Date", dateStr) : "",
    data.session ? detailRow("Session", data.session) : "",
    data.guests ? detailRow("Guests", String(data.guests)) : "",
    forHost && data.traveler_name ? detailRow("Traveler", data.traveler_name) : "",
    data.cancellation_reason ? detailRow("Reason", data.cancellation_reason) : "",
  ].join("");

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#10005;", "#fef2f2")}
      ${heading("Booking Cancelled")}
      ${subtext(forHost
        ? `The booking below${data.traveler_name ? ` from <strong>${data.traveler_name}</strong>` : ""} has been cancelled. This time slot is now free again.`
        : `Hi ${data.traveler_name || "there"}, your booking has been cancelled. We hope to welcome you on another journey soon.`)}
    </div>
    ${detailsCard(rows)}
    <div style="background:${BRAND.bgColor};border:1px solid ${BRAND.borderColor};border-radius:10px;padding:16px;margin-bottom:4px;">
      <p style="font-size:13px;color:${BRAND.textMuted};margin:0;line-height:1.5;">
        ${forHost
          ? "Your availability has been updated automatically — no action is needed on your side."
          : "If this was a mistake or you'd like to rebook, you can browse experiences anytime on Tahura Africa."}
      </p>
    </div>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, `Booking ${data.booking_ref} cancelled`, content) };
}

function withdrawalPaid(data: Record<string, any>): { subject: string; html: string } {
  const subject = `Withdrawal of $${Number(data.amount || 0).toFixed(2)} approved`;
  const rows = [
    detailRow("Amount", `$${Number(data.amount || 0).toFixed(2)}`),
    detailRow("Fee", `$${Number(data.fee || 0).toFixed(2)}`),
    detailRow("Net Payout", `<span style="font-weight:700;color:${BRAND.primaryColor};">$${Number(data.net_amount || 0).toFixed(2)}</span>`),
    detailRow("Method", data.payout_method === "mobile" ? "Mobile Money" : "Bank Transfer"),
  ].join("");

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#10003;", "#f0fdf4")}
      ${heading("Withdrawal Approved")}
      ${subtext(`Hi ${data.recipient_name || "there"}, your withdrawal request has been approved and marked as paid.`)}
    </div>
    ${detailsCard(rows)}
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, subject, content) };
}

function withdrawalRejected(data: Record<string, any>): { subject: string; html: string } {
  const subject = `Withdrawal request declined`;
  const rows = [
    detailRow("Amount requested", `$${Number(data.amount || 0).toFixed(2)}`),
    data.rejection_reason ? detailRow("Reason", data.rejection_reason) : "",
  ].join("");

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#10005;", "#fef2f2")}
      ${heading("Withdrawal Declined")}
      ${subtext(`Hi ${data.recipient_name || "there"}, your withdrawal request could not be processed.`)}
    </div>
    ${detailsCard(rows)}
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, subject, content) };
}

function applicationReceived(data: Record<string, any>): { subject: string; html: string } {
  const roleLabel = data.applicant_type === 'guide' ? 'Guide' : 'Host';
  const subject = `We've received your ${roleLabel} application`;
  const rows = [
    detailRow("Applying as", roleLabel),
    detailRow("Name", data.full_name),
  ].join("");

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#128075;", "#fff7ed")}
      ${heading("Thanks for applying!")}
      ${subtext(`Hi ${data.full_name || "there"}, we've received your application to become a ${roleLabel} on Tahura Africa. Our team reviews every application by hand — we'll email you as soon as we've made a decision.`)}
    </div>
    ${detailsCard(rows)}
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, subject, content) };
}

function newApplicationAdmin(data: Record<string, any>): { subject: string; html: string } {
  const roleLabel = data.applicant_type === 'guide' ? 'Guide' : 'Host';
  const subject = `New ${roleLabel} Application — ${data.full_name}`;

  const rows = [
    detailRow("Applying as", roleLabel),
    detailRow("Name", data.full_name),
    detailRow("Email", data.email),
    detailRow("Phone", data.phone),
    data.years_experience ? detailRow("Experience", `${data.years_experience} yrs`) : "",
  ].join("");

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#128276;", "#eff6ff")}
      ${heading("New Application Received")}
      ${subtext(`<strong>${data.full_name}</strong> just applied to become a ${roleLabel} on Tahura Africa.`)}
    </div>
    ${detailsCard(rows)}
    ${data.review_link ? ctaButton("Review in Operations", data.review_link) : ""}
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, subject, content) };
}

function applicationApproved(data: Record<string, any>): { subject: string; html: string } {
  const roleLabel = data.applicant_type === 'guide' ? 'Guide' : 'Host';
  const subject = `You're in! Welcome as a Tahura ${roleLabel}`;

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#10003;", "#f0fdf4")}
      ${heading("Application Approved")}
      ${subtext(`Hi ${data.full_name || "there"}, great news — your application to become a ${roleLabel} has been approved. ${data.applicant_type === 'guide' ? "You've been added to our shared guide pool and can be assigned to attractions and partner listings." : "A partner has been matched to your account, and you can now start receiving bookings."}`)}
    </div>
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, subject, content) };
}

function applicationRejected(data: Record<string, any>): { subject: string; html: string } {
  const roleLabel = data.applicant_type === 'guide' ? 'Guide' : 'Host';
  const subject = `Update on your ${roleLabel} application`;
  const rows = data.rejection_reason ? detailRow("Note from our team", data.rejection_reason) : "";

  const content = `
    <div style="text-align:center;">
      ${iconCircle("&#10005;", "#fef2f2")}
      ${heading("Application Not Approved")}
      ${subtext(`Hi ${data.full_name || "there"}, thanks for your interest in becoming a ${roleLabel} on Tahura Africa. We're not able to move forward with your application at this time.`)}
    </div>
    ${rows ? detailsCard(rows) : ""}
    ${signoff()}
  `;
  return { subject, html: baseLayout(subject, subject, content) };
}

// ============ TEMPLATE MAP ============

const TEMPLATES: Record<string, (data: Record<string, any>) => { subject: string; html: string }> = {
  booking_cancelled: bookingCancelled,
  booking_confirmation_traveler: bookingConfirmationTraveler,
  new_booking_host: newBookingHost,
  new_booking_guide: newBookingGuide,
  new_message: newMessageNotification,
  review_received_host: reviewReceivedHost,
  review_received_guide: reviewReceivedGuide,
  traveler_review_received: travelerReviewReceived,
  content_flagged: contentFlagged,
  content_resolved: contentResolved,
  content_removed: contentRemoved,
  support_ticket_confirmation: supportTicketConfirmation,
  support_ticket_status_update: supportTicketStatusUpdate,
  support_ticket_reply: supportTicketReply,
  support_ticket_closed: supportTicketClosed,
  account_created: accountCreated,
  host_account_created: hostAccountCreated,
  guide_account_created: guideAccountCreated,
  portal_invite: portalInvite,
  booking_reminder: bookingReminder,
  account_deactivated: accountDeactivated,
  welcome_traveler: welcomeTraveler,
  government_account_created: governmentAccountCreated,
  withdrawal_paid: withdrawalPaid,
  withdrawal_rejected: withdrawalRejected,
  application_received: applicationReceived,
  application_received_admin: newApplicationAdmin,
  application_approved: applicationApproved,
  application_rejected: applicationRejected,
};

interface EmailAttachment {
  filename: string;
  content: string; // base64
}

async function sendEmail(to: string, subject: string, html: string, attachments?: EmailAttachment[]): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: BRAND.fromEmail,
        to: [to],
        reply_to: BRAND.replyTo,
        subject,
        html,
        ...(attachments && attachments.length ? { attachments } : {}),
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { success: false, error: `Resend API error: ${res.status} - ${errBody}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Unknown error" };
  }
}

async function logEmail(
  recipientEmail: string,
  recipientName: string,
  templateType: string,
  subject: string,
  status: string,
  errorMessage?: string,
  metadata?: Record<string, any>
) {
  try {
    await supabase.from("email_logs").insert({
      recipient_email: recipientEmail,
      recipient_name: recipientName || "",
      template_type: templateType,
      subject,
      status,
      error_message: errorMessage || null,
      metadata: metadata || {},
    });
  } catch (_) {
    // non-blocking
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { template, recipient_email, recipient_name, data, attachments } = await req.json();

    if (!template || !recipient_email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: template, recipient_email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const templateFn = TEMPLATES[template];
    if (!templateFn) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${template}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject, html } = templateFn(data || {});
    const result = await sendEmail(recipient_email, subject, html, attachments);

    await logEmail(
      recipient_email,
      recipient_name || "",
      template,
      subject,
      result.success ? "sent" : "failed",
      result.error,
      data
    );

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, subject }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
