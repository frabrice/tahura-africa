/*
  # Drop Unused and Duplicate Indexes

  Removes indexes flagged as unused by the Supabase security advisor,
  plus 3 duplicate index pairs where identical indexes existed.

  1. Duplicate Indexes Dropped (keeping the `_id` suffix versions)
    - `idx_partner_hosts_partner` (duplicate of `idx_partner_hosts_partner_id`)
    - `idx_partner_listings_host` (duplicate of `idx_partner_listings_host_id`)
    - `idx_partner_listings_partner` (duplicate of `idx_partner_listings_partner_id`)

  2. Unused Indexes Dropped (48 indexes)
    - Various indexes on bookings, guides, conversations, messages, etc.
    - These had zero usage since creation per pg_stat_user_indexes

  3. Important Notes
    - Recently created notification/content_flag indexes are EXCLUDED
      since they have no usage stats yet but serve active queries
    - All drops use IF EXISTS for safety
*/

-- Duplicate indexes: drop shorter-named duplicates
DROP INDEX IF EXISTS idx_partner_hosts_partner;
DROP INDEX IF EXISTS idx_partner_listings_host;
DROP INDEX IF EXISTS idx_partner_listings_partner;

-- Unused indexes on bookings
DROP INDEX IF EXISTS idx_bookings_status;
DROP INDEX IF EXISTS idx_bookings_booking_date;
DROP INDEX IF EXISTS idx_bookings_created_at;
DROP INDEX IF EXISTS idx_bookings_host_id;
DROP INDEX IF EXISTS idx_bookings_item_date_session;
DROP INDEX IF EXISTS idx_bookings_guide_date;
DROP INDEX IF EXISTS idx_bookings_host_date;
DROP INDEX IF EXISTS idx_bookings_partner_status;
DROP INDEX IF EXISTS idx_bookings_institution_created;

-- Unused indexes on partner_hosts
DROP INDEX IF EXISTS idx_partner_hosts_traveler_id;
DROP INDEX IF EXISTS idx_partner_hosts_traveler_user_id;
DROP INDEX IF EXISTS idx_partner_hosts_created_by_portal_user;
DROP INDEX IF EXISTS idx_partner_hosts_created_by_user_id;

-- Unused indexes on partner_listings
DROP INDEX IF EXISTS idx_partner_listings_partner_status;
DROP INDEX IF EXISTS idx_partner_listings_type_status;

-- Unused indexes on guides
DROP INDEX IF EXISTS idx_guides_available;
DROP INDEX IF EXISTS idx_guides_email;
DROP INDEX IF EXISTS idx_guides_traveler_user_id;

-- Unused indexes on programs
DROP INDEX IF EXISTS idx_programs_active;

-- Unused indexes on conversations
DROP INDEX IF EXISTS idx_conversations_guide;
DROP INDEX IF EXISTS idx_conversations_updated;
DROP INDEX IF EXISTS idx_conversations_traveler_updated;
DROP INDEX IF EXISTS idx_conversations_host_updated;
DROP INDEX IF EXISTS idx_conversations_guide_updated;

-- Unused indexes on messages
DROP INDEX IF EXISTS idx_messages_conversation;
DROP INDEX IF EXISTS idx_messages_conversation_created;

-- Unused indexes on ticket_messages
DROP INDEX IF EXISTS idx_ticket_messages_ticket;
DROP INDEX IF EXISTS idx_ticket_messages_created;

-- Unused indexes on support_tickets
DROP INDEX IF EXISTS idx_support_tickets_status;
DROP INDEX IF EXISTS idx_support_tickets_booking;
DROP INDEX IF EXISTS idx_support_tickets_category;

-- Unused indexes on guide_tips
DROP INDEX IF EXISTS idx_guide_tips_status;

-- Unused indexes on guide_salary_payments
DROP INDEX IF EXISTS idx_guide_salary_status;

-- Unused indexes on schedule_overrides
DROP INDEX IF EXISTS idx_schedule_overrides_entity;
DROP INDEX IF EXISTS idx_schedule_overrides_date;

-- Unused indexes on institution_profiles
DROP INDEX IF EXISTS idx_institution_profiles_published;

-- Unused indexes on portal_users
DROP INDEX IF EXISTS idx_portal_users_code;
DROP INDEX IF EXISTS idx_portal_users_created_by;

-- Unused indexes on attraction_reviews
DROP INDEX IF EXISTS idx_attraction_reviews_booking;
DROP INDEX IF EXISTS idx_attraction_reviews_traveler;

-- Unused indexes on government_policies
DROP INDEX IF EXISTS idx_government_policies_status;
DROP INDEX IF EXISTS idx_government_policies_priority;

-- Unused indexes on notifications (keeping recipient and is_read as they serve active queries)
-- NOT dropping: idx_notifications_recipient, idx_notifications_is_read

-- Unused indexes on content_flags (keeping target and status as they serve active queries)
-- NOT dropping: idx_content_flags_target, idx_content_flags_status

-- NOT dropping: idx_institution_profiles_flagged (serves active filter queries)
