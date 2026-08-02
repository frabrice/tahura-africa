import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin,
  Calendar,
  Wallet,
  Star,
  Car,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Phone,
  MessageSquare,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { formatCurrency } from '../../lib/csvExport';

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
  booking?: any;
}

export function DriverHomePage() {
  const navigate = useNavigate();
  const [driver, setDriver] = useState<any>(null);
  const [todayTrips, setTodayTrips] = useState<Trip[]>([]);
  const [stats, setStats] = useState({
    todayEarnings: 0,
    todayTrips: 0,
    weeklyEarnings: 0,
    weeklyTrips: 0,
    rating: 0,
    totalTrips: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDriverData();
  }, []);

  const loadDriverData = async () => {
    try {
      // In production, get driver from auth context
      // For now, use mock data
      const mockDriver = {
        id: 'demo-driver-id',
        full_name: 'Jean Claude Mutabazi',
        phone: '+250 788 123 456',
        rating: 4.85,
        tier: 'silver',
        total_trips: 127,
        status: 'active',
      };
      setDriver(mockDriver);

      // Mock stats
      setStats({
        todayEarnings: 25000,
        todayTrips: 4,
        weeklyEarnings: 145000,
        weeklyTrips: 23,
        rating: 4.85,
        totalTrips: 127,
      });

      // Mock today's trips
      setTodayTrips([
        {
          id: 'trip-1',
          booking_id: 'bk-001',
          status: 'in_progress',
          transport_type: 'pickup',
          pickup_location: { name: 'Kigali International Airport', address: 'Kigali Airport' },
          dropoff_location: { name: 'Heaven Restaurant', address: 'Kigali City Center' },
          scheduled_pickup_time: new Date().toISOString(),
          total_fare: 12000,
          traveler_name: 'John Smith',
          traveler_phone: '+1 555 123 4567',
        },
        {
          id: 'trip-2',
          booking_id: 'bk-002',
          status: 'dispatched',
          transport_type: 'pickup',
          pickup_location: { name: 'Mariot Hotel', address: 'Kigali' },
          dropoff_location: { name: 'Volcanoes National Park', address: 'Musanze' },
          scheduled_pickup_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          total_fare: 45000,
          traveler_name: 'Emma Wilson',
          traveler_phone: '+44 789 123 4567',
        },
        {
          id: 'trip-3',
          booking_id: 'bk-003',
          status: 'pending_dispatch',
          transport_type: 'roundtrip',
          pickup_location: { name: 'Kigali Serena Hotel', address: 'Kigali' },
          dropoff_location: { name: 'Nyamata Church Memorial', address: 'Bugesera' },
          scheduled_pickup_time: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
          total_fare: 35000,
          traveler_name: 'David Brown',
          traveler_phone: '+250 788 987 654',
        },
      ]);
    } catch (error) {
      console.error('Error loading driver data:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeTrip = todayTrips.find(t => t.status === 'in_progress' || t.status === 'driver_en_route' || t.status === 'arrived');
  const upcomingTrips = todayTrips.filter(t => t.status === 'dispatched' || t.status === 'pending_dispatch');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-600';
      case 'in_progress': return 'text-blue-600';
      case 'driver_en_route':
      case 'arrived': return 'text-amber-600';
      case 'dispatched': return 'text-purple-600';
      default: return 'text-slate-500';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          Welcome back, {driver?.full_name?.split(' ')[0] || 'Driver'}
        </h1>
        <div className="flex items-center gap-2 mt-1 text-slate-500 text-sm">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>{driver?.rating?.toFixed(2) || '0.00'}</span>
          <span className="text-slate-300">|</span>
          <span className="capitalize px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: TEAL + '20', color: TEAL }}>
            {driver?.tier || 'Bronze'} Driver
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #065f46, #047857)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <Wallet className="w-5 h-5 text-emerald-200" />
            <TrendingUp className="w-4 h-4 text-emerald-300" />
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(stats.todayEarnings)}</div>
          <div className="text-emerald-200 text-sm mt-1">Today's Earnings</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl p-5 bg-white border border-slate-200"
        >
          <div className="flex items-center justify-between mb-3">
            <MapPin className="w-5 h-5 text-slate-400" />
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.todayTrips}</div>
          <div className="text-slate-500 text-sm mt-1">Today's Trips</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-5 bg-white border border-slate-200"
        >
          <div className="flex items-center justify-between mb-3">
            <Calendar className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.weeklyEarnings)}</div>
          <div className="text-slate-500 text-sm mt-1">This Week</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl p-5 bg-white border border-slate-200"
        >
          <div className="flex items-center justify-between mb-3">
            <Star className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalTrips}</div>
          <div className="text-slate-500 text-sm mt-1">Total Trips</div>
        </motion.div>
      </div>

      {/* Active Trip */}
      {activeTrip && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-blue-100 text-sm font-medium">Active Trip</span>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white">
              {getStatusLabel(activeTrip.status)}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div>
                <div className="text-white font-medium">{activeTrip.pickup_location?.name}</div>
                <div className="text-blue-200 text-sm">{activeTrip.pickup_location?.address}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <div className="text-white font-medium">{activeTrip.dropoff_location?.name}</div>
                <div className="text-blue-200 text-sm">{activeTrip.dropoff_location?.address}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center gap-3">
              <span className="text-white font-medium">{activeTrip.traveler_name}</span>
              <a href={`tel:${activeTrip.traveler_phone}`} className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
                <Phone className="w-4 h-4" />
              </a>
              <button className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
            <div className="text-right">
              <div className="text-white font-bold text-lg">{formatCurrency(activeTrip.total_fare)}</div>
              <div className="text-blue-200 text-xs capitalize">{activeTrip.transport_type}</div>
            </div>
          </div>

          <button
            onClick={() => navigate('/driver/trips')}
            className="w-full mt-4 py-3 rounded-xl bg-white text-blue-600 font-semibold hover:bg-blue-50 transition-colors"
          >
            View Trip Details
          </button>
        </motion.div>
      )}

      {/* Upcoming Trips */}
      {upcomingTrips.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Upcoming Trips</h2>
            <button onClick={() => navigate('/driver/trips')} className="text-sm font-medium flex items-center gap-1" style={{ color: TEAL }}>
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {upcomingTrips.slice(0, 3).map((trip) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">
                      {new Date(trip.scheduled_pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(trip.status)} bg-slate-50`}>
                    {getStatusLabel(trip.status)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <div className="flex-1 truncate text-slate-900">{trip.pickup_location?.name}</div>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  <div className="flex-1 truncate text-slate-900">{trip.dropoff_location?.name}</div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <span className="text-sm text-slate-500">{trip.traveler_name}</span>
                  <span className="font-semibold" style={{ color: TEAL }}>{formatCurrency(trip.total_fare)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/driver/schedule')}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <Calendar className="w-6 h-6" style={{ color: TEAL }} />
            <span className="text-sm font-medium text-slate-700">Set Availability</span>
          </button>
          <button
            onClick={() => navigate('/driver/wallet')}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <Wallet className="w-6 h-6" style={{ color: TEAL }} />
            <span className="text-sm font-medium text-slate-700">View Earnings</span>
          </button>
          <button
            onClick={() => navigate('/driver/profile')}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <Car className="w-6 h-6" style={{ color: TEAL }} />
            <span className="text-sm font-medium text-slate-700">Vehicle Info</span>
          </button>
          <button
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <Zap className="w-6 h-6" style={{ color: TEAL }} />
            <span className="text-sm font-medium text-slate-700">Find Charging</span>
          </button>
        </div>
      </div>

      {/* Performance Tips */}
      <div className="rounded-2xl p-5 bg-slate-50 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-3">Tips to Reach Gold Tier</h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span>Complete 50 more trips (currently at {stats.totalTrips})</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span>Maintain 4.8+ rating (currently {stats.rating})</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-600">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <span>Keep acceptance rate above 90%</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
