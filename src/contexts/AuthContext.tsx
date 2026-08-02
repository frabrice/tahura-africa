import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { auth, CurrentUser, UserType, TravelerUser } from '../lib/auth';
import { supabase } from '../lib/supabase';

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
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const traveler: TravelerUser = {
            id: session.user.id,
            email: session.user.email!,
            full_name: session.user.user_metadata?.full_name || '',
            phone: session.user.user_metadata?.phone,
            profile_picture: session.user.user_metadata?.profile_picture,
            bio: session.user.user_metadata?.bio,
            date_of_birth: session.user.user_metadata?.date_of_birth,
            nationality: session.user.user_metadata?.nationality,
          };
          localStorage.setItem('currentUser', JSON.stringify({ type: 'traveler', user: traveler }));
          setUser(traveler);
          setUserType('traveler');
        }
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('currentUser');
        setUser(null);
        setUserType(null);
      } else if (event === 'SIGNED_IN' && session?.user) {
        const current = auth.getCurrentUser();
        if (!current) {
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
          setUserType('traveler');
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
