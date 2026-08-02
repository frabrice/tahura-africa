import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';
import {
  Users, Calendar, Activity, CheckCircle, Clock, Package,
  TrendingUp, AlertCircle, Star, Zap
} from 'lucide-react';

const AMBER = '#d97706';
const AMBER_LIGHT = '#fbbf24';

interface Profile {
  name: string;
  daily_capacity: number;
  visiting_hours: string;
  entry_fee: string;
  type: string;
  published: boolean;
}

interface Booking {
  id: string;
  traveler_name: string;
  package_name: string | null;
  booking_date: string;
  guests: number;
  status: string;
  guide_name: string | null;
  created_at: string;
}

interface Guide {
  id: string;
  name: string;
  available: boolean;
  specializations: string[];
}

interface Program {
  id: string;
  title: string;
  active: boolean;
  max_participants: number;
}

export function HomePage() {
  const { user } = useAuth();
  const userId = (user as PortalUser)?.id;
  const userName = (user as PortalUser)?.name || 'Institution';

  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) loadAll();
  }, [userId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [profileRes, bookingsRes, guidesRes, programsRes] = await Promise.all([
        supabase.from('institution_profiles').select('name,daily_capacity,visiting_hours,entry_fee,type,published').eq('portal_user_id', userId).maybeSingle(),
        supabase.from('bookings').select('id,traveler_name,package_name,booking_date,guests,status,guide_name,created_at').eq('institution_id', userId).order('created_at', { ascending: false }),
        supabase.from('guides').select('id,name,available,specializations').eq('portal_user_id', userId),
        supabase.from('programs').select('id,title,active,max_participants').eq('portal_user_id', userId),
      ]);
      setProfile(profileRes.data || null);
      setBookings(bookingsRes.data || []);
      setGuides(guidesRes.data || []);
      setPrograms(programsRes.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const todayBookings = bookings.filter(b => b.booking_date === today && b.status !== 'cancelled');
  const visitorsToday = todayBookings.reduce((s, b) => s + b.guests, 0);
  const upcomingBookings = bookings.filter(b => b.booking_date >= today && b.status === 'confirmed');
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const activePrograms = programs.filter(p => p.active).length;
  const availableGuides = guides.filter(g => g.available).length;

  const dailyCap = profile?.daily_capacity || 500;
  const capacityPct = Math.min(Math.round((visitorsToday / dailyCap) * 100), 100);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const thisMonthBookings = bookings.filter(b => b.booking_date >= thisMonthStart && b.status !== 'cancelled');
  const thisMonthVisitors = thisMonthBookings.reduce((s, b) => s + b.guests, 0);

  const recentBookings = [...bookings].slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 rounded-2xl skeleton-shimmer" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 rounded-2xl skeleton-shimmer" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] mb-1" style={{ color: AMBER_LIGHT }}>Institutions Platform</p>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-neutral-900">
            {greeting}, {profile?.name || userName}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        {profile && !profile.published && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ background: '#fef3c7', borderColor: '#fde68a' }}>
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">Profile not published</span>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Visitors Today',     value: visitorsToday,          sub: `of ${dailyCap.toLocaleString()} capacity`, icon: Users,    accent: AMBER },
          { label: 'Upcoming Bookings',  value: upcomingBookings.length, sub: 'All confirmed',                           icon: Calendar, accent: '#0ea5e9' },
          { label: 'Active Programs',    value: activePrograms,          sub: `${programs.length} total`,                icon: Package,  accent: '#10b981' },
          { label: 'Guides Available',   value: availableGuides,         sub: `${guides.length} total guides`,           icon: Star,     accent: '#f43f5e' },
        ].map(({ label, value, sub, icon: Icon, accent }) => (
          <div key={label} className="bg-white rounded-2xl p-5 relative overflow-hidden border border-neutral-100 shadow-warm-sm hover:shadow-warm transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: accent }} />
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: `${accent}15` }}>
              <Icon className="w-4 h-4" style={{ color: accent }} />
            </div>
            <div className="text-2xl font-bold text-neutral-900 font-display">{value.toLocaleString()}</div>
            <div className="text-xs font-semibold text-neutral-600 mt-0.5">{label}</div>
            <div className="text-[10px] text-neutral-400 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Capacity + Monthly + Quick Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Capacity */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-warm-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${AMBER}15` }}>
              <Activity className="w-3.5 h-3.5" style={{ color: AMBER }} />
            </div>
            <span className="text-sm font-bold text-neutral-900">Capacity Today</span>
          </div>
          <div className="text-3xl font-bold font-display text-neutral-900 mb-1">{capacityPct}%</div>
          <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden mb-3">
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${capacityPct}%`,
                background: capacityPct >= 90 ? '#ef4444' : capacityPct >= 70 ? AMBER : '#10b981',
              }} />
          </div>
          <div className="flex justify-between text-xs text-neutral-500">
            <span>{visitorsToday} visitors</span>
            <span className="font-semibold" style={{ color: AMBER }}>{dailyCap - visitorsToday} remaining</span>
          </div>
        </div>

        {/* Monthly */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-warm-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-50">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-sm font-bold text-neutral-900">This Month</span>
          </div>
          <div className="text-3xl font-bold font-display text-neutral-900 mb-1">{thisMonthVisitors.toLocaleString()}</div>
          <div className="text-xs text-neutral-500 mb-3">total visitors</div>
          <div className="text-xs text-neutral-400">{thisMonthBookings.length} bookings recorded</div>
        </div>

        {/* Quick status */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-warm-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-neutral-100">
              <CheckCircle className="w-3.5 h-3.5 text-neutral-500" />
            </div>
            <span className="text-sm font-bold text-neutral-900">Quick Status</span>
          </div>
          <div className="space-y-2.5">
            {[
              { label: 'Profile',    value: profile?.published ? 'Published' : 'Draft',                ok: !!profile?.published },
              { label: 'Programs',   value: `${activePrograms} active`,                                ok: activePrograms > 0 },
              { label: 'Guides',     value: `${availableGuides} available`,                            ok: availableGuides > 0 },
              { label: 'Entry Fee',  value: profile?.entry_fee || 'Not set',                           ok: !!profile?.entry_fee },
            ].map(({ label, value, ok }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">{label}</span>
                <span className="text-xs font-semibold" style={{ color: ok ? '#10b981' : '#94a3b8' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bookings + Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-warm-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-50">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-neutral-400" />
              <h2 className="text-sm font-bold text-neutral-900">Recent Bookings</h2>
            </div>
            <span className="text-xs text-neutral-400">{recentBookings.length} shown</span>
          </div>
          {recentBookings.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400">No bookings yet</div>
          ) : (
            <div>
              {recentBookings.map(b => {
                const statusStyle = b.status === 'confirmed'
                  ? { bg: '#dcfce7', text: '#16a34a' }
                  : b.status === 'pending'
                  ? { bg: '#fef3c7', text: '#d97706' }
                  : b.status === 'completed'
                  ? { bg: '#dbeafe', text: '#2563eb' }
                  : { bg: '#fee2e2', text: '#dc2626' };
                return (
                  <div key={b.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50 transition-colors">
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: b.status === 'confirmed' ? '#10b981' : b.status === 'pending' ? AMBER : b.status === 'completed' ? '#3b82f6' : '#ef4444' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-neutral-900 truncate">{b.traveler_name}</div>
                      <div className="text-xs text-neutral-500 truncate">{b.package_name || 'General Visit'}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-semibold text-neutral-900">{b.guests} {b.guests === 1 ? 'visitor' : 'visitors'}</div>
                      <div className="text-xs text-neutral-400">{new Date(b.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full capitalize flex-shrink-0"
                      style={{ background: statusStyle.bg, color: statusStyle.text }}>
                      {b.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-neutral-100 shadow-warm-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-50">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-neutral-400" />
              <h2 className="text-sm font-bold text-neutral-900">Today's Schedule</h2>
            </div>
            <span className="text-xs text-neutral-400">{todayBookings.length} visits</span>
          </div>
          {todayBookings.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400">No visits scheduled for today</div>
          ) : (
            <div>
              {todayBookings.slice(0, 5).map(b => (
                <div key={b.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${AMBER}15` }}>
                    <Users className="w-3.5 h-3.5" style={{ color: AMBER }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-neutral-900 truncate">{b.package_name || 'General Visit'}</div>
                    <div className="text-xs text-neutral-500">{b.traveler_name} &bull; {b.guests} visitors</div>
                  </div>
                  {b.guide_name && (
                    <span className="text-xs text-neutral-400 flex-shrink-0">{b.guide_name}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'This Month Visitors', value: thisMonthVisitors.toLocaleString(), icon: Users,    alert: false },
          { label: 'Guides On Duty',      value: `${availableGuides}/${guides.length}`, icon: Star,  alert: false },
          { label: 'Pending Actions',     value: pendingBookings.length.toString(),   icon: Clock,   alert: pendingBookings.length > 0 },
        ].map(({ label, value, icon: Icon, alert }) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-neutral-100 shadow-warm-sm flex items-center gap-3 hover:shadow-warm transition-all duration-300">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: alert ? '#fef3c7' : `${AMBER}10` }}>
              <Icon className="w-4 h-4" style={{ color: alert ? '#d97706' : AMBER }} />
            </div>
            <div>
              <div className="text-xl font-bold text-neutral-900 font-display">{value}</div>
              <div className="text-xs text-neutral-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Setup checklist */}
      {(activePrograms === 0 || guides.length === 0 || !profile?.published) && (
        <div className="bg-white rounded-2xl p-5 border shadow-warm-sm" style={{ borderColor: `${AMBER}30` }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${AMBER}15` }}>
              <Zap className="w-4 h-4" style={{ color: AMBER }} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-neutral-900 mb-3">Setup Checklist</h3>
              <div className="space-y-2.5">
                {[
                  { done: !!profile?.name,      label: 'Complete your institution profile' },
                  { done: !!profile?.published,  label: 'Publish your institution for travelers to discover' },
                  { done: guides.length > 0,     label: 'Add at least one guide or staff member' },
                  { done: activePrograms > 0,    label: 'Create an active program or package' },
                ].map(({ done, label }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{ borderColor: done ? '#10b981' : '#d1d5db', background: done ? '#10b981' : 'transparent' }}>
                      {done && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-xs ${done ? 'line-through text-neutral-400' : 'text-neutral-700'}`}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
