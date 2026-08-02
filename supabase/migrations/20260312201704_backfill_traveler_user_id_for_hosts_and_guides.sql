/*
  # Backfill traveler_user_id for existing hosts and guides

  1. Changes
    - Match `partner_hosts.email` against `auth.users.email` and set `traveler_user_id`
    - Match `guides.email` against `auth.users.email` and set `traveler_user_id`
  
  2. Notes
    - Only updates records where `traveler_user_id` is currently NULL
    - Uses email-based matching (same logic as the login-time linking)
    - Ensures existing hosts/guides who have already signed up as travelers
      immediately get access to their data without needing to re-login
*/

UPDATE partner_hosts
SET traveler_user_id = au.id
FROM auth.users au
WHERE partner_hosts.email = au.email
  AND partner_hosts.traveler_user_id IS NULL;

UPDATE guides
SET traveler_user_id = au.id
FROM auth.users au
WHERE guides.email = au.email
  AND guides.traveler_user_id IS NULL;
