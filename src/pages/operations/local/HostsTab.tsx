import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, ArrowLeft, Compass, Home } from 'lucide-react';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { SideDrawer } from '../../../components/SideDrawer';
import { CreateHostForm } from '../../../components/CreateHostForm';
import { PartnerPicker, PartnerOption } from '../../../components/PartnerPicker';
import { AvailabilityCalendar } from '../../../components/AvailabilityCalendar';
import { supabase } from '../../../lib/supabase';
import {
  getHostActivityBookedRanges, getHostHomestayBookedRanges, getManualClosures,
  closeDate, reopenDate, type BookedRange, type ManualClosure,
} from '../../../lib/availability';

type CalendarKind = 'activity' | 'homestay';

export function HostsTab() {
  const [hosts, setHosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PartnerOption | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [calendarKind, setCalendarKind] = useState<CalendarKind>('activity');
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([]);
  const [closures, setClosures] = useState<ManualClosure[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [busyDate, setBusyDate] = useState<string | null>(null);
  const [savingLimit, setSavingLimit] = useState(false);

  useEffect(() => { load(); }, []);

  const loadCalendar = useCallback(async (hostId: string, kind: CalendarKind) => {
    setCalendarLoading(true);
    const [ranges, overrides] = await Promise.all([
      kind === 'activity' ? getHostActivityBookedRanges(hostId) : getHostHomestayBookedRanges(hostId),
      getManualClosures('host', hostId),
    ]);
    setBookedRanges(ranges);
    setClosures(overrides);
    setCalendarLoading(false);
  }, []);

  useEffect(() => {
    if (selected?.id) loadCalendar(selected.id, calendarKind);
  }, [selected?.id, calendarKind, loadCalendar]);

  async function handleCloseDate(date: string) {
    if (!selected?.id) return;
    setBusyDate(date);
    await closeDate('host', selected.id, date, 'Closed by Ops');
    await loadCalendar(selected.id, calendarKind);
    setBusyDate(null);
  }

  async function handleReopenDate(date: string) {
    if (!selected?.id) return;
    setBusyDate(date);
    await reopenDate('host', selected.id, date);
    await loadCalendar(selected.id, calendarKind);
    setBusyDate(null);
  }

  async function updateBookingsPerDay(value: number) {
    if (!selected?.id || value < 1) return;
    setSavingLimit(true);
    await supabase.from('partner_hosts').update({ bookings_per_day: value }).eq('id', selected.id);
    setSelected((s: any) => s ? { ...s, bookings_per_day: value } : s);
    setHosts(prev => prev.map(h => h.id === selected.id ? { ...h, bookings_per_day: value } : h));
    setSavingLimit(false);
  }

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('partner_hosts').select('*').order('created_at', { ascending: false });
    if (!data) { setHosts([]); setLoading(false); return; }
    const partnerIds = [...new Set(data.map(h => h.partner_id))];
    const { data: partners } = partnerIds.length
      ? await supabase.from('portal_users').select('id, name').in('id', partnerIds)
      : { data: [] as { id: string; name: string }[] };
    const nameById = new Map((partners || []).map(p => [p.id, p.name]));
    setHosts(data.map(h => ({ ...h, partnerName: nameById.get(h.partner_id) || 'Unknown partner' })));
    setLoading(false);
  }

  async function toggleStatus(h: any) {
    const next = h.status === 'active' ? 'inactive' : 'active';
    setHosts(prev => prev.map(x => x.id === h.id ? { ...x, status: next } : x));
    if (selected?.id === h.id) setSelected({ ...selected, status: next });
    await supabase.from('partner_hosts').update({ status: next }).eq('id', h.id);
  }

  function closeCreate() {
    setShowCreate(false);
    setSelectedPartner(null);
  }

  const filtered = hosts.filter(h => {
    const q = filter.toLowerCase();
    return !q || h.name.toLowerCase().includes(q) || h.partnerName.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-neutral-200 border-t-neutral-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-700 mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Hosts
        </button>
        <Card className="p-5 max-w-lg">
          <div className="flex items-center gap-3 mb-4">
            {selected.profile_picture ? (
              <img src={selected.profile_picture} alt="" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center text-sm text-neutral-500">{(selected.name || '?')[0]}</div>
            )}
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">{selected.name}</h2>
              <p className="text-xs text-neutral-500">{selected.partnerName}</p>
            </div>
            <span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-medium ${selected.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
              {selected.status}
            </span>
          </div>
          <div className="space-y-2 text-xs mb-5">
            <div><span className="text-neutral-500">Email</span><div className="text-neutral-900">{selected.email || '-'}</div></div>
            <div><span className="text-neutral-500">Phone</span><div className="text-neutral-900">{selected.phone || '-'}</div></div>
            <div><span className="text-neutral-500">Bio</span><div className="text-neutral-900">{selected.bio || '-'}</div></div>
            <div><span className="text-neutral-500">Revenue share</span><div className="text-neutral-900">{selected.revenue_share_pct != null ? `${selected.revenue_share_pct}%` : '-'}</div></div>
            <div>
              <span className="text-neutral-500">Bookings per day (experiences &amp; journeys)</span>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  min={1}
                  value={selected.bookings_per_day ?? 1}
                  onChange={e => updateBookingsPerDay(parseInt(e.target.value, 10) || 1)}
                  disabled={savingLimit}
                  className="w-16 px-2 py-1 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200 disabled:opacity-50"
                />
                <span className="text-neutral-400">Default 1 — one activity at a time, across all this host's listings</span>
              </div>
            </div>
          </div>
          <button onClick={() => toggleStatus(selected)} className="px-4 py-2 text-xs font-medium border border-neutral-300 rounded-lg hover:bg-neutral-50">
            {selected.status === 'active' ? 'Deactivate' : 'Activate'}
          </button>
        </Card>

        <Card className="p-5 max-w-lg mt-4">
          <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl w-fit mb-4">
            <button
              onClick={() => setCalendarKind('activity')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${calendarKind === 'activity' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              <Compass className="w-3.5 h-3.5" /> Experiences &amp; Journeys
            </button>
            <button
              onClick={() => setCalendarKind('homestay')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${calendarKind === 'homestay' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              <Home className="w-3.5 h-3.5" /> Homestay
            </button>
          </div>
          <AvailabilityCalendar
            bookedRanges={bookedRanges}
            closures={closures}
            dailyLimit={calendarKind === 'activity' ? (selected.bookings_per_day || 1) : 1}
            canManage
            onCloseDate={handleCloseDate}
            onReopenDate={handleReopenDate}
            loading={calendarLoading}
            busyDate={busyDate}
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-neutral-500">{hosts.length} host{hosts.length !== 1 ? 's' : ''}</div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter by name or partner..."
              className="pl-9 pr-4 py-2 text-xs border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200 w-64"
            />
          </div>
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Host
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Partner</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Email</th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">Revenue Share</th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-neutral-500">
                    {filter ? 'No hosts match your filter' : 'No hosts yet'}
                  </td>
                </tr>
              ) : (
                filtered.map(h => (
                  <tr key={h.id} onClick={() => setSelected(h)} className="hover:bg-neutral-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-medium text-neutral-900">{h.name}</td>
                    <td className="px-4 py-3 text-neutral-600">{h.partnerName}</td>
                    <td className="px-4 py-3 text-neutral-600">{h.email || '-'}</td>
                    <td className="px-4 py-3 text-center text-neutral-600">{h.revenue_share_pct != null ? `${h.revenue_share_pct}%` : '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${h.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <SideDrawer isOpen={showCreate} onClose={closeCreate} title={selectedPartner ? 'New Host' : 'Pick a partner'}>
        {selectedPartner ? (
          <CreateHostForm
            partnerId={selectedPartner.id}
            onCancel={closeCreate}
            onComplete={() => { closeCreate(); load(); }}
          />
        ) : (
          <PartnerPicker prompt="Which partner is this host under?" onSelect={setSelectedPartner} onCancel={closeCreate} />
        )}
      </SideDrawer>
    </div>
  );
}
