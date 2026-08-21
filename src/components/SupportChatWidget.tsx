import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { TravelerUser } from '../lib/auth';
import { sendEmail } from '../lib/sendEmail';

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

const STORAGE_KEY = 'support-chat-ticket-id';

// A synthetic id prefix for the client-only "ticket created" confirmation
// bubble — it's never written to ticket_messages (Ops doesn't need to see
// their own auto-reply come back at them), just rendered locally once.
const AUTO_REPLY_ID = 'auto-reply';

export function SupportChatWidget() {
  const { isAuthenticated, isTraveler, user } = useAuth();
  const traveler = (isAuthenticated && isTraveler && user) ? (user as TravelerUser) : null;

  const [open, setOpen] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
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
    } else {
      // Ticket vanished (e.g. deleted) — clear the stale reference.
      localStorage.removeItem(STORAGE_KEY);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!traveler) return;
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId) loadTicket(savedId);
  }, [traveler, loadTicket]);

  // Realtime: new replies land in the open (or closed) widget live, without
  // needing to reopen it to see them.
  useEffect(() => {
    if (!ticket?.id) return;
    const channel = supabase
      .channel(`ticket-${ticket.id}`)
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

  useEffect(() => {
    if (open) {
      setHasUnread(false);
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [open, messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || !traveler || sending) return;
    setSending(true);
    setInput('');

    try {
      if (!ticket) {
        // First message ever — create the ticket itself.
        const { data: newTicket, error } = await supabase.from('support_tickets').insert({
          created_by_auth_id: traveler.id,
          created_by_name: traveler.full_name || 'Traveler',
          created_by_email: traveler.email || '',
          created_by_type: 'traveler',
          portal_type: 'general',
          subject: text.slice(0, 80),
          description: text,
          category: 'general',
          priority: 'medium',
        }).select('id, ticket_ref, status').single();

        if (error || !newTicket) throw error;

        await supabase.from('ticket_messages').insert({
          ticket_id: newTicket.id,
          sender_type: 'traveler',
          sender_id: traveler.id,
          sender_name: traveler.full_name || 'Traveler',
          message_text: text,
        });

        localStorage.setItem(STORAGE_KEY, newTicket.id);
        setTicket(newTicket);
        setMessages([{
          id: AUTO_REPLY_ID,
          sender_type: 'operations',
          sender_name: 'Tahura Support',
          message_text: `Thanks! Your ticket #${newTicket.ticket_ref} has been created. Our team will get back to you as soon as possible.`,
          created_at: new Date().toISOString(),
        }]);

        if (traveler.email) {
          sendEmail({
            template: 'support_ticket_confirmation',
            recipient_email: traveler.email,
            recipient_name: traveler.full_name || '',
            data: { created_by_name: traveler.full_name || 'Traveler', subject: text.slice(0, 80), description: text, category: 'general', priority: 'medium' },
          });
        }
      } else {
        const { data: newMsg, error } = await supabase.from('ticket_messages').insert({
          ticket_id: ticket.id,
          sender_type: 'traveler',
          sender_id: traveler.id,
          sender_name: traveler.full_name || 'Traveler',
          message_text: text,
        }).select('id, sender_type, sender_name, message_text, created_at').single();

        if (error) throw error;
        if (newMsg) setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);

        if (ticket.status === 'closed' || ticket.status === 'resolved') {
          await supabase.from('support_tickets').update({ status: 'open' }).eq('id', ticket.id);
          setTicket(t => t ? { ...t, status: 'open' } : t);
        }
      }
    } catch {
      setInput(text); // put it back so nothing's silently lost
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[200]">
      {open && (
        <div className="mb-3 w-[92vw] max-w-sm h-[70vh] max-h-[520px] bg-white rounded-2xl shadow-2xl border border-neutral-200 flex flex-col overflow-hidden animate-fade-in">
          <div className="px-5 py-4 bg-neutral-900 text-white flex items-center justify-between flex-shrink-0">
            <div>
              <p className="text-sm font-semibold">Tahura Support</p>
              <p className="text-xs text-white/60">{ticket ? `Ticket ${ticket.ticket_ref}` : "We're here to help"}</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {!traveler ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
              <MessageCircle className="w-8 h-8 text-neutral-300" />
              <p className="text-sm text-neutral-600">Log in to chat with our support team.</p>
              <a href="/traveler/login" className="text-sm font-medium text-amber-600 hover:text-amber-700">Log in</a>
            </div>
          ) : loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-neutral-300 animate-spin" />
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-8">
                    <MessageCircle className="w-8 h-8 text-neutral-300" />
                    <p className="text-sm text-neutral-500">How can we help? Send us a message to get started.</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={`max-w-[85%] ${msg.sender_type === 'traveler' ? 'ml-auto' : ''}`}>
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.sender_type === 'traveler'
                          ? 'bg-neutral-900 text-white rounded-br-md'
                          : 'bg-white border border-neutral-200 text-neutral-800 rounded-bl-md'
                      }`}>
                        {msg.message_text}
                      </div>
                      <p className={`text-[10px] text-neutral-400 mt-1 ${msg.sender_type === 'traveler' ? 'text-right' : ''}`}>
                        {msg.sender_type === 'traveler' ? 'You' : msg.sender_name} · {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 border-t border-neutral-200 flex items-center gap-2 flex-shrink-0">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type a message..."
                  disabled={sending}
                  className="flex-1 px-3.5 py-2.5 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-400 disabled:opacity-60"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-40"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
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
