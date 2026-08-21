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
};

const LOGO_URL = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1773397705/Favicon_msgzop.png';

const ROLE_LABEL: Record<string, string> = {
  traveler: 'Traveler',
  partner: 'Partner',
  host: 'Host',
  guide: 'Guide',
};

export interface TranscriptMessage {
  sender_type: string;
  sender_name: string;
  message_text: string;
  created_at: string;
}

export interface TranscriptTicket {
  ticket_ref: string;
  subject: string;
  category: string;
  created_by_name: string;
  created_by_email: string;
  created_by_role: string;
  created_at: string;
  closed_at: string | null;
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
  body: { paddingHorizontal: 32, paddingTop: 24 },
  eyebrow: { color: COLORS.copperDark, fontSize: 8.5, fontFamily: 'Helvetica-Bold', letterSpacing: 1.2, marginBottom: 6 },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: COLORS.ink, marginBottom: 14 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginBottom: 18, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: COLORS.rule },
  metaItem: { fontSize: 9.5, color: COLORS.inkDim, width: '45%' },
  metaLabel: { fontFamily: 'Helvetica-Bold', color: COLORS.ink },
  sectionTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: COLORS.ink, marginBottom: 12 },
  messageRow: { marginBottom: 12 },
  messageMeta: { fontSize: 8.5, color: COLORS.inkDim, marginBottom: 3 },
  messageBubbleTeam: { backgroundColor: COLORS.paperWarm, borderRadius: 8, padding: 10 },
  messageBubbleRequester: { backgroundColor: '#F4F4F2', borderRadius: 8, padding: 10 },
  messageText: { fontSize: 9.5, lineHeight: 1.5, color: COLORS.ink },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.obsidian, paddingVertical: 12, paddingHorizontal: 32,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  footerText: { fontSize: 8, color: '#B8AFA0' },
});

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function TicketTranscriptPDF({ ticket, messages }: { ticket: TranscriptTicket; messages: TranscriptMessage[] }) {
  return (
    <Document title={`${ticket.ticket_ref} — Tahura Africa Support Transcript`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBand}>
          <View style={styles.headerLeft}>
            <Image src={LOGO_URL} style={styles.logo} />
            <Text style={styles.headerBrand}>TAHURA AFRICA</Text>
          </View>
          <Text style={styles.headerRef}>{ticket.ticket_ref}</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.eyebrow}>SUPPORT CONVERSATION TRANSCRIPT</Text>
          <Text style={styles.title}>{ticket.subject}</Text>

          <View style={styles.metaGrid}>
            <Text style={styles.metaItem}><Text style={styles.metaLabel}>From </Text>{ticket.created_by_name} ({ROLE_LABEL[ticket.created_by_role] || ticket.created_by_role})</Text>
            <Text style={styles.metaItem}><Text style={styles.metaLabel}>Email </Text>{ticket.created_by_email}</Text>
            <Text style={styles.metaItem}><Text style={styles.metaLabel}>Category </Text>{ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1)}</Text>
            <Text style={styles.metaItem}><Text style={styles.metaLabel}>Opened </Text>{formatDateTime(ticket.created_at)}</Text>
            {ticket.closed_at && (
              <Text style={styles.metaItem}><Text style={styles.metaLabel}>Closed </Text>{formatDateTime(ticket.closed_at)}</Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>Conversation</Text>
          {messages.map((m, i) => {
            const isTeam = m.sender_type === 'operations';
            return (
              <View key={i} style={styles.messageRow} wrap={false}>
                <Text style={styles.messageMeta}>{isTeam ? `${m.sender_name} · Tahura Support` : m.sender_name} — {formatDateTime(m.created_at)}</Text>
                <View style={isTeam ? styles.messageBubbleTeam : styles.messageBubbleRequester}>
                  <Text style={styles.messageText}>{m.message_text}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Tahura Africa · info@tahura.africa · +250 788 123 456</Text>
          <Text style={styles.footerText}>Support conversation record</Text>
        </View>
      </Page>
    </Document>
  );
}
