/*
  # Widen ticket_messages.sender_type for cross-portal support chat

  ## Why
  sender_type only allowed ('traveler', 'portal', 'operations') - the support
  chat widget's new guided intake sends the requester's actual role
  (traveler/partner/host/guide) as sender_type so message bubbles can be
  aligned "mine vs theirs" per portal without hardcoding one role. Partner,
  Host, and Guide would fail every message insert against the old constraint.
*/

ALTER TABLE ticket_messages DROP CONSTRAINT IF EXISTS ticket_messages_sender_type_check;
ALTER TABLE ticket_messages ADD CONSTRAINT ticket_messages_sender_type_check
  CHECK (sender_type IN ('traveler', 'partner', 'host', 'guide', 'portal', 'operations'));
