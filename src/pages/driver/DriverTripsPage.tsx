import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Clock,
  Phone,
  MessageSquare,
  CheckCircle,
  Navigation,
  Filter,
  X,
  Star,
} from 'lucide-react';
import { formatCurrency } from '../../lib/csvExport';
import { TRANSPORT_STATUS_LABELS } from '../../lib/mobilityService';

const TEAL = '#0d9488';

interface Trip {
  id: string;
  booking_id: string;
  status: string;
  transport_type: string;
  pickup_location: any;
  dropoff_location: any;
  scheduled_pickup_time: string;
  total_fare: number;
  traveler_name?: string;
  traveler_phone?: string;
  rating?: number;
  created_at: string;
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All Trips' },
  { value: 'pending_dispatch', label: 'Pending' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function DriverTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadTrips();
  }, [selectedDate]);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredTrips(trips);
    } else {
      setFilteredTrips(trips.filter(t => t.status === statusFilter));
    }
  }, [trips, statusFilter]);

  const loadTrips = async () => {
    setLoading(true);
    try {
      // Mock data - in production, fetch from Supabase
      setTrips([
        {
          id: 'trip-1',
          created_at: new Date().toISOString(),
          booking_id: 'BK-001',
          status: 'in_progress',
          transport_type: 'pickup',
          pickup_location: { name: 'Kigali International Airport', address: 'Kigali Airport, Terminal 1' },
          dropoff_location: { name: 'Marriott Hotel', address: 'Kigali City Center' },
          scheduled_pickup_time: new Date().toISOString(),
          total_fare: 12000,
          traveler_name: 'John Smith',
          traveler_phone: '+1 555 123 4567',
        },
        {
          id: 'trip-2',
          created_at: new Date().toISOString(),
          booking_id: 'BK-002',
          status: 'dispatched',
          transport_type: 'pickup',
          pickup_location: { name: 'Radisson Blu', address: 'KN 2 Ave, Kigali' },
          dropoff_location: { name: 'Volcanoes National Park', address: 'Musanze District' },
          scheduled_pickup_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          total_fare: 45000,
          traveler_name: 'Emma Wilson',
          traveler_phone: '+44 789 123 4567',
        },
        {
          id: 'trip-3',
          created_at: new Date().toISOString(),
          booking_id: 'BK-003',
          status: 'pending_dispatch',
          transport_type: 'roundtrip',
          pickup_location: { name: 'Kigali Serena Hotel', address: 'KN 3 Ave, Kigali' },
          dropoff_location: { name: 'Nyamata Church Memorial', address: 'Bugesera District' },
          scheduled_pickup_time: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
          total_fare: 35000,
          traveler_name: 'David Brown',
          traveler_phone: '+250 788 987 654',
        },
        {
          id: 'trip-4',
          created_at: new Date().toISOString(),
          booking_id: 'BK-004',
          status: 'completed',
          transport_type: 'dropoff',
          pickup_location: { name: 'Heaven Restaurant', address: 'Kigali' },
          dropoff_location: { name: 'Kigali International Airport', address: 'Kigali Airport' },
          scheduled_pickup_time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          total_fare: 8000,
          traveler_name: 'Sarah Johnson',
          traveler_phone: '+1 555 987 6543',
          rating: 5,
        },
        {
          id: 'trip-5',
          created_at: new Date().toISOString(),
          booking_id: 'BK-005',
          status: 'completed',
          transport_type: 'inter_location',
          pickup_location: { name: 'Kigali City', address: 'Kigali' },
          dropoff_location: { name: 'Lake Kivu', address: 'Rubavu' },
          scheduled_pickup_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          total_fare: 55000,
          traveler_name: 'Michael Chen',
          traveler_phone: '+86 138 1234 5678',
          rating: 4,
        },
      ]);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-emerald-100 text-emerald-700',
      in_progress: 'bg-blue-100 text-blue-700',
      driver_en_route: 'bg-amber-100 text-amber-700',
      arrived: 'bg-amber-100 text-amber-700',
      dispatched: 'bg-purple-100 text-purple-700',
      pending_dispatch: 'bg-slate-100 text-slate-600',
      cancelled: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-600';
  };

  const handleTripAction = async (tripId: string, action: 'accept' | 'start' | 'arrive' | 'complete') => {
    // Update trip status
    const statusMap: Record<string, string> = {
      accept: 'driver_en_route',
      start: 'in_progress',
      arrive: 'arrived',
      complete: 'completed',
    };

    setTrips(prev => prev.map(t =>
      t.id === tripId ? { ...t, status: statusMap[action] } : t
    ));
  };

  const TripCard = ({ trip }: { trip: Trip }) => {
    const isLoading = trip.status === 'in_progress';
    const isPending = trip.status === 'pending_dispatch';
    const isDispatched = trip.status === 'dispatched';
    const isCompleted = trip.status === 'completed';
    const isEnRoute = trip.status === 'driver_en_route';
    const isArrived = trip.status === 'arrived';

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`rounded-xl border overflow-hidden ${isCompleted ? 'bg-slate-50 border-slate-200' : isLoading ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-slate-200'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-inherit">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500">{trip.booking_id}</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(trip.status)}`}>
              {TRANSPORT_STATUS_LABELS[trip.status] || trip.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600">
              {new Date(trip.scheduled_pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Route */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <div className="w-0.5 h-10 bg-slate-200 my-1" />
              <MapPin className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <div className="font-medium text-slate-900">{trip.pickup_location?.name}</div>
                <div className="text-sm text-slate-500">{trip.pickup_location?.address}</div>
              </div>
              <div>
                <div className="font-medium text-slate-900">{trip.dropoff_location?.name}</div>
                <div className="text-sm text-slate-500">{trip.dropoff_location?.address}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Traveler Info & Fare */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-t border-inherit">
          <div className="flex items-center gap-3">
            <span className="font-medium text-slate-700">{trip.traveler_name}</span>
            {trip.rating && (
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="w-4 h-4 fill-amber-500" />
                <span className="text-sm">{trip.rating}</span>
              </div>
            )}
            {!isCompleted && (
              <>
                <a href={`tel:${trip.traveler_phone}`} className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100">
                  <Phone className="w-4 h-4" />
                </a>
                <button className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100">
                  <MessageSquare className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          <div className="text-right">
            <div className="font-bold" style={{ color: TEAL }}>{formatCurrency(trip.total_fare)}</div>
            <div className="text-xs text-slate-500 capitalize">{trip.transport_type}</div>
          </div>
        </div>

        {/* Action Buttons */}
        {!isCompleted && trip.status !== 'cancelled' && (
          <div className="p-3 border-t border-inherit flex gap-2">
            {isPending && (
              <>
                <button
                  onClick={() => handleTripAction(trip.id, 'accept')}
                  className="flex-1 py-2.5 rounded-lg font-medium text-white transition-colors"
                  style={{ background: TEAL }}
                >
                  Accept Trip
                </button>
                <button className="px-4 py-2.5 rounded-lg font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                  Decline
                </button>
              </>
            )}
            {isDispatched && (
              <button
                onClick={() => handleTripAction(trip.id, 'start')}
                className="flex-1 py-2.5 rounded-lg font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                Start Navigation
              </button>
            )}
            {(isEnRoute || isArrived) && !isLoading && (
              <button
                onClick={() => handleTripAction(trip.id, isArrived ? 'start' : 'arrive')}
                className="flex-1 py-2.5 rounded-lg font-medium text-white transition-colors"
                style={{ background: TEAL }}
              >
                {isArrived ? 'Start Trip' : 'Mark Arrived'}
              </button>
            )}
            {isLoading && (
              <button
                onClick={() => handleTripAction(trip.id, 'complete')}
                className="flex-1 py-2.5 rounded-lg font-medium text-white bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Complete Trip
              </button>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Trips</h1>
          <p className="text-slate-500 text-sm mt-1">
            {filteredTrips.length} trip{filteredTrips.length !== 1 ? 's' : ''} {statusFilter !== 'all' ? `(${STATUS_FILTERS.find(f => f.value === statusFilter)?.label})` : ''}
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-lg border transition-colors ${showFilters ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
        >
          <Filter className="w-5 h-5" style={{ color: TEAL }} />
        </button>
      </div>

      {/* Filters Modal */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowFilters(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-white z-50 shadow-xl"
            >
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="font-semibold text-lg">Filters</h2>
                <button onClick={() => setShowFilters(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <div className="space-y-2">
                    {STATUS_FILTERS.map(filter => (
                      <button
                        key={filter.value}
                        onClick={() => setStatusFilter(filter.value)}
                        className={`w-full px-3 py-2 rounded-lg text-left text-sm font-medium transition-colors ${statusFilter === filter.value ? 'bg-teal-50 border-2 text-teal-700' : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                        style={statusFilter === filter.value ? { borderColor: TEAL } : {}}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-white">
                <button
                  onClick={() => setShowFilters(false)}
                  className="w-full py-3 rounded-lg font-medium text-white transition-colors"
                  style={{ background: TEAL }}
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Trips List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-medium text-slate-900 mb-1">No trips found</h3>
          <p className="text-slate-500 text-sm">Try adjusting your filters or check back later</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredTrips.map(trip => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Stats Summary */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
          <div className="text-2xl font-bold" style={{ color: TEAL }}>{formatCurrency(trips.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.total_fare, 0))}</div>
          <div className="text-xs text-slate-500 mt-1">Today's Earnings</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
          <div className="text-2xl font-bold text-slate-900">{trips.filter(t => t.status === 'completed').length}</div>
          <div className="text-xs text-slate-500 mt-1">Completed</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
          <div className="text-2xl font-bold text-amber-500">{trips.filter(t => !['completed', 'cancelled'].includes(t.status)).length}</div>
          <div className="text-xs text-slate-500 mt-1">Active</div>
        </div>
      </div>
    </div>
  );
}
