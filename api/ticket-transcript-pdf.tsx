import type { TranscriptTicket, TranscriptMessage } from '../src/components/TicketTranscriptPDF';

// No explicit runtime config — Node.js is Vercel's default for API routes,
// and 'nodejs' (unversioned) isn't a recognized config.runtime value; only
// 'edge' or a versioned string like 'nodejs20.x' are. Omitting it gets the
// intended runtime without risking a misparsed config.
//
// Both @react-pdf/renderer and the transcript component are imported
// dynamically *inside* the handler, inside the try/catch — a failure during
// module evaluation (e.g. a dependency that doesn't load in this runtime)
// otherwise happens before any of this function's own code runs, surfacing
// only as Vercel's opaque FUNCTION_INVOCATION_FAILED with no detail. Inside
// the try/catch, the same failure becomes a real, readable JSON error.

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

    const [{ pdf }, { TicketTranscriptPDF }, React] = await Promise.all([
      import('@react-pdf/renderer/lib/react-pdf.js'),
      import('../src/components/TicketTranscriptPDF'),
      import('react'),
    ]);

    const instance = pdf(React.createElement(TicketTranscriptPDF, { ticket, messages }) as any);
    const buffer = await instance.toBuffer();
    const chunks: Buffer[] = [];
    for await (const chunk of buffer) chunks.push(chunk as Buffer);
    const pdfBuffer = Buffer.concat(chunks);

    res.setHeader('Content-Type', 'application/pdf');
    res.status(200).send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to render PDF', stack: err?.stack });
  }
}
