/*
  # Add InTouch (IntouchPay) mobile-money support to payments

  ## Why
  Pesapal handles card payments only. MTN MoMo and Airtel Money now go through
  InTouch (IntouchPay, https://www.intouchpay.co.rw). InTouch uses an async
  "push to phone" flow: we request a payment, the subscriber approves a prompt on
  their handset, and InTouch calls our callback with the result. This migration
  generalises the `payments` table so it can store InTouch transactions alongside
  the existing Pesapal ones.

  ## Changes
  - `pesapal_merchant_reference` becomes nullable (InTouch rows don't have one).
  - New columns: `provider` ('pesapal' | 'intouch'), `intouch_request_id`
    (our requesttransactionid), `intouch_transaction_id` (InTouch's id),
    `mobile_phone` (the paying MoMo/Airtel number).
  - InTouch charges in RWF, so `currency` may now be 'RWF' on those rows.
*/

ALTER TABLE payments ALTER COLUMN pesapal_merchant_reference DROP NOT NULL;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'pesapal';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS intouch_request_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS intouch_transaction_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS mobile_phone text;

CREATE INDEX IF NOT EXISTS payments_intouch_request_idx ON payments(intouch_request_id);
CREATE INDEX IF NOT EXISTS payments_provider_idx ON payments(provider);
