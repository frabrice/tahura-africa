import { useState, useEffect, useCallback } from 'react';
import { Compass, Home } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getHostContext } from '../../lib/useHostData';
import { AvailabilityCalendar } from '../../components/AvailabilityCalendar';
import {
  getHostActivityBookedRanges, getHostHomestayBookedRanges, getManualClosures,
  closeDate, reopenDate, type BookedRange, type ManualClosure,
} from '../../lib/availability';

type CalendarKind = 'activity' | 'homestay';

export function HostCalendarPage() {
  const hostContext = getHostContext();
  const [kind, setKind] = useState<CalendarKind>('activity');
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([]);
  const [closures, setClosures] = useState<ManualClosure[]>([]);
  const [dailyLimit, setDailyLimit] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyDate, setBusyDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!hostContext?.id) return;
    setLoading(true);
    const [ranges, overrides, hostRow] = await Promise.all([
      kind === 'activity' ? getHostActivityBookedRanges(hostContext.id) : getHostHomestayBookedRanges(hostContext.id),
      getManualClosures('host', hostContext.id),
      supabase.from('partner_hosts').select('bookings_per_day').eq('id', hostContext.id).maybeSingle(),
    ]);
    setBookedRanges(ranges);
    setClosures(overrides);
    setDailyLimit(kind === 'activity' ? (hostRow.data?.bookings_per_day || 1) : 1);
    setLoading(false);
  }, [hostContext?.id, kind]);

  useEffect(() => { load(); }, [load]);

  async function handleClose(date: string) {
    if (!hostContext?.id) return;
    setBusyDate(date);
    await closeDate('host', hostContext.id, date);
    await load();
    setBusyDate(null);
  }

  async function handleReopen(date: string) {
    if (!hostContext?.id) return;
    setBusyDate(date);
    await reopenDate('host', hostContext.id, date);
    await load();
    setBusyDate(null);
  }

  if (!hostContext) return null;

  return (
    <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Calendar</h1>
        <p className="text-sm text-neutral-500 mt-1">
          One calendar per listing type — bookings on any of your listings show up here and block the same date everywhere else.
        </p>
      </div>

      <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl w-fit mb-6">
        <button
          onClick={() => setKind('activity')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${kind === 'activity' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
        >
          <Compass className="w-3.5 h-3.5" /> Experiences &amp; Journeys
        </button>
        <button
          onClick={() => setKind('homestay')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${kind === 'homestay' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
        >
          <Home className="w-3.5 h-3.5" /> Homestay
        </button>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <p className="text-xs text-neutral-500 mb-4">
          {kind === 'activity'
            ? `You can lead up to ${dailyLimit} activit${dailyLimit === 1 ? 'y' : 'ies'} per day, across all your experience and journey listings combined. Click an open day to close it yourself.`
            : "Your homestay listings share one calendar — only one stay at a time. Click an open day to close it yourself."}
        </p>
        <AvailabilityCalendar
          bookedRanges={bookedRanges}
          closures={closures}
          dailyLimit={dailyLimit}
          canManage
          onCloseDate={handleClose}
          onReopenDate={handleReopen}
          loading={loading}
          busyDate={busyDate}
        />
      </div>
    </div>
  );
}
