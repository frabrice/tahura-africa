import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LifeBuoy, Send, ArrowLeft, Clock, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TravelerUser } from '../../lib/auth';

interface Ticket {
  id: string;
  ticket_ref: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  portal_type: string;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  sender_type: string;
  sender_name: string;
  message_text: string;
  created_at: string;
}

export function MyTicketsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const traveler = user as TravelerUser | null;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/traveler/login');
      return;
    }
    if (traveler?.id) loadTickets();
  }, [traveler?.id, isAuthenticated]);

  async function loadTickets() {
    setLoading(true);
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('created_by_auth_id', traveler!.id)
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
    setSelectedTicket(ticket);
    loadMessages(ticket.id);
  }

  async function handleSendMessage() {
    if (!selectedTicket || !newMessage.trim() || !traveler?.id) return;
    await supabase.from('ticket_messages').insert({
      ticket_id: selectedTicket.id,
      sender_type: 'traveler',
      sender_id: traveler.id,
      sender_name: traveler.full_name || 'Traveler',
      message_text: newMessage.trim(),
    });
    setNewMessage('');
    loadMessages(selectedTicket.id);
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="w-3.5 h-3.5 text-amber-600" />;
      case 'in_progress': return <Clock className="w-3.5 h-3.5 text-blue-600" />;
      case 'resolved': return <CheckCircle className="w-3.5 h-3.5 text-green-600" />;
      default: return <CheckCircle className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-amber-50 text-amber-700 border-amber-200',
      in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
      resolved: 'bg-green-50 text-green-700 border-green-200',
      closed: 'bg-neutral-100 text-neutral-600 border-neutral-200',
    };
    return colors[status] || colors.closed;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (selectedTicket) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
        <button
          onClick={() => { setSelectedTicket(null); setMessages([]); }}
          className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Tickets
        </button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-neutral-900">{selectedTicket.subject}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-neutral-500">{selectedTicket.ticket_ref}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs border rounded capitalize ${statusBadge(selectedTicket.status)}`}>
                {statusIcon(selectedTicket.status)}
                {selectedTicket.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        <Card className="p-5 mb-4 bg-neutral-50">
          <p className="text-sm text-neutral-700">{selectedTicket.description}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500 flex-wrap">
            <span>Category: {selectedTicket.category}</span>
            <span>Priority: {selectedTicket.priority}</span>
            <span>{new Date(selectedTicket.created_at).toLocaleDateString()}</span>
          </div>
        </Card>

        <div className="space-y-3 mb-4">
          {messages.map(msg => (
            <div key={msg.id} className={`p-4 rounded-xl ${msg.sender_type === 'traveler' ? 'bg-sky-50 ml-8' : 'bg-white border border-neutral-200 mr-8'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-neutral-900">{msg.sender_name}</span>
                <span className="text-xs text-neutral-400">{new Date(msg.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-neutral-700">{msg.message_text}</p>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center py-6">
              <p className="text-xs text-neutral-400">No messages yet. The support team will respond soon.</p>
            </div>
          )}
        </div>

        {selectedTicket.status !== 'closed' && (
          <div className="flex gap-2">
            <input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="px-4 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
      <button
        onClick={() => navigate('/help-support')}
        className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Help & Support
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-neutral-900">My Tickets</h1>
          <p className="text-sm text-neutral-500 mt-1">Track the status of your support requests</p>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-support-chat'))}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Ticket
        </button>
      </div>

      {tickets.length === 0 ? (
        <Card className="p-12 text-center">
          <LifeBuoy className="w-12 h-12 text-neutral-200 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-neutral-900 mb-1">No Support Tickets</h3>
          <p className="text-xs text-neutral-500 mb-4">You haven't submitted any support tickets yet.</p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-support-chat'))}
            className="px-4 py-2 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Submit a Ticket
          </button>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <Card key={ticket.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => openTicket(ticket)}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs text-neutral-500">{ticket.ticket_ref}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs border rounded capitalize ${statusBadge(ticket.status)}`}>
                      {statusIcon(ticket.status)}
                      {ticket.status.replace('_', ' ')}
                    </span>
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
