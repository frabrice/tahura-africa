import { Document, Page, View, Text, Image, Link, StyleSheet } from '@react-pdf/renderer';
import type { CustomQuote } from '../lib/customQuotes';

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
};

const LOGO_URL = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1773397705/Favicon_msgzop.png';

const TYPE_LABEL: Record<CustomQuote['quote_type'], string> = {
  experience: 'Custom Experience',
  homestay: 'Custom Homestay',
  itinerary: 'Custom Itinerary',
};

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
  hero: { width: '100%', height: 200, objectFit: 'cover' },
  body: { paddingHorizontal: 32, paddingTop: 24 },
  eyebrow: {
    color: COLORS.copperDark,
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: COLORS.ink, marginBottom: 10 },
  factsRow: { flexDirection: 'row', gap: 18, marginBottom: 14 },
  factItem: { fontSize: 9.5, color: COLORS.inkDim },
  factLabel: { fontFamily: 'Helvetica-Bold', color: COLORS.ink },
  preparedFor: {
    fontSize: 9.5,
    color: COLORS.inkDim,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
  },
  description: { fontSize: 10, lineHeight: 1.5, color: COLORS.ink, marginBottom: 18 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.ink,
    marginBottom: 10,
    marginTop: 4,
  },
  dayRow: { flexDirection: 'row', marginBottom: 10 },
  dayBadge: {
    width: 46,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.copperDark,
    backgroundColor: COLORS.paperWarm,
    borderRadius: 4,
    paddingVertical: 3,
    textAlign: 'center',
    marginRight: 10,
    height: 18,
  },
  dayContent: { flex: 1 },
  dayTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  dayDescription: { fontSize: 9.5, color: COLORS.inkDim, lineHeight: 1.4 },
  includedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  includedDot: {
    width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.sienna, marginRight: 8,
  },
  includedText: { fontSize: 9.5, color: COLORS.ink },
  priceCard: {
    backgroundColor: COLORS.paperWarm,
    borderRadius: 8,
    padding: 18,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: { fontSize: 9.5, color: COLORS.inkDim },
  priceValue: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: COLORS.copperDark },
  validity: { fontSize: 8.5, color: COLORS.inkDim, marginTop: 10 },
  ctaBlock: {
    marginTop: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.rule,
    borderRadius: 8,
  },
  ctaLabel: { fontSize: 9, color: COLORS.inkDim, marginBottom: 4 },
  ctaLink: { fontSize: 10, color: COLORS.sienna, fontFamily: 'Helvetica-Bold' },
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function QuotePDF({ quote, quoteUrl }: { quote: CustomQuote; quoteUrl: string }) {
  const duration = quote.duration_value
    ? `${quote.duration_value} ${quote.duration_unit === 'days' ? (quote.duration_value === 1 ? 'day' : 'days') : 'hrs'}`
    : null;

  return (
    <Document title={`${quote.title} — Tahura Africa Quote`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBand}>
          <View style={styles.headerLeft}>
            <Image src={LOGO_URL} style={styles.logo} />
            <Text style={styles.headerBrand}>TAHURA AFRICA</Text>
          </View>
          <Text style={styles.headerRef}>{quote.quote_ref}</Text>
        </View>

        {quote.cover_image && <Image src={quote.cover_image} style={styles.hero} />}

        <View style={styles.body}>
          <Text style={styles.eyebrow}>{TYPE_LABEL[quote.quote_type].toUpperCase()}</Text>
          <Text style={styles.title}>{quote.title}</Text>

          <View style={styles.factsRow}>
            {duration && (
              <Text style={styles.factItem}><Text style={styles.factLabel}>Duration </Text>{duration}</Text>
            )}
            <Text style={styles.factItem}>
              <Text style={styles.factLabel}>Guests </Text>Up to {quote.guests}
            </Text>
          </View>

          <Text style={styles.preparedFor}>Prepared for {quote.client_name}</Text>

          {quote.description && <Text style={styles.description}>{quote.description}</Text>}

          {quote.quote_type === 'itinerary' && quote.itinerary_days && quote.itinerary_days.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>Day by Day</Text>
              {quote.itinerary_days.map((d) => (
                <View key={d.day} style={styles.dayRow} wrap={false}>
                  <Text style={styles.dayBadge}>DAY {d.day}</Text>
                  <View style={styles.dayContent}>
                    <Text style={styles.dayTitle}>{d.title}</Text>
                    {d.description && <Text style={styles.dayDescription}>{d.description}</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}

          {quote.quote_type !== 'itinerary' && quote.whats_included.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>
                {quote.quote_type === 'homestay' ? "What's Included in Your Stay" : "What's Included"}
              </Text>
              {quote.whats_included.map((item, i) => (
                <View key={i} style={styles.includedRow}>
                  <View style={styles.includedDot} />
                  <Text style={styles.includedText}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Total Price</Text>
            <Text style={styles.priceValue}>${quote.client_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
          </View>
          <Text style={styles.validity}>
            This quote is valid until {formatDate(quote.valid_until)}. After that, the payment link below will no longer be active.
          </Text>

          <View style={styles.ctaBlock}>
            <Text style={styles.ctaLabel}>To confirm and pay securely, visit:</Text>
            <Link src={quoteUrl} style={styles.ctaLink}>{quoteUrl}</Link>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Tahura Africa · info@tahura.africa · +250 788 123 456</Text>
          <Text style={styles.footerText}>Authentic African experiences</Text>
        </View>
      </Page>
    </Document>
  );
}
