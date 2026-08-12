import { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';
import { logAdminAction } from '../../lib/auditLog';
import {
  AlertTriangle, CheckCircle,
  Save, RotateCcw, Settings, Shield
} from 'lucide-react';

interface SystemRule {
  id: string;
  category: string;
  name: string;
  description: string;
  enabled: boolean;
  value: string | null;
  updated_at: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; bg: string; icon: any }> = {
  capacity: { label: 'Capacity', bg: 'bg-orange-50', icon: AlertTriangle },
  booking: { label: 'Booking', bg: 'bg-blue-50', icon: CheckCircle },
  quality: { label: 'Quality', bg: 'bg-emerald-50', icon: Shield },
  financial: { label: 'Financial', bg: 'bg-slate-50', icon: Settings },
};

export function RulesPage() {
  const { user } = useAuth();
  const me = user as PortalUser;
  const [rules, setRules] = useState<SystemRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState<Set<string>>(new Set());

  useEffect(() => { loadRules(); }, []);

  async function loadRules() {
    setLoading(true);
    try {
      const { data } = await supabase.from('system_rules').select('*').order('category');
      if (data && data.length > 0) {
        setRules(data);
      } else {
        // Seed default rules if table is empty
        const defaults = getDefaultRules();
        setRules(defaults);
      }
    } catch (err) {
      console.error('Error loading rules:', err);
      setRules(getDefaultRules());
    }
    setLoading(false);
  }

  function getDefaultRules(): SystemRule[] {
    return [
      { id: '1', category: 'capacity', name: 'Institution Daily Capacity Threshold', description: 'Alert when institution reaches 85% of daily capacity', enabled: true, value: '85', updated_at: new Date().toISOString() },
      { id: '2', category: 'capacity', name: 'Automatic Booking Pause', description: 'Pause new bookings when capacity reaches 100%', enabled: true, value: '100', updated_at: new Date().toISOString() },
      { id: '3', category: 'booking', name: 'Maximum Group Size', description: 'Limit group bookings to institution-defined maximums', enabled: true, value: null, updated_at: new Date().toISOString() },
      { id: '4', category: 'booking', name: 'Advance Booking Window', description: 'Require bookings to be made at least 24 hours in advance', enabled: false, value: '24', updated_at: new Date().toISOString() },
      { id: '5', category: 'quality', name: 'New Listing Review Required', description: 'All new listings require approval before going live', enabled: true, value: null, updated_at: new Date().toISOString() },
      { id: '6', category: 'quality', name: 'Automatic Flag Threshold', description: 'Listings with 3+ flags automatically enter review', enabled: true, value: '3', updated_at: new Date().toISOString() },
      { id: '7', category: 'financial', name: 'Commission Rate', description: 'Platform commission charged on every transaction', enabled: true, value: '7', updated_at: new Date().toISOString() },
      { id: '8', category: 'financial', name: 'Partner Booking Limit', description: 'Prevent partners from over-booking beyond capacity', enabled: true, value: null, updated_at: new Date().toISOString() },
    ];
  }

  function toggleRule(id: string) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    setEdited(prev => new Set(prev).add(id));
  }

  function updateValue(id: string, value: string) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, value } : r));
    setEdited(prev => new Set(prev).add(id));
  }

  async function saveChanges() {
    setSaving(true);
    try {
      const toSave = rules.filter(r => edited.has(r.id));
      for (const rule of toSave) {
        await supabase.from('system_rules').upsert({
          id: rule.id,
          category: rule.category,
          name: rule.name,
          description: rule.description,
          enabled: rule.enabled,
          value: rule.value,
          updated_at: new Date().toISOString(),
        });
        logAdminAction({
          actor: me, action: 'rule.update', targetType: 'system_rule', targetId: rule.id,
          details: { name: rule.name, enabled: rule.enabled, value: rule.value },
        });
      }
      setEdited(new Set());
    } catch (err) {
      console.error('Error saving rules:', err);
    }
    setSaving(false);
  }

  function resetChanges() {
    loadRules();
    setEdited(new Set());
  }

  const grouped = rules.reduce((acc, rule) => {
    if (!acc[rule.category]) acc[rule.category] = [];
    acc[rule.category].push(rule);
    return acc;
  }, {} as Record<string, SystemRule[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">System Rules</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Configure platform-wide policies and thresholds</p>
        </div>
        {edited.size > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={resetChanges}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-600 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              onClick={saveChanges}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([category, categoryRules]) => {
          const config = CATEGORY_CONFIG[category] || { label: category, bg: 'bg-neutral-50', icon: Settings };
          const Icon = config.icon;
          return (
            <Card key={category} className={`p-5 ${config.bg}`}>
              <div className="flex items-center gap-2 mb-4">
                <Icon className="w-4 h-4 text-neutral-500" />
                <h3 className="text-sm font-medium text-neutral-900 capitalize">{config.label} Rules</h3>
              </div>
              <div className="space-y-3">
                {categoryRules.map(rule => (
                  <div key={rule.id} className={`p-4 border rounded-lg transition-all ${edited.has(rule.id) ? 'border-amber-300 bg-amber-50/30' : 'border-neutral-200 bg-white'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-neutral-900">{rule.name}</span>
                          {edited.has(rule.id) && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">Modified</span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-600">{rule.description}</p>
                        {rule.value !== null && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-neutral-500">Value:</span>
                            <input
                              type="text"
                              value={rule.value}
                              onChange={(e) => updateValue(rule.id, e.target.value)}
                              className="w-20 px-2 py-1 text-xs border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-neutral-400"
                            />
                            {rule.name.includes('Rate') && <span className="text-xs text-neutral-400">%</span>}
                            {rule.name.includes('Threshold') && <span className="text-xs text-neutral-400">%</span>}
                            {rule.name.includes('Window') && <span className="text-xs text-neutral-400">hrs</span>}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => toggleRule(rule.id)}
                        className={`flex-shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          rule.enabled ? 'bg-emerald-500' : 'bg-neutral-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            rule.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
