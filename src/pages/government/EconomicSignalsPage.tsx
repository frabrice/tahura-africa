import { useState, useEffect } from 'react';
import { Download, DollarSign, Users, BarChart3 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';

export function EconomicSignalsPage() {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [partnerCount, setPartnerCount] = useState(0);
  const [guideCount, setGuideCount] = useState(0);
  const [listingCount, setListingCount] = useState(0);
  const [avgBookingValue, setAvgBookingValue] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [bookingsRes, partnersRes, guidesRes, listingsRes] = await Promise.all([
      supabase.from('bookings').select('total_amount, commission_amount'),
      supabase.from('portal_users').select('id', { count: 'exact', head: true }).eq('portal_type', 'partner'),
      supabase.from('guides').select('id', { count: 'exact', head: true }).eq('available', true),
      supabase.from('partner_listings').select('id', { count: 'exact', head: true }),
    ]);

    const bkgs = bookingsRes.data || [];
    const rev = bkgs.reduce((s, b) => s + Number(b.total_amount), 0);
    const comm = bkgs.reduce((s, b) => s + Number(b.commission_amount || 0), 0);
    setTotalRevenue(rev);
    setTotalCommission(comm);
    setBookingCount(bkgs.length);
    setAvgBookingValue(bkgs.length > 0 ? rev / bkgs.length : 0);
    setPartnerCount(partnersRes.count || 0);
    setGuideCount(guidesRes.count || 0);
    setListingCount(listingsRes.count || 0);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-neutral-900">Economic Signals</h1>
        <Button variant="secondary" size="sm" onClick={() => {}}>
          <Download className="w-4 h-4 mr-1.5" />
          Export Data
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-5 bg-rose-50">
          <div className="text-xs text-neutral-500 mb-1">Total Revenue</div>
          <div className="text-2xl font-medium text-neutral-900">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
          <div className="text-xs text-neutral-500 mt-1">All bookings</div>
        </Card>
        <Card className="p-5 bg-blue-50">
          <div className="text-xs text-neutral-500 mb-1">Commission Collected</div>
          <div className="text-2xl font-medium text-neutral-900">${totalCommission.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
          <div className="text-xs text-neutral-500 mt-1">7% platform fee</div>
        </Card>
        <Card className="p-5 bg-emerald-50">
          <div className="text-xs text-neutral-500 mb-1">Avg Booking Value</div>
          <div className="text-2xl font-medium text-neutral-900">${avgBookingValue.toFixed(0)}</div>
        </Card>
        <Card className="p-5 bg-amber-50">
          <div className="text-xs text-neutral-500 mb-1">Total Bookings</div>
          <div className="text-2xl font-medium text-neutral-900">{bookingCount.toLocaleString()}</div>
        </Card>
      </div>

      <Card className="p-5 mb-8 bg-sky-50">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-4 h-4 text-neutral-500" />
          <h3 className="text-sm font-medium text-neutral-900">Economic Indicators</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Total Platform Revenue', value: `$${totalRevenue.toLocaleString()}`, sub: 'From all bookings' },
            { label: 'Platform Commission', value: `$${totalCommission.toLocaleString()}`, sub: '7% commission model' },
            { label: 'Average Booking Value', value: `$${avgBookingValue.toFixed(2)}`, sub: 'Per transaction' },
            { label: 'Active Tourism Partners', value: partnerCount.toString(), sub: 'Registered partners' },
            { label: 'Active Guides & Staff', value: guideCount.toString(), sub: 'Available for tours' },
            { label: 'Total Listings', value: listingCount.toString(), sub: 'Experiences & homestays' },
          ].map(item => (
            <div key={item.label} className="p-4 border border-neutral-200 bg-white rounded-xl">
              <div className="text-xs text-neutral-500 mb-1">{item.label}</div>
              <div className="text-lg font-medium text-neutral-900">{item.value}</div>
              <div className="text-xs text-neutral-400 mt-0.5">{item.sub}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5 bg-teal-50">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-4 h-4 text-neutral-500" />
            <h3 className="text-sm font-medium text-neutral-900">Revenue Breakdown</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-neutral-100">
              <span className="text-neutral-600">Gross Transaction Volume</span>
              <span className="text-neutral-900 font-medium">${totalRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-100">
              <span className="text-neutral-600">Platform Commission (7%)</span>
              <span className="text-neutral-900 font-medium">${totalCommission.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-neutral-600">Provider Earnings</span>
              <span className="text-neutral-900 font-medium">${(totalRevenue - totalCommission).toLocaleString()}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-neutral-50">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-4 h-4 text-neutral-500" />
            <h3 className="text-sm font-medium text-neutral-900">Employment Indicators</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-neutral-100">
              <span className="text-neutral-600">Registered Partners</span>
              <span className="text-neutral-900 font-medium">{partnerCount}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-100">
              <span className="text-neutral-600">Active Guides</span>
              <span className="text-neutral-900 font-medium">{guideCount}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-100">
              <span className="text-neutral-600">Active Listings</span>
              <span className="text-neutral-900 font-medium">{listingCount}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-neutral-600">Total Bookings Processed</span>
              <span className="text-neutral-900 font-medium">{bookingCount}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
