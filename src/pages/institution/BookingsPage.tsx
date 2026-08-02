import { useState, useEffect } from 'react';
import { Download, Calendar, User, Search } from 'lucide-react';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';

interface Booking {
  id: string;
  booking_ref: string;
  traveler_name: string;
  traveler_email: string;
  package_name: string | null;
  guide_name: string | null;
  booking_date: string;
  guests: number;
  subtotal: number;
  service_fee: number;
  total_amount: number;
  status: string;
  special_requests: string | null;
  created_at: string;
}

type FilterStatus = 'all' | 'confirmed' | 'pending' | 'completed' | 'cancelled';

export function BookingsPage() {
  const { user } = useAuth();
  const userId = (user as PortalUser)?.id;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (userId) loadBookings();
  }, [userId]);

  async function loadBookings() {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('institution_id', userId)
      .order('created_at', { ascending: false });
    setBookings(data || []);
    setLoading(false);
  }

  const filtered = bookings
    .filter(b => filterStatus === 'all' || b.status === filterStatus)
    .filter(b => !search || b.traveler_name.toLowerCase().includes(search.toLowerCase()) || (b.package_name || '').toLowerCase().includes(search.toLowerCase()));

  const counts = {
    all: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  if (selectedBooking) {
    return (
      <BookingDetail
        booking={selectedBooking}
        onBack={() => setSelectedBooking(null)}
        onUpdate={async () => { await loadBookings(); setSelectedBooking(null); }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Bookings</h1>
          <p className="text-xs text-neutral-500 mt-0.5">{bookings.length} total bookings</p>
        </div>
        <button
          onClick={() => {}}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search visitor or program..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
          />
        </div>
        <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg">
          {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as FilterStatus[]).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${filterStatus === s ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              {s === 'all' ? `All (${counts.all})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${counts[s]})`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
          <div className="text-sm text-neutral-500">No bookings found</div>
        </Card>
      ) : (
        <Card>
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Visitor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Program</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Visitors</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Guide</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-neutral-900">{b.traveler_name}</div>
                    <div className="text-xs text-neutral-400">{b.traveler_email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{b.package_name || 'General Visit'}</td>
                  <td className="px-4 py-3 text-sm text-neutral-600">
                    {new Date(b.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{b.guests}</td>
                  <td className="px-4 py-3 text-sm font-medium text-neutral-900">${parseFloat(String(b.total_amount || 0)).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-neutral-500">{b.guide_name || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelectedBooking(b)} className="text-xs font-medium text-neutral-900 hover:text-neutral-600 transition-colors">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function BookingDetail({ booking, onBack, onUpdate }: {
  booking: Booking; onBack: () => void; onUpdate: () => Promise<void>;
}) {
  const [updating, setUpdating] = useState(false);

  async function updateStatus(newStatus: string) {
    setUpdating(true);
    await supabase.from('bookings').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', booking.id);
    await onUpdate();
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-5 transition-colors">
        ← Back to bookings
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900 mb-1">
            Booking #{booking.booking_ref || booking.id.slice(-6).toUpperCase()}
          </h1>
          <div className="text-sm text-neutral-500">{booking.package_name || 'General Visit'}</div>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-neutral-400" />
              Visit Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Visit Date" value={new Date(booking.booking_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} />
              <InfoField label="Number of Visitors" value={`${booking.guests} visitor${booking.guests !== 1 ? 's' : ''}`} />
              <InfoField label="Program" value={booking.package_name || 'General Visit'} />
              {booking.guide_name && <InfoField label="Assigned Guide" value={booking.guide_name} />}
            </div>
            {booking.special_requests && (
              <div className="mt-4 pt-4 border-t border-neutral-100">
                <div className="text-xs font-medium text-neutral-500 mb-1">Special Requests</div>
                <div className="text-sm text-neutral-700">{booking.special_requests}</div>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">Payment Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Subtotal</span>
                <span className="text-neutral-900">${parseFloat(String(booking.subtotal || 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Service fee</span>
                <span className="text-neutral-900">${parseFloat(String(booking.service_fee || 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-neutral-100 pt-2 mt-2">
                <span className="text-neutral-900">Total</span>
                <span className="text-neutral-900">${parseFloat(String(booking.total_amount || 0)).toFixed(2)}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">
              <User className="w-4 h-4 text-neutral-400 inline mr-2" />
              Visitor Information
            </h3>
            <div className="space-y-3">
              <InfoField label="Name" value={booking.traveler_name} />
              <InfoField label="Email" value={booking.traveler_email} />
              <InfoField label="Booked" value={new Date(booking.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
            </div>
          </Card>

          <div className="space-y-2">
            {booking.status === 'confirmed' && (
              <button
                onClick={() => updateStatus('completed')}
                disabled={updating}
                className="w-full px-4 py-2.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Mark as Completed'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-neutral-400 mb-0.5">{label}</div>
      <div className="text-sm text-neutral-900">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-blue-50 text-blue-700 border-blue-200',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return (
    <span className={`inline-flex px-2.5 py-1 text-xs font-medium border rounded-full capitalize ${styles[status] || 'bg-neutral-50 text-neutral-600 border-neutral-200'}`}>
      {status}
    </span>
  );
}
