import { PDFDownloadLink } from '@react-pdf/renderer';
import { Download, Loader2 } from 'lucide-react';
import { QuotePDF } from './QuotePDF';
import type { CustomQuote } from '../lib/customQuotes';

export function QuotePDFDownloadLink({ quote, quoteUrl, className }: { quote: CustomQuote; quoteUrl: string; className?: string }) {
  return (
    <PDFDownloadLink document={<QuotePDF quote={quote} quoteUrl={quoteUrl} />} fileName={`${quote.quote_ref}.pdf`} className={className}>
      {({ loading }) => loading ? (
        <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</>
      ) : (
        <><Download className="w-4 h-4" /> Download as PDF</>
      )}
    </PDFDownloadLink>
  );
}
