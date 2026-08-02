/*
  # Create Email Logs Table

  1. New Tables
    - `email_logs`
      - `id` (uuid, primary key)
      - `recipient_email` (text, not null) - the email address the message was sent to
      - `recipient_name` (text) - display name of the recipient
      - `template_type` (text, not null) - identifier for which email template was used
      - `subject` (text, not null) - the email subject line
      - `status` (text, not null, default 'sent') - delivery status: sent, failed, pending
      - `error_message` (text) - error details if delivery failed
      - `metadata` (jsonb) - additional context (booking_id, flag_id, etc.)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `email_logs` table
    - Only authenticated users (operations) can read email logs
    - System (service role) inserts logs via edge functions

  3. Indexes
    - Index on `recipient_email` for lookup queries
    - Index on `template_type` for filtering
    - Index on `created_at` for chronological queries
*/

CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_name text DEFAULT '',
  template_type text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operations users can view email logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users
      WHERE portal_users.user_id_code = 'OPS-001'
      AND portal_users.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON email_logs(template_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);
