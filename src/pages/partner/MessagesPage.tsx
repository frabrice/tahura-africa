import { useState, useEffect, useRef } from 'react';
import { Card } from '../../components/Card';
import { ArrowLeft, Users, MessageSquare, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';

interface PartnerHost {
  id: string;
  name: string;
  profile_picture: string;
  status: string;
}

interface Conversation {
  id: string;
  booking_id: string;
  traveler_name: string;
  host_name?: string;
  listing_title: string;
  listing_type: string;
  last_message?: string;
  last_message_at?: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: 'traveler' | 'host' | 'guide';
  sender_name: string;
  message_text: string;
  is_read: boolean;
  created_at: string;
}

export function MessagesPage() {
  const { user } = useAuth();
  const portalUser = user as PortalUser | null;
  const [hosts, setHosts] = useState<PartnerHost[]>([]);
  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (portalUser?.id) loadHosts();
    else setLoading(false);
  }, [portalUser?.id]);

  useEffect(() => {
    if (selectedHostId) {
      setSelectedConvId(null);
      setMessages([]);
      loadConversations(selectedHostId);
    }
  }, [selectedHostId]);

  useEffect(() => {
    if (selectedConvId) loadMessages(selectedConvId);
  }, [selectedConvId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Supabase Realtime: subscribe to messages for live updates
  useEffect(() => {
    if (!portalUser?.id) return;
    const channel = supabase
      .channel('partner-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          if (selectedConvId && newMsg.conversation_id === selectedConvId) {
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
          if (selectedHostId) loadConversations(selectedHostId);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [portalUser?.id, selectedConvId, selectedHostId]);

  const loadHosts = async () => {
    if (!portalUser?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('partner_hosts')
        .select('id, name, profile_picture, status')
        .eq('partner_id', portalUser.id)
        .order('name');

      if (error) throw error;
      setHosts(data || []);
    } catch (err) {
      console.error('Error loading hosts:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async (hostId: string) => {
    setLoadingConvs(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('host_id', hostId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoadingConvs(false);
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

  const selectedHost = hosts.find(h => h.id === selectedHostId);
  const selectedConversation = conversations.find(c => c.id === selectedConvId);

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

  if (loading) {
    return <div className="text-neutral-600 py-8 text-sm">Loading...</div>;
  }

  if (!selectedHostId) {
    return (
      <div>
        <h1 className="text-lg font-medium text-neutral-900 mb-1">Messages</h1>
        <p className="text-sm text-neutral-500 mb-6">Select a host to view their conversations with travelers.</p>

        {hosts.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
            <div className="text-neutral-500 text-sm">No hosts found</div>
            <p className="text-xs text-neutral-400 mt-2">Add hosts to your team to see their messages here.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hosts.map((host) => (
              <button
                key={host.id}
                onClick={() => setSelectedHostId(host.id)}
                className="text-left bg-white border border-neutral-200 rounded-xl p-4 hover:border-neutral-400 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  {host.profile_picture ? (
                    <img src={host.profile_picture} alt={host.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-neutral-500">{host.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">{host.name}</p>
                    <span className={`text-xs ${host.status === 'active' ? 'text-emerald-600' : 'text-neutral-400'}`}>
                      {host.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-500 group-hover:text-neutral-700 transition-colors">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>View conversations</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => { setSelectedHostId(null); setSelectedConvId(null); setConversations([]); setMessages([]); }}
          className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selectedHost?.profile_picture ? (
            <img src={selectedHost.profile_picture} alt={selectedHost.name} className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-neutral-500">{selectedHost?.name.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-medium text-neutral-900 truncate">{selectedHost?.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-50 px-2.5 py-1.5 rounded-full">
          <Eye className="w-3 h-3" />
          <span>Read only</span>
        </div>
      </div>

      {loadingConvs ? (
        <div className="text-neutral-600 py-8 text-sm">Loading conversations...</div>
      ) : conversations.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
          <div className="text-neutral-500 text-sm">No conversations yet</div>
          <p className="text-xs text-neutral-400 mt-2">Messages between {selectedHost?.name} and travelers will appear here.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`${selectedConvId ? 'hidden lg:block' : 'block'} lg:col-span-1`}>
            <Card className="divide-y divide-neutral-100">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`w-full text-left p-4 hover:bg-neutral-50 transition-colors ${
                    selectedConvId === conv.id ? 'bg-neutral-50' : ''
                  }`}
                >
                  <div className="font-medium text-sm text-neutral-900 mb-1">{conv.traveler_name}</div>
                  <div className="text-xs text-neutral-500 mb-2 capitalize">
                    {conv.listing_type} &middot; {conv.listing_title}
                  </div>
                  {conv.last_message && (
                    <>
                      <div className="text-xs text-neutral-600 line-clamp-2">{conv.last_message}</div>
                      <div className="text-xs text-neutral-400 mt-2">
                        {conv.last_message_at && formatTime(conv.last_message_at)}
                      </div>
                    </>
                  )}
                </button>
              ))}
            </Card>
          </div>

          <div className={`${selectedConvId ? 'block' : 'hidden lg:block'} col-span-2`}>
            {selectedConvId && selectedConversation ? (
              <Card className="flex flex-col h-[600px]">
                <div className="p-4 border-b border-neutral-100">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedConvId(null)}
                      className="lg:hidden p-1 hover:bg-neutral-100 rounded-full transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-neutral-900 mb-0.5">
                        {selectedConversation.traveler_name}
                      </div>
                      <div className="text-xs text-neutral-500 capitalize">
                        {selectedConversation.listing_title}
                      </div>
                    </div>
                  </div>
                </div>

                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-neutral-400 text-sm">
                      No messages yet
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isFromHost = msg.sender_type === 'host';
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isFromHost ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className="max-w-[70%]">
                            <div className="text-xs text-neutral-500 mb-1">{msg.sender_name}</div>
                            <div
                              className={`px-4 py-2.5 rounded text-sm ${
                                isFromHost
                                  ? 'bg-neutral-900 text-white'
                                  : 'bg-neutral-100 text-neutral-900'
                              }`}
                            >
                              {msg.message_text}
                            </div>
                            <div className="text-xs text-neutral-400 mt-1.5">
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

                <div className="p-4 border-t border-neutral-100 bg-neutral-50">
                  <div className="flex items-center justify-center gap-2 text-xs text-neutral-400">
                    <Eye className="w-3.5 h-3.5" />
                    <span>
                      Viewing messages between {selectedHost?.name} and {selectedConversation.traveler_name}
                    </span>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="h-[600px] flex items-center justify-center">
                <div className="text-sm text-neutral-500">Select a conversation to view messages</div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
