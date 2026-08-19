import { useState, lazy, Suspense } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { BookingReceiptData } from './BookingReceiptPDF';

// @react-pdf/renderer is a huge dependency (~470KB gzipped) — deferred into
// its own chunk, loaded only once the traveler actually asks for a receipt,
// matching the pattern already used for Quote PDF downloads.
const BookingReceiptDownloadLink = lazy(() =>
  import('./BookingReceiptDownloadLink').then(m => ({ default: m.BookingReceiptDownloadLink }))
);

export function BookingReceiptDownloadButton({ data, className }: { data: BookingReceiptData; className?: string }) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button onClick={() => setArmed(true)} className={className}>
        <Download className="w-4 h-4" /> Download Receipt
      </button>
    );
  }

  return (
    <Suspense fallback={<span className={className}><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</span>}>
      <BookingReceiptDownloadLink data={data} className={className} />
    </Suspense>
  );
}
