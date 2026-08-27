const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export type EmailTemplate =
  | 'booking_confirmation_traveler'
  | 'new_booking_host'
  | 'new_booking_guide'
  | 'new_message'
  | 'review_received_host'
  | 'review_received_guide'
  | 'traveler_review_received'
  | 'content_flagged'
  | 'content_resolved'
  | 'content_removed'
  | 'support_ticket_confirmation'
  | 'support_ticket_status_update'
  | 'support_ticket_reply'
  | 'support_ticket_closed'
  | 'account_created'
  | 'host_account_created'
  | 'guide_account_created'
  | 'booking_reminder'
  | 'account_deactivated'
  | 'welcome_traveler'
  | 'government_account_created'
  | 'booking_cancelled'
  | 'withdrawal_paid'
  | 'withdrawal_rejected'
  | 'application_received'
  | 'application_received_admin'
  | 'application_approved'
  | 'application_rejected';

interface SendEmailParams {
  template: EmailTemplate;
  recipient_email: string;
  recipient_name?: string;
  data: Record<string, any>;
}

async function sendWithRetry(params: SendEmailParams, retries = 2): Promise<void> {
  const url = `${SUPABASE_URL}/functions/v1/send-email`;
  let lastError: Error | null = null;

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      if (res.ok) return;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
    if (i < retries) {
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  console.error('Email failed after retries:', lastError);
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  try {
    await sendWithRetry(params);
  } catch (_) {
    // non-blocking: email failures should never break the UI
  }
}
