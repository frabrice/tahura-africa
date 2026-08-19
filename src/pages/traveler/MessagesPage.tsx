import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../components/Card';
import { ArrowLeft, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TravelerUser } from '../../lib/auth';
import { sendEmail } from '../../lib/sendEmail';
import { useToast } from '../../components/Toast';

interface Conversation {
  id: string;
  booking_id: string;
  traveler_name: string;
  host_name?: string;
  guide_name?: string;
  listing_title: string;
  listing_type: string;
  last_message?: string;
  last_message_at?: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'traveler' | 'host' | 'guide';
  sender_name: string;
  message_text: string;
  is_read: boolean;
  created_at: string;
}

export function MessagesPage() {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const traveler = user as TravelerUser | null;
  const { showToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (traveler?.id) {
      loadConversations();
    }
  }, [traveler?.id]);

  // Deep-link support: "Message Host/Guide" on a booking confirmation lands
  // here with ?conversation=<id>&greeting=<text> so the chat opens directly
  // instead of dropping the traveler on the bare conversation list.
  useEffect(() => {
    if (autoOpenedRef.current || conversations.length === 0) return;
    const convId = searchParams.get('conversation');
    if (!convId) return;
    if (!conversations.some(c => c.id === convId)) return;
    autoOpenedRef.current = true;
    setSelectedConvId(convId);
    const greeting = searchParams.get('greeting');
    if (greeting) setNewMessage(greeting);
    setSearchParams(params => { params.delete('conversation'); params.delete('greeting'); return params; }, { replace: true });
  }, [conversations, searchParams, setSearchParams]);

  // Supabase Realtime: subscribe to messages for live updates
  useEffect(() => {
    if (!traveler?.id) return;

    const channel = supabase
      .channel('traveler-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          // Update messages if this conversation is open
          if (selectedConvId && newMsg.conversation_id === selectedConvId) {
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            markMessagesAsRead(selectedConvId);
          }
          // Refresh conversations list to show latest message
          loadConversations();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [traveler?.id, selectedConvId]);

  useEffect(() => {
    if (selectedConvId) {
      loadMessages(selectedConvId);
      markMessagesAsRead(selectedConvId);
    }
  }, [selectedConvId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversations = async () => {
    if (!traveler?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('traveler_id', traveler.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const markMessagesAsRead = async (conversationId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('is_read', false)
        .neq('sender_type', 'traveler');
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConvId || !traveler?.id) return;

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: selectedConvId,
        sender_type: 'traveler',
        sender_id: traveler.id,
        sender_name: traveler.full_name || 'Traveler',
        message_text: newMessage.trim(),
        is_read: false,
      });

      if (error) throw error;

      setNewMessage('');
      await loadMessages(selectedConvId);
      await loadConversations();

      const conv = conversations.find(c => c.id === selectedConvId);
      if (conv) {
        const recipientType = conv.host_name ? 'host' : 'guide';
        const table = recipientType === 'host' ? 'partner_hosts' : 'guides';
        const nameField = conv.host_name || conv.guide_name || '';
        supabase.from('conversations').select('host_id, guide_id').eq('id', selectedConvId).maybeSingle().then(({ data: convData }) => {
          const recipientId = recipientType === 'host' ? convData?.host_id : convData?.guide_id;
          if (recipientId) {
            supabase.from(table).select('email, name').eq('id', recipientId).maybeSingle().then(({ data: recipData }) => {
              if (recipData?.email) {
                sendEmail({
                  template: 'new_message',
                  recipient_email: recipData.email,
                  recipient_name: recipData.name || nameField,
                  data: {
                    sender_name: traveler?.full_name || 'Traveler',
                    message_preview: newMessage.trim().slice(0, 150),
                    listing_title: conv.listing_title,
                  },
                });
              }
            });
          }
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
      showToast("Couldn't send your message. Please try again.", 'error');
    } finally {
      setSending(false);
    }
  };

  const selectedConversation = conversations.find((c) => c.id === selectedConvId);
  const otherPartyName = selectedConversation?.host_name || selectedConversation?.guide_name || 'Host';
  const hasUnread = (conv: Conversation) => {
    return !!conv.last_message && conv.last_message_at;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        {selectedConvId && (
          <button
            onClick={() => setSelectedConvId(null)}
            className="lg:hidden p-2 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">Messages</h1>
      </div>

      {loading ? (
        <div className="text-center py-16 text-neutral-600">Loading conversations...</div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-neutral-500">No conversations yet</p>
          <p className="text-sm text-neutral-400 mt-2">
            Start a conversation by completing a booking
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className={`${selectedConvId ? 'hidden lg:block' : 'block'} lg:col-span-1 space-y-2`}>
            {conversations.map((conv) => (
              <Card
                key={conv.id}
                hover
                onClick={() => setSelectedConvId(conv.id)}
                className={`p-3 md:p-4 cursor-pointer ${selectedConvId === conv.id ? 'border-neutral-400' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-medium text-neutral-900">
                    {conv.host_name || conv.guide_name || 'Host'}
                  </h3>
                  {hasUnread(conv) && (
                    <div className="w-2 h-2 rounded-full bg-neutral-900"></div>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mb-2 capitalize">
                  Re: {conv.listing_type} · {conv.listing_title}
                </p>
                {conv.last_message && (
                  <>
                    <p className="text-xs text-neutral-600 line-clamp-2 mb-1">
                      {conv.last_message}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {conv.last_message_at && formatTime(conv.last_message_at)}
                    </p>
                  </>
                )}
              </Card>
            ))}
          </div>

          <div className={`${selectedConvId ? 'block' : 'hidden lg:block'} lg:col-span-2`}>
            {selectedConvId && selectedConversation ? (
              <Card className="flex flex-col h-[600px]">
                <div className="p-4 md:p-5 border-b border-neutral-200">
                  <h2 className="text-base font-semibold text-neutral-900 mb-1">
                    {otherPartyName}
                  </h2>
                  <p className="text-xs text-neutral-500 capitalize">
                    About: {selectedConversation.listing_title}
                  </p>
                </div>

                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-neutral-400 text-sm">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isFromTraveler = msg.sender_type === 'traveler';
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isFromTraveler ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[75%] ${isFromTraveler ? '' : ''}`}>
                            <div className="text-xs text-neutral-500 mb-1">
                              {isFromTraveler ? msg.sender_name : otherPartyName}
                            </div>
                            <div
                              className={`p-3 rounded-lg text-sm ${
                                isFromTraveler
                                  ? 'bg-neutral-900 text-white'
                                  : 'bg-neutral-100 text-neutral-900'
                              }`}
                            >
                              {msg.message_text}
                            </div>
                            <div className="text-xs text-neutral-400 mt-1">
                              {new Date(msg.created_at).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form
                  onSubmit={handleSendMessage}
                  className="p-4 md:p-5 border-t border-neutral-200"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-transparent"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={sending || !newMessage.trim()}
                      className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </Card>
            ) : (
              <Card className="p-8 md:p-12 text-center text-neutral-400">
                <p>Select a conversation to view messages</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
