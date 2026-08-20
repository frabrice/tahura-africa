import { useRef } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Download, Loader2 } from 'lucide-react';
import { BookingReceiptPDF, type BookingReceiptData } from './BookingReceiptPDF';

export function BookingReceiptDownloadLink({ data, className }: { data: BookingReceiptData; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const autoClickedRef = useRef(false);

  return (
    <div ref={containerRef} style={{ display: 'contents' }}>
      <PDFDownloadLink document={<BookingReceiptPDF data={data} />} fileName={`${data.bookingRef}-receipt.pdf`} className={className}>
        {({ loading }) => {
          if (!loading && !autoClickedRef.current) {
            autoClickedRef.current = true;
            requestAnimationFrame(() => containerRef.current?.querySelector('a')?.click());
          }
          return loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</>
          ) : (
            <><Download className="w-4 h-4" /> Download Receipt</>
          );
        }}
      </PDFDownloadLink>
    </div>
  );
}
