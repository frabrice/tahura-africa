const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface NotifyMessageParams {
  conversation_id: string;
  sender_type: 'traveler' | 'host' | 'guide';
  sender_name: string;
  message_text: string;
}

// Resolving the *other* party's email (especially a traveler's, who only
// exists as a Supabase Auth identity) can't safely happen client-side, so
// this hands the whole "who gets notified and what's their email" decision
// to the notify-message edge function. Fire-and-forget, same as sendEmail —
// a notification failure should never block the message itself from sending.
export async function notifyMessage(params: NotifyMessageParams): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/notify-message`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
  } catch (_) {
    // non-blocking
  }
}
