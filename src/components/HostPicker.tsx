import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HostOption {
  id: string;
  name: string;
  partnerId: string | null;
  partnerName: string;
}

interface HostPickerProps {
  currentHostId?: string | null;
  onSelect: (host: HostOption) => void;
  onCancel: () => void;
}

export function HostPicker({ currentHostId, onSelect, onCancel }: HostPickerProps) {
  const [hosts, setHosts] = useState<HostOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: hostRows } = await supabase.from('partner_hosts').select('id, name, partner_id').eq('status', 'active').order('name');
      const partnerIds = [...new Set((hostRows || []).map(h => h.partner_id).filter(Boolean))];
      const { data: partners } = partnerIds.length
        ? await supabase.from('portal_users').select('id, name').in('id', partnerIds)
        : { data: [] as { id: string; name: string }[] };
      const nameById = new Map((partners || []).map(p => [p.id, p.name]));
      setHosts((hostRows || []).map(h => ({
        id: h.id, name: h.name, partnerId: h.partner_id,
        partnerName: h.partner_id ? (nameById.get(h.partner_id) || 'Unknown partner') : 'Independent (Ops)',
      })));
      setLoading(false);
    };
    load();
  }, []);

  const filtered = hosts.filter(h => h.name.toLowerCase().includes(search.toLowerCase()) || h.partnerName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center gap-2 px-3.5 py-2.5 border border-neutral-200 rounded-lg">
        <Search className="w-4 h-4 text-neutral-400 flex-shrink-0" />
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search hosts by name or partner…"
          className="flex-1 text-sm outline-none placeholder-neutral-400"
        />
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-neutral-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-neutral-400">No hosts found.</div>
      ) : (
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {filtered.map(h => (
            <button
              key={h.id}
              onClick={() => onSelect(h)}
              disabled={h.id === currentHostId}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="text-sm font-medium text-neutral-900">{h.name}</span>
              <span className="text-xs text-neutral-400">{h.partnerName}{h.id === currentHostId ? ' · current' : ''}</span>
            </button>
          ))}
        </div>
      )}

      <button onClick={onCancel} className="w-full py-2 text-xs font-medium text-neutral-500 hover:text-neutral-800">Cancel</button>
    </div>
  );
}
