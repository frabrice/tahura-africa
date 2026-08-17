import { useState, useEffect } from 'react';
import { Search, Plus, ArrowLeft } from 'lucide-react';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { SideDrawer } from '../../../components/SideDrawer';
import { CreateHostForm } from '../../../components/CreateHostForm';
import { supabase } from '../../../lib/supabase';

interface PartnerOption {
  id: string;
  name: string;
}

function PartnerPicker({ onSelect, onCancel }: { onSelect: (p: PartnerOption) => void; onCancel: () => void }) {
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
      <p className="text-sm text-neutral-500 mb-1">Which partner is this host under?</p>
      <div className="flex items-center gap-2 px-3.5 py-2.5 border border-neutral-200 rounded-lg">
        <Search className="w-4 h-4 text-neutral-400 flex-shrink-0" />
        <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search partners…" className="flex-1 text-sm outline-none placeholder-neutral-400" />
      </div>
      {loading ? (
        <div className="py-8 text-center text-sm text-neutral-400">Loading…</div>
      ) : (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {filtered.map(p => (
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

export function HostsTab() {
  const [hosts, setHosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PartnerOption | null>(null);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => { load(); }, []);

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
          </div>
          <button onClick={() => toggleStatus(selected)} className="px-4 py-2 text-xs font-medium border border-neutral-300 rounded-lg hover:bg-neutral-50">
            {selected.status === 'active' ? 'Deactivate' : 'Activate'}
          </button>
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
          <PartnerPicker onSelect={setSelectedPartner} onCancel={closeCreate} />
        )}
      </SideDrawer>
    </div>
  );
}
