import { useState, useEffect, useCallback } from 'react';
import { Plus, FileText, Compass, Home as HomeIcon, Route, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SideDrawer } from './SideDrawer';
import { ShareButton } from './ShareButton';
import { QuoteDownloadButton } from './QuoteDownloadButton';
import { CustomQuoteForm } from './CustomQuoteForm';
import { CustomQuote, CreatedBy, QuoteType, isQuoteExpired } from '../lib/customQuotes';

interface Attribution {
  partnerId?: string | null;
  hostId?: string | null;
  guideId?: string | null;
}

interface CustomQuoteListProps {
  createdBy?: CreatedBy;
  attribution: Attribution;
  /** Ops oversight mode: hides "New Custom Quote" (a quote must belong to a real
   *  Partner/Host/Guide relationship with the client) and shows who created each one. */
  canCreate?: boolean;
}

const TYPE_META: Record<QuoteType, { label: string; icon: typeof Compass }> = {
  experience: { label: 'Experience', icon: Compass },
  homestay: { label: 'Homestay', icon: HomeIcon },
  itinerary: { label: 'Itinerary', icon: Route },
};

const STATUS_STYLE: Record<CustomQuote['status'], string> = {
  draft: 'bg-neutral-100 text-neutral-600',
  sent: 'bg-sky-50 text-sky-700',
  paid: 'bg-emerald-50 text-emerald-700',
  expired: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-red-50 text-red-700',
};

export function CustomQuoteList({ createdBy, attribution, canCreate = true }: CustomQuoteListProps) {
  const [quotes, setQuotes] = useState<CustomQuote[]>([]);
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<CustomQuote | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('custom_quotes').select('*').order('created_at', { ascending: false });
    if (attribution.partnerId) query = query.eq('partner_id', attribution.partnerId);
    if (attribution.hostId) query = query.eq('host_id', attribution.hostId);
    if (attribution.guideId) query = query.eq('guide_id', attribution.guideId);
    const { data } = await query;
    const loaded = (data as CustomQuote[]) || [];
    setQuotes(loaded);
    setLoading(false);

    if (canCreate) return; // creator dashboards already know who they are

    const partnerIds = [...new Set(loaded.filter(q => q.partner_id).map(q => q.partner_id!))];
    const hostIds = [...new Set(loaded.filter(q => q.host_id).map(q => q.host_id!))];
    const guideIds = [...new Set(loaded.filter(q => q.guide_id).map(q => q.guide_id!))];
    const [partners, hosts, guides] = await Promise.all([
      partnerIds.length ? supabase.from('portal_users').select('id, name').in('id', partnerIds) : { data: [] },
      hostIds.length ? supabase.from('partner_hosts').select('id, name').in('id', hostIds) : { data: [] },
      guideIds.length ? supabase.from('guides').select('id, name').in('id', guideIds) : { data: [] },
    ]);
    const nameById = new Map<string, string>();
    (partners.data || []).forEach((p: any) => nameById.set(p.id, p.name));
    (hosts.data || []).forEach((h: any) => nameById.set(h.id, h.name));
    (guides.data || []).forEach((g: any) => nameById.set(g.id, g.name));

    const names: Record<string, string> = {};
    loaded.forEach(q => {
      if (q.created_by === 'partner' && q.partner_id) names[q.id] = `${nameById.get(q.partner_id) || 'Unknown partner'} (Partner)`;
      else if (q.created_by === 'host' && q.host_id) names[q.id] = `${nameById.get(q.host_id) || 'Unknown host'} (Host, via ${nameById.get(q.partner_id || '') || 'partner'})`;
      else if (q.created_by === 'guide' && q.guide_id) names[q.id] = `${nameById.get(q.guide_id) || 'Unknown guide'} (Guide)`;
      else names[q.id] = 'Unknown';
    });
    setCreatorNames(names);
  }, [attribution.partnerId, attribution.hostId, attribution.guideId, canCreate]);

  useEffect(() => { load(); }, [load]);

  async function markSent(quote: CustomQuote) {
    if (quote.status !== 'draft') return;
    await supabase.from('custom_quotes').update({ status: 'sent' }).eq('id', quote.id);
    setSelected(s => s ? { ...s, status: 'sent' } : s);
    setQuotes(qs => qs.map(q => q.id === quote.id ? { ...q, status: 'sent' } : q));
  }

  const quoteUrl = (q: CustomQuote) => `${window.location.origin}/quote/${q.id}`;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (selected) {
    const meta = TYPE_META[selected.quote_type];
    const Icon = meta.icon;
    const expired = isQuoteExpired(selected);
    return (
      <div className="space-y-6">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Quotes
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-neutral-400" />
              <span className="text-xs font-medium text-neutral-500">{meta.label}</span>
              <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[expired && selected.status !== 'paid' ? 'expired' : selected.status]}`}>
                {expired && selected.status !== 'paid' ? 'Expired' : selected.status}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">{selected.title}</h2>
            <p className={`text-xs text-neutral-400 ${canCreate ? 'mb-4' : 'mb-1'}`}>{selected.quote_ref} · For {selected.client_name}</p>
            {!canCreate && (
              <p className="text-xs text-neutral-500 mb-4">Created by <span className="font-medium text-neutral-700">{creatorNames[selected.id] || '—'}</span></p>
            )}

            <div className="space-y-2 text-sm mb-5">
              <div className="flex justify-between"><span className="text-neutral-500">Client receives</span><span className="font-medium text-neutral-900">{selected.client_email}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Client pays</span><span className="font-bold text-neutral-900">${selected.client_total.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">You receive</span><span className="font-medium text-emerald-700">${selected.net_amount.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Valid until</span><span className="font-medium text-neutral-900">{new Date(selected.valid_until).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 flex items-center justify-center border border-neutral-300 rounded-lg py-2 hover:bg-neutral-50">
                <ShareButton title={selected.title} path={`/quote/${selected.id}`} variant="chip" className="!bg-transparent !shadow-none" />
              </div>
              <QuoteDownloadButton
                quote={selected}
                quoteUrl={quoteUrl(selected)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border border-neutral-300 rounded-lg py-2.5 hover:bg-neutral-50"
              />
            </div>
            {selected.status === 'draft' && (
              <button onClick={() => markSent(selected)} className="w-full mt-2 py-2.5 bg-neutral-900 text-white text-xs font-medium rounded-lg hover:bg-neutral-800">
                Mark as Sent
              </button>
            )}
          </div>

          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5">
            <p className="text-xs font-medium text-neutral-500 mb-2">Payment link</p>
            <p className="text-xs text-neutral-700 break-all bg-white border border-neutral-200 rounded-lg p-2.5">{quoteUrl(selected)}</p>
            <p className="text-[11px] text-neutral-400 mt-3">Share this link directly, or use the Share button to send it via WhatsApp, email, or copy it.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Custom Quotes</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {canCreate ? "Build a one-off quote for a client's custom request" : 'Every off-catalog quote created across Partners, Hosts, and Guides'}
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-800">
            <Plus className="w-4 h-4" /> New Custom Quote
          </button>
        )}
      </div>

      {quotes.length === 0 ? (
        <div className="py-16 text-center bg-white border border-neutral-200 rounded-2xl">
          <FileText className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-500">No custom quotes yet</p>
          <p className="text-xs text-neutral-400 mt-1">Create one for a client asking for something off-catalog</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quotes.map(q => {
            const meta = TYPE_META[q.quote_type];
            const Icon = meta.icon;
            const expired = isQuoteExpired(q);
            const statusKey = expired && q.status !== 'paid' ? 'expired' : q.status;
            return (
              <button key={q.id} onClick={() => setSelected(q)} className="text-left bg-white border border-neutral-200 rounded-2xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="text-[11px] text-neutral-500">{meta.label}</span>
                  <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[statusKey]}`}>{statusKey}</span>
                </div>
                <h3 className="text-sm font-semibold text-neutral-900 line-clamp-1 mb-1">{q.title}</h3>
                <p className="text-xs text-neutral-400 mb-1">For {q.client_name}</p>
                {!canCreate && <p className="text-[11px] text-neutral-400 mb-2 line-clamp-1">{creatorNames[q.id] || '—'}</p>}
                <p className={`text-sm font-bold text-neutral-900 ${canCreate ? 'mt-2' : ''}`}>${q.client_total.toLocaleString()}</p>
              </button>
            );
          })}
        </div>
      )}

      {canCreate && createdBy && (
        <SideDrawer isOpen={showForm} onClose={() => setShowForm(false)} title="New Custom Quote">
          <CustomQuoteForm
            createdBy={createdBy}
            attribution={attribution}
            onCancel={() => setShowForm(false)}
            onComplete={() => { setShowForm(false); load(); }}
          />
        </SideDrawer>
      )}
    </div>
  );
}
