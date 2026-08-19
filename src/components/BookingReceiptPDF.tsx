import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const COLORS = {
  copper: '#C4883A',
  copperDark: '#8a5523',
  sienna: '#C14B32',
  obsidian: '#0F0D0B',
  ink: '#221B14',
  inkDim: '#6B6459',
  paper: '#FFFFFF',
  paperWarm: '#FDF6EC',
  rule: '#EEE1CC',
  emerald: '#0B7A4B',
};

const LOGO_URL = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1773397705/Favicon_msgzop.png';

export interface BookingReceiptLineItem {
  label: string;
  value: string;
  muted?: boolean;
}

export interface BookingReceiptData {
  bookingRef: string;
  itemTitle: string;
  itemTypeLabel: string;
  dateLabel: string;
  sessionLabel?: string;
  guestsLabel: string;
  guests: number;
  lineItems: BookingReceiptLineItem[];
  total: number;
  travelerName: string;
  travelerEmail?: string;
  paymentMethodLabel?: string;
}

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: COLORS.ink, paddingBottom: 60 },
  headerBand: {
    backgroundColor: COLORS.obsidian,
    paddingHorizontal: 32,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 22, height: 22, borderRadius: 11 },
  headerBrand: { color: '#F5E6CC', fontSize: 11, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  headerRef: { color: COLORS.copper, fontSize: 9, fontFamily: 'Helvetica-Bold' },
  body: { paddingHorizontal: 32, paddingTop: 28 },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E6F4EC',
    color: COLORS.emerald,
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  eyebrow: {
    color: COLORS.copperDark,
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: COLORS.ink, marginBottom: 14 },
  factsRow: { flexDirection: 'row', gap: 18, marginBottom: 14, flexWrap: 'wrap' },
  factItem: { fontSize: 9.5, color: COLORS.inkDim },
  factLabel: { fontFamily: 'Helvetica-Bold', color: COLORS.ink },
  preparedFor: {
    fontSize: 9.5,
    color: COLORS.inkDim,
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.ink,
    marginBottom: 12,
  },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
  },
  lineLabel: { fontSize: 9.5, color: COLORS.inkDim },
  lineValue: { fontSize: 9.5, color: COLORS.ink, fontFamily: 'Helvetica-Bold' },
  totalCard: {
    backgroundColor: COLORS.paperWarm,
    borderRadius: 8,
    padding: 18,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 9.5, color: COLORS.inkDim },
  totalValue: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: COLORS.copperDark },
  paymentNote: { fontSize: 8.5, color: COLORS.inkDim, marginTop: 10 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.obsidian,
    paddingVertical: 12,
    paddingHorizontal: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 8, color: '#B8AFA0' },
});

export function BookingReceiptPDF({ data }: { data: BookingReceiptData }) {
  return (
    <Document title={`Receipt ${data.bookingRef} — Tahura Africa`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBand}>
          <View style={styles.headerLeft}>
            <Image src={LOGO_URL} style={styles.logo} />
            <Text style={styles.headerBrand}>TAHURA AFRICA</Text>
          </View>
          <Text style={styles.headerRef}>{data.bookingRef}</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.statusBadge}>PAYMENT CONFIRMED</Text>
          <Text style={styles.eyebrow}>{data.itemTypeLabel.toUpperCase()}</Text>
          <Text style={styles.title}>{data.itemTitle}</Text>

          <View style={styles.factsRow}>
            <Text style={styles.factItem}><Text style={styles.factLabel}>Date </Text>{data.dateLabel}</Text>
            {data.sessionLabel && (
              <Text style={styles.factItem}><Text style={styles.factLabel}>Session </Text>{data.sessionLabel}</Text>
            )}
            <Text style={styles.factItem}><Text style={styles.factLabel}>{data.guestsLabel} </Text>{data.guests}</Text>
          </View>

          <Text style={styles.preparedFor}>
            Booked by {data.travelerName}{data.travelerEmail ? ` · ${data.travelerEmail}` : ''}
          </Text>

          <Text style={styles.sectionTitle}>Payment Summary</Text>
          {data.lineItems.map((item, i) => (
            <View key={i} style={styles.lineRow}>
              <Text style={styles.lineLabel}>{item.label}</Text>
              <Text style={item.muted ? styles.lineLabel : styles.lineValue}>{item.value}</Text>
            </View>
          ))}

          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>${data.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
          </View>
          {data.paymentMethodLabel && (
            <Text style={styles.paymentNote}>Paid via {data.paymentMethodLabel}.</Text>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Tahura Africa · info@tahura.africa · +250 788 123 456</Text>
          <Text style={styles.footerText}>Authentic African experiences</Text>
        </View>
      </Page>
    </Document>
  );
}
