import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, CurrentUser, UserType, TravelerUser, PortalUser, toPortalUser } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { sendEmail } from '../lib/sendEmail';
import type { Session } from '@supabase/supabase-js';

// Email/password signup already sends welcome_traveler explicitly
// (SignupPage.tsx) at signup time, before any session/SIGNED_IN event
// exists (email confirmation blocks session creation until they verify).
// OAuth providers (Google) never go through that code path at all — the
// button just redirects straight to signInWithOAuth — so this is the
// only place a first-time OAuth signup can be detected. There's no
// "isNewUser" flag on the client session, so this infers it from the
// account having just been created (via signInWithOAuth) within the
// last minute; a returning OAuth login's created_at will be from the
// past, so this only fires once per account.
function isBrandNewOAuthSession(session: Session): boolean {
  const provider = session.user.app_metadata?.provider;
  if (!provider || provider === 'email') return false;
  const createdAt = new Date(session.user.created_at).getTime();
  return Date.now() - createdAt < 60_000;
}

// A Supabase Auth session could belong to either a traveler or an
// invite-based portal account (partner/operations). Portal accounts are
// checked first — if the session's auth_user_id links to an active
// portal_users row, it's a portal login, not a traveler one. Without this
// check, every newly-invited partner/admin would be silently misclassified
// as a traveler the instant they signed in.
// A password-recovery link makes Supabase establish a real session client-side
// so the app can call updateUser({ password }) - but that session must never be
// treated as a normal login, or the reset-password page gets skipped entirely
// and the user is just silently signed in. Supabase leaves `type=recovery` in
// the URL hash until something consumes it, so that's the signal to check.
function isPasswordRecoveryLink(): boolean {
  return window.location.hash.includes('type=recovery');
}

async function classifySupabaseSession(
  session: Session
): Promise<{ type: 'portal'; user: PortalUser } | { type: 'traveler'; user: TravelerUser }> {
  const { data: portalRow } = await supabase
    .from('portal_users')
    .select('id, portal_type, email, user_id_code, name, phone, contact_person, country, province, specific_location, specialty, tags, is_active')
    .eq('auth_user_id', session.user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (portalRow) {
    return { type: 'portal', user: toPortalUser(portalRow) };
  }

  const traveler: TravelerUser = {
    id: session.user.id,
    email: session.user.email!,
    full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
    phone: session.user.user_metadata?.phone,
    profile_picture: session.user.user_metadata?.avatar_url || session.user.user_metadata?.profile_picture,
    bio: session.user.user_metadata?.bio,
    date_of_birth: session.user.user_metadata?.date_of_birth,
    nationality: session.user.user_metadata?.nationality,
  };
  return { type: 'traveler', user: traveler };
}

interface AuthContextType {
  user: CurrentUser | null;
  userType: UserType | null;
  isAuthenticated: boolean;
  isTraveler: boolean;
  isPortalUser: (portalType?: string) => boolean;
  login: (type: UserType, user: CurrentUser) => void;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [userType, setUserType] = useState<UserType | null>(null);

  // A recovery link can land on ANY page: links sent from the Supabase dashboard
  // (or an app link whose redirect isn't allow-listed) carry no redirect_to, so
  // they arrive at the site root. Whenever one shows up, send the person to the
  // reset-password page - keeping the hash so the page can still tell it's a
  // recovery session.
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  // An expired or already-used email link arrives as an error in the URL hash and
  // would otherwise just show the home page with no explanation.
  const goToExpiredNotice = useCallback(() => {
    if (window.location.pathname.startsWith('/traveler/')) return;
    navigateRef.current('/traveler/forgot-password?link=expired', { replace: true });
  }, []);
  const goToResetPage = useCallback(() => {
    if (window.location.pathname.startsWith('/traveler/reset-password')) return;
    navigateRef.current(`/traveler/reset-password${window.location.hash}`, { replace: true });
  }, []);

  const refreshUser = useCallback(() => {
    const currentUser = auth.getCurrentUser();
    if (currentUser) {
      setUser(currentUser.user);
      setUserType(currentUser.type);
    } else {
      setUser(null);
      setUserType(null);
    }
  }, []);

  useEffect(() => {
    if (isPasswordRecoveryLink()) goToResetPage();
    else if (window.location.hash.includes('error_code=otp_expired')) goToExpiredNotice();

    const stored = auth.getCurrentUser();
    if (stored) {
      setUser(stored.user);
      setUserType(stored.type);
    } else if (!isPasswordRecoveryLink()) {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          const classified = await classifySupabaseSession(session);
          localStorage.setItem('currentUser', JSON.stringify(classified));
          setUser(classified.user);
          setUserType(classified.type);
        }
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('currentUser');
        setUser(null);
        setUserType(null);
      } else if (event === 'PASSWORD_RECOVERY') {
        // Established purely so the reset-password page can update the
        // password - not a real login, so don't classify or persist it.
        goToResetPage();
      } else if (event === 'SIGNED_IN' && session?.user) {
        const current = auth.getCurrentUser();
        if (!current && !isPasswordRecoveryLink()) {
          classifySupabaseSession(session).then((classified) => {
            localStorage.setItem('currentUser', JSON.stringify(classified));
            setUser(classified.user);
            setUserType(classified.type);

            if (classified.type === 'traveler' && isBrandNewOAuthSession(session)) {
              sendEmail({
                template: 'welcome_traveler',
                recipient_email: classified.user.email,
                recipient_name: classified.user.full_name,
                data: { full_name: classified.user.full_name },
              });
            }
          });
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        const current = auth.getCurrentUser();
        if (current?.type === 'traveler') {
          const traveler: TravelerUser = {
            id: session.user.id,
            email: session.user.email!,
            full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
            phone: session.user.user_metadata?.phone,
            profile_picture: session.user.user_metadata?.avatar_url || session.user.user_metadata?.profile_picture,
            bio: session.user.user_metadata?.bio,
            date_of_birth: session.user.user_metadata?.date_of_birth,
            nationality: session.user.user_metadata?.nationality,
          };
          localStorage.setItem('currentUser', JSON.stringify({ type: 'traveler', user: traveler }));
          setUser(traveler);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [goToResetPage, goToExpiredNotice]);

  const login = useCallback((type: UserType, userData: CurrentUser) => {
    setUser(userData);
    setUserType(type);
  }, []);

  const logout = useCallback(() => {
    auth.logout();
    setUser(null);
    setUserType(null);
  }, []);

  const isPortalUser = useCallback((portalType?: string) => {
    return auth.isPortalUser(portalType);
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    userType,
    isAuthenticated: !!user,
    isTraveler: userType === 'traveler',
    isPortalUser,
    login,
    logout,
    refreshUser,
  }), [user, userType, isPortalUser, login, logout, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
