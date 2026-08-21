import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { Logo } from '../components/Logo';
import { Calendar, MessageSquare, Wallet, Package, User, Menu, X, LayoutDashboard, ArrowLeftRight, ChevronRight, FileText } from 'lucide-react';
import { Footer } from '../components/Footer';
import { HostHomePage } from '../pages/host/HostHomePage';
import { useUnreadMessages } from '../lib/useUnreadMessages';
import { useHostBookings } from '../lib/useHostData';
import { useAuth } from '../contexts/AuthContext';
import type { SupportIdentity } from '../components/SupportChatWidget';

const SupportChatWidget = lazy(() => import('../components/SupportChatWidget').then(m => ({ default: m.SupportChatWidget })));
const HostBookingsPage = lazy(() => import('../pages/host/HostBookingsPage').then(m => ({ default: m.HostBookingsPage })));
const CustomQuoteList = lazy(() => import('../components/CustomQuoteList').then(m => ({ default: m.CustomQuoteList })));
const HostMessagesPage = lazy(() => import('../pages/host/HostMessagesPage').then(m => ({ default: m.HostMessagesPage })));
const HostWalletPage   = lazy(() => import('../pages/host/HostWalletPage').then(m => ({ default: m.HostWalletPage })));
const HostListingsPage = lazy(() => import('../pages/host/HostListingsPage').then(m => ({ default: m.HostListingsPage })));
const HostProfilePage  = lazy(() => import('../pages/host/HostProfilePage').then(m => ({ default: m.HostProfilePage })));

interface HostContext {
  id: string;
  name: string;
  partner_id: string;
  profile_picture?: string;
  email?: string;
}

export function getHostContext(): HostContext | null {
  try {
    const stored = localStorage.getItem('hostContext');
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

export function HostDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isTraveler } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const hostContext = useMemo(() => getHostContext(), []);
  const { displayCount: unreadDisplay } = useUnreadMessages('host', hostContext?.id);
  const { bookings } = useHostBookings(hostContext?.id);

  useEffect(() => {
    if (!hostContext) {
      navigate(isTraveler ? '/profile' : '/traveler/login', { replace: true });
    }
  }, [hostContext, isTraveler, navigate]);

  const upcomingCount = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return bookings.filter(b => new Date(b.booking_date) >= today && b.status !== 'cancelled').length;
  }, [bookings]);
  const upcomingDisplay = upcomingCount === 0 ? '' : upcomingCount > 9 ? '9+' : upcomingCount.toString();

  if (!hostContext) {
    return null;
  }

  const supportIdentity: SupportIdentity = { role: 'host', id: hostContext.id, name: hostContext.name || 'Host', email: hostContext.email || '' };

  const badgeMap: Record<string, string> = {
    '/host/messages': unreadDisplay,
    '/host/bookings': upcomingDisplay,
  };

  const navItems = [
    { path: '/host',          label: 'Dashboard', icon: LayoutDashboard },
    { path: '/host/bookings', label: 'Bookings',  icon: Calendar },
    { path: '/host/messages', label: 'Messages',  icon: MessageSquare },
    { path: '/host/wallet',   label: 'Wallet',    icon: Wallet },
    { path: '/host/listings', label: 'Listings',  icon: Package },
    { path: '/host/quotes',   label: 'Quotes',    icon: FileText },
    { path: '/host/profile',  label: 'Profile',   icon: User },
  ];

  const isActive = (path: string) => {
    if (path === '/host') return location.pathname === '/host';
    return location.pathname.startsWith(path);
  };

  const hostInitial = (hostContext?.name || 'H').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen" style={{ background: '#faf9f7' }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ background: '#0F0D0B', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="h-16 px-4 md:px-6 flex items-center justify-between max-w-[2000px] mx-auto gap-4">
          {/* Logo */}
          <button onClick={() => navigate('/host')} className="flex items-center gap-3 flex-shrink-0 group">
            <Logo height={28} className="opacity-90 group-hover:opacity-100 transition-opacity" />
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-px h-4 bg-white/[0.12]" />
              <span className="text-xs font-medium text-white/40 tracking-wide">Host</span>
            </div>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => {
              const badge = badgeMap[path] || '';
              const active = isActive(path);
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active ? 'text-white bg-white/[0.1]' : 'text-white/45 hover:text-white/80 hover:bg-white/[0.06]'}`}
                >
                  <Icon className="w-4 h-4" style={active ? { color: '#E8B86D' } : {}} />
                  {label}
                  {badge && (
                    <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-copper-500 text-white rounded-full leading-none" style={{ background: '#C4883A' }}>
                      {badge}
                    </span>
                  )}
                  {active && <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full" style={{ background: '#C4883A' }} />}
                </button>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => navigate('/profile')}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Traveler
            </button>

            {hostContext?.name && (
              <span className="hidden md:block text-sm text-white/50 font-medium truncate max-w-[140px]">
                {hostContext.name}
              </span>
            )}

            <button
              onClick={() => navigate('/host/profile')}
              className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-copper-500/40 hover:ring-copper-500/80 transition-all"
            >
              {hostContext?.profile_picture ? (
                <img src={hostContext.profile_picture} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg, #C4883A, #8B3A1E)' }}>
                  {hostInitial}
                </div>
              )}
            </button>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMenuOpen(false)} />
          <div className="fixed top-16 right-0 bottom-0 w-72 z-50 lg:hidden" style={{ background: '#0F0D0B', borderLeft: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="p-3 pt-4">
              {navItems.map(({ path, label, icon: Icon }) => {
                const badge = badgeMap[path] || '';
                const active = isActive(path);
                return (
                  <button
                    key={path}
                    onClick={() => { navigate(path); setMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-0.5 text-sm font-medium transition-all ${active ? 'text-white bg-white/[0.08]' : 'text-white/45 hover:text-white/75 hover:bg-white/[0.05]'}`}
                  >
                    <Icon className="w-4 h-4" style={active ? { color: '#E8B86D' } : {}} />
                    <span className="flex-1 text-left">{label}</span>
                    {badge && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: '#C4883A' }}>{badge}</span>}
                    <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                  </button>
                );
              })}
              <div className="border-t border-white/[0.07] my-3" />
              <button
                onClick={() => { navigate('/profile'); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/45 hover:text-white/75 hover:bg-white/[0.05] transition-all"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Switch to Traveler
              </button>
            </div>
          </div>
        </>
      )}

      {/* Content */}
      <div className="pt-16">
        <main className="max-w-[2000px] mx-auto min-h-screen">
          <Suspense fallback={
            <div className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl skeleton-shimmer" />
              ))}
            </div>
          }>
            <Routes>
              <Route index element={<HostHomePage />} />
              <Route path="bookings"  element={<HostBookingsPage />} />
              <Route path="messages"  element={<HostMessagesPage />} />
              <Route path="wallet"    element={<HostWalletPage />} />
              <Route path="listings"  element={<HostListingsPage />} />
              <Route path="quotes"    element={<CustomQuoteList createdBy="host" attribution={{ hostId: hostContext.id, partnerId: hostContext.partner_id }} />} />
              <Route path="profile"   element={<HostProfilePage />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>

      <Suspense fallback={null}>
        <SupportChatWidget identity={supportIdentity} />
      </Suspense>
    </div>
  );
}
