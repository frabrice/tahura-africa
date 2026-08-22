import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { getGuideContext } from '../../lib/useGuideData';
import { AvailabilityCalendar } from '../../components/AvailabilityCalendar';
import { getGuideBookedRanges, getManualClosures, closeDate, reopenDate, type BookedRange, type ManualClosure } from '../../lib/availability';

export function GuideCalendarPage() {
  const guideContext = getGuideContext();
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([]);
  const [closures, setClosures] = useState<ManualClosure[]>([]);
  const [dailyLimit, setDailyLimit] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyDate, setBusyDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!guideContext?.id) return;
    setLoading(true);
    const [ranges, overrides, guideRow] = await Promise.all([
      getGuideBookedRanges(guideContext.id),
      getManualClosures('guide', guideContext.id),
      supabase.from('guides').select('max_engagements_per_day').eq('id', guideContext.id).maybeSingle(),
    ]);
    setBookedRanges(ranges);
    setClosures(overrides);
    setDailyLimit(guideRow.data?.max_engagements_per_day || 1);
    setLoading(false);
  }, [guideContext?.id]);

  useEffect(() => { load(); }, [load]);

  async function handleClose(date: string) {
    if (!guideContext?.id) return;
    setBusyDate(date);
    await closeDate('guide', guideContext.id, date);
    await load();
    setBusyDate(null);
  }

  async function handleReopen(date: string) {
    if (!guideContext?.id) return;
    setBusyDate(date);
    await reopenDate('guide', guideContext.id, date);
    await load();
    setBusyDate(null);
  }

  if (!guideContext) return null;

  return (
    <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Calendar</h1>
        <p className="text-sm text-neutral-500 mt-1">
          One calendar across every attraction and program you're booked for.
        </p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <p className="text-xs text-neutral-500 mb-4">
          You can take up to {dailyLimit} booking{dailyLimit === 1 ? '' : 's'} per day, across all your attractions combined. Click an open day to close it yourself.
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
