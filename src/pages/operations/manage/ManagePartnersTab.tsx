import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../../components/Button';
import CreateUserDrawer from '../../../components/CreateUserDrawer';
import { PartnerListView } from './PartnerListView';
import { PartnerDetailView } from './PartnerDetailView';
import { ListingDetailView } from './ListingDetailView';

interface Props {
  drillPartnerId: string | null;
  drillListingId: string | null;
  onClearDrill: () => void;
}

export function ManagePartnersTab({ drillPartnerId, drillListingId, onClearDrill }: Props) {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadPartners();
  }, []);

  useEffect(() => {
    if (drillPartnerId) {
      setSelectedPartnerId(drillPartnerId);
      if (drillListingId) setSelectedListingId(drillListingId);
    }
  }, [drillPartnerId, drillListingId]);

  async function loadPartners() {
    setLoading(true);
    const { data } = await supabase
      .from('portal_users')
      .select('id, name, email, phone, contact_person, country, province, specific_location, specialty, tags, is_active, created_at')
      .eq('portal_type', 'partner')
      .order('created_at', { ascending: false });

    if (data) {
      const enriched = await Promise.all(
        data.map(async (p) => {
          const [hostsRes, listingsRes] = await Promise.all([
            supabase.from('partner_hosts').select('id').eq('partner_id', p.id),
            supabase.from('partner_listings').select('id').eq('partner_id', p.id),
          ]);
          return {
            ...p,
            hostsCount: hostsRes.data?.length || 0,
            listingsCount: listingsRes.data?.length || 0,
          };
        })
      );
      setPartners(enriched);
    }
    setLoading(false);
  }

  if (selectedListingId && selectedPartnerId) {
    return (
      <ListingDetailView
        listingId={selectedListingId}
        partnerId={selectedPartnerId}
        onBack={() => {
          setSelectedListingId(null);
          if (drillListingId) onClearDrill();
        }}
      />
    );
  }

  if (selectedPartnerId) {
    return (
      <PartnerDetailView
        partnerId={selectedPartnerId}
        onBack={() => {
          setSelectedPartnerId(null);
          onClearDrill();
        }}
        onSelectListing={(id) => setSelectedListingId(id)}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Partner
        </Button>
      </div>
      <PartnerListView
        partners={partners}
        loading={loading}
        filter={filter}
        onFilterChange={setFilter}
        onSelectPartner={setSelectedPartnerId}
      />
      <CreateUserDrawer
        isOpen={showCreate}
        fixedType="partner"
        onClose={() => setShowCreate(false)}
        onSuccess={() => { setShowCreate(false); loadPartners(); }}
      />
    </div>
  );
}
