import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';
import { Card } from '../../components/Card';
import {
  Sparkles, Image, Search, TrendingUp, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, Lightbulb, Star, Camera, Tag, Calendar
} from 'lucide-react';

type StudioTab = 'description' | 'photos' | 'keywords' | 'seasonal';

interface Listing {
  id: string;
  title: string;
  description: string | null;
  listing_type: string;
  media: string[];
  tags: string[] | null;
  whats_included: string[] | null;
  pricing: { base_price?: number; currency?: string } | null;
  status: string;
}

const SEASON_TIPS: Record<string, { months: string; title: string; tip: string }> = {
  'Jan–Feb': { months: 'Jan–Feb', title: 'Dry Season Peak', tip: 'Highlight sunshine and outdoor adventures. Perfect for hiking, wildlife, and beach activities. Emphasize guaranteed weather in your description.' },
  'Mar–Apr': { months: 'Mar–Apr', title: 'Shoulder Season', tip: 'Transition period — attract early-bird travelers with slightly lower pricing. Great for photography with lush, green landscapes.' },
  'May–Jun': { months: 'May–Jun', title: 'Low Season Start', tip: 'Offer value deals and package bundles. Lean into intimate, uncrowded experiences as a selling point.' },
  'Jul–Aug': { months: 'Jul–Aug', title: 'School Holidays', tip: 'Family-friendly framing pays off here. Highlight safety, guided tours, and kid-friendly inclusions. Booking lead times shorten — keep availability current.' },
  'Sep–Oct': { months: 'Sep–Oct', title: 'Shoulder Recovery', tip: 'Traveler confidence grows again. Refresh your photos and update your description with any new features or improvements.' },
  'Nov–Dec': { months: 'Nov–Dec', title: 'Festival & Year-End', tip: 'Tie your listing to local festivals, celebrations, and year-end getaways. Gift-style framing ("The perfect holiday escape") converts well.' },
};

const POWER_KEYWORDS = [
  { word: 'authentic', category: 'Trust', impact: 'high' },
  { word: 'locally guided', category: 'Trust', impact: 'high' },
  { word: 'immersive', category: 'Experience', impact: 'high' },
  { word: 'off-the-beaten-path', category: 'Discovery', impact: 'high' },
  { word: 'breathtaking views', category: 'Visual', impact: 'medium' },
  { word: 'private', category: 'Exclusivity', impact: 'high' },
  { word: 'hands-on', category: 'Experience', impact: 'medium' },
  { word: 'sustainable', category: 'Values', impact: 'high' },
  { word: 'award-winning', category: 'Trust', impact: 'medium' },
  { word: 'family-friendly', category: 'Audience', impact: 'medium' },
  { word: 'all-inclusive', category: 'Value', impact: 'high' },
  { word: 'unforgettable', category: 'Emotion', impact: 'medium' },
  { word: 'expert-led', category: 'Trust', impact: 'high' },
  { word: 'flexible', category: 'Convenience', impact: 'medium' },
  { word: 'small group', category: 'Quality', impact: 'high' },
];

const DESCRIPTION_FRAMEWORK = [
  { step: 1, title: 'Hook (1–2 sentences)', tip: 'Open with the transformative moment — what does a traveler feel, see, or do that they cannot anywhere else? Lead with emotion, not logistics.' },
  { step: 2, title: 'The Experience (2–3 sentences)', tip: 'Describe what happens, in sequence. Use sensory language: sounds, smells, textures. Make the reader feel present.' },
  { step: 3, title: 'What Sets You Apart (1–2 sentences)', tip: 'Name your unique differentiator — your host\'s story, a rare location, a private itinerary. This is your competitive moat.' },
  { step: 4, title: 'Practical Details (1–2 sentences)', tip: 'End with clear logistics: group size, duration, key inclusions. Clarity reduces hesitation at the booking step.' },
];

export function ContentStudioPage() {
  const { user } = useAuth();
  const userId = (user as PortalUser)?.id;
  const [activeTab, setActiveTab] = useState<StudioTab>('description');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFramework, setExpandedFramework] = useState<number | null>(null);
  const [selectedListing, setSelectedListing] = useState<string>('all');

  useEffect(() => {
    if (userId) loadListings();
  }, [userId]);

  async function loadListings() {
    setLoading(true);
    const { data } = await supabase
      .from('partner_listings')
      .select('id,title,description,listing_type,media,tags,whats_included,pricing,status')
      .eq('partner_id', userId);
    setListings(data || []);
    setLoading(false);
  }

  const targetListings = selectedListing === 'all' ? listings : listings.filter(l => l.id === selectedListing);

  // Compute per-listing scores for photo and description health
  function descScore(l: Listing) {
    const words = (l.description || '').split(/\s+/).filter(Boolean).length;
    if (words >= 80) return { score: 'strong', pct: 100, label: 'Strong' };
    if (words >= 40) return { score: 'fair', pct: 55, label: 'Fair' };
    if (words >= 15) return { score: 'weak', pct: 25, label: 'Needs work' };
    return { score: 'missing', pct: 5, label: 'Missing' };
  }

  function photoScore(l: Listing) {
    const count = l.media?.length || 0;
    if (count >= 5) return { score: 'strong', pct: 100, label: `${count} photos — great` };
    if (count >= 3) return { score: 'fair', pct: 55, label: `${count} photos — add more` };
    if (count >= 1) return { score: 'weak', pct: 25, label: `Only ${count} photo${count !== 1 ? 's' : ''}` };
    return { score: 'missing', pct: 5, label: 'No photos' };
  }

  const currentMonth = new Date().getMonth(); // 0-indexed
  const currentSeasonKey = Object.keys(SEASON_TIPS)[Math.floor(currentMonth / 2)];
  const currentSeason = SEASON_TIPS[currentSeasonKey];

  const tabs: { id: StudioTab; label: string; icon: any }[] = [
    { id: 'description', label: 'Description Workshop', icon: Sparkles },
    { id: 'photos', label: 'Photo Guidelines', icon: Camera },
    { id: 'keywords', label: 'Discovery Keywords', icon: Search },
    { id: 'seasonal', label: 'Seasonal Strategy', icon: Calendar },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            Content Studio
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">Tools and frameworks to craft listings that convert browsers into bookers</p>
        </div>
        {listings.length > 1 && (
          <select
            value={selectedListing}
            onChange={e => setSelectedListing(e.target.value)}
            className="text-xs border border-neutral-200 rounded-lg px-3 py-2 bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All listings</option>
            {listings.map(l => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${activeTab === t.id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'description' && (
        <div className="space-y-5">
          {/* Listing health overview */}
          {listings.length > 0 && (
            <Card className="p-5 bg-neutral-50">
              <h2 className="text-sm font-semibold text-neutral-900 mb-4">Description Health</h2>
              <div className="space-y-3">
                {targetListings.map(l => {
                  const ds = descScore(l);
                  const words = (l.description || '').split(/\s+/).filter(Boolean).length;
                  return (
                    <div key={l.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-neutral-800 truncate">{l.title}</span>
                          <span className={`text-xs font-medium flex-shrink-0 ml-2 ${ds.score === 'strong' ? 'text-emerald-600' : ds.score === 'fair' ? 'text-amber-600' : 'text-rose-500'}`}>
                            {words} words — {ds.label}
                          </span>
                        </div>
                        <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${ds.score === 'strong' ? 'bg-emerald-500' : ds.score === 'fair' ? 'bg-amber-400' : 'bg-rose-400'}`}
                            style={{ width: `${ds.pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-neutral-400 mt-3">Aim for 80+ words. Listings with rich descriptions see up to 40% more bookings.</p>
            </Card>
          )}

          {/* Framework */}
          <Card className="p-5 bg-neutral-50">
            <h2 className="text-sm font-semibold text-neutral-900 mb-1 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              The 4-Part Description Framework
            </h2>
            <p className="text-xs text-neutral-500 mb-4">Follow this structure to write descriptions that convert. Tap each step for guidance.</p>
            <div className="space-y-2">
              {DESCRIPTION_FRAMEWORK.map(f => (
                <div key={f.step} className="border border-neutral-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedFramework(expandedFramework === f.step ? null : f.step)}
                    className="w-full flex items-center justify-between p-3 bg-white hover:bg-neutral-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                        {f.step}
                      </div>
                      <span className="text-xs font-semibold text-neutral-800">{f.title}</span>
                    </div>
                    {expandedFramework === f.step ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />}
                  </button>
                  {expandedFramework === f.step && (
                    <div className="px-4 pb-4 pt-2 bg-teal-50 border-t border-teal-100">
                      <p className="text-xs text-teal-800 leading-relaxed">{f.tip}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Example */}
          <Card className="p-5 bg-neutral-50">
            <h2 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              Example: Before & After
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-xs font-semibold text-rose-700">Weak</span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed italic">
                  "We offer a nice village homestay experience. You will sleep in a traditional house and eat local food. The host is friendly. Nearby there are some attractions."
                </p>
              </div>
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-700">Strong</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed italic">
                  "Wake to the sound of a wood-fire kitchen and the smell of fresh mandazi — this is your morning in Mama Zawadi's homestead. Spend three days learning to cook, farm, and live as the community does, guided by a family that has called this valley home for four generations. Unlike resort stays, you sleep in a hand-built mud house and share every meal at the family table. Groups of 2–6, all meals included."
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'photos' && (
        <div className="space-y-5">
          {/* Photo health */}
          {listings.length > 0 && (
            <Card className="p-5 bg-neutral-50">
              <h2 className="text-sm font-semibold text-neutral-900 mb-4">Photo Coverage</h2>
              <div className="space-y-3">
                {targetListings.map(l => {
                  const ps = photoScore(l);
                  return (
                    <div key={l.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-neutral-800 truncate">{l.title}</span>
                          <span className={`text-xs font-medium flex-shrink-0 ml-2 ${ps.score === 'strong' ? 'text-emerald-600' : ps.score === 'fair' ? 'text-amber-600' : 'text-rose-500'}`}>
                            {ps.label}
                          </span>
                        </div>
                        <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${ps.score === 'strong' ? 'bg-emerald-500' : ps.score === 'fair' ? 'bg-amber-400' : 'bg-rose-400'}`}
                            style={{ width: `${ps.pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-neutral-400 mt-3">Listings with 5+ photos receive 3x more clicks than those with 1–2 photos.</p>
            </Card>
          )}

          {/* Shot list */}
          <Card className="p-5 bg-neutral-50">
            <h2 className="text-sm font-semibold text-neutral-900 mb-1 flex items-center gap-2">
              <Camera className="w-4 h-4 text-neutral-500" />
              The Essential Shot List
            </h2>
            <p className="text-xs text-neutral-500 mb-4">Every listing should have these 7 types of photos.</p>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                { num: 1, shot: 'The Hero Shot', desc: 'Your best, most dramatic image — the one that stops the scroll. A wide landscape, a joyful group, or a striking cultural moment. This is your cover photo.' },
                { num: 2, shot: 'The Welcome Moment', desc: 'Capture the host or guide greeting guests. Human-to-human connection builds instant trust. Smile, eye contact, warmth.' },
                { num: 3, shot: 'The Activity in Action', desc: 'Show the core experience mid-moment — not staged. Cooking, hiking, exploring. Movement beats posed every time.' },
                { num: 4, shot: 'The Detail Shot', desc: 'A carved door, a dish of food, a woven textile, tools on a shelf. Details say "this is real" when wide shots cannot.' },
                { num: 5, shot: 'The Sleeping Space', desc: 'For homestays: a clean, natural-light shot of the bedroom. Essential for trust. Style it simply — remove clutter.' },
                { num: 6, shot: 'The Landscape / Setting', desc: 'Where is this? Establish the surroundings — the village, the valley, the beach. Context helps travelers visualise the journey.' },
                { num: 7, shot: 'The Guest Reaction', desc: 'A candid of guests laughing, discovering, or relaxing. Social proof in image form. Always the best converter.' },
              ].map(s => (
                <div key={s.num} className="flex gap-3 p-3 bg-white rounded-lg border border-neutral-100">
                  <div className="w-6 h-6 rounded-full bg-neutral-900 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">{s.num}</div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-900 mb-0.5">{s.shot}</div>
                    <p className="text-xs text-neutral-500 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Technical tips */}
          <Card className="p-5 bg-neutral-50">
            <h2 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
              <Image className="w-4 h-4 text-neutral-500" />
              Technical Tips
            </h2>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                { title: 'Shoot in golden hour', tip: 'The hour after sunrise or before sunset produces warm, flattering light at no cost. Avoid harsh midday sun.' },
                { title: 'Landscape orientation', tip: 'Upload horizontal (16:9 or 4:3) images. They display best on all screens and in search results.' },
                { title: 'No filters needed', tip: 'Authentic beats over-edited. Slightly increase brightness and contrast in native phone tools — that is enough.' },
                { title: 'Clean the frame', tip: 'Remove plastic bags, power cords, and clutter before shooting. One minute of prep saves a weak photo.' },
                { title: 'Minimum resolution', tip: 'Aim for 1920×1080px minimum. A blurry photo signals low quality to potential travelers.' },
                { title: 'Show the people', tip: 'Empty spaces feel cold. Even 1 person in a wide shot gives travellers a scale reference and emotional anchor.' },
              ].map(t => (
                <div key={t.title} className="p-3 bg-white rounded-lg border border-neutral-100">
                  <div className="text-xs font-semibold text-neutral-900 mb-1">{t.title}</div>
                  <p className="text-xs text-neutral-500 leading-relaxed">{t.tip}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'keywords' && (
        <div className="space-y-5">
          {/* Tags health */}
          {listings.length > 0 && (
            <Card className="p-5 bg-neutral-50">
              <h2 className="text-sm font-semibold text-neutral-900 mb-4">Tag Coverage</h2>
              <div className="space-y-3">
                {targetListings.map(l => {
                  const tagCount = l.tags?.length || 0;
                  const pct = tagCount >= 5 ? 100 : tagCount >= 3 ? 65 : tagCount >= 1 ? 30 : 5;
                  const label = tagCount >= 5 ? 'Strong' : tagCount >= 3 ? 'Add more' : tagCount >= 1 ? `Only ${tagCount} tag${tagCount !== 1 ? 's' : ''}` : 'No tags';
                  const color = tagCount >= 5 ? 'bg-emerald-500' : tagCount >= 3 ? 'bg-amber-400' : 'bg-rose-400';
                  return (
                    <div key={l.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-neutral-800 truncate">{l.title}</span>
                          <span className={`text-xs font-medium flex-shrink-0 ml-2 ${tagCount >= 5 ? 'text-emerald-600' : tagCount >= 3 ? 'text-amber-600' : 'text-rose-500'}`}>
                            {label}
                          </span>
                        </div>
                        <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                        {l.tags && l.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {l.tags.map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded-full">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-neutral-400 mt-3">Use 5+ tags per listing to maximise search discovery across all traveler filters.</p>
            </Card>
          )}

          {/* Power keywords */}
          <Card className="p-5 bg-neutral-50">
            <h2 className="text-sm font-semibold text-neutral-900 mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-neutral-500" />
              High-Impact Keywords
            </h2>
            <p className="text-xs text-neutral-500 mb-4">These words consistently appear in top-performing listings. Use them naturally in your description and tags.</p>
            <div className="flex flex-wrap gap-2">
              {POWER_KEYWORDS.map(k => (
                <div
                  key={k.word}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${k.impact === 'high' ? 'bg-teal-50 border-teal-200 text-teal-800' : 'bg-neutral-50 border-neutral-200 text-neutral-700'}`}
                >
                  {k.impact === 'high' && <Star className="w-3 h-3 text-teal-500" />}
                  <span>{k.word}</span>
                  <span className={`text-xs ${k.impact === 'high' ? 'text-teal-500' : 'text-neutral-400'}`}>· {k.category}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-neutral-400 mt-3">
              <Star className="w-3 h-3 inline text-teal-500 mr-1" />
              = highest conversion impact
            </p>
          </Card>

          {/* Tag strategy */}
          <Card className="p-5 bg-neutral-50">
            <h2 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-neutral-500" />
              Tag Strategy by Listing Type
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  type: 'Experience', tags: ['cultural immersion', 'local guide', 'hands-on', 'small group', 'off-the-beaten-path', 'photography', 'wildlife', 'adventure'],
                  tip: 'Lead with the activity type, then the setting, then the vibe. Travelers search "what + where + how".'
                },
                {
                  type: 'Homestay', tags: ['authentic', 'home-cooked meals', 'family stay', 'private room', 'local life', 'peaceful', 'off-grid', 'sustainable'],
                  tip: 'Comfort words matter here — "clean", "private", "welcoming". Include meals and room details as tags.'
                },
                {
                  type: 'Attraction', tags: ['must-see', 'UNESCO', 'history', 'panoramic view', 'entrance included', 'guided tour', 'iconic', 'skip-the-line'],
                  tip: 'Use landmark names and recognizable descriptors. Travelers are searching by name, not concept.'
                },
                {
                  type: 'Itinerary', tags: ['multi-day', 'all-inclusive', 'curated', 'flexible', 'private tour', 'hidden gems', 'expert-led', 'bespoke'],
                  tip: 'Highlight the length and format first. Travelers choosing itineraries want certainty — show them you have planned everything.'
                },
              ].map(s => (
                <div key={s.type} className="p-4 bg-white rounded-lg border border-neutral-100">
                  <div className="text-xs font-semibold text-neutral-900 mb-2">{s.type}</div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {s.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded-full">{tag}</span>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed">{s.tip}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'seasonal' && (
        <div className="space-y-5">
          {/* Current season spotlight */}
          {currentSeason && (
            <div className="p-5 rounded-xl bg-gradient-to-br from-teal-600 to-teal-800 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-teal-200" />
                <span className="text-xs font-semibold text-teal-200 uppercase tracking-wide">Now — {currentSeason.months}</span>
              </div>
              <h2 className="text-base font-semibold mb-2">{currentSeason.title}</h2>
              <p className="text-sm text-teal-100 leading-relaxed">{currentSeason.tip}</p>
            </div>
          )}

          {/* All seasons */}
          <Card className="p-5 bg-neutral-50">
            <h2 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-neutral-400" />
              Year-Round Strategy Calendar
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {Object.values(SEASON_TIPS).map(s => {
                const isCurrent = s.months === currentSeason?.months;
                return (
                  <div key={s.months} className={`p-4 rounded-lg border ${isCurrent ? 'bg-teal-50 border-teal-200' : 'bg-white border-neutral-100'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
                      <span className={`text-xs font-semibold ${isCurrent ? 'text-teal-700' : 'text-neutral-500'}`}>{s.months}</span>
                      <span className={`text-xs font-medium ${isCurrent ? 'text-teal-900' : 'text-neutral-800'}`}>— {s.title}</span>
                    </div>
                    <p className={`text-xs leading-relaxed ${isCurrent ? 'text-teal-700' : 'text-neutral-500'}`}>{s.tip}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Seasonal pricing tips */}
          <Card className="p-5 bg-neutral-50">
            <h2 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-neutral-500" />
              Seasonal Pricing Principles
            </h2>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                { title: 'Raise prices before peak, not during', tip: 'Increase rates 4–6 weeks before your busiest season. Travelers who plan ahead expect premium — and they pay it.' },
                { title: 'Discount off-peak, not the product', tip: 'Frame low-season rates as exclusive access, not a discount. "Private experience at an exceptional rate" beats "20% off".' },
                { title: 'Bundle for value, not just price', tip: 'In slow seasons, add inclusions (transfers, a meal, an extra activity) before cutting price. It protects your perceived value.' },
              ].map(t => (
                <div key={t.title} className="p-4 bg-white rounded-lg border border-neutral-100">
                  <div className="text-xs font-semibold text-neutral-900 mb-1">{t.title}</div>
                  <p className="text-xs text-neutral-500 leading-relaxed">{t.tip}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
