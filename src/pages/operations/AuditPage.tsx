import { useState, useEffect } from 'react';
import { Download, Search } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { exportToCSV } from '../../lib/csvExport';

interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_name: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const ACTION_COLOR: Record<string, string> = {
  invite: 'bg-purple-50 text-purple-700 border-purple-200',
  create: 'bg-blue-50 text-blue-700 border-blue-200',
  update: 'bg-slate-50 text-slate-700 border-slate-200',
  delete: 'bg-red-50 text-red-700 border-red-200',
  approve: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  reject: 'bg-amber-50 text-amber-700 border-amber-200',
};

function colorFor(action: string): string {
  const key = Object.keys(ACTION_COLOR).find(k => action.toLowerCase().includes(k));
  return (key && ACTION_COLOR[key]) || 'bg-neutral-50 text-neutral-600 border-neutral-200';
}

export function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase
      .from('admin_audit_log')
      .select('id, actor_id, actor_name, action, target_type, target_id, details, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    setEntries((data as AuditEntry[]) || []);
    setLoading(false);
  }

  const filtered = entries.filter(e => {
    const q = filter.toLowerCase();
    return !q ||
      e.action.toLowerCase().includes(q) ||
      e.actor_name.toLowerCase().includes(q) ||
      (e.target_type || '').toLowerCase().includes(q);
  });

  function handleExport() {
    const headers = ['Timestamp', 'Actor', 'Action', 'Target Type', 'Target ID', 'Details'];
    const rows = filtered.map(e => [
      new Date(e.created_at).toLocaleString(),
      e.actor_name,
      e.action,
      e.target_type || '',
      e.target_id || '',
      JSON.stringify(e.details || {}),
    ]);
    exportToCSV('tahura-audit-log.csv', headers, rows);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-medium text-neutral-900">Audit Log</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Real record of admin actions — invites, approvals, rule changes, and more</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by actor, action, target..." className="pl-9 pr-4 py-2 text-xs border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200 w-64" />
          </div>
          <Button variant="secondary" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-1.5" />
            Export Logs
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center bg-neutral-50">
          <p className="text-sm text-neutral-500">{entries.length === 0 ? 'No admin actions recorded yet' : 'No entries match your filter'}</p>
        </Card>
      ) : (
        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <Card className="bg-slate-50 min-w-[700px] md:min-w-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Actor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map(entry => (
                  <tr key={entry.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 text-xs text-neutral-600 whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-900">{entry.actor_name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 text-xs border rounded ${colorFor(entry.action)}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500">
                      {entry.target_type ? `${entry.target_type}${entry.target_id ? ` · ${entry.target_id.slice(0, 8)}` : ''}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
