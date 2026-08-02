/*
  # Link portal_users to Supabase Auth (secure invite-based accounts)

  Moves admin (operations) + partner logins onto Supabase Auth. Each portal_users
  row keeps the portal profile/role but delegates authentication (bcrypt password,
  email verification, secure sessions) to auth.users.

  1. Changes
    - `portal_users.auth_user_id` (uuid, FK -> auth.users, ON DELETE SET NULL)
      links a portal account to its Supabase Auth identity. NULL for legacy accounts
      still on the old custom auth (kept working via fallback during migration).
    - `portal_users.password_hash` made nullable — Supabase-Auth accounts have no
      local hash (bcrypt lives in auth.users).
    - index on auth_user_id for fast login lookups.

  Legacy accounts (auth_user_id IS NULL) continue to authenticate the old way until
  migrated, so no one is locked out.
*/

ALTER TABLE portal_users
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE portal_users
  ALTER COLUMN password_hash DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_portal_users_auth_user_id ON portal_users(auth_user_id);
