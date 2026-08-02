import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Search, Send, Phone, ChevronRight, User } from 'lucide-react';

const TEAL = '#0d9488';

interface Conversation {
  id: string;
  participant_name: string;
  participant_role: 'traveler' | 'partner' | 'support';
  last_message: string;
  last_message_time: string;
  unread_count: number;
  booking_ref?: string;
}

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  is_own: boolean;
}

export function DriverMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    try {
      // Mock data
      setConversations([
        {
          id: 'conv-1',
          participant_name: 'John Smith',
          participant_role: 'traveler',
          last_message: 'Thanks for the great ride to Volcanoes National Park!',
          last_message_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          unread_count: 0,
          booking_ref: 'BK-001',
        },
        {
          id: 'conv-2',
          participant_name: 'Emma Wilson',
          participant_role: 'traveler',
          last_message: "I'll be waiting outside the hotel entrance",
          last_message_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          unread_count: 1,
          booking_ref: 'BK-002',
        },
        {
          id: 'conv-3',
          participant_name: 'Tahura Support',
          participant_role: 'support',
          last_message: 'Your driver profile has been verified successfully.',
          last_message_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          unread_count: 0,
        },
      ]);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (_conversationId: string) => {
    // Mock messages
    setMessages([
      {
        id: 'msg-1',
        sender_id: 'driver',
        sender_name: 'You',
        content: 'Hello! I will be your driver for the Volcanoes National Park trip. I will pick you up at the hotel at 6:00 AM.',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        is_own: true,
      },
      {
        id: 'msg-2',
        sender_id: 'traveler',
        sender_name: 'John Smith',
        content: 'Great, thank you! Should I be ready a bit earlier?',
        created_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
        is_own: false,
      },
      {
        id: 'msg-3',
        sender_id: 'driver',
        sender_name: 'You',
        content: 'Yes, please be ready 10 minutes early just to be safe. I will message when I arrive.',
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        is_own: true,
      },
      {
        id: 'msg-4',
        sender_id: 'traveler',
        sender_name: 'John Smith',
        content: 'Thanks for the great ride to Volcanoes National Park!',
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        is_own: false,
      },
    ]);
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    loadMessages(conv.id);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const message: Message = {
      id: `msg-${Date.now()}`,
      sender_id: 'driver',
      sender_name: 'You',
      content: newMessage,
      created_at: new Date().toISOString(),
      is_own: true,
    };

    setMessages((prev) => [...prev, message]);
    setNewMessage('');
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] flex">
      {/* Conversations List */}
      <div
        className={`w-full md:w-80 border-r border-slate-200 bg-white flex flex-col ${
          selectedConversation ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-900">Messages</h1>
          <p className="text-sm text-slate-500 mt-1">
            {conversations.filter((c) => c.unread_count > 0).length} unread
          </p>
        </div>

        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <motion.button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`w-full p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100 ${
                  selectedConversation?.id === conv.id ? 'bg-slate-50' : ''
                }`}
                whileTap={{ scale: 0.99 }}
              >
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium text-slate-900 truncate">{conv.participant_name}</span>
                    <span className="text-xs text-slate-400 flex-shrink-0">{formatTime(conv.last_message_time)}</span>
                  </div>
                  {conv.booking_ref && (
                    <div className="text-xs font-mono mb-1" style={{ color: TEAL }}>
                      {conv.booking_ref}
                    </div>
                  )}
                  <p className="text-sm text-slate-500 truncate">{conv.last_message}</p>
                </div>
                {conv.unread_count > 0 && (
                  <span
                    className="min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-medium text-white rounded-full"
                    style={{ background: TEAL }}
                  >
                    {conv.unread_count}
                  </span>
                )}
              </motion.button>
            ))
          )}
        </div>
      </div>

      {/* Chat View */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col bg-slate-50">
          {/* Chat Header */}
          <div className="p-4 bg-white border-b border-slate-200 flex items-center gap-3">
            <button
              onClick={() => setSelectedConversation(null)}
              className="md:hidden p-1.5 -ml-1 rounded-lg hover:bg-slate-100"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-500" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-slate-900">{selectedConversation.participant_name}</div>
              <div className="text-xs text-slate-500 capitalize">{selectedConversation.participant_role}</div>
            </div>
            <a
              href={`tel:+250788123456`}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <Phone className="w-5 h-5" />
            </a>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.is_own ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                    msg.is_own ? 'rounded-br-md' : 'rounded-bl-md'
                  }`}
                  style={msg.is_own ? { background: TEAL } : { background: 'white' }}
                >
                  <p className={`text-sm ${msg.is_own ? 'text-white' : 'text-slate-700'}`}>
                    {msg.content}
                  </p>
                  <div
                    className={`text-xs mt-1 ${msg.is_own ? 'text-white/70' : 'text-slate-400'}`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Message Input */}
          <div className="p-4 bg-white border-t border-slate-200">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                onClick={handleSendMessage}
                className="p-2.5 rounded-xl text-white"
                style={{ background: TEAL }}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Select a conversation to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
}
