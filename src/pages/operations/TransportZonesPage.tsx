import { useState, useEffect } from 'react';
import { Car, Check, Loader2, Plus, X } from 'lucide-react';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';

interface SurgeRules {
  peak_hours: string[];
  weekend_multiplier: number;
  event_multiplier: number;
  night_surcharge?: number;
}

interface TransportZone {
  id: string;
  region: string;
  base_fare: number;
  per_km_rate: number;
  min_fare: number;
  surge_rules: SurgeRules;
  is_active: boolean;
}

function ZoneCard({ zone, onSaved }: { zone: TransportZone; onSaved: () => void }) {
  const [edit, setEdit] = useState({
    base_fare: String(zone.base_fare),
    per_km_rate: String(zone.per_km_rate),
    min_fare: String(zone.min_fare),
    weekend_multiplier: String(zone.surge_rules?.weekend_multiplier ?? 1),
    event_multiplier: String(zone.surge_rules?.event_multiplier ?? 1),
    night_surcharge: String(zone.surge_rules?.night_surcharge ?? 0),
    peak_hours: zone.surge_rules?.peak_hours || [],
  });
  const [newPeak, setNewPeak] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  function update<K extends keyof typeof edit>(key: K, value: (typeof edit)[K]) {
    setEdit(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function addPeak() {
    if (!/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(newPeak.trim())) return;
    update('peak_hours', [...edit.peak_hours, newPeak.trim()]);
    setNewPeak('');
  }

  function removePeak(idx: number) {
    update('peak_hours', edit.peak_hours.filter((_, i) => i !== idx));
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('transport_zones').update({
      base_fare: parseFloat(edit.base_fare) || 0,
      per_km_rate: parseFloat(edit.per_km_rate) || 0,
      min_fare: parseFloat(edit.min_fare) || 0,
      surge_rules: {
        peak_hours: edit.peak_hours,
        weekend_multiplier: parseFloat(edit.weekend_multiplier) || 1,
        event_multiplier: parseFloat(edit.event_multiplier) || 1,
        night_surcharge: parseFloat(edit.night_surcharge) || 0,
      },
      updated_at: new Date().toISOString(),
    }).eq('id', zone.id);
    setSaving(false);
    if (!error) {
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-neutral-900">{zone.region}</h3>
        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save
          </button>
        )}
        {saved && !dirty && <span className="text-xs text-emerald-600 font-medium">Saved</span>}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-[11px] font-medium text-neutral-500 mb-1">Base fare (RWF)</label>
          <input type="number" min="0" value={edit.base_fare} onChange={e => update('base_fare', e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-neutral-500 mb-1">Per km (RWF)</label>
          <input type="number" min="0" value={edit.per_km_rate} onChange={e => update('per_km_rate', e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-neutral-500 mb-1">Minimum fare (RWF)</label>
          <input type="number" min="0" value={edit.min_fare} onChange={e => update('min_fare', e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200" />
        </div>
      </div>

      <div className="border-t border-neutral-100 pt-4">
        <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-3">Surge pricing</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[11px] font-medium text-neutral-500 mb-1">Weekend multiplier</label>
            <input type="number" min="1" step="0.05" value={edit.weekend_multiplier} onChange={e => update('weekend_multiplier', e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-neutral-500 mb-1">Event multiplier</label>
            <input type="number" min="1" step="0.05" value={edit.event_multiplier} onChange={e => update('event_multiplier', e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200" />
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-[11px] font-medium text-neutral-500 mb-1">Night surcharge, 10pm–5am (RWF, 0 = off)</label>
          <input type="number" min="0" value={edit.night_surcharge} onChange={e => update('night_surcharge', e.target.value)}
            className="w-32 px-2.5 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-neutral-500 mb-1.5">Peak hours (25% surcharge)</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {edit.peak_hours.map((p, i) => (
              <span key={i} className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-lg border border-amber-100">
                {p}
                <button onClick={() => removePeak(i)}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newPeak}
              onChange={e => setNewPeak(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPeak()}
              placeholder="e.g. 07:00-09:00"
              className="flex-1 px-2.5 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200"
            />
            <button onClick={addPeak} className="px-3 py-1.5 text-xs font-medium bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function TransportZonesPage() {
  const [zones, setZones] = useState<TransportZone[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('transport_zones').select('*').order('region');
    setZones(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-neutral-200 border-t-neutral-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Car className="w-4 h-4 text-neutral-500" />
        <h1 className="text-lg font-medium text-neutral-900">Transport Zones</h1>
      </div>
      <p className="text-xs text-neutral-500 mb-6">Base fare, per-km rate, minimum fare, and surge rules per region — used whenever a traveler adds transport to any booking.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {zones.map(z => <ZoneCard key={z.id} zone={z} onSaved={load} />)}
      </div>
    </div>
  );
}
