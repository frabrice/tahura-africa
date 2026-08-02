import { useNavigate } from 'react-router-dom';
import { Building2, Landmark, Shield, ArrowRight, Layers, Globe, BarChart3, Settings, Home } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useState, useEffect } from 'react';

const portals = [
  {
    id: 'partner',
    name: 'Partner Console',
    tagline: 'For tour operators',
    description: 'Manage your listings, bookings, hosts, and earnings. A complete operations suite built for experience providers.',
    path: '/partner/login',
    icon: Building2,
    accent: '#0d9488',
    image: 'https://images.pexels.com/photos/1450353/pexels-photo-1450353.jpeg?auto=compress&cs=tinysrgb&w=900',
  },
  {
    id: 'institution',
    name: 'Institutions Platform',
    tagline: 'For museums & parks',
    description: 'Coordinate visitor programs, guide schedules, and capacity for cultural heritage sites and protected areas.',
    path: '/institution/login',
    icon: Landmark,
    accent: '#b45309',
    image: 'https://images.pexels.com/photos/3380805/pexels-photo-3380805.jpeg?auto=compress&cs=tinysrgb&w=900',
  },
  {
    id: 'government',
    name: 'Government Portal',
    tagline: 'For tourism authorities',
    description: 'Access aggregated tourism insights, regional economic signals, and sector data to inform policy decisions.',
    path: '/government/login',
    icon: Shield,
    accent: '#1d4ed8',
    image: 'https://images.pexels.com/photos/1770775/pexels-photo-1770775.jpeg?auto=compress&cs=tinysrgb&w=900',
  },
];

const ecosystem = [
  { n: '01', label: 'Supply',    icon: Layers,    desc: 'Partners and institutions create and publish offerings to the shared catalog with full scheduling and capacity control.' },
  { n: '02', label: 'Discovery', icon: Globe,     desc: 'Travelers explore, evaluate, communicate, and book. All interactions are visible to the relevant parties in real time.' },
  { n: '03', label: 'Quality',   icon: Settings,  desc: 'The platform monitors thresholds, moderates content, handles disputes, and enforces system rules automatically.' },
  { n: '04', label: 'Insight',   icon: BarChart3, desc: 'Government accesses anonymized aggregated data on patterns and economic signals, without touching operational controls.' },
];

export function Gateway() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-white'}`}
        style={{ borderBottom: scrolled ? '1px solid #e5e7eb' : '1px solid transparent' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo height={32} />
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Explore</span>
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className={`max-w-6xl mx-auto transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="max-w-2xl">
            <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wide uppercase rounded-full bg-neutral-100 text-neutral-500 mb-6">
              B2B Infrastructure
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] text-neutral-900 mb-6">
              Africa's tourism<br />
              <span className="text-neutral-400">infrastructure,</span><br />
              unified.
            </h1>
            <p className="text-lg text-neutral-500 leading-relaxed max-w-xl">
              A single platform connecting operators, institutions, and government agencies through shared data and coordinated operations.
            </p>
          </div>
        </div>
      </section>

      {/* Portal Cards */}
      <section className="pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">Choose your portal</p>
            <h2 className="text-2xl font-bold text-neutral-900">Select your role</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
            {portals.map(portal => {
              const Icon = portal.icon;
              const isHovered = hovered === portal.id;
              return (
                <button
                  key={portal.id}
                  onClick={() => navigate(portal.path)}
                  onMouseEnter={() => setHovered(portal.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="group text-left rounded-2xl overflow-hidden border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
                  style={{
                    borderColor: isHovered ? portal.accent : '#e5e7eb',
                    boxShadow: isHovered ? `0 8px 32px rgba(0,0,0,0.10)` : '0 1px 4px rgba(0,0,0,0.04)',
                    transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
                  }}
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden bg-neutral-100">
                    <img
                      src={portal.image}
                      alt={portal.name}
                      className="w-full h-full object-cover transition-transform duration-500"
                      style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}
                    />
                    {/* Subtle gradient overlay at bottom only */}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.18) 100%)' }} />
                    {/* Accent dot */}
                    <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: portal.accent }} />
                  </div>

                  {/* Content */}
                  <div className="p-5 bg-white">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${portal.accent}14` }}>
                        <Icon className="w-4.5 h-4.5" style={{ color: portal.accent }} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold mb-0.5" style={{ color: portal.accent }}>{portal.tagline}</p>
                        <h3 className="text-sm font-bold text-neutral-900">{portal.name}</h3>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-500 leading-relaxed mb-4">{portal.description}</p>
                    <div className="flex items-center gap-1.5 text-xs font-semibold transition-colors" style={{ color: portal.accent }}>
                      Enter portal
                      <ArrowRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isHovered ? 'translate-x-1' : ''}`} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Operations row */}
          <button
            onClick={() => navigate('/hq/operations-control-room/login')}
            className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-300 transition-all duration-200 text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-200 flex items-center justify-center">
                <Settings className="w-4 h-4 text-neutral-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-700">Operations Control</p>
                <p className="text-xs text-neutral-400">Internal platform management — restricted access</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-1 transition-transform duration-200" />
          </button>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-neutral-100" />

      {/* How It Works */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">Ecosystem</p>
            <h2 className="text-2xl font-bold text-neutral-900">How Tahura flows</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ecosystem.map(step => {
              const Icon = step.icon;
              return (
                <div
                  key={step.label}
                  className="p-6 rounded-2xl border border-neutral-100 bg-neutral-50 hover:border-neutral-200 hover:bg-white transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-2.5 mb-5">
                    <span className="text-xs font-black text-neutral-300 tabular-nums">{step.n}</span>
                    <div className="w-8 h-8 rounded-lg bg-neutral-200 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-neutral-600" />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 mb-2">{step.label}</h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="border-t border-neutral-100">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo height={24} className="opacity-60" />
          <p className="text-xs text-neutral-400 text-center">
            &copy; {new Date().getFullYear()} Tahura. Africa's unified tourism infrastructure.
          </p>
        </div>
      </div>
    </div>
  );
}
