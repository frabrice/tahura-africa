import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Package, Users, ArrowRight, Clock,
  MessageSquare, Star, CheckCircle, Award, Trophy,
  Zap, Target
} from 'lucide-react';
import { useHostRecord, useHostBookings, useHostListings, getHostContext } from '../../lib/useHostData';
import { useUnreadMessages } from '../../lib/useUnreadMessages';

const COPPER = '#C4883A';
const TEAL = '#0d9488';

export function HostHomePage() {
  const navigate = useNavigate();
  const ctx = getHostContext();
  const { host } = useHostRecord();
  const { bookings } = useHostBookings(ctx?.id);
  const { listings } = useHostListings(ctx?.id);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today]);

  const todayBookings = useMemo(() =>
    bookings.filter(b => b.booking_date === todayStr && b.status !== 'cancelled'),
    [bookings, todayStr]
  );

  const upcoming = useMemo(() =>
    bookings
      .filter(b => b.booking_date > todayStr && b.status !== 'cancelled')
      .sort((a, b) => a.booking_date.localeCompare(b.booking_date))
      .slice(0, 1),
    [bookings, todayStr]
  );

  const nextBooking = upcoming[0] ?? null;

  const totalEarnings = useMemo(() =>
    bookings.filter(b => b.status === 'completed').reduce((s, b) => s + Number(b.total_amount), 0),
    [bookings]
  );

  const completedCount = bookings.filter(b => b.status === 'completed').length;
  const activeListings = listings.filter(l => l.status === 'active').length;
  const hostName = host?.name || ctx?.name || 'Host';
  const initials = hostName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  const profilePic = host?.profile_picture || null;

  const { totalUnread, displayCount: unreadDisplay } = useUnreadMessages('host', ctx?.id);

  const upcomingAll = useMemo(() =>
    bookings.filter(b => b.booking_date >= todayStr && b.status !== 'cancelled'),
    [bookings, todayStr]
  );

  // Achievements
  const achievements: { icon: any; title: string; desc: string; unlocked: boolean; color: string }[] = [
    {
      icon: Star,
      title: 'First Booking',
      desc: 'Received your first booking',
      unlocked: bookings.length > 0,
      color: COPPER,
    },
    {
      icon: CheckCircle,
      title: '5 Completions',
      desc: 'Completed 5 guest stays',
      unlocked: completedCount >= 5,
      color: TEAL,
    },
    {
      icon: Trophy,
      title: '10 Completions',
      desc: 'Completed 10 guest stays',
      unlocked: completedCount >= 10,
      color: '#f59e0b',
    },
    {
      icon: Zap,
      title: 'Active Host',
      desc: 'Has at least 1 active listing',
      unlocked: activeListings >= 1,
      color: '#0ea5e9',
    },
  ];

  const daysUntilNext = nextBooking
    ? Math.round((new Date(nextBooking.booking_date).getTime() - today.getTime()) / 86400000)
    : null;

  return (
    <div className="max-w-2xl mx-auto pb-12 pt-4 md:pt-2">
      {/* Mobile-first hero */}
      <div className="relative rounded-2xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0d4040 100%)' }}>
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="relative p-6 md:p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] mb-1" style={{ color: COPPER }}>Host Dashboard</p>
              <h1 className="text-2xl font-bold text-white">Good {getTimeOfDay()}, {hostName.split(' ')[0]}</h1>
              <p className="text-sm text-slate-400 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            {/* Avatar */}
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border-2" style={{ borderColor: COPPER }}>
              {profilePic ? (
                <img src={profilePic} alt={hostName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white" style={{ background: COPPER }}>
                  {initials}
                </div>
              )}
            </div>
          </div>

          {/* Hero stats strip */}
          <div className="grid grid-cols-3 gap-3">
            <HeroStat label="Earnings" value={`$${totalEarnings >= 1000 ? (totalEarnings / 1000).toFixed(1) + 'k' : totalEarnings.toLocaleString()}`} color={COPPER} />
            <HeroStat label="Upcoming" value={upcomingAll.length.toString()} color="#38bdf8" />
            <HeroStat label="Listings" value={activeListings.toString()} color={TEAL} />
          </div>
        </div>
      </div>

      {/* Alert banners */}
      {(totalUnread > 0 || todayBookings.length > 0) && (
        <div className="flex flex-col gap-2 mb-5">
          {totalUnread > 0 && (
            <AlertBanner
              icon={MessageSquare}
              title={`${unreadDisplay} new message${totalUnread !== 1 ? 's' : ''}`}
              sub="Tap to view conversations"
              color={COPPER}
              onClick={() => navigate('/host/messages')}
            />
          )}
          {todayBookings.length > 0 && (
            <AlertBanner
              icon={Calendar}
              title={`${todayBookings.length} booking${todayBookings.length !== 1 ? 's' : ''} today`}
              sub="Guests arriving today"
              color={TEAL}
              onClick={() => navigate('/host/bookings')}
            />
          )}
        </div>
      )}

      {/* Guest Prep Card — next booking */}
      {nextBooking && (
        <div className="mb-5 p-5 rounded-2xl border" style={{ background: 'rgba(13,148,136,0.04)', borderColor: 'rgba(13,148,136,0.2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4" style={{ color: TEAL }} />
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: TEAL }}>
              {daysUntilNext === 1 ? 'Tomorrow' : daysUntilNext === 0 ? 'Today' : `In ${daysUntilNext} days`} — Guest Prep
            </span>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0" style={{ background: TEAL }}>
              {(nextBooking.traveler_name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-neutral-900">{nextBooking.traveler_name || 'Guest'}</p>
              <p className="text-xs text-neutral-500 truncate">{nextBooking.item_title}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1 text-xs text-neutral-400">
                  <Calendar className="w-3 h-3" />
                  {new Date(nextBooking.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                {nextBooking.guests && (
                  <span className="flex items-center gap-1 text-xs text-neutral-400">
                    <Users className="w-3 h-3" />
                    {nextBooking.guests} guest{nextBooking.guests !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-neutral-900">${Number(nextBooking.total_amount).toLocaleString()}</p>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${TEAL}18`, color: TEAL }}>{nextBooking.status}</span>
            </div>
          </div>
          {/* Prep checklist */}
          <div className="mt-4 pt-4 border-t border-teal-100">
            <p className="text-xs font-semibold text-neutral-600 mb-2">Before they arrive:</p>
            <div className="grid grid-cols-2 gap-2">
              {['Check-in instructions ready', 'Space cleaned & prepared', 'Welcome message sent', 'Supplies stocked'].map(item => (
                <div key={item} className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <div className="w-3.5 h-3.5 rounded border border-neutral-300 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Today's Schedule */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-400" />
            Today's Schedule
          </h2>
          <button onClick={() => navigate('/host/bookings')} className="text-xs font-semibold flex items-center gap-1" style={{ color: COPPER }}>
            All bookings <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {todayBookings.length === 0 ? (
          <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-100 text-center">
            <Calendar className="w-6 h-6 text-neutral-300 mx-auto mb-2" />
            <p className="text-xs text-neutral-400">No guests scheduled for today — enjoy the day off!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayBookings.map(b => (
              <div key={b.id} className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-neutral-100 shadow-sm">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: TEAL }}>
                  {(b.traveler_name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-neutral-900 truncate">{b.traveler_name || 'Guest'}</p>
                  <p className="text-xs text-neutral-500 truncate">{b.item_title}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {b.session && <p className="text-xs text-neutral-500">{b.session}</p>}
                  <p className="text-xs font-semibold text-neutral-900">${Number(b.total_amount).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Listings summary */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-neutral-400" />
            Your Listings
          </h2>
          <button onClick={() => navigate('/host/listings')} className="text-xs font-semibold flex items-center gap-1" style={{ color: COPPER }}>
            Manage <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {listings.length === 0 ? (
          <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-100 text-center">
            <Package className="w-6 h-6 text-neutral-300 mx-auto mb-2" />
            <p className="text-xs text-neutral-400">No listings yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {listings.slice(0, 4).map(l => {
              const lBookings = bookings.filter(b => b.item_id === l.id && b.status !== 'cancelled').length;
              const sc = l.status === 'active' ? { bg: '#dcfce7', text: '#16a34a' } : l.status === 'paused' ? { bg: '#fef3c7', text: '#d97706' } : { bg: '#f3f4f6', text: '#6b7280' };
              return (
                <div key={l.id} className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-neutral-100 shadow-sm">
                  <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-100">
                    {l.media?.[0] ? (
                      <img src={l.media[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-neutral-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-neutral-900 truncate">{l.title}</p>
                    <p className="text-xs text-neutral-400 capitalize">{l.listing_type} · {lBookings} booking{lBookings !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: sc.bg, color: sc.text }}>{l.status}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Achievements */}
      <div>
        <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2 mb-3">
          <Award className="w-4 h-4 text-neutral-400" />
          Achievements
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {achievements.map(a => (
            <div
              key={a.title}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${a.unlocked ? 'bg-white border-neutral-100 shadow-sm' : 'bg-neutral-50 border-neutral-100 opacity-40'}`}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: a.unlocked ? `${a.color}18` : '#f3f4f6' }}
              >
                <a.icon className="w-5 h-5" style={{ color: a.unlocked ? a.color : '#9ca3af' }} />
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-bold truncate ${a.unlocked ? 'text-neutral-900' : 'text-neutral-400'}`}>{a.title}</p>
                <p className="text-xs text-neutral-400 truncate">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function HeroStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs font-medium" style={{ color }}>{label}</p>
    </div>
  );
}

function AlertBanner({ icon: Icon, title, sub, color, onClick }: {
  icon: any; title: string; sub: string; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all duration-200 group"
      style={{ background: `${color}09`, borderColor: `${color}25` }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color }}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-neutral-900">{title}</p>
        <p className="text-xs text-neutral-500">{sub}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
    </button>
  );
}
