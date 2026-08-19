import { PDFDownloadLink } from '@react-pdf/renderer';
import { Download, Loader2 } from 'lucide-react';
import { BookingReceiptPDF, type BookingReceiptData } from './BookingReceiptPDF';

export function BookingReceiptDownloadLink({ data, className }: { data: BookingReceiptData; className?: string }) {
  return (
    <PDFDownloadLink document={<BookingReceiptPDF data={data} />} fileName={`${data.bookingRef}-receipt.pdf`} className={className}>
      {({ loading }) => loading ? (
        <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</>
      ) : (
        <><Download className="w-4 h-4" /> Download Receipt</>
      )}
    </PDFDownloadLink>
  );
}
