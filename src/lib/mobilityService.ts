import { supabase } from './supabase';
import { getDrivingRoute } from './routing';
import type {
  Vehicle,
  Driver,
  Transport,
  TransportZone,
  TransportLocation,
  TransportFareCalculation,
  DispatchScoreResult,
  TransportType,
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

const DISPATCH_SCORE_WEIGHTS = {
  distance: 0.30,
  availability: 0.25,
  quality: 0.25,
  specialization: 0.10,
  fleet_priority: 0.10,
};

const DRIVER_TIER_PRIORITIES = {
  platinum: 4,
  gold: 3,
  silver: 2,
  bronze: 1,
};

const FLEET_PRIORITY_SCORES = {
  tahura: 100,
  partner: 80,
  independent: 60,
};

const DRIVER_SPECIALIZATIONS = [
  'airport',
  'wildlife_tours',
  'city_tours',
  'multi_day',
  'nature_hikes',
  'cultural_tours',
  'photography_tours',
  'night_tours',
];

// ============================================================================
// FARE CALCULATION
// ============================================================================

export async function calculateTransportFare(
  pickupLocation: TransportLocation,
  dropoffLocation: TransportLocation,
  zoneId: string,
  isRoundtrip: boolean = false
): Promise<TransportFareCalculation | null> {
  try {
    // Get zone details
    const { data: zone, error: zoneError } = await supabase
      .from('transport_zones')
      .select('*')
      .eq('id', zoneId)
      .single();

    if (zoneError || !zone) {
      console.error('Error fetching transport zone:', zoneError);
      return null;
    }

    // Real driving-route distance (OSRM). Falls back to straight-line if the
    // routing request fails (offline, no route found across water/borders,
    // etc.) so fare calculation never just breaks.
    const pLat = pickupLocation.coordinates?.lat || 0;
    const pLng = pickupLocation.coordinates?.lng || 0;
    const dLat = dropoffLocation.coordinates?.lat || 0;
    const dLng = dropoffLocation.coordinates?.lng || 0;
    const route = await getDrivingRoute({ lat: pLat, lng: pLng }, { lat: dLat, lng: dLng });
    const distanceKm = route?.distanceKm ?? calculateDistance(pLat, pLng, dLat, dLng);

    // Calculate base fare
    const baseFare = zone.base_fare;
    const distanceFare = distanceKm * zone.per_km_rate;

    // Apply surge if applicable
    const surgeInfo = calculateSurgeMultiplier(zone);
    const surgeMultiplier = surgeInfo.multiplier;

    // Calculate total
    let subtotal = baseFare + distanceFare;
    if (subtotal < zone.min_fare) {
      subtotal = zone.min_fare;
    }

    const totalFare = isRoundtrip
      ? subtotal * surgeMultiplier * 2
      : subtotal * surgeMultiplier;

    return {
      zone_id: zone.id,
      zone_name: zone.region,
      distance_km: Math.round(distanceKm * 10) / 10,
      base_fare: baseFare,
      distance_fare: Math.round(distanceFare * 100) / 100,
      surge_multiplier: surgeMultiplier,
      surge_reason: surgeInfo.reason,
      subtotal: Math.round(subtotal * 100) / 100,
      is_roundtrip: isRoundtrip,
      total_fare: Math.round(totalFare * 100) / 100,
    };
  } catch (error) {
    console.error('Error calculating transport fare:', error);
    return null;
  }
}

function calculateSurgeMultiplier(
  zone: TransportZone
): { multiplier: number; reason?: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hour = now.getHours();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const surgeRules = zone.surge_rules;

  // Check peak hours
  if (surgeRules.peak_hours && surgeRules.peak_hours.length > 0) {
    for (const peak of surgeRules.peak_hours) {
      const [start, end] = peak.split('-');
      const startHour = parseInt(start.split(':')[0]);
      const endHour = parseInt(end.split(':')[0]);

      if (hour >= startHour && hour < endHour) {
        return { multiplier: 1.25, reason: 'Peak hour surcharge' };
      }
    }
  }

  // Check weekend multiplier
  if (isWeekend && surgeRules.weekend_multiplier > 1) {
    return { multiplier: surgeRules.weekend_multiplier, reason: 'Weekend surcharge' };
  }

  // Check night surcharge (if applicable)
  if (hour >= 22 || hour < 5) {
    const nightSurcharge = surgeRules.night_surcharge || 0;
    if (nightSurcharge > 0) {
      // Night surcharge is a fixed amount addition, not multiplier
      return { multiplier: 1.15, reason: 'Night surcharge' };
    }
  }

  return { multiplier: surgeRules.event_multiplier || 1.0 };
}

// Haversine (straight-line) distance - used as a fallback when the real
// routing call fails, and for driver-dispatch proximity scoring below where
// exact road distance doesn't matter, just relative ranking.
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

// ============================================================================
// DISPATCH ALGORITHM
// ============================================================================

export async function findBestDriver(
  pickupLocation: TransportLocation,
  scheduledTime: Date,
  requiredSpecializations: string[] = [],
  maxDistanceKm: number = 30
): Promise<DispatchScoreResult | null> {
  try {
    // Get available drivers from database
    const { data: availableDrivers, error } = await supabase.rpc(
      'get_available_drivers',
      {
        p_pickup_lat: pickupLocation.coordinates?.lat || 0,
        p_pickup_lng: pickupLocation.coordinates?.lng || 0,
        p_scheduled_time: scheduledTime.toISOString(),
        p_max_distance_km: maxDistanceKm,
      }
    );

    if (error) {
      console.error('Error fetching available drivers:', error);
      return null;
    }

    if (!availableDrivers || availableDrivers.length === 0) {
      return null;
    }

    // Score each driver
    const scoredDrivers: DispatchScoreResult[] = availableDrivers.map((driver: any) => {
      const scores = calculateDispatchScores(
        driver,
        pickupLocation,
        scheduledTime,
        requiredSpecializations
      );

      return {
        driver_id: driver.driver_id,
        driver: driver as Driver,
        score: scores.total,
        distance_score: scores.distance,
        availability_score: scores.availability,
        quality_score: scores.quality,
        specialization_score: scores.specialization,
        fleet_priority_score: scores.fleetPriority,
        estimated_arrival_minutes: Math.round((scores.distanceKm / 30) * 60), // Assume 30km/h avg speed
      };
    });

    // Sort by score descending
    scoredDrivers.sort((a, b) => b.score - a.score);

    // Return best match
    return scoredDrivers[0] || null;
  } catch (error) {
    console.error('Error finding best driver:', error);
    return null;
  }
}

function calculateDispatchScores(
  driver: any,
  pickupLocation: TransportLocation,
  _scheduledTime: Date,
  requiredSpecializations: string[]
): {
  total: number;
  distance: number;
  availability: number;
  quality: number;
  specialization: number;
  fleetPriority: number;
  distanceKm: number;
} {
  // Distance score (30%)
  const driverLat = driver.current_location?.lat || -1.95;
  const driverLng = driver.current_location?.lng || 30.06;
  const pickupLat = pickupLocation.coordinates?.lat || 0;
  const pickupLng = pickupLocation.coordinates?.lng || 0;

  const distanceKm = calculateDistance(driverLat, driverLng, pickupLat, pickupLng);
  let distanceScore = Math.max(0, 100 - distanceKm * 3); // -3 points per km
  distanceScore = Math.min(100, Math.max(0, distanceScore));

  // Availability score (25%)
  const now = new Date();
  const minutesSinceLastTrip = driver.last_trip_ended_at
    ? (now.getTime() - new Date(driver.last_trip_ended_at).getTime()) / 60000
    : 120;
  const availabilityScore = Math.min(100, minutesSinceLastTrip * 0.83); // Max at 120 min

  // Quality score (25%)
  const ratingScore = (driver.rating || 0) * 20; // 5.0 * 20 = 100
  const tierScore = DRIVER_TIER_PRIORITIES[driver.tier as keyof typeof DRIVER_TIER_PRIORITIES] || 1;
  const qualityScore = (ratingScore * 0.6 + tierScore * 20 * 0.4);

  // Specialization score (10%)
  let specializationScore = 50; // Base score
  if (requiredSpecializations.length > 0) {
    const driverSpecs = driver.specializations || [];
    const matchingSpecs = requiredSpecializations.filter((s) =>
      driverSpecs.includes(s)
    );
    specializationScore = matchingSpecs.length > 0
      ? 100 * (matchingSpecs.length / requiredSpecializations.length)
      : 0;
  } else {
    specializationScore = 75; // Good score when no specific requirements
  }

  // Fleet priority score (10%)
  const fleetPriorityScore = FLEET_PRIORITY_SCORES[
    driver.user_account_type as keyof typeof FLEET_PRIORITY_SCORES
  ] || 60;

  // Calculate weighted total
  const total =
    distanceScore * DISPATCH_SCORE_WEIGHTS.distance +
    availabilityScore * DISPATCH_SCORE_WEIGHTS.availability +
    qualityScore * DISPATCH_SCORE_WEIGHTS.quality +
    specializationScore * DISPATCH_SCORE_WEIGHTS.specialization +
    fleetPriorityScore * DISPATCH_SCORE_WEIGHTS.fleet_priority;

  return {
    total: Math.round(total * 100) / 100,
    distance: Math.round(distanceScore * 100) / 100,
    availability: Math.round(availabilityScore * 100) / 100,
    quality: Math.round(qualityScore * 100) / 100,
    specialization: Math.round(specializationScore * 100) / 100,
    fleetPriority: Math.round(fleetPriorityScore * 100) / 100,
    distanceKm,
  };
}

// ============================================================================
// TRANSPORT MANAGEMENT
// ============================================================================

export async function createTransport(
  bookingId: string,
  pickupLocation: TransportLocation,
  dropoffLocation: TransportLocation,
  transportType: TransportType,
  scheduledPickupTime: Date,
  zoneId?: string
): Promise<Transport | null> {
  try {
    // Get fare calculation
    const fare = zoneId
      ? await calculateTransportFare(pickupLocation, dropoffLocation, zoneId, transportType === 'roundtrip')
      : null;

    // Create transport record
    const transportData = {
      booking_id: bookingId,
      transport_type: transportType,
      pickup_location: pickupLocation,
      dropoff_location: dropoffLocation,
      scheduled_pickup_time: scheduledPickupTime.toISOString(),
      distance_km: fare?.distance_km,
      base_fare: fare?.base_fare,
      total_fare: fare?.total_fare,
      surge_multiplier: fare?.surge_multiplier || 1.0,
      status: 'pending_dispatch',
    };

    const { data: transport, error } = await supabase
      .from('transports')
      .insert(transportData)
      .select()
      .single();

    if (error) {
      console.error('Error creating transport:', error);
      return null;
    }

    return transport;
  } catch (error) {
    console.error('Error in createTransport:', error);
    return null;
  }
}

export async function dispatchTransport(
  transportId: string
): Promise<{ success: boolean; driver?: Driver; error?: string }> {
  try {
    // Get transport details
    const { data: transport, error: transportError } = await supabase
      .from('transports')
      .select('*')
      .eq('id', transportId)
      .single();

    if (transportError || !transport) {
      return { success: false, error: 'Transport not found' };
    }

    // Find best driver
    const bestDriver = await findBestDriver(
      transport.pickup_location,
      new Date(transport.scheduled_pickup_time),
      [] // Could add required specializations based on booking type
    );

    if (!bestDriver) {
      // No driver available - keep in pending_dispatch status
      return { success: false, error: 'No drivers available' };
    }

    // Assign driver to transport
    const { error: updateError } = await supabase
      .from('transports')
      .update({
        driver_id: bestDriver.driver_id,
        status: 'dispatched',
        dispatch_score: bestDriver.score,
        dispatch_offered_at: new Date().toISOString(),
      })
      .eq('id', transportId);

    if (updateError) {
      console.error('Error dispatching transport:', updateError);
      return { success: false, error: 'Failed to assign driver' };
    }

    // Send notification to driver (would be handled by a Supabase trigger or edge function)
    // For now, just return success

    return { success: true, driver: bestDriver.driver };
  } catch (error) {
    console.error('Error in dispatchTransport:', error);
    return { success: false, error: 'Dispatch failed' };
  }
}

export async function updateTransportStatus(
  transportId: string,
  newStatus: Transport['status'],
  notes?: string
): Promise<boolean> {
  try {
    const updateData: Record<string, any> = { status: newStatus };

    if (newStatus === 'driver_en_route') {
      updateData.dispatch_accepted_at = new Date().toISOString();
    } else if (newStatus === 'arrived') {
      // Driver arrived at pickup
    } else if (newStatus === 'in_progress') {
      updateData.actual_pickup_time = new Date().toISOString();
    } else if (newStatus === 'completed') {
      updateData.actual_dropoff_time = new Date().toISOString();
    }

    if (notes) {
      updateData.driver_notes = notes;
    }

    const { error } = await supabase
      .from('transports')
      .update(updateData)
      .eq('id', transportId);

    if (error) {
      console.error('Error updating transport status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateTransportStatus:', error);
    return false;
  }
}

// ============================================================================
// VEHICLE MANAGEMENT
// ============================================================================

export async function getVehicles(ownerType?: string, ownerId?: string): Promise<Vehicle[]> {
  try {
    let query = supabase.from('vehicles').select('*');

    if (ownerType) {
      query = query.eq('owner_type', ownerType);
    }
    if (ownerId) {
      query = query.eq('owner_id', ownerId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching vehicles:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getVehicles:', error);
    return [];
  }
}

export async function createVehicle(
  vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>
): Promise<Vehicle | null> {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .insert(vehicle)
      .select()
      .single();

    if (error) {
      console.error('Error creating vehicle:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createVehicle:', error);
    return null;
  }
}

export async function updateVehicleLocation(
  vehicleId: string,
  lat: number,
  lng: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('vehicles')
      .update({
        current_location: {
          lat,
          lng,
          last_updated: new Date().toISOString(),
        },
      })
      .eq('id', vehicleId);

    return !error;
  } catch (error) {
    console.error('Error updating vehicle location:', error);
    return false;
  }
}

// ============================================================================
// DRIVER MANAGEMENT
// ============================================================================

export async function getDrivers(status?: string): Promise<Driver[]> {
  try {
    let query = supabase.from('drivers').select('*');

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching drivers:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getDrivers:', error);
    return [];
  }
}

export async function getDriverById(driverId: string): Promise<Driver | null> {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', driverId)
      .single();

    if (error) {
      console.error('Error fetching driver:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getDriverById:', error);
    return null;
  }
}

export async function createDriver(
  driver: Omit<Driver, 'id' | 'created_at' | 'updated_at'>
): Promise<Driver | null> {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .insert(driver)
      .select()
      .single();

    if (error) {
      console.error('Error creating driver:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createDriver:', error);
    return null;
  }
}

export async function updateDriverTier(
  driverId: string,
  tier: Driver['tier']
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('drivers')
      .update({ tier })
      .eq('id', driverId);

    return !error;
  } catch (error) {
    console.error('Error updating driver tier:', error);
    return false;
  }
}

export async function getDriverSchedule(
  driverId: string,
  date: string
): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('driver_schedules')
      .select('*')
      .eq('driver_id', driverId)
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching driver schedule:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getDriverSchedule:', error);
    return null;
  }
}

export async function setDriverAvailability(
  driverId: string,
  date: string,
  status: 'available' | 'off_duty' | 'leave',
  startTime?: string,
  endTime?: string
): Promise<boolean> {
  try {
    const scheduleData = {
      driver_id: driverId,
      date,
      status,
      available_start_time: startTime || '07:00:00',
      available_end_time: endTime || '19:00:00',
    };

    const { error } = await supabase
      .from('driver_schedules')
      .upsert(scheduleData, { onConflict: 'driver_id,date' });

    return !error;
  } catch (error) {
    console.error('Error setting driver availability:', error);
    return false;
  }
}

// ============================================================================
// TRANSPORT ZONES
// ============================================================================

export async function getTransportZones(): Promise<TransportZone[]> {
  try {
    const { data, error } = await supabase
      .from('transport_zones')
      .select('*')
      .eq('is_active', true)
      .order('region');

    if (error) {
      console.error('Error fetching transport zones:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getTransportZones:', error);
    return [];
  }
}

export async function getTransportZoneForLocation(
  lat: number,
  lng: number
): Promise<TransportZone | null> {
  try {
    const zones = await getTransportZones();
    if (zones.length === 0) return null;

    const withCenter = zones.filter((z) => z.coverage_area?.center);
    if (withCenter.length === 0) {
      const kigaliZone = zones.find((z) => z.region === 'Kigali City');
      return kigaliZone || zones[0] || null;
    }

    // Airport Transfer has a small, specific radius around the airport -
    // check it first so a nearby-but-larger zone (e.g. Kigali City) can't
    // shadow it just by having a bigger circle.
    const airportZone = withCenter.find((z) => z.region === 'Airport Transfer');
    if (airportZone?.coverage_area?.center) {
      const d = calculateDistance(lat, lng, airportZone.coverage_area.center.lat, airportZone.coverage_area.center.lng);
      if (d <= (airportZone.coverage_area.radius_km ?? 0)) return airportZone;
    }

    let best: TransportZone | null = null;
    let bestDistance = Infinity;
    for (const zone of withCenter) {
      if (zone.region === 'Airport Transfer') continue;
      const center = zone.coverage_area!.center!;
      const d = calculateDistance(lat, lng, center.lat, center.lng);
      if (d < bestDistance) {
        bestDistance = d;
        best = zone;
      }
    }

    return best || zones[0] || null;
  } catch (error) {
    console.error('Error in getTransportZoneForLocation:', error);
    return null;
  }
}

// ============================================================================
// CHARGING STATIONS
// ============================================================================

export async function getChargingStations(status?: string): Promise<any[]> {
  try {
    let query = supabase.from('charging_stations').select('*');

    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.eq('status', 'operational');
    }

    const { data, error } = await query.order('name');

    if (error) {
      console.error('Error fetching charging stations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getChargingStations:', error);
    return [];
  }
}

// ============================================================================
// ANALYTICS
// ============================================================================

export async function getMobilityMetrics(
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalTrips: number;
  totalDistance: number;
  totalRevenue: number;
  avgRating: number;
  activeDrivers: number;
  activeVehicles: number;
  evPercentage: number;
}> {
  try {
    let query = supabase
      .from('transports')
      .select('id, distance_km, total_fare, rating, status');

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data: transports, error } = await query;

    if (error) {
      console.error('Error fetching mobility metrics:', error);
    }

    const completedTrips = transports?.filter((t) => t.status === 'completed') || [];

    // Get vehicle counts
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, is_ev, status')
      .eq('status', 'active');

    const activeDriversResult = await supabase
      .from('drivers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    const ratings = completedTrips.filter((t) => t.rating).map((t) => t.rating);

    return {
      totalTrips: completedTrips.length,
      totalDistance: completedTrips.reduce((sum, t) => sum + (t.distance_km || 0), 0),
      totalRevenue: completedTrips.reduce((sum, t) => sum + (t.total_fare || 0), 0),
      avgRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
      activeDrivers: activeDriversResult.count || 0,
      activeVehicles: vehicles?.length || 0,
      evPercentage: vehicles
        ? (vehicles.filter((v) => v.is_ev).length / vehicles.length) * 100
        : 0,
    };
  } catch (error) {
    console.error('Error in getMobilityMetrics:', error);
    return {
      totalTrips: 0,
      totalDistance: 0,
      totalRevenue: 0,
      avgRating: 0,
      activeDrivers: 0,
      activeVehicles: 0,
      evPercentage: 0,
    };
  }
}

// ============================================================================
// HELPER EXPORTS
// ============================================================================

export const DRIVER_SPECIALIZATION_OPTIONS = DRIVER_SPECIALIZATIONS;

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  sedan: 'Sedan',
  suv: 'SUV',
  van: 'Van',
  minibus: 'Minibus',
  motorcycle: 'Motorcycle',
};

export const VEHICLE_AMENITY_OPTIONS = [
  'wifi',
  'ac',
  'charging_ports',
  'coolbox',
  'first_aid_kit',
  'baby_seat',
  'wheelchair_access',
  'luggage_rack',
  'sunroof',
  'bluetooth_audio',
];

export const DRIVER_TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

export const TRANSPORT_STATUS_LABELS: Record<string, string> = {
  pending_dispatch: 'Pending Dispatch',
  dispatched: 'Dispatched',
  driver_en_route: 'Driver En Route',
  arrived: 'Driver Arrived',
  in_progress: 'Trip In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const TRANSPORT_TYPE_LABELS: Record<string, string> = {
  pickup: 'Pickup Only',
  dropoff: 'Drop-off Only',
  roundtrip: 'Round Trip',
  inter_location: 'Inter-location Transfer',
};
