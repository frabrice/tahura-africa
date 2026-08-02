/*
  # Replace Operations Admin Account

  Removes the existing operations admin account (ops@roava.com) and creates
  a new one with the updated email and password.

  - Deletes all existing portal_users rows (only one existed)
  - Inserts new operations admin:
    - Email: ops@tahuraafrica.com
    - Password: TahuraAfrica@123 (SHA-256 hashed)
    - User ID Code: OP000001
    - Portal type: operations
*/

DELETE FROM portal_users;

INSERT INTO portal_users (
  id,
  email,
  password_hash,
  portal_type,
  name,
  user_id_code,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'ops@tahuraafrica.com',
  '96e1328e57d80b7af0b1465d058f99f63fc5b3b87b7d1cca5b8f8098a8b8b798',
  'operations',
  'Operations Admin',
  'OP000001',
  true,
  now(),
  now()
);
