import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';
import { logAdminAction } from '../../lib/auditLog';
import { sendEmail } from '../../lib/sendEmail';
import { FlagContentModal } from '../../components/FlagContentModal';
import {
  Flag, CheckCircle, XCircle, Eye, Shield, AlertTriangle,
  MessageSquare, Landmark, MapPin, Star, RefreshCw, ClipboardCheck, Search
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
  const { user } = useAuth();
  const me = user as PortalUser;
  const [view, setView] = useState<'flags' | 'quality'>('flags');
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
      logAdminAction({ actor: me, action: `flag.${newStatus}`, targetType: flag?.flag.target_type, targetId: flag?.flag.target_id, details: { title: flag?.title, note: actionNote || undefined } });
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
        {view === 'flags' && (
          <button onClick={loadFlags} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4 text-neutral-500" />
          </button>
        )}
      </div>

      <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl w-fit">
        <button onClick={() => setView('flags')} className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${view === 'flags' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
          <Flag className="w-3.5 h-3.5" /> Flags Queue
        </button>
        <button onClick={() => setView('quality')} className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${view === 'quality' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
          <ClipboardCheck className="w-3.5 h-3.5" /> Listing Quality
        </button>
      </div>

      {view === 'quality' ? (
        <ListingQualityTab me={me} />
      ) : (
      <>
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
      </>
      )}
    </div>
  );
}

interface QualityListing {
  id: string;
  title: string;
  listing_type: string;
  pricing: { base_price?: number; currency?: string } | null;
  status: string;
  is_flagged: boolean;
  created_at: string;
  partner_id: string;
}

function ListingQualityTab({ me }: { me: PortalUser }) {
  const [listings, setListings] = useState<QualityListing[]>([]);
  const [partnerNames, setPartnerNames] = useState<Record<string, { name: string; email: string }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<QualityListing | null>(null);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase
      .from('partner_listings')
      .select('id, title, listing_type, pricing, status, is_flagged, created_at, partner_id')
      .order('created_at', { ascending: false });
    const rows = (data as QualityListing[]) || [];
    setListings(rows);

    const partnerIds = [...new Set(rows.map(r => r.partner_id).filter(Boolean))];
    if (partnerIds.length > 0) {
      const { data: partners } = await supabase.from('portal_users').select('id, name, email').in('id', partnerIds);
      setPartnerNames(Object.fromEntries((partners || []).map((p: any) => [p.id, { name: p.name || 'Unknown', email: p.email }])));
    }
    setLoading(false);
  }

  async function handleApprove(listing: QualityListing) {
    setBusy(true);
    const updates: Record<string, unknown> = {};
    if (listing.status === 'draft') updates.status = 'active';
    if (listing.is_flagged) updates.is_flagged = false;

    if (Object.keys(updates).length > 0) {
      await supabase.from('partner_listings').update(updates).eq('id', listing.id);
    }

    if (listing.is_flagged) {
      await supabase.from('content_flags').update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('target_type', 'listing').eq('target_id', listing.id).eq('status', 'active');
      const partner = partnerNames[listing.partner_id];
      await supabase.from('notifications').insert({
        recipient_portal_user_id: listing.partner_id,
        type: 'listing_unflagged',
        title: `Flag removed from "${listing.title}"`,
        message: 'Your listing has been reviewed and approved. It is now visible to travelers again.',
        metadata: { target_type: 'listing', target_id: listing.id, target_title: listing.title },
      });
      if (partner?.email) {
        sendEmail({ template: 'content_resolved', recipient_email: partner.email, recipient_name: partner.name, data: { target_type: 'listing', target_title: listing.title } });
      }
    }

    logAdminAction({ actor: me, action: 'listing.approve', targetType: 'partner_listing', targetId: listing.id, details: { title: listing.title } });
    setBusy(false);
    setSelected(null);
    loadData();
  }

  async function handleRemove(listing: QualityListing) {
    setBusy(true);
    await supabase.from('partner_listings').update({ status: 'draft' }).eq('id', listing.id);

    const partner = partnerNames[listing.partner_id];
    await supabase.from('notifications').insert({
      recipient_portal_user_id: listing.partner_id,
      type: 'listing_removed',
      title: `Your listing "${listing.title}" has been removed`,
      message: 'Your listing has been taken down by the operations team. If you believe this was in error, please contact support.',
      metadata: { target_type: 'listing', target_id: listing.id, target_title: listing.title },
    });
    if (partner?.email) {
      sendEmail({ template: 'content_removed', recipient_email: partner.email, recipient_name: partner.name, data: { target_type: 'listing', target_title: listing.title } });
    }

    logAdminAction({ actor: me, action: 'listing.remove', targetType: 'partner_listing', targetId: listing.id, details: { title: listing.title } });
    setBusy(false);
    setShowRemoveConfirm(false);
    setSelected(null);
    loadData();
  }

  const filtered = listings.filter(l => {
    const q = search.toLowerCase();
    return !q || l.title.toLowerCase().includes(q) || (partnerNames[l.partner_id]?.name || '').toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (selected) {
    const partner = partnerNames[selected.partner_id];
    return (
      <div>
        <button onClick={() => setSelected(null)} className="text-xs text-neutral-600 hover:text-neutral-900 mb-4">
          &larr; Back to Listing Quality
        </button>
        <h1 className="text-lg font-medium text-neutral-900 mb-6">{selected.title}</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Card className="p-5 bg-blue-50">
            <h3 className="text-sm font-medium text-neutral-900 mb-4">Listing Information</h3>
            <div className="space-y-3 text-sm">
              <div><div className="text-xs text-neutral-500 mb-1">Partner</div><div className="text-neutral-900">{partner?.name || 'Unknown'}</div></div>
              <div><div className="text-xs text-neutral-500 mb-1">Type</div><div className="text-neutral-900 capitalize">{selected.listing_type}</div></div>
              <div><div className="text-xs text-neutral-500 mb-1">Price</div><div className="text-neutral-900">${selected.pricing?.base_price ?? 0} {selected.pricing?.currency || 'USD'}</div></div>
              <div><div className="text-xs text-neutral-500 mb-1">Status</div><div className="text-neutral-900 capitalize">{selected.status}{selected.is_flagged ? ' · Flagged' : ''}</div></div>
              <div><div className="text-xs text-neutral-500 mb-1">Created</div><div className="text-neutral-900">{new Date(selected.created_at).toLocaleDateString()}</div></div>
            </div>
          </Card>

          <Card className="p-5 bg-amber-50">
            <h3 className="text-sm font-medium text-neutral-900 mb-4">Moderation Actions</h3>
            <p className="text-xs text-neutral-600 mb-4">All actions are logged in the audit trail and notify the partner.</p>
            <div className="flex flex-wrap gap-3">
              <button disabled={busy} onClick={() => handleApprove(selected)} className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white hover:bg-neutral-800 transition-colors disabled:opacity-50 rounded-lg">
                Approve Listing
              </button>
              <button disabled={busy} onClick={() => setShowFlagModal(true)} className="px-4 py-2 text-xs font-medium border border-neutral-200 hover:bg-neutral-50 transition-colors rounded-lg">
                Request Changes
              </button>
              <button disabled={busy} onClick={() => setShowRemoveConfirm(true)} className="px-4 py-2 text-xs font-medium border border-neutral-200 hover:bg-neutral-50 transition-colors text-red-600 rounded-lg">
                Remove Listing
              </button>
            </div>
            {showRemoveConfirm && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700 mb-2">Remove this listing from the platform? The partner will be notified.</p>
                <div className="flex gap-2">
                  <button disabled={busy} onClick={() => handleRemove(selected)} className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">Confirm Remove</button>
                  <button onClick={() => setShowRemoveConfirm(false)} className="px-3 py-1.5 text-xs font-medium border border-neutral-300 rounded-lg hover:bg-white">Cancel</button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {showFlagModal && partner && (
          <FlagContentModal
            targetType="listing"
            targetId={selected.id}
            targetTitle={selected.title}
            ownerPortalUserId={selected.partner_id}
            flaggedBy={me?.id || ''}
            onClose={() => setShowFlagModal(false)}
            onFlagged={() => { setShowFlagModal(false); logAdminAction({ actor: me, action: 'listing.request_changes', targetType: 'partner_listing', targetId: selected.id, details: { title: selected.title } }); loadData(); setSelected(null); }}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-neutral-500">{filtered.length} listing{filtered.length !== 1 ? 's' : ''}</div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by listing or partner..." className="pl-9 pr-4 py-2 text-xs border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200 w-64" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center bg-neutral-50">
          <p className="text-sm text-neutral-500">No listings to review</p>
        </Card>
      ) : (
        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <Card className="min-w-[600px] md:min-w-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Listing</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Partner</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map(listing => (
                  <tr key={listing.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 text-sm text-neutral-900">{listing.title}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{partnerNames[listing.partner_id]?.name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600 capitalize">{listing.listing_type}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">${listing.pricing?.base_price ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${listing.is_flagged ? 'bg-red-50 text-red-700' : listing.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                        {listing.is_flagged ? 'Flagged' : listing.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(listing)} className="text-xs text-neutral-900 hover:underline">
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
