/*
  # Fix Foreign Key Constraints for Traveler Account Deletion

  1. Changes
    - `partner_hosts.traveler_user_id`: Changed from NO ACTION to SET NULL
      so deleting a traveler auth user does not block if they are linked as a host
    - `guides.traveler_user_id`: Changed from NO ACTION to SET NULL
      so deleting a traveler auth user does not block if they are linked as a guide
    - `conversations.traveler_id`: Changed from CASCADE to SET NULL
      so conversations are preserved (anonymized) for hosts/guides instead of being deleted
    - `attraction_reviews.traveler_id`: Changed from CASCADE to SET NULL
      so public reviews are preserved (anonymized) instead of being deleted

  2. Unchanged (already correct)
    - `bookings.traveler_id`: Already SET NULL
    - `saved_items.user_id`: Already CASCADE (personal data, fine to delete)
    - `support_tickets.created_by_auth_id`: Already SET NULL

  3. Important Notes
    - These changes ensure that deleting a traveler's auth account gracefully
      handles all downstream data without blocking or losing shared content
    - Host/guide records remain intact with their traveler_user_id set to null
    - Conversations and reviews become anonymous but are preserved
*/

ALTER TABLE partner_hosts
  DROP CONSTRAINT IF EXISTS partner_hosts_traveler_user_id_fkey,
  ADD CONSTRAINT partner_hosts_traveler_user_id_fkey
    FOREIGN KEY (traveler_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE guides
  DROP CONSTRAINT IF EXISTS guides_traveler_user_id_fkey,
  ADD CONSTRAINT guides_traveler_user_id_fkey
    FOREIGN KEY (traveler_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_traveler_id_fkey,
  ADD CONSTRAINT conversations_traveler_id_fkey
    FOREIGN KEY (traveler_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE attraction_reviews
  DROP CONSTRAINT IF EXISTS attraction_reviews_traveler_id_fkey,
  ADD CONSTRAINT attraction_reviews_traveler_id_fkey
    FOREIGN KEY (traveler_id) REFERENCES auth.users(id) ON DELETE SET NULL;
