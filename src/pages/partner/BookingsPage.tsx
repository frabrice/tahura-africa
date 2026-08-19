import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { exportToCSV } from '../../lib/csvExport';
import { PortalUser } from '../../lib/auth';
import { Calendar, Clock, Mail, User } from 'lucide-react';
import { TransportRequestCard } from '../../components/TransportRequestCard';

interface DBBooking {
  id: string;
  booking_ref: string;
  traveler_name: string;
  traveler_email: string;
  booking_type: string;
  item_title: string;
  booking_date: string;
  guests: number;
  subtotal: number;
  service_fee: number;
  total_amount: number;
  special_requests?: string;
  status: string;
  created_at: string;
  transport_requested?: boolean;
  transport_id?: string | null;
}

export function BookingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const portalUser = user as PortalUser | null;

  const [bookings, setBookings] = useState<DBBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<DBBooking | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');

  const handleExport = () => {
    if (sortedBookings.length === 0) {
      toast.showToast('No bookings to export', 'warning');
      return;
    }

    const headers = ['Reference', 'Traveler', 'Email', 'Type', 'Item', 'Date', 'Guests', 'Subtotal', 'Service Fee', 'Total', 'Status', 'Created'];
    const rows = sortedBookings.map(b => [
      b.booking_ref,
      b.traveler_name,
      b.traveler_email,
      b.booking_type,
      b.item_title,
      new Date(b.booking_date).toLocaleDateString(),
      b.guests.toString(),
      b.subtotal.toFixed(2),
      b.service_fee.toFixed(2),
      b.total_amount.toFixed(2),
      b.status,
      new Date(b.created_at).toLocaleDateString(),
    ]);

    exportToCSV(`bookings-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    toast.showToast('Bookings exported successfully', 'success');
  };

  const loadBookings = async () => {
    if (!portalUser?.id) return;
    setLoading(true);
    try {
      const [byPartner, hostsRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .eq('partner_id', portalUser.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('partner_hosts')
          .select('id')
          .eq('partner_id', portalUser.id),
      ]);

      const hostIds = (hostsRes.data || []).map(h => h.id);
      let byHost: { data: any[] | null; error: unknown } = { data: [], error: null };
      if (hostIds.length > 0) {
        byHost = await supabase
          .from('bookings')
          .select('*')
          .in('host_id', hostIds)
          .order('created_at', { ascending: false });
      }

      const seen = new Set<string>();
      const merged: DBBooking[] = [];
      [...(byPartner.data || []), ...(byHost.data || [])].forEach(b => {
        if (!seen.has(b.id)) {
          seen.add(b.id);
          merged.push(b);
        }
      });

      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setBookings(merged);
    } catch (err) {
      console.error('Error loading bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (portalUser?.id) loadBookings();
  }, [portalUser?.id]);

  const filteredBookings = filterStatus === 'all'
    ? bookings
    : bookings.filter(b => b.status === filterStatus);

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    return new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime();
  });

  if (selectedBooking) {
    return (
      <BookingDetailView
        booking={selectedBooking}
        onBack={() => setSelectedBooking(null)}
        onStatusUpdate={async () => {
          await loadBookings();
          setSelectedBooking(null);
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-neutral-900">Bookings</h1>
        <Button variant="secondary" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4 mr-1.5" />
          Export Bookings
        </Button>
      </div>

      <div className="flex gap-3 mb-6">
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status as any)}
            className={`px-3 py-1.5 text-xs font-medium border transition-colors capitalize ${
              filterStatus === status
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-neutral-600 py-8 text-sm">Loading bookings...</div>
      ) : sortedBookings.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-neutral-500 text-sm">No bookings found.</div>
        </Card>
      ) : (
        <Card className="bg-teal-50">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Traveler</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Listing</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Guests</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {sortedBookings.map(booking => (
                <tr key={booking.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-sm text-neutral-900">{booking.traveler_name}</td>
                  <td className="px-4 py-3 text-sm text-neutral-600">
                    {booking.item_title}
                    {booking.transport_requested && (
                      <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-teal-100 text-teal-700 align-middle">
                        Transport
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">
                    {new Date(booking.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{booking.guests}</td>
                  <td className="px-4 py-3 text-sm text-neutral-900">${booking.total_amount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 text-xs border ${
                        booking.status === 'confirmed'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : booking.status === 'pending'
                          ? 'bg-orange-50 text-orange-700 border-orange-200'
                          : booking.status === 'completed'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                      }`}
                    >
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedBooking(booking)}
                      className="text-xs font-medium text-neutral-900 hover:text-neutral-600 transition-colors"
                    >
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

function BookingDetailView({
  booking,
  onBack,
  onStatusUpdate,
}: {
  booking: DBBooking;
  onBack: () => void;
  onStatusUpdate: () => Promise<void>;
}) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', booking.id);

      if (updateError) throw updateError;
      await onStatusUpdate();
    } catch (err: any) {
      setError(err.message);
      setUpdating(false);
    }
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="text-sm text-neutral-600 hover:text-neutral-900 mb-4 transition-colors"
      >
        ← Back to bookings
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-neutral-900 mb-1">
            Booking #{booking.booking_ref || booking.id.slice(-6).toUpperCase()}
          </h1>
          <div className="text-sm text-neutral-500">{booking.item_title}</div>
        </div>
        <span
          className={`px-3 py-1.5 text-xs font-medium border ${
            booking.status === 'confirmed'
              ? 'bg-green-50 text-green-700 border-green-200'
              : booking.status === 'pending'
              ? 'bg-orange-50 text-orange-700 border-orange-200'
              : booking.status === 'completed'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-neutral-50 text-neutral-600 border-neutral-200'
          }`}
        >
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card className="p-5 mb-6 bg-lime-50">
            <h3 className="text-sm font-medium text-neutral-900 mb-4">Booking Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm mb-1">
                  <Calendar className="w-4 h-4 text-neutral-400" />
                  <span className="text-neutral-500">Date</span>
                </div>
                <div className="text-sm text-neutral-900 ml-6">
                  {new Date(booking.booking_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm mb-1">
                  <Clock className="w-4 h-4 text-neutral-400" />
                  <span className="text-neutral-500">Booked On</span>
                </div>
                <div className="text-sm text-neutral-900 ml-6">
                  {new Date(booking.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm mb-1">
                  <User className="w-4 h-4 text-neutral-400" />
                  <span className="text-neutral-500">Guests</span>
                </div>
                <div className="text-sm text-neutral-900 ml-6">
                  {booking.guests} {booking.guests === 1 ? 'guest' : 'guests'}
                </div>
              </div>
            </div>

            {booking.special_requests && (
              <div className="mt-4 pt-4 border-t border-neutral-200">
                <div className="text-xs font-medium text-neutral-500 mb-1">Special Requests</div>
                <div className="text-sm text-neutral-700">{booking.special_requests}</div>
              </div>
            )}
          </Card>

          {booking.transport_requested && booking.transport_id && (
            <Card className="p-5 mb-6">
              <h3 className="text-sm font-medium text-neutral-900 mb-4">Transport</h3>
              <TransportRequestCard transportId={booking.transport_id} />
            </Card>
          )}

          <Card className="p-5 bg-violet-50">
            <h3 className="text-sm font-medium text-neutral-900 mb-4">Listing Information</h3>
            <div className="text-sm text-neutral-600">
              <div className="mb-2">
                <span className="text-neutral-500">Name:</span> {booking.item_title}
              </div>
              <div className="mb-2">
                <span className="text-neutral-500">Type:</span>{' '}
                {booking.booking_type.charAt(0).toUpperCase() + booking.booking_type.slice(1)}
              </div>
            </div>
          </Card>
        </div>

        <div>
          <Card className="p-5 mb-6 bg-orange-50">
            <h3 className="text-sm font-medium text-neutral-900 mb-4">Traveler Information</h3>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-neutral-500 mb-1">Name</div>
                <div className="text-sm text-neutral-900">{booking.traveler_name}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Email</div>
                <div className="text-sm text-neutral-900">{booking.traveler_email}</div>
              </div>
            </div>
            <button className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-50 transition-colors">
              <Mail className="w-4 h-4" />
              Message Traveler
            </button>
          </Card>

          <Card className="p-5 bg-fuchsia-50">
            <h3 className="text-sm font-medium text-neutral-900 mb-4">Payment</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Subtotal</span>
                <span className="text-neutral-900">${booking.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Service fee</span>
                <span className="text-neutral-900">${booking.service_fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-neutral-100">
                <span className="text-neutral-500">Total amount</span>
                <span className="text-neutral-900 font-medium">${booking.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-neutral-100">
                <span className="text-neutral-500">Your earnings</span>
                <span className="text-neutral-900 font-medium">${(booking.total_amount * 0.95).toFixed(2)}</span>
              </div>
            </div>
          </Card>

          <div className="mt-4 space-y-2">
            {booking.status === 'confirmed' && (
              <button
                onClick={() => updateStatus('completed')}
                disabled={updating}
                className="w-full px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
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
