import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sendEmail } from '../lib/sendEmail';

export type SupportRole = 'traveler' | 'partner' | 'host' | 'guide';

export interface SupportIdentity {
  role: SupportRole;
  id: string;
  name: string;
  email: string;
}

interface TicketMessage {
  id: string;
  sender_type: string;
  sender_name: string;
  message_text: string;
  created_at: string;
}

interface Ticket {
  id: string;
  ticket_ref: string;
  status: string;
}

interface BookingOption {
  id: string;
  booking_ref: string;
  item_title: string;
}

const STORAGE_KEY = 'support-chat-ticket-id';

// Synthetic id for the client-only "ticket created" confirmation bubble —
// never written to ticket_messages, just rendered locally once.
const AUTO_REPLY_ID = 'auto-reply';

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'booking', label: 'Booking' },
  { id: 'payment', label: 'Payment' },
  { id: 'account', label: 'Account' },
  { id: 'other', label: 'Other' },
];

const BOOKING_COLUMN: Record<SupportRole, string> = {
  traveler: 'traveler_id',
  partner: 'partner_id',
  host: 'host_id',
  guide: 'guide_id',
};

const TICKET_ORIGIN_COLUMN: Record<SupportRole, string> = {
  traveler: 'created_by_auth_id',
  partner: 'created_by_portal_id',
  host: 'created_by_host_id',
  guide: 'created_by_guide_id',
};

type Step = 'idle' | 'category' | 'booking' | 'describe' | 'chat';

export function SupportChatWidget({ identity }: { identity: SupportIdentity | null }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [category, setCategory] = useState('');
  const [bookings, setBookings] = useState<BookingOption[]>([]);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadTicket = useCallback(async (ticketId: string) => {
    setLoading(true);
    const [{ data: t }, { data: msgs }] = await Promise.all([
      supabase.from('support_tickets').select('id, ticket_ref, status').eq('id', ticketId).maybeSingle(),
      supabase.from('ticket_messages').select('id, sender_type, sender_name, message_text, created_at').eq('ticket_id', ticketId).order('created_at', { ascending: true }),
    ]);
    if (t) {
      setTicket(t);
      setMessages(msgs || []);
      setStep('chat');
    } else {
      // Ticket vanished (e.g. deleted) — clear the stale reference.
      localStorage.removeItem(STORAGE_KEY);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!identity) return;
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId) loadTicket(savedId);
  }, [identity, loadTicket]);

  // Realtime: new replies land in the open (or closed) widget live.
  useEffect(() => {
    if (!ticket?.id) return;
    const channel = supabase
      .channel(`ticket-messages-${ticket.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${ticket.id}` },
        (payload) => {
          const msg = payload.new as TicketMessage;
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
          if (msg.sender_type === 'operations' && !open) setHasUnread(true);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticket?.id, open]);

  // Realtime: a ticket closed by Ops flips this widget to the Closed state live.
  useEffect(() => {
    if (!ticket?.id) return;
    const channel = supabase
      .channel(`ticket-status-${ticket.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `id=eq.${ticket.id}` },
        (payload) => {
          const updated = payload.new as { status: string };
          setTicket(t => t ? { ...t, status: updated.status } : t);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticket?.id]);

  useEffect(() => {
    if (open) {
      setHasUnread(false);
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [open, messages]);

  // Lets other pages (e.g. Help & Support's "Contact Us") open the widget
  // without needing a shared context — it lives in the portal shell, a
  // sibling of the routed page, not the page itself.
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-support-chat', handler);
    return () => window.removeEventListener('open-support-chat', handler);
  }, []);

  function startTicket() {
    setCategory('');
    setBookingId(null);
    setStep('category');
  }

  async function selectCategory(catId: string) {
    setCategory(catId);
    if (catId === 'booking' && identity) {
      setLoadingBookings(true);
      const { data } = await supabase
        .from('bookings')
        .select('id, booking_ref, item_title')
        .eq(BOOKING_COLUMN[identity.role], identity.id)
        .order('created_at', { ascending: false });
      setBookings(data || []);
      setLoadingBookings(false);
      setStep('booking');
    } else {
      setStep('describe');
    }
  }

  async function handleDescribeSubmit() {
    const text = input.trim();
    if (!text || !identity || sending) return;
    setSending(true);
    setInput('');

    try {
      const { data: newTicket, error } = await supabase.from('support_tickets').insert({
        [TICKET_ORIGIN_COLUMN[identity.role]]: identity.id,
        created_by_role: identity.role,
        created_by_name: identity.name,
        created_by_email: identity.email,
        created_by_type: identity.role === 'traveler' ? 'traveler' : 'portal',
        portal_type: identity.role === 'partner' ? 'partner' : 'general',
        booking_id: bookingId,
        subject: text.slice(0, 80),
        description: text,
        category,
        priority: 'medium',
      }).select('id, ticket_ref, status').single();

      if (error || !newTicket) throw error;

      const { data: firstMsg } = await supabase.from('ticket_messages').insert({
        ticket_id: newTicket.id,
        sender_type: identity.role,
        sender_id: identity.id,
        sender_name: identity.name,
        message_text: text,
      }).select('id, sender_type, sender_name, message_text, created_at').single();

      localStorage.setItem(STORAGE_KEY, newTicket.id);
      setTicket(newTicket);

      const autoReply: TicketMessage = {
        id: AUTO_REPLY_ID,
        sender_type: 'operations',
        sender_name: 'Tahura Support',
        message_text: `Thanks! Your ticket #${newTicket.ticket_ref} has been created. Our team will get back to you as soon as possible.`,
        created_at: new Date().toISOString(),
      };
      // The user's own message always renders alongside the auto-reply —
      // never replace the list with just the synthetic bubble.
      setMessages(firstMsg ? [firstMsg, autoReply] : [autoReply]);
      setStep('chat');

      if (identity.email) {
        sendEmail({
          template: 'support_ticket_confirmation',
          recipient_email: identity.email,
          recipient_name: identity.name,
          data: { created_by_name: identity.name, subject: text.slice(0, 80), description: text, category, priority: 'medium' },
        });
      }
    } catch {
      setInput(text); // put it back so nothing's silently lost
    } finally {
      setSending(false);
    }
  }

  async function handleChatSend() {
    const text = input.trim();
    if (!text || !identity || !ticket || sending) return;
    setSending(true);
    setInput('');
    try {
      const { data: newMsg, error } = await supabase.from('ticket_messages').insert({
        ticket_id: ticket.id,
        sender_type: identity.role,
        sender_id: identity.id,
        sender_name: identity.name,
        message_text: text,
      }).select('id, sender_type, sender_name, message_text, created_at').single();
      if (error) throw error;
      if (newMsg) setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  function startNewConversation() {
    localStorage.removeItem(STORAGE_KEY);
    setTicket(null);
    setMessages([]);
    setInput('');
    setStep('idle');
  }

  const isClosed = ticket?.status === 'closed';
  const headerSubtitle = step === 'chat' && ticket ? `Ticket ${ticket.ticket_ref}` : "We're here to help";

  return (
    <div className="fixed bottom-5 right-5 z-[200]">
      {open && (
        <div className="mb-3 w-[92vw] max-w-sm h-[70vh] max-h-[560px] bg-white rounded-2xl shadow-2xl border border-neutral-200 flex flex-col overflow-hidden animate-fade-in">
          <div className="px-5 py-4 bg-neutral-900 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {(step === 'category' || step === 'booking' || step === 'describe') && (
                <button onClick={() => setStep('idle')} className="p-1 -ml-1 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold">Tahura Support</p>
                <p className="text-xs text-white/60 truncate">{headerSubtitle}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {!identity ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
              <MessageCircle className="w-8 h-8 text-neutral-300" />
              <p className="text-sm text-neutral-600">Log in to chat with our support team.</p>
              <a href="/traveler/login" className="text-sm font-medium text-amber-600 hover:text-amber-700">Log in</a>
            </div>
          ) : loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-neutral-300 animate-spin" />
            </div>
          ) : step === 'idle' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
              <MessageCircle className="w-9 h-9 text-neutral-300" />
              <p className="text-sm text-neutral-500">Have a question or need help with something? We usually respond quickly.</p>
              <button
                onClick={startTicket}
                className="px-5 py-2.5 text-sm font-semibold bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors"
              >
                Start a conversation
              </button>
            </div>
          ) : step === 'category' ? (
            <div className="flex-1 p-5 space-y-3">
              <p className="text-sm font-medium text-neutral-700 mb-1">What's this about?</p>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => selectCategory(c.id)}
                    className="px-4 py-3 text-sm font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-xl hover:border-neutral-400 hover:bg-neutral-100 transition-colors text-left"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          ) : step === 'booking' ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              <p className="text-sm font-medium text-neutral-700 mb-1">Which booking is this about?</p>
              <button
                onClick={() => setStep('describe')}
                className="w-full px-4 py-3 text-sm font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-xl hover:border-neutral-400 transition-colors text-left"
              >
                General booking question
              </button>
              {loadingBookings ? (
                <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 text-neutral-300 animate-spin" /></div>
              ) : (
                bookings.map(b => (
                  <button
                    key={b.id}
                    onClick={() => { setBookingId(b.id); setStep('describe'); }}
                    className="w-full px-4 py-3 text-left border border-neutral-200 rounded-xl hover:border-neutral-400 transition-colors"
                  >
                    <p className="text-sm font-medium text-neutral-900 truncate">{b.item_title}</p>
                    <p className="text-xs text-neutral-400 font-mono mt-0.5">{b.booking_ref}</p>
                  </button>
                ))
              )}
            </div>
          ) : step === 'describe' ? (
            <div className="flex-1 flex flex-col p-5">
              <p className="text-sm font-medium text-neutral-700 mb-3">Tell us what's going on</p>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Describe your issue..."
                rows={5}
                autoFocus
                className="flex-1 w-full px-3.5 py-3 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-400 resize-none"
              />
              <button
                onClick={handleDescribeSubmit}
                disabled={sending || !input.trim()}
                className="mt-3 w-full py-3 text-sm font-semibold bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50">
                {messages.map(msg => (
                  <div key={msg.id} className={`max-w-[85%] ${msg.sender_type === identity.role ? 'ml-auto' : ''}`}>
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.sender_type === identity.role
                        ? 'bg-neutral-900 text-white rounded-br-md'
                        : 'bg-white border border-neutral-200 text-neutral-800 rounded-bl-md'
                    }`}>
                      {msg.message_text}
                    </div>
                    <p className={`text-[10px] text-neutral-400 mt-1 ${msg.sender_type === identity.role ? 'text-right' : ''}`}>
                      {msg.sender_type === identity.role ? 'You' : msg.sender_name} · {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>

              {isClosed ? (
                <div className="p-4 border-t border-neutral-200 flex-shrink-0 space-y-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-sm text-neutral-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    This conversation has ended
                  </div>
                  <button
                    onClick={startNewConversation}
                    className="w-full py-2.5 text-sm font-medium border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors"
                  >
                    Start a new conversation
                  </button>
                </div>
              ) : (
                <div className="p-3 border-t border-neutral-200 flex items-center gap-2 flex-shrink-0">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                    placeholder="Type a message..."
                    disabled={sending}
                    className="flex-1 px-3.5 py-2.5 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-400 disabled:opacity-60"
                  />
                  <button
                    onClick={handleChatSend}
                    disabled={sending || !input.trim()}
                    className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-40"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-14 h-14 rounded-full bg-neutral-900 text-white shadow-xl flex items-center justify-center hover:bg-neutral-800 hover:scale-105 active:scale-95 transition-all"
        aria-label={open ? 'Close support chat' : 'Open support chat'}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {hasUnread && !open && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>
    </div>
  );
}
