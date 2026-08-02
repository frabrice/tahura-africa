import { useState, useEffect } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import CreateUserDrawer from '../../components/CreateUserDrawer';

interface PortalUser {
  id: string;
  portal_type: string;
  email: string;
  user_id_code: string;
  name?: string;
  phone?: string;
  contact_person?: string;
  country?: string;
  province?: string;
  specific_location?: string;
  specialty?: string;
  tags?: string[];
  is_active: boolean;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('portal_users')
      .select('id, portal_type, email, user_id_code, name, phone, contact_person, country, province, specific_location, specialty, tags, is_active, created_at, created_by, updated_at')
      .order('created_at', { ascending: false });

    if (data) {
      setUsers(data);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.user_id_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || user.portal_type === filterType;
    return matchesSearch && matchesType;
  });

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}?`)) {
      return;
    }

    const { error } = await supabase
      .from('portal_users')
      .delete()
      .eq('id', userId);

    if (error) {
      alert('Error deleting user: ' + error.message);
    } else {
      fetchUsers();
    }
  };

  const getPortalTypeColor = (type: string) => {
    switch (type) {
      case 'partner':
        return 'bg-emerald-100 text-emerald-800';
      case 'institution':
        return 'bg-amber-100 text-amber-800';
      case 'government':
        return 'bg-rose-100 text-rose-800';
      case 'operations':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">User Management</h1>
          <p className="text-neutral-600 mt-1">Create and manage portal users</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateDrawer(true)}
        >
          <Plus className="w-5 h-5 mr-2" />
          Create User
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="partner">Partner</option>
            <option value="institution">Institution</option>
            <option value="government">Government</option>
            <option value="operations">Operations</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">ID Code</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Name/Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Location</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPortalTypeColor(user.portal_type)}`}>
                      {user.portal_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-900 font-mono">{user.user_id_code}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-neutral-900">{user.name || '—'}</div>
                    <div className="text-xs text-neutral-500">{user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">
                    {user.province ? `${user.province}, ${user.country}` : user.country || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteUser(user.id, user.email)}
                      className="p-2 hover:bg-red-50 rounded transition-colors group"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4 text-neutral-400 group-hover:text-red-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-neutral-500">No users found</p>
            </div>
          )}
        </div>
      </Card>

      <CreateUserDrawer
        isOpen={showCreateDrawer}
        onClose={() => setShowCreateDrawer(false)}
        onSuccess={fetchUsers}
      />
    </div>
  );
}
