import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { auth, CurrentUser, UserType, TravelerUser, PortalUser, toPortalUser } from '../lib/auth';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

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
      } else if (event === 'SIGNED_IN' && session?.user) {
        const current = auth.getCurrentUser();
        if (!current && !isPasswordRecoveryLink()) {
          classifySupabaseSession(session).then((classified) => {
            localStorage.setItem('currentUser', JSON.stringify(classified));
            setUser(classified.user);
            setUserType(classified.type);
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
  }, []);

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
