import { useState, useEffect } from 'react';
import { Send, ArrowLeft, Clock, CheckCircle, AlertCircle, Loader2, FileCheck } from 'lucide-react';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';
import { sendEmail } from '../../lib/sendEmail';

interface Ticket {
  id: string;
  ticket_ref: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  portal_type: string;
  target_portal_id: string | null;
  booking_id: string | null;
  created_by_name: string;
  created_by_email: string;
  created_by_role: string;
  created_at: string;
  booking?: { booking_ref: string; item_title: string } | null;
}

function portalLabel(type: string) {
  if (type === 'general') return 'General Inquiry';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function portalBadgeClass(type: string) {
  if (type === 'general') return 'bg-amber-50 text-amber-600';
  if (type === 'partner') return 'bg-emerald-50 text-emerald-600';
  if (type === 'institution') return 'bg-teal-50 text-teal-600';
  return 'bg-neutral-100 text-neutral-500';
}

const ROLE_BADGE_CLASS: Record<string, string> = {
  traveler: 'bg-orange-50 text-orange-600',
  partner: 'bg-emerald-50 text-emerald-600',
  host: 'bg-sky-50 text-sky-600',
  guide: 'bg-violet-50 text-violet-600',
};

interface TicketMessage {
  id: string;
  sender_type: string;
  sender_name: string;
  message_text: string;
  created_at: string;
}

export function CasesPage() {
  const { user } = useAuth();
  const portalUser = user as PortalUser | null;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [closing, setClosing] = useState(false);

  useEffect(() => { loadTickets(); }, []);

  // Live incoming messages on whichever ticket is open — same pattern as
  // the traveler-facing widget. Without this, a reply typed on the other
  // end only shows up here after a manual refresh.
  useEffect(() => {
    if (!selected?.id) return;
    const channel = supabase
      .channel(`ops-ticket-messages-${selected.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${selected.id}` },
        (payload) => {
          const msg = payload.new as TicketMessage;
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selected?.id]);

  async function loadTickets() {
    setLoading(true);
    const { data } = await supabase
      .from('support_tickets')
      .select('*, booking:booking_id(booking_ref, item_title)')
      .order('created_at', { ascending: false });
    setTickets(data || []);
    setLoading(false);
  }

  async function loadMessages(ticketId: string) {
    const { data } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  }

  function openTicket(ticket: Ticket) {
    setSelected(ticket);
    loadMessages(ticket.id);
  }

  async function handleSendMessage() {
    if (!selected || !newMessage.trim() || !portalUser) return;
    const messageText = newMessage.trim();
    await supabase.from('ticket_messages').insert({
      ticket_id: selected.id,
      sender_type: 'operations',
      sender_id: portalUser.id,
      sender_name: portalUser.name || 'Operations',
      message_text: messageText,
    });
    setNewMessage('');
    loadMessages(selected.id);

    if (selected.created_by_email) {
      sendEmail({
        template: 'support_ticket_reply',
        recipient_email: selected.created_by_email,
        recipient_name: selected.created_by_name || '',
        data: {
          subject: selected.subject,
          ticket_ref: selected.ticket_ref,
          message_text: messageText,
        },
      });
    }
  }

  async function updateStatus(ticketId: string, status: string) {
    await supabase.from('support_tickets').update({ status }).eq('id', ticketId);
    const ticket = selected?.id === ticketId ? selected : tickets.find(t => t.id === ticketId);
    if (selected?.id === ticketId) {
      setSelected({ ...selected, status });
    }
    if (ticket?.created_by_email) {
      sendEmail({
        template: 'support_ticket_status_update',
        recipient_email: ticket.created_by_email,
        recipient_name: ticket.created_by_name || '',
        data: {
          subject: ticket.subject,
          new_status: status,
        },
      });
    }
    loadTickets();
  }

  async function handleCloseTicket() {
    if (!selected || closing) return;
    setClosing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/close-ticket`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticket_id: selected.id }),
      });
      if (res.ok) {
        setSelected({ ...selected, status: 'closed' });
        loadTickets();
      }
    } finally {
      setClosing(false);
    }
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-amber-50 text-amber-700 border-amber-200',
      in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
      resolved: 'bg-green-50 text-green-700 border-green-200',
      closed: 'bg-neutral-100 text-neutral-600 border-neutral-200',
    };
    return colors[status] || colors.closed;
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="w-3.5 h-3.5 text-amber-600" />;
      case 'in_progress': return <Clock className="w-3.5 h-3.5 text-blue-600" />;
      case 'resolved': return <CheckCircle className="w-3.5 h-3.5 text-green-600" />;
      default: return <CheckCircle className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);
  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Cases
        </button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-lg font-medium text-neutral-900">{selected.subject}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-neutral-500">{selected.ticket_ref}</span>
              <span className="text-xs text-neutral-500">From: {selected.created_by_name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${ROLE_BADGE_CLASS[selected.created_by_role] || 'bg-neutral-100 text-neutral-500'}`}>{selected.created_by_role}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${portalBadgeClass(selected.portal_type)}`}>{portalLabel(selected.portal_type)}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs border rounded capitalize ${statusBadge(selected.status)}`}>
                {statusIcon(selected.status)}
                {selected.status.replace('_', ' ')}
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {selected.status === 'open' && (
              <button onClick={() => updateStatus(selected.id, 'in_progress')} className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors">
                Mark In Progress
              </button>
            )}
            {(selected.status === 'open' || selected.status === 'in_progress') && (
              <button onClick={() => updateStatus(selected.id, 'resolved')} className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition-colors">
                Resolve
              </button>
            )}
            {selected.status !== 'closed' && (
              <button onClick={handleCloseTicket} disabled={closing} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors disabled:opacity-50">
                {closing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
                {closing ? 'Closing…' : 'Close & Send Transcript'}
              </button>
            )}
          </div>
        </div>

        <Card className="p-5 mb-4 bg-neutral-50">
          <p className="text-sm text-neutral-700">{selected.description}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500 flex-wrap">
            <span>Category: {selected.category}</span>
            <span>Priority: {selected.priority}</span>
            <span>Routed to: {portalLabel(selected.portal_type)}</span>
            {selected.booking && (
              <span className="px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded">Booking: {selected.booking.item_title} ({selected.booking.booking_ref})</span>
            )}
            <span>{new Date(selected.created_at).toLocaleDateString()}</span>
          </div>
        </Card>

        <div className="space-y-3 mb-4">
          {messages.map(msg => (
            <div key={msg.id} className={`p-4 rounded-xl ${msg.sender_type === 'operations' ? 'bg-sky-50 ml-8' : 'bg-white border border-neutral-200 mr-8'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-neutral-900">{msg.sender_name} <span className="text-neutral-400">({msg.sender_type})</span></span>
                <span className="text-xs text-neutral-400">{new Date(msg.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-neutral-700">{msg.message_text}</p>
            </div>
          ))}
        </div>

        {selected.status !== 'closed' && (
          <div className="flex gap-2">
            <input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a reply..."
              className="flex-1 px-4 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
            />
            <button onClick={handleSendMessage} disabled={!newMessage.trim()} className="px-4 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-40">
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-medium text-neutral-900 mb-6">Cases & Support</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card className="p-4 bg-yellow-50">
          <div className="text-xs text-neutral-500 mb-1">Open</div>
          <div className="text-xl font-medium text-neutral-900">{openCount}</div>
        </Card>
        <Card className="p-4 bg-blue-50">
          <div className="text-xs text-neutral-500 mb-1">In Progress</div>
          <div className="text-xl font-medium text-neutral-900">{inProgressCount}</div>
        </Card>
        <Card className="p-4 bg-green-50">
          <div className="text-xs text-neutral-500 mb-1">Resolved</div>
          <div className="text-xl font-medium text-neutral-900">{resolvedCount}</div>
        </Card>
        <Card className="p-4 bg-neutral-50">
          <div className="text-xs text-neutral-500 mb-1">Total</div>
          <div className="text-xl font-medium text-neutral-900">{tickets.length}</div>
        </Card>
      </div>

      <div className="flex gap-2 mb-4">
        {['all', 'open', 'in_progress', 'resolved', 'closed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              filter === f ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {f === 'all' ? 'All' : f.replace('_', ' ').charAt(0).toUpperCase() + f.replace('_', ' ').slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center bg-neutral-50">
          <p className="text-sm text-neutral-500">No support tickets found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(ticket => (
            <Card key={ticket.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => openTicket(ticket)}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs text-neutral-500">{ticket.ticket_ref}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs border rounded capitalize ${statusBadge(ticket.status)}`}>
                      {statusIcon(ticket.status)}
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-neutral-400">from {ticket.created_by_name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${ROLE_BADGE_CLASS[ticket.created_by_role] || 'bg-neutral-100 text-neutral-500'}`}>{ticket.created_by_role}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${portalBadgeClass(ticket.portal_type)}`}>{portalLabel(ticket.portal_type)}</span>
                  </div>
                  <h3 className="text-sm font-medium text-neutral-900 truncate">{ticket.subject}</h3>
                  <p className="text-xs text-neutral-500 mt-1 line-clamp-1">{ticket.description}</p>
                </div>
                <div className="text-xs text-neutral-400 ml-4 flex-shrink-0">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
