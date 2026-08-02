export interface Experience {
  id: string;
  provider_id: string;
  provider_type: 'partner' | 'institution';
  title: string;
  description: string;
  category: string;
  location: {
    name: string;
    region: string;
    coordinates?: { lat: number; lng: number };
  };
  price_range: {
    min: number;
    max: number;
    currency: string;
  };
  capacity_limit: number;
  status: 'draft' | 'published' | 'suspended';
  media: string[];
  details?: {
    duration?: string;
    included?: string[];
    notIncluded?: string[];
    requirements?: string[];
  };
  provider_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Homestay {
  id: string;
  host_id: string;
  title: string;
  description: string;
  location: {
    name: string;
    region: string;
    coordinates?: { lat: number; lng: number };
  };
  stay_type: 'entire_home' | 'private_room' | 'shared_room';
  price_per_night: number;
  max_guests: number;
  amenities: string[];
  house_rules: string[];
  media: string[];
  status: 'published' | 'unlisted';
  host_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Attraction {
  id: string;
  institution_id: string;
  name: string;
  description: string;
  type: 'museum' | 'park' | 'heritage_site' | 'landmark';
  location: {
    name: string;
    region: string;
    coordinates?: { lat: number; lng: number };
  };
  entry_fee: number | 'varies';
  visiting_hours: string;
  guidelines: string[];
  media: string[];
  status: 'open' | 'closed' | 'seasonal';
  institution_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  experience_id?: string;
  traveler_id: string;
  provider_id: string;
  booking_date: string;
  time_slot: string;
  party_size: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  booking_reference: string;
  booking_type: 'experience' | 'homestay' | 'attraction' | 'itinerary';
  item_title?: string;
  provider_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  recipient_id: string;
  experience_id?: string;
  content: string;
  read_at?: string;
  created_at: string;
  sender_name?: string;
  recipient_name?: string;
  related_item?: {
    type: 'experience' | 'homestay' | 'attraction';
    title: string;
  };
}

export interface SavedItem {
  traveler_id: string;
  item_id: string;
  item_type: 'experience' | 'homestay' | 'attraction';
  saved_at: string;
  item?: Experience | Homestay | Attraction;
}

// ============================================================================
// TAHURA MOBILITY TYPES
// ============================================================================

export type VehicleOwnerType = 'tahura' | 'partner' | 'independent';
export type VehicleType = 'sedan' | 'suv' | 'van' | 'minibus' | 'motorcycle';
export type VehicleStatus = 'active' | 'maintenance' | 'retired';

export interface Vehicle {
  id: string;
  owner_type: VehicleOwnerType;
  owner_id?: string;
  vehicle_type: VehicleType;
  plate_number: string;
  capacity: number;
  is_ev: boolean;
  year_manufactured?: number;
  model?: string;
  color?: string;
  amenities: string[];
  status: VehicleStatus;
  current_location: {
    lat: number | null;
    lng: number | null;
    last_updated: string | null;
  };
  documents: {
    insurance_url?: string;
    inspection_url?: string;
    license_url?: string;
  };
  created_at: string;
  updated_at: string;
}

export type DriverAccountType = 'tahura_employee' | 'partner_employee' | 'independent';
export type DriverStatus = 'pending_verification' | 'active' | 'suspended' | 'inactive';
export type DriverTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Driver {
  id: string;
  user_account_type: DriverAccountType;
  portal_user_id?: string;
  traveler_user_id?: string;
  full_name: string;
  phone: string;
  email?: string;
  profile_picture?: string;
  license_number: string;
  license_expiry: string;
  languages: string[];
  specializations: string[];
  status: DriverStatus;
  tier: DriverTier;
  rating: number;
  total_trips: number;
  total_kilometers: number;
  max_engagements_per_day: number;
  bank_account: {
    bank_name?: string;
    account_number?: string;
    account_name?: string;
  };
  documents: {
    id_card_url?: string;
    license_url?: string;
    certifications: Array<{
      name: string;
      issued: string;
      expires?: string;
    }>;
  };
  created_at: string;
  updated_at: string;
}

export interface DriverVehicle {
  id: string;
  driver_id: string;
  vehicle_id: string;
  is_primary: boolean;
  assigned_at: string;
}

export type TransportType = 'pickup' | 'dropoff' | 'roundtrip' | 'inter_location';
export type TransportStatus =
  | 'pending_dispatch'
  | 'dispatched'
  | 'driver_en_route'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface TransportLocation {
  name: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  landmark?: string;
}

export interface Transport {
  id: string;
  booking_id?: string;
  driver_id?: string;
  vehicle_id?: string;
  transport_type: TransportType;
  pickup_location: TransportLocation;
  dropoff_location: TransportLocation;
  scheduled_pickup_time?: string;
  actual_pickup_time?: string;
  scheduled_dropoff_time?: string;
  actual_dropoff_time?: string;
  distance_km?: number;
  base_fare?: number;
  per_km_rate?: number;
  total_fare?: number;
  surge_multiplier: number;
  status: TransportStatus;
  dispatch_score?: number;
  dispatch_offered_at?: string;
  dispatch_accepted_at?: string;
  traveler_notes?: string;
  driver_notes?: string;
  rating?: number;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  driver?: Driver;
  vehicle?: Vehicle;
  booking?: Booking;
}

export interface TransportZone {
  id: string;
  region: string;
  base_fare: number;
  per_km_rate: number;
  min_fare: number;
  surge_rules: {
    peak_hours: string[];
    weekend_multiplier: number;
    event_multiplier: number;
    night_surcharge?: number;
  };
  coverage_area: {
    center?: { lat: number; lng: number };
    radius_km?: number;
    boundaries?: Array<{ lat: number; lng: number }>;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ChargerType = 'level2' | 'dc_fast' | 'supercharger';
export type ChargingStationStatus = 'operational' | 'maintenance' | 'planned';

export interface ChargingStation {
  id: string;
  name: string;
  partner_id?: string;
  location: { lat: number; lng: number };
  address?: string;
  charger_type: ChargerType;
  num_stalls: number;
  available_stalls: number;
  pricing_per_kwh?: number;
  status: ChargingStationStatus;
  amenities: string[];
  created_at: string;
  updated_at: string;
}

export type ScheduleStatus = 'available' | 'on_trip' | 'break' | 'off_duty' | 'leave';

export interface DriverSchedule {
  id: string;
  driver_id: string;
  date: string;
  status: ScheduleStatus;
  available_start_time: string;
  available_end_time: string;
  current_trip_id?: string;
  created_at: string;
}

export interface TransportRatingReview {
  id: string;
  transport_id: string;
  traveler_id: string;
  driver_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

// Transport Mandatory Options
export type TransportMandatoryFor = 'none' | 'all' | 'foreign_travelers' | 'first_time_bookers';

// Transport Default Pickup Types
export interface TransportDefaultPickup {
  type: 'traveler_location' | 'fixed_location' | 'hotel';
  location?: TransportLocation;
}

// Extended Booking with transport
export interface BookingWithTransport extends Booking {
  transport_requested?: boolean;
  transport_id?: string;
  transport_status_snapshot?: string;
  transport?: Transport;
}

// Dispatch Score Result
export interface DispatchScoreResult {
  driver_id: string;
  driver: Driver;
  score: number;
  distance_score: number;
  availability_score: number;
  quality_score: number;
  specialization_score: number;
  fleet_priority_score: number;
  estimated_arrival_minutes: number;
}

// Transport Fare Calculation
export interface TransportFareCalculation {
  zone_id: string;
  zone_name: string;
  distance_km: number;
  base_fare: number;
  distance_fare: number;
  surge_multiplier: number;
  surge_reason?: string;
  subtotal: number;
  is_roundtrip: boolean;
  total_fare: number;
}
