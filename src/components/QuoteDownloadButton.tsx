import { useState, lazy, Suspense } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { CustomQuote } from '../lib/customQuotes';

// @react-pdf/renderer is a huge dependency (~470KB gzipped) — deferred into
// its own chunk, loaded only once the user actually asks for a PDF, not on
// every visit to a quote page (which includes clients paying via the public
// link, where a heavier first load matters most).
const QuotePDFDownloadLink = lazy(() =>
  import('./QuotePDFDownloadLink').then(m => ({ default: m.QuotePDFDownloadLink }))
);

export function QuoteDownloadButton({ quote, quoteUrl, className }: { quote: CustomQuote; quoteUrl: string; className?: string }) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button onClick={() => setArmed(true)} className={className}>
        <Download className="w-4 h-4" /> Download as PDF
      </button>
    );
  }

  return (
    <Suspense fallback={<span className={className}><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</span>}>
      <QuotePDFDownloadLink quote={quote} quoteUrl={quoteUrl} className={className} />
    </Suspense>
  );
}
