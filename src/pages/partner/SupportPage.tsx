import { useState, useEffect } from 'react';
import { LifeBuoy, Send, ArrowLeft, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';

interface Ticket {
  id: string;
  ticket_ref: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  booking_id: string | null;
  created_by_name: string;
  created_by_email: string;
  created_at: string;
  booking_item_title?: string;
}

interface TicketMessage {
  id: string;
  sender_type: string;
  sender_name: string;
  message_text: string;
  created_at: string;
}

export function SupportPage() {
  const { user } = useAuth();
  const portalUser = user as PortalUser | null;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => { if (portalUser?.id) loadTickets(); }, [portalUser?.id]);

  async function loadTickets() {
    setLoading(true);
    const { data } = await supabase
      .from('support_tickets')
      .select('*, bookings:booking_id(item_title)')
      .eq('target_portal_id', portalUser!.id)
      .eq('portal_type', 'partner')
      .order('created_at', { ascending: false });
    const mapped = (data || []).map((t: any) => ({
      ...t,
      booking_item_title: t.bookings?.item_title || null,
    }));
    setTickets(mapped);
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
    setSelectedTicket(ticket);
    loadMessages(ticket.id);
  }

  async function handleSendMessage() {
    if (!selectedTicket || !newMessage.trim() || !portalUser?.id) return;
    await supabase.from('ticket_messages').insert({
      ticket_id: selectedTicket.id,
      sender_type: 'partner',
      sender_id: portalUser.id,
      sender_name: portalUser.name || 'Partner',
      message_text: newMessage.trim(),
    });
    setNewMessage('');
    loadMessages(selectedTicket.id);
  }

  async function updateStatus(ticketId: string, status: string) {
    await supabase.from('support_tickets').update({ status }).eq('id', ticketId);
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, status });
    }
    loadTickets();
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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (selectedTicket) {
    return (
      <div>
        <button onClick={() => setSelectedTicket(null)} className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Tickets
        </button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-lg font-medium text-neutral-900">{selectedTicket.subject}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-neutral-500">{selectedTicket.ticket_ref}</span>
              <span className="text-xs text-neutral-500">From: {selectedTicket.created_by_name}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs border rounded capitalize ${statusBadge(selectedTicket.status)}`}>
                {statusIcon(selectedTicket.status)}
                {selectedTicket.status.replace('_', ' ')}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {selectedTicket.status === 'open' && (
              <button onClick={() => updateStatus(selectedTicket.id, 'in_progress')} className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors">
                Mark In Progress
              </button>
            )}
            {(selectedTicket.status === 'open' || selectedTicket.status === 'in_progress') && (
              <button onClick={() => updateStatus(selectedTicket.id, 'resolved')} className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition-colors">
                Resolve
              </button>
            )}
          </div>
        </div>

        <Card className="p-5 mb-4 bg-neutral-50">
          <p className="text-sm text-neutral-700">{selectedTicket.description}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500 flex-wrap">
            <span>Category: {selectedTicket.category}</span>
            <span>Priority: {selectedTicket.priority}</span>
            {selectedTicket.booking_item_title && (
              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded">Listing: {selectedTicket.booking_item_title}</span>
            )}
            {!selectedTicket.booking_id && (
              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">General Inquiry</span>
            )}
            <span>{new Date(selectedTicket.created_at).toLocaleDateString()}</span>
          </div>
        </Card>

        <div className="space-y-3 mb-4">
          {messages.map(msg => (
            <div key={msg.id} className={`p-4 rounded-xl ${msg.sender_type === 'partner' ? 'bg-emerald-50 ml-8' : 'bg-white border border-neutral-200 mr-8'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-neutral-900">{msg.sender_name}</span>
                <span className="text-xs text-neutral-400">{new Date(msg.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-neutral-700">{msg.message_text}</p>
            </div>
          ))}
        </div>

        {selectedTicket.status !== 'closed' && (
          <div className="flex gap-2">
            <input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Type a reply..." className="flex-1 px-4 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400" />
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-neutral-900">Support Tickets</h1>
        <div className="text-xs text-neutral-500">{tickets.filter(t => t.status === 'open').length} open</div>
      </div>

      {tickets.length === 0 ? (
        <Card className="p-12 text-center bg-neutral-50">
          <LifeBuoy className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">No support tickets received yet</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <Card key={ticket.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => openTicket(ticket)}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-neutral-500">{ticket.ticket_ref}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs border rounded capitalize ${statusBadge(ticket.status)}`}>
                      {statusIcon(ticket.status)}
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-neutral-400">from {ticket.created_by_name}</span>
                  </div>
                  <h3 className="text-sm font-medium text-neutral-900 truncate">{ticket.subject}</h3>
                  <p className="text-xs text-neutral-500 mt-1 line-clamp-1">{ticket.description}</p>
                  {ticket.booking_item_title && (
                    <span className="inline-block text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mt-1.5">{ticket.booking_item_title}</span>
                  )}
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
