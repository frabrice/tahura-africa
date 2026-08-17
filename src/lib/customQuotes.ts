export type QuoteType = 'experience' | 'homestay' | 'itinerary';
export type QuoteStatus = 'draft' | 'sent' | 'paid' | 'expired' | 'cancelled';
export type CreatedBy = 'partner' | 'host' | 'guide';

export interface ItineraryDay {
  day: number;
  title: string;
  description: string;
}

export interface CustomQuote {
  id: string;
  quote_ref: string;

  quote_type: QuoteType;
  title: string;
  description: string;
  cover_image: string | null;
  duration_value: number | null;
  duration_unit: 'hours' | 'days' | null;
  guests: number;
  whats_included: string[];
  itinerary_days: ItineraryDay[] | null;

  net_amount: number;
  commission_rate_locked: number;
  client_total: number;
  valid_until: string;

  client_name: string;
  client_email: string;
  client_phone: string | null;

  partner_id: string | null;
  host_id: string | null;
  guide_id: string | null;
  created_by: CreatedBy;

  status: QuoteStatus;
  resulting_booking_id: string | null;

  created_at: string;
  updated_at: string;
}

/** Mirrors the server-side gross-up formula exactly (net_amount / (1 - rate)), rounded to cents. */
export function computeClientTotal(netAmount: number, commissionRate: number): number {
  if (!netAmount || netAmount <= 0 || commissionRate >= 1) return 0;
  return Math.round((netAmount / (1 - commissionRate)) * 100) / 100;
}

export function isQuoteExpired(quote: Pick<CustomQuote, 'valid_until' | 'status'>): boolean {
  if (quote.status === 'paid' || quote.status === 'cancelled') return false;
  return new Date(quote.valid_until).getTime() < Date.now();
}

export const QUOTE_VALIDITY_PRESETS = [
  { label: '24 hours', hours: 24 },
  { label: '48 hours', hours: 48 },
  { label: '3 days', hours: 72 },
  { label: '7 days', hours: 168 },
] as const;

export function quoteTypeRoute(quote: Pick<CustomQuote, 'quote_type'>): string {
  return quote.quote_type;
}
