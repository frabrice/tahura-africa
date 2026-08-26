import { X, MapPin, Clock, Star } from 'lucide-react';

interface Props {
  profile: any;
  programs: any[];
  guides: any[];
  onClose: () => void;
}

export function AttractionPreviewModal({ profile, programs, guides, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-5 py-3.5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-neutral-900">Traveler preview</h3>
            {!profile.published && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium uppercase tracking-wide">
                Unpublished — not visible to travelers
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors">
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        {profile.cover_image && (
          <div className="relative">
            <img src={profile.cover_image} alt="" className="w-full h-56 object-cover" />
            {profile.image_credit && (
              <span className="absolute bottom-1.5 right-2 text-[10px] text-white/80 bg-black/30 px-1.5 py-0.5 rounded">
                {profile.image_credit}
              </span>
            )}
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-1">
            <h2 className="text-xl font-semibold text-neutral-900">{profile.name}</h2>
            <div className="text-sm font-semibold text-neutral-900 flex-shrink-0">
              {profile.entry_fee_is_free ? 'Free entry' : `$${profile.entry_fee_amount} entry`}
            </div>
          </div>
          {profile.tagline && <p className="text-sm text-neutral-500 mb-3">{profile.tagline}</p>}

          <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500 mb-4">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{profile.location}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{profile.opening_time} – {profile.closing_time}</span>
          </div>

          <p className="text-sm text-neutral-700 leading-relaxed mb-6">{profile.description || 'No description provided.'}</p>

          {programs.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">Programs</h3>
              <div className="space-y-2">
                {programs.filter(p => p.active).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-neutral-900">{p.title}</div>
                      <div className="text-xs text-neutral-500">{p.duration_hours}h</div>
                    </div>
                    <div className="text-sm font-medium text-neutral-900">{p.price_per_person > 0 ? `$${p.price_per_person}/person` : 'Free'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {guides.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">Guides</h3>
              <div className="flex flex-wrap gap-2">
                {guides.map(g => (
                  <div key={g.id} className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 rounded-full">
                    {g.profile_picture ? (
                      <img src={g.profile_picture} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center text-[9px] text-neutral-500">{(g.name || '?')[0]}</div>
                    )}
                    <span className="text-xs font-medium text-neutral-800">{g.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {profile.guidelines?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-neutral-900 mb-2">Visitor guidelines</h3>
              <ul className="space-y-1">
                {profile.guidelines.map((g: string) => (
                  <li key={g} className="text-xs text-neutral-600 flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-neutral-400 rounded-full flex-shrink-0" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-1 mt-4 text-xs text-neutral-400">
            <Star className="w-3.5 h-3.5" />
            This is exactly what travelers will see once the attraction is published.
          </div>
        </div>
      </div>
    </div>
  );
}
