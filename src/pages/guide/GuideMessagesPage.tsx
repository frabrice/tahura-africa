import { useState, useEffect, useRef } from 'react';
import { Card } from '../../components/Card';
import { ArrowLeft, Send, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getGuideContext } from '../../lib/useGuideData';
import { useUnreadMessages } from '../../lib/useUnreadMessages';
import { sendEmail } from '../../lib/sendEmail';

interface Conversation {
  id: string;
  booking_id: string;
  traveler_name: string;
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

export function GuideMessagesPage() {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const guideContext = getGuideContext();
  const guideId = guideContext?.id || null;
  const guideName = guideContext?.name || 'Guide';
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { unreadByConversation, refresh: refreshUnread } = useUnreadMessages('guide', guideId);

  useEffect(() => {
    if (guideId) {
      loadConversations();
    } else {
      setLoading(false);
    }
  }, [guideId]);

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
    if (!guideId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('guide_id', guideId)
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
        .neq('sender_type', 'guide');
      refreshUnread();
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConvId || !guideId) return;

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: selectedConvId,
        sender_type: 'guide',
        sender_id: guideId,
        sender_name: guideName,
        message_text: newMessage.trim(),
        is_read: false,
      });

      if (error) throw error;

      const msgText = newMessage.trim();
      setNewMessage('');
      await loadMessages(selectedConvId);
      await loadConversations();

      const conv = conversations.find(c => c.id === selectedConvId);
      if (conv) {
        supabase.from('conversations').select('traveler_id').eq('id', selectedConvId).maybeSingle().then(({ data: convData }) => {
          if (convData?.traveler_id) {
            supabase.from('traveler_users').select('email, full_name').eq('id', convData.traveler_id).maybeSingle().then(({ data: trav }) => {
              if (trav?.email) {
                sendEmail({
                  template: 'new_message',
                  recipient_email: trav.email,
                  recipient_name: trav.full_name || conv.traveler_name,
                  data: {
                    sender_name: guideName,
                    message_preview: msgText.slice(0, 150),
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
    } finally {
      setSending(false);
    }
  };

  const selectedConversation = conversations.find((c) => c.id === selectedConvId);
  const filteredConversations = conversations.filter(
    (c) =>
      c.traveler_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.listing_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {selectedConvId && (
          <button
            onClick={() => setSelectedConvId(null)}
            className="lg:hidden p-2 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Messages</h1>
          <p className="text-sm text-neutral-600 mt-1">Communicate with your visitors</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-neutral-600">Loading conversations...</div>
      ) : !guideId ? (
        <Card className="p-8 text-center text-neutral-400">
          <p>No guide profile found. Please set up your guide profile first.</p>
        </Card>
      ) : conversations.length === 0 ? (
        <Card className="p-8 text-center text-neutral-400">
          <p>No conversations yet</p>
          <p className="text-sm mt-2">Messages from visitors will appear here</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className={`${selectedConvId ? 'hidden lg:block' : 'block'} lg:col-span-1 space-y-4`}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-2">
              {filteredConversations.map((conv) => (
                <Card
                  key={conv.id}
                  hover
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`p-4 cursor-pointer ${selectedConvId === conv.id ? 'border-green-400 bg-green-50' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-neutral-900">{conv.traveler_name}</h3>
                    {(unreadByConversation[conv.id] || 0) > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-teal-500 text-white rounded-full leading-none">
                        {unreadByConversation[conv.id] > 9 ? '9+' : unreadByConversation[conv.id]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 mb-2">{conv.listing_title}</p>
                  {conv.last_message && (
                    <>
                      <p className="text-xs text-neutral-600 line-clamp-1 mb-1">
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
          </div>

          <div className={`${selectedConvId ? 'block' : 'hidden lg:block'} lg:col-span-3`}>
            {selectedConvId && selectedConversation ? (
              <Card className="flex flex-col h-[600px]">
                <div className="p-5 border-b border-neutral-200">
                  <h2 className="text-lg font-bold text-neutral-900 mb-1">
                    {selectedConversation.traveler_name}
                  </h2>
                  <p className="text-sm text-neutral-500">
                    Tour: {selectedConversation.listing_title}
                  </p>
                </div>

                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-neutral-50">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-neutral-400 text-sm">
                      No messages yet
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isFromGuide = msg.sender_type === 'guide';
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isFromGuide ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className="max-w-[70%]">
                            <div className="text-xs text-neutral-500 mb-1">
                              {isFromGuide ? guideName : selectedConversation.traveler_name}
                            </div>
                            <div
                              className={`p-3 rounded-lg text-sm ${
                                isFromGuide
                                  ? 'bg-green-600 text-white'
                                  : 'bg-white text-neutral-900 border border-neutral-200'
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

                <form onSubmit={handleSendMessage} className="p-5 border-t border-neutral-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={sending || !newMessage.trim()}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </Card>
            ) : (
              <Card className="p-12 text-center text-neutral-400 h-[600px] flex items-center justify-center">
                <p>Select a conversation to view messages</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
