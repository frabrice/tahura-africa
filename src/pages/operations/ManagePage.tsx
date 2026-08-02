import { useState, useEffect, useRef } from 'react';
import { Search, X, Layers, Landmark } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useDebounce } from '../../lib/useDebounce';
import { ManagePartnersTab } from './manage/ManagePartnersTab';
import { ManageInstitutionsTab } from './manage/ManageInstitutionsTab';

type ManageTab = 'partners' | 'institutions';

interface SearchResult {
  id: string;
  title: string;
  type: 'experience' | 'homestay' | 'attraction';
  ownerName: string;
  ownerId: string;
  tab: ManageTab;
}

export function ManagePage() {
  const [activeTab, setActiveTab] = useState<ManageTab>('partners');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 300);
  const searchRef = useRef<HTMLDivElement>(null);

  const [drillPartnerId, setDrillPartnerId] = useState<string | null>(null);
  const [drillListingId, setDrillListingId] = useState<string | null>(null);
  const [drillInstitutionId, setDrillInstitutionId] = useState<string | null>(null);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    searchContent(debouncedQuery.trim());
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function searchContent(q: string) {
    setSearching(true);
    const term = `%${q}%`;

    const [listingsRes, institutionsRes] = await Promise.all([
      supabase
        .from('partner_listings')
        .select('id, title, listing_type, partner_id, partner:portal_users!partner_listings_partner_id_fkey(name)')
        .ilike('title', term)
        .limit(6),
      supabase
        .from('institution_profiles')
        .select('id, name, portal_user_id, type')
        .ilike('name', term)
        .limit(4),
    ]);

    const results: SearchResult[] = [];

    (listingsRes.data || []).forEach((l: any) => {
      results.push({
        id: l.id,
        title: l.title,
        type: l.listing_type,
        ownerName: l.partner?.name || 'Unknown Partner',
        ownerId: l.partner_id,
        tab: 'partners',
      });
    });

    (institutionsRes.data || []).forEach((i: any) => {
      results.push({
        id: i.id,
        title: i.name,
        type: 'attraction',
        ownerName: i.type || 'Attraction',
        ownerId: i.portal_user_id,
        tab: 'institutions',
      });
    });

    setSearchResults(results);
    setSearchOpen(true);
    setSearching(false);
  }

  function handleSearchSelect(result: SearchResult) {
    setSearchQuery('');
    setSearchOpen(false);
    setSearchResults([]);

    if (result.tab === 'partners') {
      setActiveTab('partners');
      setDrillPartnerId(result.ownerId);
      setDrillListingId(result.id);
      setDrillInstitutionId(null);
    } else if (result.tab === 'institutions') {
      setActiveTab('institutions');
      setDrillInstitutionId(result.ownerId);
      setDrillPartnerId(null);
      setDrillListingId(null);
    }
  }

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = {
      experience: 'bg-amber-100 text-amber-700',
      homestay: 'bg-rose-100 text-rose-700',
      attraction: 'bg-teal-100 text-teal-700',
    };
    return colors[type] || 'bg-neutral-100 text-neutral-600';
  };

  const tabs: { id: ManageTab; label: string; icon: typeof Layers }[] = [
    { id: 'partners', label: 'Partners', icon: Layers },
    { id: 'institutions', label: 'Attractions', icon: Landmark },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-neutral-900">Manage</h1>
        <p className="text-xs text-neutral-500 mt-0.5">View and manage all platform accounts, listings, and content</p>
      </div>

      <div ref={searchRef} className="relative mb-6">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim()) setSearchOpen(true);
            }}
            onFocus={() => {
              if (searchResults.length > 0) setSearchOpen(true);
            }}
            placeholder="Search listings, attractions, partners..."
            className="w-full pl-10 pr-10 py-2.5 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200 focus:border-neutral-400 placeholder:text-neutral-400"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchOpen(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-neutral-100"
            >
              <X className="w-3.5 h-3.5 text-neutral-400" />
            </button>
          )}
        </div>

        {searchOpen && (searchResults.length > 0 || searching) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto">
            {searching ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
              </div>
            ) : (
              searchResults.map(r => (
                <button
                  key={`${r.tab}-${r.id}`}
                  onClick={() => handleSearchSelect(r)}
                  className="w-full text-left px-4 py-3 hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-0 flex items-center gap-3"
                >
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${typeBadge(r.type)}`}>
                    {r.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-neutral-900 truncate">{r.title}</div>
                    <div className="text-xs text-neutral-500">{r.ownerName}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex bg-neutral-100 p-1 rounded-lg gap-1 mb-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setDrillPartnerId(null);
                setDrillListingId(null);
                setDrillInstitutionId(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'partners' && (
        <ManagePartnersTab
          drillPartnerId={drillPartnerId}
          drillListingId={drillListingId}
          onClearDrill={() => { setDrillPartnerId(null); setDrillListingId(null); }}
        />
      )}
      {activeTab === 'institutions' && (
        <ManageInstitutionsTab
          drillInstitutionId={drillInstitutionId}
          onClearDrill={() => setDrillInstitutionId(null)}
        />
      )}
    </div>
  );
}
