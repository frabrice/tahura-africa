import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/Card';
import {
  Flag, CheckCircle, XCircle, Eye, Shield, AlertTriangle,
  MessageSquare, Landmark, MapPin, Star, RefreshCw
} from 'lucide-react';

interface ContentFlag {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  severity: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

interface FlaggedItem {
  flag: ContentFlag;
  title: string;
  details: string;
  owner: string;
}

const SEVERITY_CONFIG = {
  high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertTriangle },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Flag },
  low: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', icon: Eye },
};

const STATUS_CONFIG = {
  pending: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700' },
  reviewing: { label: 'Reviewing', bg: 'bg-blue-50', text: 'text-blue-700' },
  resolved: { label: 'Resolved', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  dismissed: { label: 'Dismissed', bg: 'bg-neutral-50', text: 'text-neutral-500' },
};

export function ModerationPage() {
  const [flags, setFlags] = useState<FlaggedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewing' | 'resolved' | 'dismissed'>('all');
  const [selectedItem, setSelectedItem] = useState<FlaggedItem | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => { loadFlags(); }, []);

  async function loadFlags() {
    setLoading(true);
    try {
      const { data: flagData } = await supabase
        .from('content_flags')
        .select('*')
        .order('created_at', { ascending: false });

      const flaggedItems: FlaggedItem[] = [];

      for (const flag of (flagData || [])) {
        let title = 'Unknown';
        let details = '';
        let owner = 'Unknown';

        if (flag.target_type === 'listing') {
          const { data } = await supabase.from('partner_listings').select('title,description,partner_id').eq('id', flag.target_id).single();
          if (data) { title = data.title; details = data.description || ''; }
        } else if (flag.target_type === 'review') {
          const { data } = await supabase.from('reviews').select('review_text,reviewer_name').eq('id', flag.target_id).single();
          if (data) { title = 'Review'; details = data.review_text || ''; owner = data.reviewer_name || 'Unknown'; }
        } else if (flag.target_type === 'attraction_review') {
          const { data } = await supabase.from('attraction_reviews').select('review_text,reviewer_name').eq('id', flag.target_id).single();
          if (data) { title = 'Attraction Review'; details = data.review_text || ''; owner = data.reviewer_name || 'Unknown'; }
        } else if (flag.target_type === 'guide') {
          const { data } = await supabase.from('guides').select('name,bio').eq('id', flag.target_id).single();
          if (data) { title = data.name; details = data.bio || ''; }
        } else if (flag.target_type === 'institution') {
          const { data } = await supabase.from('institution_profiles').select('name,description').eq('id', flag.target_id).single();
          if (data) { title = data.name; details = data.description || ''; }
        }

        flaggedItems.push({ flag, title, details, owner });
      }

      setFlags(flaggedItems);
    } catch (err) {
      console.error('Error loading flags:', err);
    }
    setLoading(false);
  }

  async function handleAction(flagId: string, newStatus: string) {
    setProcessing(true);
    try {
      await supabase
        .from('content_flags')
        .update({ status: newStatus, resolved_at: newStatus === 'resolved' || newStatus === 'dismissed' ? new Date().toISOString() : null })
        .eq('id', flagId);

      // If resolving, also flag the target item
      const flag = flags.find(f => f.flag.id === flagId);
      if (flag && newStatus === 'resolved') {
        if (flag.flag.target_type === 'listing') {
          await supabase.from('partner_listings').update({ is_flagged: true }).eq('id', flag.flag.target_id);
        } else if (flag.flag.target_type === 'review') {
          await supabase.from('reviews').update({ is_flagged: true }).eq('id', flag.flag.target_id);
        } else if (flag.flag.target_type === 'attraction_review') {
          await supabase.from('attraction_reviews').update({ is_flagged: true }).eq('id', flag.flag.target_id);
        }
      }

      setFlags(prev => prev.map(f => f.flag.id === flagId ? { ...f, flag: { ...f.flag, status: newStatus, resolved_at: newStatus === 'resolved' || newStatus === 'dismissed' ? new Date().toISOString() : null } } : f));
      setSelectedItem(null);
      setActionNote('');
    } catch (err) {
      console.error('Error updating flag:', err);
    }
    setProcessing(false);
  }

  const filtered = filter === 'all' ? flags : flags.filter(f => f.flag.status === filter);
  const counts = {
    all: flags.length,
    pending: flags.filter(f => f.flag.status === 'pending').length,
    reviewing: flags.filter(f => f.flag.status === 'reviewing').length,
    resolved: flags.filter(f => f.flag.status === 'resolved').length,
    dismissed: flags.filter(f => f.flag.status === 'dismissed').length,
  };

  function getTypeIcon(type: string) {
    switch (type) {
      case 'listing': return <MapPin className="w-4 h-4" />;
      case 'review': return <Star className="w-4 h-4" />;
      case 'attraction_review': return <Star className="w-4 h-4" />;
      case 'guide': return <MessageSquare className="w-4 h-4" />;
      case 'institution': return <Landmark className="w-4 h-4" />;
      default: return <Flag className="w-4 h-4" />;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-neutral-500" />
            Content Moderation
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">Review and manage flagged content across the platform</p>
        </div>
        <button onClick={loadFlags} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4 text-neutral-500" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['pending', 'reviewing', 'resolved', 'dismissed'] as const).map(status => {
          const conf = STATUS_CONFIG[status];
          return (
            <Card key={status} className={`p-4 ${conf.bg}`}>
              <div className="text-2xl font-bold text-neutral-900">{counts[status]}</div>
              <div className={`text-xs font-medium ${conf.text}`}>{conf.label}</div>
            </Card>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl w-fit">
        {(['all', 'pending', 'reviewing', 'resolved', 'dismissed'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
              filter === tab ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className={`ml-1.5 text-xs ${filter === tab ? 'text-neutral-500' : 'text-neutral-400'}`}>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-500">No flagged content</p>
          <p className="text-xs text-neutral-400 mt-1">All clear — no content requires moderation</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const sev = SEVERITY_CONFIG[item.flag.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.low;
            const status = STATUS_CONFIG[item.flag.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
            const SeverityIcon = sev.icon;
            const isOpen = selectedItem?.flag.id === item.flag.id;

            return (
              <Card key={item.flag.id} className={`overflow-hidden transition-all ${isOpen ? 'ring-1 ring-neutral-300' : ''}`}>
                <button
                  onClick={() => setSelectedItem(isOpen ? null : item)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg ${sev.bg} flex-shrink-0`}>
                        <SeverityIcon className={`w-4 h-4 ${sev.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${sev.bg} ${sev.text} ${sev.border}`}>
                            {item.flag.severity}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${status.bg} ${status.text}`}>
                            {status.label}
                          </span>
                          <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                            {getTypeIcon(item.flag.target_type)}
                            {item.flag.target_type}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-neutral-900 truncate">{item.title}</h3>
                        <p className="text-xs text-neutral-500 mt-0.5">{item.flag.reason}</p>
                        <p className="text-[10px] text-neutral-400 mt-1">
                          Flagged {new Date(item.flag.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isOpen ? <XCircle className="w-4 h-4 text-neutral-400" /> : <Eye className="w-4 h-4 text-neutral-400" />}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-neutral-100 pt-4">
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Content Details</h4>
                      <p className="text-sm text-neutral-700 leading-relaxed">{item.details || 'No details available'}</p>
                      {item.owner && item.owner !== 'Unknown' && (
                        <p className="text-xs text-neutral-500 mt-2">By: {item.owner}</p>
                      )}
                    </div>

                    {item.flag.status === 'pending' || item.flag.status === 'reviewing' ? (
                      <div className="space-y-3">
                        <textarea
                          value={actionNote}
                          onChange={(e) => setActionNote(e.target.value)}
                          placeholder="Add a note about your decision (optional)..."
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 resize-none"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAction(item.flag.id, 'resolved')}
                            disabled={processing}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve & Flag Item
                          </button>
                          <button
                            onClick={() => handleAction(item.flag.id, 'dismissed')}
                            disabled={processing}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-neutral-600 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Dismiss
                          </button>
                          <button
                            onClick={() => handleAction(item.flag.id, 'reviewing')}
                            disabled={processing}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Mark Reviewing
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pt-2">
                        <span className="text-xs text-neutral-500">
                          Resolved {item.flag.resolved_at ? new Date(item.flag.resolved_at).toLocaleDateString('en-US') : 'N/A'}
                        </span>
                        <button
                          onClick={() => handleAction(item.flag.id, 'pending')}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Reopen
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
