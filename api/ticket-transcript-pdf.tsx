// Edge runtime, matching the project's other two working routes
// (api/og/[type]/[id].tsx, api/sitemap.ts) — this route originally used the
// Node.js (req, res) handler signature and consistently failed with an
// opaque FUNCTION_INVOCATION_FAILED regardless of what it imported or did,
// even after switching PDF libraries entirely. Both of this project's other
// API routes use Edge + the Web-standard Request/Response signature; this
// one was the only exception. pdf-lib has no Node-specific dependencies
// (no Buffer, no fs) so it runs the same way under Edge.
export const config = { runtime: 'edge' };

interface TranscriptTicket {
  ticket_ref: string;
  subject: string;
  category: string;
  created_by_name: string;
  created_by_email: string;
  created_by_role: string;
  created_at: string;
  closed_at: string | null;
}

interface TranscriptMessage {
  sender_type: string;
  sender_name: string;
  message_text: string;
  created_at: string;
}

const ROLE_LABEL: Record<string, string> = {
  traveler: 'Traveler',
  partner: 'Partner',
  host: 'Host',
  guide: 'Guide',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// pdf-lib doesn't wrap text — break into lines that fit maxWidth ourselves.
function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { ticket, messages }: { ticket: TranscriptTicket; messages: TranscriptMessage[] } = await request.json();
    if (!ticket || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Missing ticket or messages' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

    const OBSIDIAN = rgb(0.059, 0.051, 0.043);
    const COPPER = rgb(0.769, 0.533, 0.227);
    const INK = rgb(0.133, 0.106, 0.078);
    const INK_DIM = rgb(0.42, 0.394, 0.365);
    const PAPER_WARM = rgb(0.992, 0.965, 0.925);
    const REQUESTER_BG = rgb(0.957, 0.957, 0.949);

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    const MARGIN = 48;
    const CONTENT_W = PAGE_W - MARGIN * 2;

    let page = doc.addPage([PAGE_W, PAGE_H]);
    let y = 0;

    function drawHeader() {
      page.drawRectangle({ x: 0, y: PAGE_H - 50, width: PAGE_W, height: 50, color: OBSIDIAN });
      page.drawText('TAHURA AFRICA', { x: MARGIN, y: PAGE_H - 32, size: 11, font: bold, color: rgb(0.96, 0.9, 0.8) });
      const refWidth = bold.widthOfTextAtSize(ticket.ticket_ref, 9);
      page.drawText(ticket.ticket_ref, { x: PAGE_W - MARGIN - refWidth, y: PAGE_H - 30, size: 9, font: bold, color: COPPER });
      y = PAGE_H - 80;
    }

    function ensureSpace(needed: number) {
      if (y - needed < MARGIN + 20) {
        page = doc.addPage([PAGE_W, PAGE_H]);
        drawHeader();
      }
    }

    drawHeader();

    page.drawText('SUPPORT CONVERSATION TRANSCRIPT', { x: MARGIN, y, size: 8.5, font: bold, color: COPPER });
    y -= 22;
    for (const line of wrapText(ticket.subject, bold, 18, CONTENT_W)) {
      page.drawText(line, { x: MARGIN, y, size: 18, font: bold, color: INK });
      y -= 22;
    }
    y -= 6;

    const metaLines = [
      `From: ${ticket.created_by_name} (${ROLE_LABEL[ticket.created_by_role] || ticket.created_by_role})`,
      `Email: ${ticket.created_by_email}`,
      `Category: ${ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1)}`,
      `Opened: ${formatDateTime(ticket.created_at)}`,
      ...(ticket.closed_at ? [`Closed: ${formatDateTime(ticket.closed_at)}`] : []),
    ];
    for (const line of metaLines) {
      page.drawText(line, { x: MARGIN, y, size: 9.5, font, color: INK_DIM });
      y -= 14;
    }
    y -= 8;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: rgb(0.933, 0.882, 0.8) });
    y -= 24;

    page.drawText('Conversation', { x: MARGIN, y, size: 12, font: bold, color: INK });
    y -= 22;

    for (const m of messages) {
      const isTeam = m.sender_type === 'operations';
      const label = isTeam ? `${m.sender_name} · Tahura Support` : m.sender_name;
      const metaLine = `${label} — ${formatDateTime(m.created_at)}`;
      const bodyLines = wrapText(m.message_text, font, 9.5, CONTENT_W - 20);
      const blockHeight = 14 + bodyLines.length * 13 + 16;

      ensureSpace(blockHeight);

      page.drawText(metaLine, { x: MARGIN, y, size: 8.5, font, color: INK_DIM });
      y -= 14;

      const bgTop = y + 6;
      const bgHeight = bodyLines.length * 13 + 10;
      page.drawRectangle({
        x: MARGIN, y: bgTop - bgHeight, width: CONTENT_W, height: bgHeight,
        color: isTeam ? PAPER_WARM : REQUESTER_BG,
      });
      for (const line of bodyLines) {
        page.drawText(line, { x: MARGIN + 10, y: y - 4, size: 9.5, font, color: INK });
        y -= 13;
      }
      y -= 16;
    }

    const pdfBytes = await doc.save();

    return new Response(pdfBytes, { status: 200, headers: { 'Content-Type': 'application/pdf' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Failed to render PDF', stack: err?.stack }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
