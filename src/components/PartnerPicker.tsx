import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface PartnerOption {
  id: string;
  name: string;
}

interface PartnerPickerProps {
  prompt?: string;
  onSelect: (p: PartnerOption) => void;
  onCancel: () => void;
}

export function PartnerPicker({ prompt = 'Which partner is this under?', onSelect, onCancel }: PartnerPickerProps) {
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('portal_users').select('id, name').eq('portal_type', 'partner').eq('is_active', true).order('name').then(({ data }) => {
      setPartners(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = partners.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-3">
      <p className="text-sm text-neutral-500 mb-1">{prompt}</p>
      <div className="flex items-center gap-2 px-3.5 py-2.5 border border-neutral-200 rounded-lg">
        <Search className="w-4 h-4 text-neutral-400 flex-shrink-0" />
        <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search partners…" className="flex-1 text-sm outline-none placeholder-neutral-400" />
      </div>
      {loading ? (
        <div className="py-8 text-center text-sm text-neutral-400">Loading…</div>
      ) : (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-neutral-400">No partners found.</div>
          ) : filtered.map(p => (
            <button key={p.id} onClick={() => onSelect(p)} className="w-full text-left px-3.5 py-2.5 rounded-lg hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition-colors text-sm font-medium text-neutral-900">
              {p.name}
            </button>
          ))}
        </div>
      )}
      <button onClick={onCancel} className="w-full py-2 text-xs font-medium text-neutral-500 hover:text-neutral-800">Cancel</button>
    </div>
  );
}
