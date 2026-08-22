// Whether a booking can be reviewed yet — the day after its last day, not
// the day it starts. duration_days is already reliably populated for
// homestay and itinerary bookings (multi-day) and null for single-day
// experience/attraction bookings, where it correctly falls back to 1 day.
export function isReviewEligible(booking: { booking_date: string; duration_days?: number | null; status: string }): boolean {
  if (booking.status === 'cancelled') return false;
  const lastDay = new Date(booking.booking_date);
  lastDay.setDate(lastDay.getDate() + (booking.duration_days || 1) - 1);
  const eligibleFrom = new Date(lastDay);
  eligibleFrom.setDate(eligibleFrom.getDate() + 1);
  eligibleFrom.setHours(0, 0, 0, 0);
  return new Date() >= eligibleFrom;
}
