import { useState } from 'react';
import { Landmark, UserRound } from 'lucide-react';
import { ManageInstitutionsTab } from './manage/ManageInstitutionsTab';
import { GuidesTab } from './attractions/GuidesTab';

type AttractionsTab = 'attractions' | 'guides';

export function AttractionsPage() {
  const [activeTab, setActiveTab] = useState<AttractionsTab>('attractions');

  const tabs: { id: AttractionsTab; label: string; icon: typeof Landmark }[] = [
    { id: 'attractions', label: 'Attractions', icon: Landmark },
    { id: 'guides', label: 'Guides', icon: UserRound },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-neutral-900">Attractions</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Create and manage parks, museums &amp; sites, and the guides assigned to them.
        </p>
      </div>

      <div className="flex bg-neutral-100 p-1 rounded-lg gap-1 mb-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-md transition-colors ${
                activeTab === tab.id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'attractions' && <ManageInstitutionsTab drillInstitutionId={null} onClearDrill={() => {}} />}
      {activeTab === 'guides' && <GuidesTab />}
    </div>
  );
}

export default AttractionsPage;
