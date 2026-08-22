import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { BookedRange, ManualClosure } from '../lib/availability';
import { formatDateStr } from '../lib/availability';

interface AvailabilityCalendarProps {
  bookedRanges: BookedRange[];
  closures: ManualClosure[];
  dailyLimit: number;
  canManage: boolean;
  onCloseDate?: (date: string) => void;
  onReopenDate?: (date: string) => void;
  loading?: boolean;
  busyDate?: string | null;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function AvailabilityCalendar({
  bookedRanges, closures, dailyLimit, canManage, onCloseDate, onReopenDate, loading, busyDate,
}: AvailabilityCalendarProps) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const closedDates = useMemo(() => new Set(closures.map(c => c.date)), [closures]);

  const cells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingBlanks = firstDay.getDay();
    const out: { date: Date | null; dateStr: string | null }[] = [];
    for (let i = 0; i < leadingBlanks; i++) out.push({ date: null, dateStr: null });
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      out.push({ date: d, dateStr: formatDateStr(d) });
    }
    return out;
  }, [viewMonth]);

  function statusFor(dateStr: string, date: Date): 'past' | 'booked' | 'closed' | 'open' {
    if (date < today) return 'past';
    const concurrent = bookedRanges.filter(r => date >= r.start && date <= r.end).length;
    if (concurrent >= dailyLimit) return 'booked';
    if (closedDates.has(dateStr)) return 'closed';
    return 'open';
  }

  function handleDayClick(dateStr: string, status: 'past' | 'booked' | 'closed' | 'open') {
    if (!canManage || loading) return;
    if (status === 'open') onCloseDate?.(dateStr);
    else if (status === 'closed') onReopenDate?.(dateStr);
  }

  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-neutral-500" />
        </button>
        <p className="text-sm font-semibold text-neutral-900">{monthLabel}</p>
        <button
          onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-neutral-500" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-neutral-400 uppercase">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell.date || !cell.dateStr) return <div key={i} />;
          const status = statusFor(cell.dateStr, cell.date);
          const isBusy = busyDate === cell.dateStr;
          const base = 'aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-colors relative';
          const styleByStatus: Record<string, string> = {
            past: 'text-neutral-300',
            booked: 'bg-rose-100 text-rose-700 font-semibold',
            closed: `bg-neutral-200 text-neutral-500 ${canManage ? 'cursor-pointer hover:bg-neutral-300' : ''}`,
            open: `text-neutral-700 ${canManage ? 'cursor-pointer hover:bg-emerald-50 hover:text-emerald-700' : ''}`,
          };
          return (
            <button
              key={i}
              disabled={!canManage || status === 'past' || status === 'booked' || loading}
              onClick={() => handleDayClick(cell.dateStr!, status)}
              className={`${base} ${styleByStatus[status]} disabled:cursor-default`}
              title={status === 'booked' ? 'Booked' : status === 'closed' ? 'Closed — click to reopen' : status === 'open' && canManage ? 'Click to close this date' : undefined}
            >
              {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : cell.date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 text-[11px] text-neutral-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-100 border border-rose-200" /> Booked</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-neutral-200 border border-neutral-300" /> Closed</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-white border border-neutral-300" /> Open</span>
      </div>
    </div>
  );
}
