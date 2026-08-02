import { useNavigate } from 'react-router-dom';
import { ChevronDown, Home } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Logo } from './Logo';

interface PortalSwitcherProps {
  currentPortal: string;
}

const portals = [
  { id: 'gateway',     name: 'Tahura Gateway',       path: '/gateway',     dot: '#C4883A' },
  { id: 'partner',     name: 'Partner Console',       path: '/partner',     dot: '#0d9488' },
];

export function PortalSwitcher({ currentPortal }: PortalSwitcherProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const current = portals.find((p) => p.id === currentPortal) || portals[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-neutral-200">
      <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
        {/* Left: logo + portal switcher */}
        <div className="flex items-center gap-5">
          <button
            onClick={() => navigate('/gateway')}
            className="flex items-center gap-2 group"
          >
            <Logo
              height={28}
              alt="Tahura"
              className="h-7 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity"
            />
          </button>

          <div className="w-px h-4 bg-neutral-200" />

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 hover:bg-neutral-100"
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: current.dot }} />
              <span className="text-xs font-medium text-neutral-600 tracking-wide">{current.name}</span>
              <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-56 rounded-xl overflow-hidden animate-fade-up bg-white border border-neutral-200 shadow-lg">
                <div className="p-1">
                  {portals.map((portal) => (
                    <button
                      key={portal.id}
                      onClick={() => { navigate(portal.path); setIsOpen(false); }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-center gap-3 transition-all duration-150 ${
                        portal.id === currentPortal
                          ? 'text-neutral-900 bg-neutral-100 font-semibold'
                          : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: portal.dot }} />
                      <span className="font-medium">{portal.name}</span>
                      {portal.id === currentPortal && (
                        <span className="ml-auto text-[10px] text-neutral-400 font-medium">Current</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: back to traveler */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-all duration-200"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Back to Explore</span>
        </button>
      </div>
    </div>
  );
}
