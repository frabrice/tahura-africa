import { pdf } from '@react-pdf/renderer/lib/react-pdf.js';
import { TicketTranscriptPDF, type TranscriptTicket, type TranscriptMessage } from '../src/components/TicketTranscriptPDF';

// Node runtime, not Edge - @react-pdf/renderer's font/layout dependencies
// (yoga-layout, fontkit) are unverified under Deno (where the calling
// close-ticket edge function runs) but are already proven working in this
// exact Node environment: QuotePDF/BookingReceiptPDF render client-side in
// the browser, and this component was smoke-tested via a plain Node script
// during development. Keeping PDF rendering here, in a known-good runtime,
// rather than gambling on it inside the edge function that emails people.
export const config = { runtime: 'nodejs' };

interface RequestBody {
  ticket: TranscriptTicket;
  messages: TranscriptMessage[];
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { ticket, messages }: RequestBody = req.body;
    if (!ticket || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Missing ticket or messages' });
      return;
    }

    const instance = pdf(<TicketTranscriptPDF ticket={ticket} messages={messages} />);
    const buffer = await instance.toBuffer();
    const chunks: Buffer[] = [];
    for await (const chunk of buffer) chunks.push(chunk as Buffer);
    const pdfBuffer = Buffer.concat(chunks);

    res.setHeader('Content-Type', 'application/pdf');
    res.status(200).send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to render PDF' });
  }
}
