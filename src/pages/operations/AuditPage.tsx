import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';

interface AuditEntry {
  id: string;
  type: string;
  description: string;
  actor: string;
  created_at: string;
}

export function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);

    const [ticketsRes, bookingsRes] = await Promise.all([
      supabase.from('support_tickets')
        .select('id, ticket_ref, subject, status, created_by_name, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('bookings')
        .select('id, booking_ref, item_title, traveler_name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const auditEntries: AuditEntry[] = [];

    (ticketsRes.data || []).forEach((t: any) => {
      auditEntries.push({
        id: `ticket-${t.id}`,
        type: 'support',
        description: `Ticket ${t.ticket_ref}: ${t.subject} (${t.status})`,
        actor: t.created_by_name,
        created_at: t.created_at,
      });
    });

    (bookingsRes.data || []).forEach((b: any) => {
      auditEntries.push({
        id: `booking-${b.id}`,
        type: 'booking',
        description: `Booking ${b.booking_ref}: ${b.item_title} (${b.status})`,
        actor: b.traveler_name,
        created_at: b.created_at,
      });
    });

    auditEntries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setEntries(auditEntries);
    setLoading(false);
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-neutral-900">Audit Log</h1>
        <Button variant="secondary" size="sm" onClick={() => {}}>
          <Download className="w-4 h-4 mr-1.5" />
          Export Logs
        </Button>
      </div>

      {entries.length === 0 ? (
        <Card className="p-12 text-center bg-neutral-50">
          <p className="text-sm text-neutral-500">No activity recorded yet</p>
        </Card>
      ) : (
        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <Card className="bg-slate-50 min-w-[700px] md:min-w-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 text-xs text-neutral-600">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 text-xs border ${
                        entry.type === 'support' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        entry.type === 'booking' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-neutral-50 text-neutral-600 border-neutral-200'
                      }`}>
                        {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-900">{entry.description}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{entry.actor}</td>
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
