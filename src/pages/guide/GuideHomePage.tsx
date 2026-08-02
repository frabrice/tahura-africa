import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, DollarSign, BookOpen, Users, ArrowRight, Clock, MessageSquare, TrendingUp } from 'lucide-react';
import { useGuideRecord, useGuideBookings, useGuidePrograms, getGuideContext } from '../../lib/useGuideData';
import { useUnreadMessages } from '../../lib/useUnreadMessages';

const TEAL = '#0d9488';

function StatCard({ icon: Icon, label, value, sub, accentColor }: {
  icon: React.ElementType; label: string; value: string; sub?: string; accentColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 relative overflow-hidden border border-neutral-100 shadow-warm-sm hover:shadow-warm transition-all duration-300 group">
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: accentColor }} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accentColor}15` }}>
          <Icon className="w-5 h-5" style={{ color: accentColor }} />
        </div>
        <TrendingUp className="w-4 h-4 text-neutral-300 group-hover:text-neutral-400 transition-colors" />
      </div>
      <p className="text-2xl font-bold text-neutral-900 mb-0.5 font-display">{value}</p>
      <p className="text-xs font-semibold text-neutral-600">{label}</p>
      {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export function GuideHomePage() {
  const navigate = useNavigate();
  const ctx = getGuideContext();
  const { guide } = useGuideRecord();
  const { bookings } = useGuideBookings(ctx?.id);
  const { programs } = useGuidePrograms(ctx?.id);

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const upcoming = useMemo(() =>
    bookings.filter(b => new Date(b.booking_date) >= today && b.status !== 'cancelled').slice(0, 5),
    [bookings, today]
  );

  const totalEarnings = useMemo(() =>
    bookings.filter(b => b.status === 'completed').reduce((s, b) => s + Number(b.total_amount), 0),
    [bookings]
  );

  const guideName = guide?.name || ctx?.name || 'Guide';
  const { totalUnread, displayCount: unreadDisplay } = useUnreadMessages('guide', ctx?.id);
  const upcomingAll = useMemo(() =>
    bookings.filter(b => new Date(b.booking_date) >= today && b.status !== 'cancelled'),
    [bookings, today]
  );

  const statusColor: Record<string, string> = {
    confirmed: TEAL,
    completed: '#16a34a',
    pending:   '#d97706',
    cancelled: '#dc2626',
  };

  return (
    <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto animate-fade-in">
      {/* Greeting */}
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.15em] mb-1" style={{ color: TEAL }}>Guide Dashboard</p>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-neutral-900">
          Welcome back, {guideName.split(' ')[0]}
        </h1>
        <p className="text-sm text-neutral-500 mt-1">Here's an overview of your guiding activity.</p>
      </div>

      {/* Alerts */}
      {(totalUnread > 0 || upcomingAll.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          {totalUnread > 0 && (
            <button
              onClick={() => navigate('/guide/messages')}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all duration-200 flex-1 group"
              style={{ background: `${TEAL}0a`, borderColor: `${TEAL}30` }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: TEAL }}>
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-neutral-900">{unreadDisplay} new message{totalUnread !== 1 ? 's' : ''}</p>
                <p className="text-xs text-neutral-500">Tap to view conversations</p>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
          {upcomingAll.length > 0 && (
            <button
              onClick={() => navigate('/guide/bookings')}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all duration-200 flex-1 group"
              style={{ background: 'rgba(14,165,233,0.06)', borderColor: 'rgba(14,165,233,0.2)' }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-sky-500">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-neutral-900">{upcomingAll.length > 9 ? '9+' : upcomingAll.length} upcoming tour{upcomingAll.length !== 1 ? 's' : ''}</p>
                <p className="text-xs text-neutral-500">Tap to view schedule</p>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard icon={DollarSign} label="Total Earnings"  value={`$${totalEarnings.toLocaleString()}`}                          sub="Completed tours"      accentColor="#C4883A" />
        <StatCard icon={Calendar}   label="Upcoming Tours"  value={upcoming.length.toString()}                                     sub="Confirmed bookings"  accentColor="#0ea5e9" />
        <StatCard icon={BookOpen}   label="Programs"        value={programs.length.toString()}                                     sub="Assigned to you"      accentColor={TEAL}    />
        <StatCard icon={Users}      label="All Bookings"    value={bookings.filter(b => b.status !== 'cancelled').length.toString()} sub="All time"            accentColor="#8b5cf6" />
      </div>

      {/* Detail panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming tours */}
        <div className="bg-white border border-neutral-100 rounded-2xl p-5 shadow-warm-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Upcoming Tours</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Next scheduled tours</p>
            </div>
            <button onClick={() => navigate('/guide/bookings')} className="flex items-center gap-1 text-xs font-semibold transition-colors" style={{ color: TEAL }}>
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {upcoming.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-8 h-8 text-neutral-200 mx-auto mb-2" />
              <p className="text-sm text-neutral-400">No upcoming tours</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((b) => (
                <div key={b.id} className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border border-neutral-200">
                    <span className="text-xs font-bold text-neutral-700">
                      {(b.traveler_name || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-neutral-900 truncate">{b.traveler_name || 'Guest'}</p>
                    <p className="text-xs text-neutral-500 truncate">{b.item_title}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-[10px] text-neutral-400">
                        <Clock className="w-3 h-3" />
                        {new Date(b.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-neutral-900">${Number(b.total_amount).toLocaleString()}</p>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${statusColor[b.status] || '#888'}15`, color: statusColor[b.status] || '#888' }}
                    >
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Programs */}
        <div className="bg-white border border-neutral-100 rounded-2xl p-5 shadow-warm-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">My Programs</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Assigned programs</p>
            </div>
            <button onClick={() => navigate('/guide/programs')} className="flex items-center gap-1 text-xs font-semibold transition-colors" style={{ color: TEAL }}>
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {programs.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-8 h-8 text-neutral-200 mx-auto mb-2" />
              <p className="text-sm text-neutral-400">No programs assigned yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {programs.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${TEAL}15` }}>
                    <BookOpen className="w-4 h-4" style={{ color: TEAL }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-neutral-900 truncate">{p.title}</p>
                    <p className="text-[10px] text-neutral-400">{Number(p.duration_hours)}h · {p.max_participants} max</p>
                  </div>
                  <span className="text-xs font-bold text-neutral-700">${Number(p.price_per_person)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
