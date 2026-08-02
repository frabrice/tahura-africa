import { useState, useEffect } from 'react';
import { Plus, Shield, AlertTriangle, Calendar, X, Check } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';

interface CapacityRule {
  id: string;
  institution_id: string;
  rule_type: string;
  applies_to: string;
  capacity: number;
  reason: string | null;
  active: boolean;
  created_at: string;
}

interface DayOutlook {
  date: string;
  day: string;
  bookings: number;
  visitors: number;
}

interface ProfileCapacity {
  daily_capacity: number;
  opening_time: string | null;
  closing_time: string | null;
  closed_days: string[] | null;
}

export function SchedulePage() {
  const { user } = useAuth();
  const userId = (user as PortalUser)?.id;
  const [rules, setRules] = useState<CapacityRule[]>([]);
  const [profile, setProfile] = useState<ProfileCapacity | null>(null);
  const [outlook, setOutlook] = useState<DayOutlook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRule, setShowAddRule] = useState(false);
  const [showEditCapacity, setShowEditCapacity] = useState(false);

  useEffect(() => {
    if (userId) loadData();
  }, [userId]);

  async function loadData() {
    if (!userId) return;
    setLoading(true);
    try {
      const today = new Date();
      const in7Days = new Date(today);
      in7Days.setDate(today.getDate() + 6);
      const todayStr = today.toISOString().split('T')[0];
      const endStr = in7Days.toISOString().split('T')[0];

      const [profileRes, rulesRes, bookingsRes] = await Promise.all([
        supabase.from('institution_profiles')
          .select('daily_capacity, opening_time, closing_time, closed_days')
          .eq('portal_user_id', userId)
          .maybeSingle(),
        supabase.from('capacity_rules')
          .select('*')
          .eq('institution_id', userId)
          .eq('active', true)
          .order('created_at', { ascending: false }),
        supabase.from('bookings')
          .select('booking_date, guests')
          .eq('institution_id', userId)
          .gte('booking_date', todayStr)
          .lte('booking_date', endStr)
          .neq('status', 'cancelled'),
      ]);

      setProfile(profileRes.data || { daily_capacity: 500, opening_time: null, closing_time: null, closed_days: null });
      setRules(rulesRes.data || []);

      const dayMap = new Map<string, DayOutlook>();
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
        dayMap.set(dateStr, { date: dateStr, day: dayName, bookings: 0, visitors: 0 });
      }

      (bookingsRes.data || []).forEach((b: { booking_date: string; guests: number }) => {
        const dateKey = b.booking_date.split('T')[0];
        const existing = dayMap.get(dateKey);
        if (existing) {
          dayMap.set(dateKey, { ...existing, bookings: existing.bookings + 1, visitors: existing.visitors + b.guests });
        }
      });

      setOutlook(Array.from(dayMap.values()));
    } catch (err) {
      console.error('Error loading schedule:', err);
    }
    setLoading(false);
  }

  async function deactivateRule(id: string) {
    await supabase.from('capacity_rules').update({ active: false }).eq('id', id);
    setRules(prev => prev.filter(r => r.id !== id));
  }

  const dailyCapacity = profile?.daily_capacity || 500;
  const blockedRules = rules.filter(r => r.rule_type === 'blocked_date');
  const capacityRules = rules.filter(r => r.rule_type !== 'blocked_date');

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Schedule & Capacity</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Manage visitor capacity and availability rules</p>
        </div>
        <Button size="sm" onClick={() => setShowAddRule(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Rule
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="p-5 bg-teal-50">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-4 h-4 text-neutral-500" />
            <h3 className="text-sm font-medium text-neutral-900">Daily Capacity</h3>
          </div>
          <div className="text-2xl font-semibold text-neutral-900 mb-1">{dailyCapacity.toLocaleString()}</div>
          <div className="text-xs text-neutral-500 mb-3">Maximum visitors per day</div>
          <button
            onClick={() => setShowEditCapacity(true)}
            className="text-xs text-neutral-500 hover:text-neutral-900 underline transition-colors"
          >
            Edit capacity
          </button>
        </Card>

        <Card className="p-5 bg-blue-50">
          <h3 className="text-sm font-medium text-neutral-900 mb-2">Operating Hours</h3>
          <div className="text-sm text-neutral-900 mb-1">
            {profile?.opening_time && profile?.closing_time
              ? `${profile.opening_time} — ${profile.closing_time}`
              : 'Not configured'}
          </div>
          <div className="text-xs text-neutral-500 mb-3">
            {profile?.closed_days && profile.closed_days.length > 0
              ? `Closed: ${profile.closed_days.join(', ')}`
              : 'Open all days'}
          </div>
          <button
            onClick={() => setShowEditCapacity(true)}
            className="text-xs text-neutral-500 hover:text-neutral-900 underline transition-colors"
          >
            Edit hours
          </button>
        </Card>

        <Card className="p-5 bg-rose-50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-medium text-neutral-900">Active Rules</h3>
          </div>
          <div className="text-2xl font-semibold text-neutral-900 mb-1">{rules.length}</div>
          <div className="text-xs text-neutral-500">
            {blockedRules.length} blocked date{blockedRules.length !== 1 ? 's' : ''} · {capacityRules.length} capacity rule{capacityRules.length !== 1 ? 's' : ''}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <Card className="p-5 bg-lime-50">
          <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-neutral-400" />
            7-Day Visitor Outlook
          </h3>
          <div className="space-y-3">
            {outlook.map(day => {
              const pct = dailyCapacity > 0 ? Math.min(Math.round((day.visitors / dailyCapacity) * 100), 100) : 0;
              const isBlocked = blockedRules.some(r => r.applies_to === day.date);
              return (
                <div key={day.date} className="flex items-center gap-4">
                  <div className="w-24 flex-shrink-0">
                    <div className="text-xs font-medium text-neutral-900">{day.day}</div>
                    <div className="text-xs text-neutral-500">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </div>
                  <div className="flex-1">
                    {isBlocked ? (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-xs text-rose-600 font-medium">Blocked</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-neutral-600">{day.visitors} visitors · {day.bookings} booking{day.bookings !== 1 ? 's' : ''}</span>
                          <span className="text-xs text-neutral-500">{pct}%</span>
                        </div>
                        <div className="w-full bg-neutral-100 h-2 rounded-full">
                          <div
                            className={`h-2 rounded-full ${pct >= 80 ? 'bg-orange-500' : pct >= 50 ? 'bg-blue-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 bg-amber-50">
          <h3 className="text-sm font-semibold text-neutral-900 mb-4">Active Capacity Rules</h3>
          {rules.length === 0 ? (
            <div className="text-sm text-neutral-500">
              No active rules. Add rules to manage specific date capacities or block dates.
            </div>
          ) : (
            <div className="space-y-3">
              {rules.slice(0, 6).map(rule => {
                const typeLabel = rule.rule_type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                return (
                  <div key={rule.id} className="p-3 border border-neutral-200 bg-white rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {rule.rule_type === 'blocked_date' && <AlertTriangle className="w-3 h-3 text-orange-500 flex-shrink-0" />}
                          <span className="text-xs font-medium text-neutral-900">{typeLabel}</span>
                        </div>
                        <div className="text-xs text-neutral-600 mb-0.5">{rule.applies_to}</div>
                        {rule.capacity > 0 && <div className="text-xs text-neutral-500">Limit: {rule.capacity} visitors</div>}
                        {rule.reason && <div className="text-xs text-neutral-500 mt-1 italic">{rule.reason}</div>}
                      </div>
                      <button
                        onClick={() => deactivateRule(rule.id)}
                        className="text-neutral-300 hover:text-rose-500 transition-colors flex-shrink-0 mt-0.5"
                        title="Remove rule"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {rules.length > 6 && (
                <div className="text-xs text-neutral-400 text-center">{rules.length - 6} more rule{rules.length - 6 !== 1 ? 's' : ''} not shown</div>
              )}
            </div>
          )}
        </Card>
      </div>

      {showAddRule && userId && (
        <AddRuleModal
          institutionId={userId}
          onClose={() => setShowAddRule(false)}
          onSaved={async () => { setShowAddRule(false); await loadData(); }}
        />
      )}

      {showEditCapacity && userId && (
        <EditCapacityModal
          profile={profile}
          userId={userId}
          onClose={() => setShowEditCapacity(false)}
          onSaved={async () => { setShowEditCapacity(false); await loadData(); }}
        />
      )}
    </div>
  );
}

function AddRuleModal({ institutionId, onClose, onSaved }: {
  institutionId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    rule_type: 'capacity_limit',
    applies_to: '',
    capacity: 0,
    reason: '',
  });

  const update = (field: string, value: string | number) => setForm(f => ({ ...f, [field]: value }));

  async function save() {
    if (!form.applies_to.trim()) return;
    setSaving(true);
    await supabase.from('capacity_rules').insert({
      institution_id: institutionId,
      rule_type: form.rule_type,
      applies_to: form.applies_to.trim(),
      capacity: form.capacity,
      reason: form.reason.trim() || null,
      active: true,
    });
    await onSaved();
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-neutral-100">
          <h2 className="text-sm font-semibold text-neutral-900">Add Capacity Rule</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-neutral-500 mb-1.5">Rule Type</label>
            <select
              value={form.rule_type}
              onChange={e => update('rule_type', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
            >
              <option value="capacity_limit">Capacity Limit</option>
              <option value="blocked_date">Block Date</option>
              <option value="weekend_limit">Weekend Limit</option>
              <option value="peak_season">Peak Season Rule</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1.5">
              {form.rule_type === 'blocked_date' ? 'Date to Block (YYYY-MM-DD)' : 'Applies To (date or period)'}
            </label>
            <input
              type="text"
              value={form.applies_to}
              onChange={e => update('applies_to', e.target.value)}
              placeholder={form.rule_type === 'blocked_date' ? '2026-02-20' : 'e.g. Weekends, 2026-02-20'}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
            />
          </div>
          {form.rule_type !== 'blocked_date' && (
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Visitor Limit</label>
              <input
                type="number"
                min={0}
                value={form.capacity}
                onChange={e => update('capacity', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
              />
            </div>
          )}
          <div>
            <label className="block text-xs text-neutral-500 mb-1.5">Reason (optional)</label>
            <input
              type="text"
              value={form.reason}
              onChange={e => update('reason', e.target.value)}
              placeholder="e.g. Public holiday, maintenance"
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
            />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-neutral-100">
          <button
            onClick={save}
            disabled={saving || !form.applies_to.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Saving...' : 'Add Rule'}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function EditCapacityModal({ profile, userId, onClose, onSaved }: {
  profile: ProfileCapacity | null;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [form, setForm] = useState({
    daily_capacity: profile?.daily_capacity || 500,
    opening_time: profile?.opening_time || '',
    closing_time: profile?.closing_time || '',
    closed_days: profile?.closed_days || [] as string[],
  });

  function toggleDay(day: string) {
    setForm(f => ({
      ...f,
      closed_days: f.closed_days.includes(day)
        ? f.closed_days.filter(d => d !== day)
        : [...f.closed_days, day],
    }));
  }

  async function save() {
    setSaving(true);
    await supabase.from('institution_profiles').update({
      daily_capacity: form.daily_capacity,
      opening_time: form.opening_time || null,
      closing_time: form.closing_time || null,
      closed_days: form.closed_days.length > 0 ? form.closed_days : null,
    }).eq('portal_user_id', userId);
    await onSaved();
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-neutral-100">
          <h2 className="text-sm font-semibold text-neutral-900">Edit Capacity & Hours</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-neutral-500 mb-1.5">Daily Visitor Capacity</label>
            <input
              type="number"
              min={1}
              value={form.daily_capacity}
              onChange={e => setForm(f => ({ ...f, daily_capacity: parseInt(e.target.value) || 1 }))}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Opening Time</label>
              <input
                type="time"
                value={form.opening_time}
                onChange={e => setForm(f => ({ ...f, opening_time: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Closing Time</label>
              <input
                type="time"
                value={form.closing_time}
                onChange={e => setForm(f => ({ ...f, closing_time: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-2">Closed Days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    form.closed_days.includes(day)
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-neutral-100">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
