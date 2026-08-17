import { useState } from 'react';
import { Layers, UserRound } from 'lucide-react';
import { ListingsTab } from './local/ListingsTab';
import { HostsTab } from './local/HostsTab';

type LocalTab = 'listings' | 'hosts';

export function LocalPage() {
  const [activeTab, setActiveTab] = useState<LocalTab>('listings');

  const tabs: { id: LocalTab; label: string; icon: typeof Layers }[] = [
    { id: 'listings', label: 'Listings', icon: Layers },
    { id: 'hosts', label: 'Hosts', icon: UserRound },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-neutral-900">Local</h1>
        <p className="text-xs text-neutral-500 mt-0.5">Every experience, homestay &amp; journey listing, and every host, across all partners</p>
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

      {activeTab === 'listings' && <ListingsTab />}
      {activeTab === 'hosts' && <HostsTab />}
    </div>
  );
}
