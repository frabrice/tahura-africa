import { useRef } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Download, Loader2 } from 'lucide-react';
import { QuotePDF } from './QuotePDF';
import type { CustomQuote } from '../lib/customQuotes';

export function QuotePDFDownloadLink({ quote, quoteUrl, className }: { quote: CustomQuote; quoteUrl: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const autoClickedRef = useRef(false);

  return (
    <div ref={containerRef} style={{ display: 'contents' }}>
      <PDFDownloadLink document={<QuotePDF quote={quote} quoteUrl={quoteUrl} />} fileName={`${quote.quote_ref}.pdf`} className={className}>
        {({ loading }) => {
          // The "Download as PDF" click that got us here already expressed
          // the user's intent — this component only exists because of that
          // click. Without this, the underlying <a> only becomes a real
          // download link once the PDF blob finishes generating, so the
          // click that mounted it was too early to trigger anything and a
          // second, unexplained click was silently required.
          if (!loading && !autoClickedRef.current) {
            autoClickedRef.current = true;
            requestAnimationFrame(() => containerRef.current?.querySelector('a')?.click());
          }
          return loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</>
          ) : (
            <><Download className="w-4 h-4" /> Download as PDF</>
          );
        }}
      </PDFDownloadLink>
    </div>
  );
}
