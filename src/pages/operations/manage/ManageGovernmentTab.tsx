import { useState, useEffect } from 'react';
import { Search, ChevronRight, ArrowLeft, FileText } from 'lucide-react';
import { Card } from '../../../components/Card';
import { supabase } from '../../../lib/supabase';

export function ManageGovernmentTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    const { data } = await supabase
      .from('portal_users')
      .select('id, name, email, phone, is_active, created_at')
      .eq('portal_type', 'government')
      .order('created_at', { ascending: false });

    if (data) {
      const enriched = await Promise.all(
        data.map(async (u) => {
          const [govRes, policiesRes] = await Promise.all([
            supabase.from('government_users').select('department, phone_number').eq('user_id', u.id).maybeSingle(),
            supabase.from('government_policies').select('id').eq('portal_user_id', u.id),
          ]);
          return { ...u, department: govRes.data?.department, govPhone: govRes.data?.phone_number, policiesCount: policiesRes.data?.length || 0 };
        })
      );
      setUsers(enriched);
    }
    setLoading(false);
  }

  if (selectedId) {
    return <GovernmentDetailView userId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  const filtered = users.filter(u => {
    const q = filter.toLowerCase();
    return !q || (u.name || '').toLowerCase().includes(q) || (u.department || '').toLowerCase().includes(q);
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
        <div className="text-xs text-neutral-500">{users.length} government user{users.length !== 1 ? 's' : ''} registered</div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter by name or department..."
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
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Department</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Phone</th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">Status</th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">Policies</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Joined</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-neutral-500">
                    {filter ? 'No users match your filter' : 'No government users registered yet'}
                  </td>
                </tr>
              ) : (
                filtered.map(u => (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedId(u.id)}
                    className="hover:bg-neutral-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-neutral-900">{u.name || 'Unnamed'}</td>
                    <td className="px-4 py-3 text-neutral-600">{u.department || '-'}</td>
                    <td className="px-4 py-3 text-neutral-600">{u.email}</td>
                    <td className="px-4 py-3 text-neutral-600">{u.phone || u.govPhone || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        u.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                      }`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-neutral-600">{u.policiesCount}</td>
                    <td className="px-4 py-3 text-neutral-500">
                      {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
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

function GovernmentDetailView({ userId, onBack }: { userId: string; onBack: () => void }) {
  const [portalUser, setPortalUser] = useState<any>(null);
  const [govUser, setGovUser] = useState<any>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [userId]);

  async function loadData() {
    setLoading(true);
    const [userRes, govRes, policiesRes] = await Promise.all([
      supabase.from('portal_users').select('id, portal_type, email, user_id_code, name, phone, contact_person, country, province, specific_location, specialty, tags, is_active, created_at, created_by, updated_at').eq('id', userId).maybeSingle(),
      supabase.from('government_users').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('government_policies').select('*').eq('portal_user_id', userId).order('created_at', { ascending: false }),
    ]);

    setPortalUser(userRes.data);
    setGovUser(govRes.data);
    setPolicies(policiesRes.data || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-neutral-200 border-t-neutral-700 rounded-full animate-spin" />
      </div>
    );
  }

  const activePolicies = policies.filter(p => p.status === 'active').length;
  const draftPolicies = policies.filter(p => p.status === 'draft').length;
  const archivedPolicies = policies.filter(p => p.status === 'archived').length;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-700 mb-4 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Government
      </button>

      <Card className="p-5 mb-6 bg-slate-50">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">{govUser?.name || portalUser?.name || 'Unnamed'}</h2>
            <p className="text-xs text-neutral-500 mt-0.5">{portalUser?.email}</p>
          </div>
          <span className={`px-2.5 py-1 text-[10px] font-medium rounded ${
            portalUser?.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
          }`}>
            {portalUser?.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-neutral-500">Department</span>
            <div className="text-neutral-900 font-medium mt-0.5">{govUser?.department || '-'}</div>
          </div>
          <div>
            <span className="text-neutral-500">Phone</span>
            <div className="text-neutral-900 font-medium mt-0.5">{govUser?.phone_number || portalUser?.phone || '-'}</div>
          </div>
          <div>
            <span className="text-neutral-500">User ID</span>
            <div className="text-neutral-900 font-medium mt-0.5 font-mono">{portalUser?.user_id_code}</div>
          </div>
          <div>
            <span className="text-neutral-500">Joined</span>
            <div className="text-neutral-900 font-medium mt-0.5">
              {portalUser?.created_at ? new Date(portalUser.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-'}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-4 bg-emerald-50">
          <div className="text-xs text-neutral-500 mb-1">Active Policies</div>
          <div className="text-xl font-semibold text-neutral-900">{activePolicies}</div>
        </Card>
        <Card className="p-4 bg-amber-50">
          <div className="text-xs text-neutral-500 mb-1">Draft Policies</div>
          <div className="text-xl font-semibold text-neutral-900">{draftPolicies}</div>
        </Card>
        <Card className="p-4 bg-neutral-50">
          <div className="text-xs text-neutral-500 mb-1">Archived</div>
          <div className="text-xl font-semibold text-neutral-900">{archivedPolicies}</div>
        </Card>
      </div>

      {policies.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
          <div className="text-sm font-medium text-neutral-900 mb-1">No policies</div>
          <div className="text-xs text-neutral-500">This user has not created any policies.</div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Description</th>
                  <th className="text-center px-4 py-3 font-medium text-neutral-600">Priority</th>
                  <th className="text-center px-4 py-3 font-medium text-neutral-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Focus Points</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {policies.map(p => (
                  <tr key={p.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium text-neutral-900 max-w-[200px] truncate">{p.title}</td>
                    <td className="px-4 py-3 text-neutral-600 max-w-[250px] truncate">{p.description || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        p.priority === 'high' ? 'bg-red-50 text-red-700' :
                        p.priority === 'medium' ? 'bg-amber-50 text-amber-700' :
                        'bg-neutral-100 text-neutral-500'
                      }`}>
                        {p.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        p.status === 'active' ? 'bg-green-50 text-green-700' :
                        p.status === 'draft' ? 'bg-amber-50 text-amber-700' :
                        'bg-neutral-100 text-neutral-500'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {p.focus_points?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.focus_points.slice(0, 2).map((fp: string) => (
                            <span key={fp} className="px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[10px]">{fp}</span>
                          ))}
                          {p.focus_points.length > 2 && (
                            <span className="text-[10px] text-neutral-400">+{p.focus_points.length - 2}</span>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
