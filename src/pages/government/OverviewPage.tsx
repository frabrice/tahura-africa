import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, Shield, Globe, Users, BookOpen, Layers, Calendar, MapPin } from 'lucide-react';

const BLUE = '#3b82f6';

interface StatItem {
  label: string;
  value: number;
  sub: string;
  icon: React.ElementType;
  accent: string;
}

export function OverviewPage() {
  const [stats, setStats] = useState({ totalBookings: 0, totalInstitutions: 0, totalPrograms: 0, totalPartners: 0, totalGuides: 0, totalListings: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    setLoading(true);
    const [bookingsRes, institutionsRes, programsRes, partnersRes, guidesRes, listingsRes] = await Promise.all([
      supabase.from('bookings').select('id', { count: 'exact', head: true }),
      supabase.from('institution_profiles').select('id', { count: 'exact', head: true }).eq('published', true),
      supabase.from('programs').select('id', { count: 'exact', head: true }).eq('active', true),
      supabase.from('portal_users').select('id', { count: 'exact', head: true }).eq('portal_type', 'partner'),
      supabase.from('guides').select('id', { count: 'exact', head: true }).eq('available', true),
      supabase.from('partner_listings').select('id', { count: 'exact', head: true }),
    ]);
    setStats({
      totalBookings:     bookingsRes.count || 0,
      totalInstitutions: institutionsRes.count || 0,
      totalPrograms:     programsRes.count || 0,
      totalPartners:     partnersRes.count || 0,
      totalGuides:       guidesRes.count || 0,
      totalListings:     listingsRes.count || 0,
    });
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
    );
  }

  const statItems: StatItem[] = [
    { label: 'Total Bookings',    value: stats.totalBookings,     sub: 'All time',      icon: Calendar, accent: BLUE       },
    { label: 'Attractions',       value: stats.totalInstitutions, sub: 'Published',     icon: MapPin,   accent: '#10b981' },
    { label: 'Active Programs',   value: stats.totalPrograms,     sub: 'Running',       icon: BookOpen, accent: '#d97706' },
    { label: 'Partners',          value: stats.totalPartners,     sub: 'Registered',    icon: Globe,    accent: '#0ea5e9' },
    { label: 'Active Guides',     value: stats.totalGuides,       sub: 'Available',     icon: Users,    accent: '#f43f5e' },
    { label: 'Listings',          value: stats.totalListings,     sub: 'On platform',   icon: Layers,   accent: '#0d9488' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] mb-1" style={{ color: BLUE }}>Government Portal</p>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-neutral-900">National Tourism Overview</h1>
        <p className="text-sm text-neutral-500 mt-1">Aggregated, anonymized data from across the Tahura platform.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {statItems.map(({ label, value, sub, icon: Icon, accent }) => (
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

      {/* Status panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-neutral-100 rounded-2xl p-5 shadow-warm-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${BLUE}15` }}>
              <Activity className="w-4 h-4" style={{ color: BLUE }} />
            </div>
            <h3 className="text-sm font-bold text-neutral-900">Platform Status</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Platform Health', value: 'Operational', highlight: true },
              { label: 'Data Source',     value: 'Live Platform Data', highlight: false },
              { label: 'Last Refreshed',  value: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }), highlight: false },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-neutral-50 last:border-0">
                <span className="text-sm text-neutral-500">{label}</span>
                {highlight ? (
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-full" style={{ background: '#dcfce7', color: '#16a34a' }}>
                    {value}
                  </span>
                ) : (
                  <span className="text-sm font-medium text-neutral-800">{value}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-neutral-100 rounded-2xl p-5 shadow-warm-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-neutral-100">
              <Shield className="w-4 h-4 text-neutral-500" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900">Data Transparency Notice</h3>
          </div>
          <div className="space-y-3 text-sm text-neutral-500 leading-relaxed">
            <p>
              This portal provides read-only access to aggregated tourism activity data collected through the Tahura platform.
            </p>
            <p>
              All metrics reflect activity from verified institutions, licensed partners, and registered travelers. Individual transaction details and personal information are not accessible.
            </p>
            <p className="text-xs text-neutral-400 pt-1 border-t border-neutral-100">Data refresh cycle: Real-time</p>
          </div>
        </div>
      </div>
    </div>
  );
}
