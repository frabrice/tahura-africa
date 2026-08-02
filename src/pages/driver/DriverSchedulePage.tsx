import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Car,
} from 'lucide-react';

const TEAL = '#0d9488';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface DaySchedule {
  date: string;
  status: 'available' | 'off_duty' | 'leave' | 'booked';
  startTime?: string;
  endTime?: string;
  trips?: number;
}

export function DriverSchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    status: 'available' as 'available' | 'off_duty' | 'leave',
    startTime: '07:00',
    endTime: '19:00',
  });

  // Generate mock schedule data
  const scheduleData = useMemo(() => {
    const data: Record<string, DaySchedule> = {};
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Generate schedule for current month
    for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month, day).getDay();

      // Mock: Weekdays mostly available, some weekends off
      if (dayOfWeek === 0) {
        data[dateStr] = { date: dateStr, status: 'off_duty' };
      } else if (day === 15 || day === 22) {
        data[dateStr] = { date: dateStr, status: 'booked', trips: 5, startTime: '08:00', endTime: '18:00' };
      } else if (Math.random() > 0.8) {
        data[dateStr] = { date: dateStr, status: 'leave' };
      } else {
        data[dateStr] = { date: dateStr, status: 'available', startTime: '07:00', endTime: '19:00' };
      }
    }

    return data;
  }, [currentDate]);

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Array<{ date: Date; dayNum: number; isCurrentMonth: boolean }> = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevMonthDay = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push({ date: prevMonthDay, dayNum: prevMonthDay.getDate(), isCurrentMonth: false });
    }

    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), dayNum: day, isCurrentMonth: true });
    }

    // Add remaining days to complete the grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), dayNum: i, isCurrentMonth: false });
    }

    return days;
  };

  const formatDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
      case 'booked': return <Car className="w-3.5 h-3.5 text-blue-500" />;
      case 'off_duty': return <XCircle className="w-3.5 h-3.5 text-slate-400" />;
      case 'leave': return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
      default: return null;
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const handleDayClick = (dateKey: string) => {
    setSelectedDate(dateKey);
    const schedule = scheduleData[dateKey];
    if (schedule && schedule.status !== 'booked') {
      setEditingDate(dateKey);
      setEditForm({
        status: schedule.status as 'available' | 'off_duty' | 'leave',
        startTime: schedule.startTime || '07:00',
        endTime: schedule.endTime || '19:00',
      });
    }
  };

  const handleSaveSchedule = () => {
    if (editingDate) {
      // In production, save to Supabase
      console.log('Saving schedule for', editingDate, editForm);
      setEditingDate(null);
    }
  };

  const days = getDaysInMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Stats for current month
  const availableDays = Object.values(scheduleData).filter(s => s.status === 'available').length;
  const bookedDays = Object.values(scheduleData).filter(s => s.status === 'booked').length;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Schedule</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your availability and time off</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-xl">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-emerald-100 border border-emerald-300" />
          <span className="text-sm text-slate-600">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-100 border border-blue-300" />
          <span className="text-sm text-slate-600">Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-slate-100 border border-slate-300" />
          <span className="text-sm text-slate-600">Off Duty</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-amber-100 border border-amber-300" />
          <span className="text-sm text-slate-600">Leave</span>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h2 className="font-semibold text-lg text-slate-900">
          {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {DAYS.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-xs font-medium text-slate-500"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const dateKey = formatDateKey(day.date);
            const schedule = scheduleData[dateKey];
            const isToday = day.date.getTime() === today.getTime();
            const isSelected = selectedDate === dateKey;

            return (
              <motion.button
                key={index}
                onClick={() => handleDayClick(dateKey)}
                className={`relative aspect-square p-1 border-b border-r border-slate-100 text-left transition-colors hover:bg-slate-50 ${
                  !day.isCurrentMonth ? 'bg-slate-50' : ''
                } ${isSelected ? 'ring-2 ring-inset' : ''}`}
                style={isSelected ? ({ '--tw-ring-color': TEAL } as React.CSSProperties) : {}}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex flex-col h-full">
                  <span
                    className={`text-sm font-medium ${
                      isToday
                        ? 'text-white bg-teal-500 rounded-full w-7 h-7 flex items-center justify-center'
                        : day.isCurrentMonth
                        ? 'text-slate-900'
                        : 'text-slate-400'
                    }`}
                  >
                    {day.dayNum}
                  </span>
                  {schedule && day.isCurrentMonth && (
                    <div className="mt-auto">
                      {getStatusIcon(schedule.status)}
                      {schedule.trips && (
                        <div className="text-[10px] text-blue-600 font-medium mt-0.5">
                          {schedule.trips} trips
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
          <div className="text-2xl font-bold text-emerald-600">{availableDays}</div>
          <div className="text-xs text-slate-500 mt-1">Available Days</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
          <div className="text-2xl font-bold text-blue-600">{bookedDays}</div>
          <div className="text-xs text-slate-500 mt-1">Booked Days</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
          <div className="text-2xl font-bold text-slate-900">
            {Object.values(scheduleData).reduce((sum: number, s: DaySchedule) => sum + (s.trips || 0), 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Total Trips</div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingDate && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setEditingDate(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">
                  Set Availability
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {new Date(editingDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'available', label: 'Available', color: 'emerald' },
                      { value: 'off_duty', label: 'Off Duty', color: 'slate' },
                      { value: 'leave', label: 'Leave', color: 'amber' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setEditForm((prev) => ({
                            ...prev,
                            status: opt.value as 'available' | 'off_duty' | 'leave',
                          }))
                        }
                        className={`p-3 rounded-lg text-sm font-medium border transition-colors ${
                          editForm.status === opt.value
                            ? opt.color === 'emerald'
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                              : opt.color === 'slate'
                              ? 'bg-slate-100 border-slate-500 text-slate-700'
                              : 'bg-amber-50 border-amber-500 text-amber-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {editForm.status === 'available' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={editForm.startTime}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, startTime: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={editForm.endTime}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, endTime: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 px-6 pb-6">
                <button
                  onClick={() => setEditingDate(null)}
                  className="flex-1 py-2.5 font-medium border border-slate-300 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSchedule}
                  className="flex-1 py-2.5 font-medium text-white rounded-xl"
                  style={{ background: TEAL }}
                >
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
