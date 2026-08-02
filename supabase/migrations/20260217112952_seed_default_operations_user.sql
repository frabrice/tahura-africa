/*
  # Seed Default Operations User

  ## Overview
  Creates a default operations user for initial system access and user management.

  ## Details
  - Email: ops@roava.com
  - Password: operations123 (should be changed after first login)
  - User ID Code: OP000001
  - Portal Type: operations

  ## Note
  Password is hashed using SHA-256
*/

INSERT INTO portal_users (
  portal_type,
  email,
  password_hash,
  user_id_code,
  name,
  is_active
) VALUES (
  'operations',
  'ops@roava.com',
  '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
  'OP000001',
  'Operations Admin',
  true
)
ON CONFLICT (email) DO NOTHING;