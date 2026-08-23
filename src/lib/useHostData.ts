import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export interface HostRecord {
  id: string;
  partner_id: string;
  name: string;
  bio: string;
  profile_picture: string;
  languages: string[];
  email: string;
  phone: string;
  expertise: string[];
  years_experience: number;
  status: string;
  traveler_id: string | null;
  created_at: string;
}

export interface ListingRecord {
  id: string;
  partner_id: string;
  host_id: string;
  listing_type: 'experience' | 'homestay';
  title: string;
  description: string;
  status: string;
  rejection_reason?: string | null;
  location: { name: string; region: string };
  pricing: { base_price?: number; amount?: number; per?: string; currency?: string };
  media: string[];
  details: Record<string, unknown>;
  tags: string[];
  created_at: string;
}

export interface BookingRecord {
  id: string;
  booking_ref: string;
  traveler_id: string | null;
  traveler_name: string;
  traveler_email: string;
  traveler_profile_picture?: string;
  booking_type: string;
  item_id: string | null;
  item_title: string;
  host_id: string | null;
  booking_date: string;
  duration_days?: number | null;
  guests: number;
  subtotal: number;
  service_fee: number;
  total_amount: number;
  session: string | null;
  special_requests: string;
  status: string;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
  transport_requested?: boolean;
  transport_id?: string | null;
}

export function getHostContext(): { id: string; name: string; partner_id: string; profile_picture?: string; email?: string } | null {
  try {
    const stored = localStorage.getItem('hostContext');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function useHostRecord() {
  const ctx = getHostContext();
  const [host, setHost] = useState<HostRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ctx?.id) { setLoading(false); return; }
    supabase
      .from('partner_hosts')
      .select('*')
      .eq('id', ctx.id)
      .maybeSingle()
      .then(({ data }) => {
        setHost(data);
        setLoading(false);
      });
  }, [ctx?.id]);

  return { host, loading };
}

export interface SubmissionRecord {
  id: string;
  host_id: string;
  partner_id: string;
  listing_type: 'experience' | 'homestay' | 'itinerary';
  title: string;
  description: string;
  location: { name: string; region: string };
  pricing: { base_price?: number; currency?: string };
  media: string[];
  tags: string[];
  status: 'pending_review' | 'approved' | 'rejected';
  rejection_reason: string | null;
  resulting_listing_id: string | null;
  created_at: string;
}

export function useHostSubmissions(hostId: string | undefined) {
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!hostId) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from('listing_submissions')
      .select('*')
      .eq('host_id', hostId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setSubmissions(data || []);
        setLoading(false);
      });
  };

  useEffect(load, [hostId]);

  return { submissions, loading, refetch: load };
}

export function useHostListings(hostId: string | undefined) {
  const [listings, setListings] = useState<ListingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hostId) { setLoading(false); return; }
    supabase
      .from('partner_listings')
      .select('*')
      .eq('host_id', hostId)
      .then(({ data }) => {
        setListings(data || []);
        setLoading(false);
      });
  }, [hostId]);

  return { listings, loading, refetch: () => {
    if (!hostId) return;
    setLoading(true);
    supabase.from('partner_listings').select('*').eq('host_id', hostId)
      .then(({ data }) => { setListings(data || []); setLoading(false); });
  }};
}

export function useHostBookings(hostId: string | undefined) {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hostId) { setLoading(false); return; }
    supabase
      .from('bookings')
      .select('*')
      .eq('host_id', hostId)
      .order('booking_date', { ascending: true })
      .then(({ data }) => {
        setBookings(data || []);
        setLoading(false);
      });
  }, [hostId]);

  return { bookings, loading, refetch: () => {
    if (!hostId) return;
    setLoading(true);
    supabase.from('bookings').select('*').eq('host_id', hostId)
      .order('booking_date', { ascending: true })
      .then(({ data }) => { setBookings(data || []); setLoading(false); });
  }};
}
