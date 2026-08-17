import { useState, useEffect } from 'react';
import { Search, Briefcase, UserRound, Compass, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CreatedBy } from '../lib/customQuotes';

interface Attribution {
  partnerId?: string | null;
  hostId?: string | null;
  guideId?: string | null;
}

interface Entity {
  id: string;
  name: string;
  subtitle?: string;
  partnerId?: string;
}

interface OpsQuoteAttributionPickerProps {
  onSelect: (createdBy: CreatedBy, attribution: Attribution) => void;
  onCancel: () => void;
}

const ROLES: { value: CreatedBy; label: string; hint: string; icon: typeof Briefcase }[] = [
  { value: 'partner', label: 'Partner', hint: 'Attributed to a partner organization', icon: Briefcase },
  { value: 'host', label: 'Host', hint: "Attributed to a partner's host", icon: UserRound },
  { value: 'guide', label: 'Guide', hint: 'Attributed to a guide, solo', icon: Compass },
];

export function OpsQuoteAttributionPicker({ onSelect, onCancel }: OpsQuoteAttributionPickerProps) {
  const [role, setRole] = useState<CreatedBy | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!role) return;
    setLoading(true);
    setSearch('');
    const load = async () => {
      if (role === 'partner') {
        const { data } = await supabase.from('portal_users').select('id, name').eq('portal_type', 'partner').eq('is_active', true).order('name');
        setEntities((data || []).map(p => ({ id: p.id, name: p.name })));
      } else if (role === 'host') {
        const { data: hosts } = await supabase.from('partner_hosts').select('id, name, partner_id').eq('status', 'active').order('name');
        const partnerIds = [...new Set((hosts || []).map(h => h.partner_id))];
        const { data: partners } = partnerIds.length
          ? await supabase.from('portal_users').select('id, name').in('id', partnerIds)
          : { data: [] as { id: string; name: string }[] };
        const nameById = new Map((partners || []).map(p => [p.id, p.name]));
        setEntities((hosts || []).map(h => ({ id: h.id, name: h.name, partnerId: h.partner_id, subtitle: `via ${nameById.get(h.partner_id) || 'partner'}` })));
      } else {
        const { data } = await supabase.from('guides').select('id, name').order('name');
        setEntities((data || []).map(g => ({ id: g.id, name: g.name })));
      }
      setLoading(false);
    };
    load();
  }, [role]);

  const filtered = entities.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

  const pick = (entity: Entity) => {
    if (role === 'partner') onSelect('partner', { partnerId: entity.id });
    else if (role === 'host') onSelect('host', { hostId: entity.id, partnerId: entity.partnerId });
    else if (role === 'guide') onSelect('guide', { guideId: entity.id });
  };

  if (!role) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm text-neutral-500 mb-1">Who is this quote for? Pick who it should be attributed to — Ops has no identity of its own, so a real Partner, Host, or Guide must own the earning.</p>
        {ROLES.map(r => {
          const Icon = r.icon;
          return (
            <button
              key={r.value}
              onClick={() => setRole(r.value)}
              className="w-full flex items-center gap-3 p-4 border border-neutral-200 rounded-xl hover:border-neutral-400 hover:bg-neutral-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4.5 h-4.5 text-neutral-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">{r.label}</p>
                <p className="text-xs text-neutral-400">{r.hint}</p>
              </div>
            </button>
          );
        })}
        <button onClick={onCancel} className="w-full py-2.5 text-sm font-medium text-neutral-500 hover:text-neutral-800 mt-2">Cancel</button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <button onClick={() => setRole(null)} className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      <div className="flex items-center gap-2 px-3.5 py-2.5 border border-neutral-200 rounded-lg">
        <Search className="w-4 h-4 text-neutral-400 flex-shrink-0" />
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${role}s by name…`}
          className="flex-1 text-sm outline-none placeholder-neutral-400"
        />
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-neutral-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-neutral-400">No {role}s found.</div>
      ) : (
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {filtered.map(e => (
            <button
              key={e.id}
              onClick={() => pick(e)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition-colors text-left"
            >
              <span className="text-sm font-medium text-neutral-900">{e.name}</span>
              {e.subtitle && <span className="text-xs text-neutral-400">{e.subtitle}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
