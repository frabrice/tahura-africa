import { Search, ChevronRight, Users, Layers } from 'lucide-react';
import { Card } from '../../../components/Card';

interface Partner {
  id: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  province?: string;
  specialty?: string;
  is_active: boolean;
  created_at: string;
  hostsCount: number;
  listingsCount: number;
}

interface Props {
  partners: Partner[];
  loading: boolean;
  filter: string;
  onFilterChange: (v: string) => void;
  onSelectPartner: (id: string) => void;
}

export function PartnerListView({ partners, loading, filter, onFilterChange, onSelectPartner }: Props) {
  const filtered = partners.filter(p => {
    const q = filter.toLowerCase();
    return !q || (p.name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-neutral-200 border-t-neutral-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-neutral-500">{partners.length} partner{partners.length !== 1 ? 's' : ''} registered</div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            value={filter}
            onChange={e => onFilterChange(e.target.value)}
            placeholder="Filter by name or email..."
            className="pl-9 pr-4 py-2 text-xs border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200 w-64"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Location</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Specialty</th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">Status</th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">
                  <Users className="w-3.5 h-3.5 inline" />
                </th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">
                  <Layers className="w-3.5 h-3.5 inline" />
                </th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Joined</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-neutral-500">
                    {filter ? 'No partners match your filter' : 'No partners registered yet'}
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => onSelectPartner(p.id)}
                    className="hover:bg-neutral-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-neutral-900">{p.name || 'Unnamed'}</td>
                    <td className="px-4 py-3 text-neutral-600">{p.email}</td>
                    <td className="px-4 py-3 text-neutral-600">
                      {[p.province, p.country].filter(Boolean).join(', ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{p.specialty || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${
                        p.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                      }`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-neutral-600">{p.hostsCount}</td>
                    <td className="px-4 py-3 text-center text-neutral-600">{p.listingsCount}</td>
                    <td className="px-4 py-3 text-neutral-500">
                      {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </td>
                    <td className="px-3 py-3">
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
