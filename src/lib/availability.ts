import { supabase } from './supabase';

export type EntityType = 'host' | 'guide';

export interface BookedRange {
  bookingId: string;
  start: Date;
  end: Date;
}

export interface ManualClosure {
  date: string;
  reason: string;
}

// Every date arithmetic helper here works in local calendar days, matching
// how the rest of the booking flow already parses dates (`new Date(dateStr +
// 'T00:00:00')`) — using toISOString() anywhere in here would silently shift
// dates by a day depending on the browser's timezone offset from UTC.
export function parseDateStr(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

export function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function fetchBookedRanges(filters: { host_id?: string; guide_id?: string; booking_type?: string | string[] }): Promise<BookedRange[]> {
  let query = supabase
    .from('bookings')
    .select('id, booking_date, duration_days')
    .in('status', ['pending', 'confirmed']);
  if (filters.host_id) query = query.eq('host_id', filters.host_id);
  if (filters.guide_id) query = query.eq('guide_id', filters.guide_id);
  if (Array.isArray(filters.booking_type)) query = query.in('booking_type', filters.booking_type);
  else if (filters.booking_type) query = query.eq('booking_type', filters.booking_type);

  const { data } = await query;
  return (data || []).map((b: any) => {
    const start = parseDateStr(b.booking_date);
    const end = addDays(start, (b.duration_days || 1) - 1);
    return { bookingId: b.id, start, end };
  });
}

// A host's single shared "activity" calendar — experience + itinerary
// bookings across every listing they have, since one person can only lead
// one activity at a time regardless of how many listings that activity is
// spread across.
export function getHostActivityBookedRanges(hostId: string): Promise<BookedRange[]> {
  return fetchBookedRanges({ host_id: hostId, booking_type: ['experience', 'itinerary'] });
}

// A host's homestay calendar — deliberately separate from the activity
// calendar (renting out a room isn't "busy" the way leading a tour is), but
// shared across every homestay listing that host has, since it's the same
// physical home either way.
export function getHostHomestayBookedRanges(hostId: string): Promise<BookedRange[]> {
  return fetchBookedRanges({ host_id: hostId, booking_type: 'homestay' });
}

// A guide's shared calendar across every attraction/program they're booked
// for.
export function getGuideBookedRanges(guideId: string): Promise<BookedRange[]> {
  return fetchBookedRanges({ guide_id: guideId });
}

export async function getManualClosures(entityType: EntityType, entityId: string): Promise<ManualClosure[]> {
  const { data } = await supabase
    .from('schedule_overrides')
    .select('override_date, reason')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('is_available', false);
  return (data || []).map((r: any) => ({ date: r.override_date, reason: r.reason || '' }));
}

// True only if every day in [requestStart, requestEnd] both (a) isn't
// manually closed and (b) wouldn't push that day's concurrent-booking count
// past dailyLimit if this request were accepted.
export function isRangeAvailable(
  bookedRanges: BookedRange[],
  closures: ManualClosure[],
  requestStart: Date,
  requestEnd: Date,
  dailyLimit: number,
): boolean {
  const closedDates = new Set(closures.map(c => c.date));
  for (let d = new Date(requestStart); d <= requestEnd; d = addDays(d, 1)) {
    if (closedDates.has(formatDateStr(d))) return false;
    const concurrent = bookedRanges.filter(r => d >= r.start && d <= r.end).length;
    if (concurrent >= dailyLimit) return false;
  }
  return true;
}

export async function closeDate(entityType: EntityType, entityId: string, date: string, reason = ''): Promise<void> {
  await supabase.from('schedule_overrides').upsert(
    { entity_type: entityType, entity_id: entityId, override_date: date, is_available: false, reason },
    { onConflict: 'entity_type,entity_id,override_date' },
  );
}

export async function reopenDate(entityType: EntityType, entityId: string, date: string): Promise<void> {
  await supabase
    .from('schedule_overrides')
    .delete()
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('override_date', date);
}
