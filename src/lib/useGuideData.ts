import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export interface GuideRecord {
  id: string;
  portal_user_id: string;
  name: string;
  bio: string;
  email: string;
  phone: string;
  specializations: string[];
  languages: string[];
  experience_years: number;
  rating: number;
  total_tours: number;
  available: boolean;
  created_at: string;
}

export interface ProgramRecord {
  id: string;
  portal_user_id: string;
  title: string;
  description: string;
  duration_hours: number;
  max_participants: number;
  price_per_person: number;
  what_included: string[];
  what_to_bring: string[];
  images: string[];
  active: boolean;
  created_at: string;
  institution_id?: string | null;
}

export interface GuideBookingRecord {
  id: string;
  booking_ref: string;
  traveler_id: string | null;
  traveler_name: string;
  traveler_email: string;
  traveler_profile_picture?: string;
  booking_type: string;
  item_id: string | null;
  item_title: string;
  guide_id: string | null;
  guide_name: string | null;
  program_id: string | null;
  package_name: string | null;
  institution_id: string | null;
  booking_date: string;
  duration_days?: number | null;
  guests: number;
  subtotal: number;
  service_fee: number;
  total_amount: number;
  session: string | null;
  special_requests: string;
  status: string;
  created_at: string;
  updated_at: string;
  transport_requested?: boolean;
  transport_id?: string | null;
}

export function getGuideContext(): { id: string; name: string; portal_user_id: string; email?: string } | null {
  try {
    const stored = localStorage.getItem('guideContext');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function useGuideRecord() {
  const ctx = getGuideContext();
  const [guide, setGuide] = useState<GuideRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ctx?.id) { setLoading(false); return; }
    supabase
      .from('guides')
      .select('*')
      .eq('id', ctx.id)
      .maybeSingle()
      .then(({ data }) => {
        setGuide(data);
        setLoading(false);
      });
  }, [ctx?.id]);

  return { guide, loading };
}

export function useGuidePrograms(guideId: string | undefined) {
  const [programs, setPrograms] = useState<ProgramRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guideId) { setLoading(false); return; }
    supabase
      .from('program_guides')
      .select('program_id')
      .eq('guide_id', guideId)
      .then(async ({ data: links }) => {
        if (!links || links.length === 0) { setPrograms([]); setLoading(false); return; }
        const ids = links.map((l: { program_id: string }) => l.program_id);
        const { data: progs } = await supabase
          .from('programs')
          .select('*')
          .in('id', ids);

        const portalUserIds = [...new Set((progs || []).map(p => p.portal_user_id))];
        const { data: institutions } = portalUserIds.length
          ? await supabase.from('institution_profiles').select('id, portal_user_id').in('portal_user_id', portalUserIds)
          : { data: [] as { id: string; portal_user_id: string }[] };
        const institutionByPortalUser = new Map((institutions || []).map(i => [i.portal_user_id, i.id]));

        setPrograms((progs || []).map(p => ({ ...p, institution_id: institutionByPortalUser.get(p.portal_user_id) ?? null })));
        setLoading(false);
      });
  }, [guideId]);

  return { programs, loading };
}

export interface AssignedListingRecord {
  id: string;
  title: string;
  listing_type: 'experience' | 'homestay' | 'itinerary';
  pricing: { base_price?: number; currency?: string } | null;
  media: string[];
  status: string;
}

// Partner-listing guide assignment (guides.id -> partner_listings.guide_id) is
// a separate pool from the attraction-side program_guides join above — a
// guide can appear in both.
export function useGuideAssignedListings(guideId: string | undefined) {
  const [listings, setListings] = useState<AssignedListingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guideId) { setLoading(false); return; }
    supabase
      .from('partner_listings')
      .select('id, title, listing_type, pricing, media, status')
      .eq('guide_id', guideId)
      .then(({ data }) => {
        setListings(data || []);
        setLoading(false);
      });
  }, [guideId]);

  return { listings, loading };
}

export function useGuideBookings(guideId: string | undefined) {
  const [bookings, setBookings] = useState<GuideBookingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    if (!guideId) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from('bookings')
      .select('*')
      .eq('guide_id', guideId)
      .order('booking_date', { ascending: true })
      .then(({ data }) => {
        setBookings(data || []);
        setLoading(false);
      });
  };

  useEffect(fetch, [guideId]);

  return { bookings, loading, refetch: fetch };
}
