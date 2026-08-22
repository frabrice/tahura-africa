import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { Logo } from '../components/Logo';
import { Calendar, CalendarDays, Wallet, BookOpen, User, Menu, X, LayoutDashboard, ArrowLeftRight, MessageSquare, ChevronRight, FileText, Star } from 'lucide-react';
import { Footer } from '../components/Footer';
import { GuideHomePage } from '../pages/guide/GuideHomePage';
import { getGuideContext, useGuideBookings } from '../lib/useGuideData';
import { useUnreadMessages } from '../lib/useUnreadMessages';
import { useAuth } from '../contexts/AuthContext';
import type { SupportIdentity } from '../components/SupportChatWidget';

const SupportChatWidget = lazy(() => import('../components/SupportChatWidget').then(m => ({ default: m.SupportChatWidget })));
const GuideBookingsPage = lazy(() => import('../pages/guide/GuideBookingsPage').then(m => ({ default: m.GuideBookingsPage })));
const CustomQuoteList = lazy(() => import('../components/CustomQuoteList').then(m => ({ default: m.CustomQuoteList })));
const GuideProgramsPage = lazy(() => import('../pages/guide/GuideProgramsPage').then(m => ({ default: m.GuideProgramsPage })));
const GuideCalendarPage = lazy(() => import('../pages/guide/GuideCalendarPage').then(m => ({ default: m.GuideCalendarPage })));
const GuideReviewsPage = lazy(() => import('../pages/guide/GuideReviewsPage').then(m => ({ default: m.GuideReviewsPage })));
const GuideWalletPage   = lazy(() => import('../pages/guide/GuideWalletPage').then(m => ({ default: m.GuideWalletPage })));
const GuideProfilePage  = lazy(() => import('../pages/guide/GuideProfilePage').then(m => ({ default: m.GuideProfilePage })));
const GuideMessagesPage = lazy(() => import('../pages/guide/GuideMessagesPage').then(m => ({ default: m.GuideMessagesPage })));

const TEAL = '#0d9488';
const TEAL_LIGHT = '#2dd4bf';

export function GuideDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isTraveler } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const guideContext = useMemo(() => getGuideContext(), []);
  const { displayCount: unreadDisplay } = useUnreadMessages('guide', guideContext?.id);
  const { bookings } = useGuideBookings(guideContext?.id);

  useEffect(() => {
    if (!guideContext) {
      navigate(isTraveler ? '/profile' : '/traveler/login', { replace: true });
    }
  }, [guideContext, isTraveler, navigate]);

  const upcomingCount = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return bookings.filter(b => new Date(b.booking_date) >= today && b.status !== 'cancelled').length;
  }, [bookings]);
  const upcomingDisplay = upcomingCount === 0 ? '' : upcomingCount > 9 ? '9+' : upcomingCount.toString();

  if (!guideContext) {
    return null;
  }

  const supportIdentity: SupportIdentity = { role: 'guide', id: guideContext.id, name: guideContext.name || 'Guide', email: guideContext.email || '' };

  const badgeMap: Record<string, string> = {
    '/guide/messages': unreadDisplay,
    '/guide/bookings': upcomingDisplay,
  };

  const navItems = [
    { path: '/guide',          label: 'Dashboard', icon: LayoutDashboard },
    { path: '/guide/bookings', label: 'My Tours',  icon: Calendar },
    { path: '/guide/programs', label: 'Programs',  icon: BookOpen },
    { path: '/guide/calendar', label: 'Calendar',  icon: CalendarDays },
    { path: '/guide/reviews',  label: 'Reviews',   icon: Star },
    { path: '/guide/quotes',   label: 'Quotes',    icon: FileText },
    { path: '/guide/messages', label: 'Messages',  icon: MessageSquare },
    { path: '/guide/wallet',   label: 'Wallet',    icon: Wallet },
    { path: '/guide/profile',  label: 'Profile',   icon: User },
  ];

  const isActive = (path: string) => {
    if (path === '/guide') return location.pathname === '/guide';
    return location.pathname.startsWith(path);
  };

  const guideInitial = (guideContext?.name || 'G').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen" style={{ background: '#f7faf9' }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ background: '#0F0D0B', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="h-16 px-4 md:px-6 flex items-center justify-between max-w-[2000px] mx-auto gap-4">
          <button onClick={() => navigate('/guide')} className="flex items-center gap-3 flex-shrink-0 group">
            <Logo height={28} className="opacity-90 group-hover:opacity-100 transition-opacity" />
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-px h-4 bg-white/[0.12]" />
              <span className="text-xs font-medium text-white/40 tracking-wide">Guide</span>
            </div>
          </button>

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
                  <Icon className="w-4 h-4" style={active ? { color: TEAL_LIGHT } : {}} />
                  {label}
                  {badge && (
                    <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white rounded-full leading-none" style={{ background: TEAL }}>
                      {badge}
                    </span>
                  )}
                  {active && <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full" style={{ background: TEAL }} />}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => navigate('/profile')}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Traveler
            </button>
            {guideContext?.name && (
              <span className="hidden md:block text-sm text-white/50 font-medium truncate max-w-[140px]">{guideContext.name}</span>
            )}
            <button
              onClick={() => navigate('/guide/profile')}
              className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 transition-all"
              style={{ '--tw-ring-color': `${TEAL}60` } as React.CSSProperties}
            >
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm" style={{ background: `linear-gradient(135deg, ${TEAL}, #065f46)` }}>
                {guideInitial}
              </div>
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
                    <Icon className="w-4 h-4" style={active ? { color: TEAL_LIGHT } : {}} />
                    <span className="flex-1 text-left">{label}</span>
                    {badge && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: TEAL }}>{badge}</span>}
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
              <Route index element={<GuideHomePage />} />
              <Route path="bookings" element={<GuideBookingsPage />} />
              <Route path="programs" element={<GuideProgramsPage />} />
              <Route path="calendar" element={<GuideCalendarPage />} />
              <Route path="reviews" element={<GuideReviewsPage />} />
              <Route path="quotes" element={<CustomQuoteList createdBy="guide" attribution={{ guideId: guideContext.id }} />} />
              <Route path="messages" element={<GuideMessagesPage />} />
              <Route path="wallet"   element={<GuideWalletPage />} />
              <Route path="profile"  element={<GuideProfilePage />} />
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
