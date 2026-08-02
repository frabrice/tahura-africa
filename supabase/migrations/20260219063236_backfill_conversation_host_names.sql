/*
  # Backfill Host Names in Conversations

  ## Overview
  Updates existing conversations to populate the host_name field from the partner_hosts table.
  This ensures all conversation cards display the correct host name instead of the fallback "Host" text.

  ## Changes
  - Updates all conversations where host_id exists but host_name is null or empty
  - Fetches the actual host name from partner_hosts table
  - No structural changes, only data updates

  ## Notes
  - Safe to run multiple times (idempotent)
  - Only affects conversations with valid host_id references
*/

-- Backfill host_name for existing conversations
UPDATE conversations c
SET host_name = ph.name
FROM partner_hosts ph
WHERE c.host_id = ph.id
  AND (c.host_name IS NULL OR c.host_name = '');
