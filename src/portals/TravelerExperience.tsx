import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { useState, lazy, Suspense, useEffect } from 'react';
import { Heart, Calendar, MessageSquare, User, Menu, Compass, Landmark, LogOut, LifeBuoy, X, ChevronRight, Map, UserPlus } from 'lucide-react';
import { Logo } from '../components/Logo';
import { PageTransition } from '../components/PageTransition';
import { useAuth } from '../contexts/AuthContext';
import type { TravelerUser } from '../lib/auth';
import { Footer } from '../components/Footer';
import { ExplorePage } from '../pages/traveler/ExplorePage';

function JourneyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="6" r="2" />
      <path d="M5 16C5 12 8 10 12 10s7-2 7-6" />
      <path d="M5 9l2-2-2-2" />
      <path d="M19 13l-2 2 2 2" />
    </svg>
  );
}

const SavedPage = lazy(() => import('../pages/traveler/SavedPage').then(m => ({ default: m.SavedPage })));
const MessagesPage = lazy(() => import('../pages/traveler/MessagesPage').then(m => ({ default: m.MessagesPage })));
const BookingsPage = lazy(() => import('../pages/traveler/BookingsPage').then(m => ({ default: m.BookingsPage })));
const ProfilePage = lazy(() => import('../pages/traveler/ProfilePage').then(m => ({ default: m.ProfilePage })));
const ExperienceDetailPage = lazy(() => import('../pages/traveler/ExperienceDetailPage').then(m => ({ default: m.ExperienceDetailPage })));
const HomestayDetailPage = lazy(() => import('../pages/traveler/HomestayDetailPage').then(m => ({ default: m.HomestayDetailPage })));
const AttractionDetailPage = lazy(() => import('../pages/traveler/AttractionDetailPage').then(m => ({ default: m.AttractionDetailPage })));
const HostDetailPage = lazy(() => import('../pages/traveler/HostDetailPage').then(m => ({ default: m.HostDetailPage })));
const HelpSupportPage = lazy(() => import('../pages/traveler/HelpSupportPage').then(m => ({ default: m.HelpSupportPage })));
const HelpArticlePage = lazy(() => import('../pages/traveler/HelpArticlePage').then(m => ({ default: m.HelpArticlePage })));
const MyTicketsPage = lazy(() => import('../pages/traveler/MyTicketsPage').then(m => ({ default: m.MyTicketsPage })));
const TermsOfServicePage = lazy(() => import('../pages/traveler/TermsOfServicePage').then(m => ({ default: m.TermsOfServicePage })));
const PrivacyPolicyPage = lazy(() => import('../pages/traveler/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const PaymentCallbackPage = lazy(() => import('../pages/traveler/PaymentCallbackPage').then(m => ({ default: m.PaymentCallbackPage })));
const ItineraryDetailPage = lazy(() => import('../pages/traveler/ItineraryDetailPage').then(m => ({ default: m.ItineraryDetailPage })));
const MapPage = lazy(() => import('../pages/traveler/MapPage').then(m => ({ default: m.MapPage })));
const BecomeALocalPage = lazy(() => import('../pages/traveler/BecomeALocalPage').then(m => ({ default: m.BecomeALocalPage })));

export function TravelerExperience() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isTraveler, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'local' | 'journeys' | 'attractions'>('local');
  const [scrolled, setScrolled] = useState(false);

  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleTabChange = (tab: 'local' | 'journeys' | 'attractions') => {
    setActiveTab(tab);
  };

  const travelerUser = (isAuthenticated && isTraveler && user) ? user as TravelerUser : null;
  const initials = travelerUser?.full_name
    ? travelerUser.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : null;
  const firstName = travelerUser?.full_name?.split(' ')[0] || null;

  const headerBase = isHomePage && !scrolled
    ? 'bg-white/95 backdrop-blur-sm border-b border-stone-100/80'
    : 'bg-white border-b border-stone-200';

  const menuItems = [
    { icon: Heart, label: 'Saved', path: '/saved', color: 'text-rose-500' },
    { icon: Calendar, label: 'My Trips', path: '/trips', color: 'text-amber-600' },
    { icon: MessageSquare, label: 'Messages', path: '/messages', color: 'text-sky-500' },
    { icon: Map, label: 'Map', path: '/map', color: 'text-teal-500' },
    { icon: UserPlus, label: 'Become a Local', path: '/become-a-local', color: 'text-orange-500' },
    { icon: LifeBuoy, label: 'Help & Support', path: '/help-support', color: 'text-emerald-600' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerBase}`}>
        <div className="h-16 md:h-[4.5rem] px-4 md:px-8 flex items-center justify-between max-w-[1920px] mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center group flex-shrink-0"
          >
            <Logo
              height={28}
              className="md:h-8 transition-opacity duration-200 group-hover:opacity-75"
            />
          </button>

          {isHomePage && (
            <nav className="hidden lg:flex items-center gap-1">
              {(['local', 'journeys', 'attractions'] as const).map((tab) => {
                const isActive = activeTab === tab;
                const icons = { local: Compass, journeys: JourneyIcon, attractions: Landmark };
                const colors = { local: 'text-orange-500', journeys: 'text-green-600', attractions: 'text-sky-500' };
                const Icon = icons[tab];
                return (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg ${
                      isActive
                        ? 'text-stone-900 bg-stone-50'
                        : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50/70'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? colors[tab] : 'text-stone-400'} transition-colors duration-200`} />
                    <span className="capitalize">{tab}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          <div className="flex items-center gap-2 md:gap-3">
            {!isAuthenticated && (
              <button
                onClick={() => navigate('/traveler/login')}
                className="hidden md:block text-sm text-stone-600 hover:text-stone-900 px-4 py-2 font-medium transition-colors duration-200 rounded-lg hover:bg-stone-50"
              >
                Sign in
              </button>
            )}
            {firstName && (
              <span className="hidden md:inline-block text-sm font-medium text-stone-600">
                {firstName}
              </span>
            )}

            <button
              onClick={() => navigate('/become-a-local')}
              className="hidden md:flex items-center gap-1.5 text-[13px] font-semibold text-orange-700 px-4 py-2 rounded-full bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80 hover:border-orange-300 hover:from-orange-100 hover:to-amber-100 hover:shadow-warm-sm transition-all duration-200"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Become a Local
            </button>

            <button
              onClick={() => isAuthenticated ? navigate('/profile') : navigate('/traveler/login')}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 via-amber-400 to-green-500 p-px hover:scale-105 transition-transform duration-200 shadow-sm"
            >
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                {travelerUser?.profile_picture ? (
                  <img src={travelerUser.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                ) : initials ? (
                  <span className="text-xs font-bold text-stone-700">{initials}</span>
                ) : (
                  <User className="w-4 h-4 text-stone-500" />
                )}
              </div>
            </button>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-all duration-200 ${
                menuOpen
                  ? 'bg-stone-900 border-stone-900 text-white'
                  : 'border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed top-0 right-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100">
              <Logo height={28} />
              <button
                onClick={() => setMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {travelerUser && (
              <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 via-amber-400 to-green-500 p-px flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                      {travelerUser.profile_picture ? (
                        <img src={travelerUser.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-stone-700">{initials}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{travelerUser.full_name}</p>
                    <p className="text-xs text-stone-500">{travelerUser.email}</p>
                  </div>
                </div>
              </div>
            )}

            {isHomePage && (
              <div className="px-5 py-3 border-b border-stone-100 lg:hidden">
                <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-2">Browse</p>
                <div className="space-y-0.5">
                  {(['local', 'journeys', 'attractions'] as const).map((tab) => {
                    const icons = { local: Compass, journeys: JourneyIcon, attractions: Landmark };
                    const colors = { local: 'text-orange-500', journeys: 'text-green-600', attractions: 'text-sky-500' };
                    const Icon = icons[tab];
                    return (
                      <button
                        key={tab}
                        onClick={() => { handleTabChange(tab); setMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                          activeTab === tab ? 'bg-stone-100 text-stone-900 font-medium' : 'text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${colors[tab]}`} />
                        <span className="capitalize">{tab}</span>
                        {activeTab === tab && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex-1 px-5 py-3 space-y-0.5 overflow-y-auto">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-2">Account</p>
              {menuItems.map(({ icon: Icon, label, path, color }) => (
                <button
                  key={path}
                  onClick={() => { navigate(path); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-all group"
                >
                  <Icon className={`w-4 h-4 ${color} transition-colors`} />
                  <span>{label}</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto text-stone-300 group-hover:text-stone-400 transition-colors" />
                </button>
              ))}
              <div className="pt-2 border-t border-stone-100 mt-2">
                <button
                  onClick={() => { navigate(isAuthenticated ? '/profile' : '/traveler/login'); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-all group"
                >
                  <User className="w-4 h-4 text-stone-400" />
                  <span>{isAuthenticated ? 'Profile' : 'Sign in'}</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto text-stone-300 group-hover:text-stone-400 transition-colors" />
                </button>
                {!isAuthenticated && (
                  <button
                    onClick={() => { navigate('/traveler/signup'); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 transition-all mt-1"
                  >
                    <User className="w-4 h-4" />
                    <span>Create account</span>
                  </button>
                )}
              </div>
            </div>

            {isAuthenticated && (
              <div className="px-5 py-4 border-t border-stone-100">
                <button
                  onClick={() => { logout(); setMenuOpen(false); navigate('/'); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <div className="pt-16 md:pt-[4.5rem]">
        <main className="max-w-[1920px] mx-auto min-h-screen">
          <Suspense fallback={
            <div className="p-6 md:p-8 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 bg-stone-100 rounded-xl skeleton-shimmer" />
              ))}
            </div>
          }>
            <Routes>
              <Route index element={<PageTransition><ExplorePage activeTab={activeTab} onTabChange={handleTabChange} /></PageTransition>} />
              <Route path="saved" element={<PageTransition><SavedPage /></PageTransition>} />
              <Route path="trips" element={<PageTransition><BookingsPage /></PageTransition>} />
              <Route path="messages" element={<PageTransition><MessagesPage /></PageTransition>} />
              <Route path="profile" element={<PageTransition><ProfilePage /></PageTransition>} />
              <Route path="experience/:id" element={<PageTransition><ExperienceDetailPage /></PageTransition>} />
              <Route path="homestay/:id" element={<PageTransition><HomestayDetailPage /></PageTransition>} />
              <Route path="attraction/:id" element={<PageTransition><AttractionDetailPage /></PageTransition>} />
              <Route path="hosts/:id" element={<PageTransition><HostDetailPage /></PageTransition>} />
              <Route path="help-support" element={<PageTransition><HelpSupportPage /></PageTransition>} />
              <Route path="help-support/:slug" element={<PageTransition><HelpArticlePage /></PageTransition>} />
              <Route path="my-tickets" element={<PageTransition><MyTicketsPage /></PageTransition>} />
              <Route path="terms-of-service" element={<PageTransition><TermsOfServicePage /></PageTransition>} />
              <Route path="privacy-policy" element={<PageTransition><PrivacyPolicyPage /></PageTransition>} />
              <Route path="payment/callback" element={<PageTransition><PaymentCallbackPage /></PageTransition>} />
              <Route path="itinerary/:id" element={<PageTransition><ItineraryDetailPage /></PageTransition>} />
              <Route path="map" element={<PageTransition><MapPage /></PageTransition>} />
              <Route path="become-a-local" element={<PageTransition><BecomeALocalPage /></PageTransition>} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  );
}
