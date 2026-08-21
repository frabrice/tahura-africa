import { supabase } from './supabase';

export interface TravelerUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  profile_picture?: string;
  bio?: string;
  date_of_birth?: string;
  nationality?: string;
  preferred_language?: string;
  trip_count?: number;
  countries_visited?: string[];
}

export interface PortalUser {
  id: string;
  portal_type: 'partner' | 'government' | 'institution' | 'operations';
  email: string;
  user_id_code: string;
  name?: string;
  phone?: string;
  contact_person?: string;
  country?: string;
  province?: string;
  specific_location?: string;
  specialty?: string;
  tags?: string[];
  is_active: boolean;
}

export type UserType = 'traveler' | 'portal';
export type CurrentUser = TravelerUser | PortalUser;

const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const travelerAuth = {
  async signUp(email: string, password: string, fullName: string, phone?: string): Promise<{ user: TravelerUser | null; error: string | null; needsVerification?: boolean }> {
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone || null,
          },
          emailRedirectTo: `${window.location.origin}/traveler/verify-email?type=signup&email=${encodeURIComponent(email)}`,
        },
      });

      if (signUpError) {
        return { user: null, error: signUpError.message };
      }

      if (!authData.user) {
        return { user: null, error: 'Failed to create user' };
      }

      const needsVerification = authData.user.identities && authData.user.identities.length === 0;

      const user: TravelerUser = {
        id: authData.user.id,
        email: authData.user.email!,
        full_name: fullName,
        phone: phone,
      };

      if (!needsVerification && authData.session) {
        localStorage.setItem('currentUser', JSON.stringify({ type: 'traveler', user }));
      }

      return { user, error: null, needsVerification };
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  },

  async login(email: string, password: string): Promise<{ user: TravelerUser | null; error: string | null; needsVerification?: boolean }> {
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        return { user: null, error: signInError.message };
      }

      if (!data.user) {
        return { user: null, error: 'Login failed' };
      }

      const needsVerification = !data.user.email_confirmed_at;

      if (needsVerification) {
        return { user: null, error: 'Email not confirmed', needsVerification: true };
      }

      const user: TravelerUser = {
        id: data.user.id,
        email: data.user.email!,
        full_name: data.user.user_metadata?.full_name || '',
        phone: data.user.user_metadata?.phone,
        profile_picture: data.user.user_metadata?.profile_picture,
        bio: data.user.user_metadata?.bio,
        date_of_birth: data.user.user_metadata?.date_of_birth,
        nationality: data.user.user_metadata?.nationality,
      };

      localStorage.setItem('currentUser', JSON.stringify({ type: 'traveler', user }));

      return { user, error: null, needsVerification: false };
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  },

  async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/traveler/reset-password`,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  async checkIsHost(_travelerId: string): Promise<{
    isHost: boolean;
    hostId: string | null;
    hostData: { id: string; name: string; partner_id: string; profile_picture?: string; email?: string } | null;
    isGuide: boolean;
    guideId: string | null;
    guideData: { id: string; name: string; portal_user_id: string; email?: string } | null;
  }> {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser?.email) return { isHost: false, hostId: null, hostData: null, isGuide: false, guideId: null, guideData: null };

      const [hostRes, guideRes] = await Promise.all([
        supabase
          .from('partner_hosts')
          .select('id, name, partner_id, profile_picture, traveler_user_id')
          .eq('email', authUser.email)
          .eq('status', 'active')
          .maybeSingle(),
        supabase
          .from('guides')
          .select('id, name, portal_user_id, traveler_user_id')
          .eq('email', authUser.email)
          .eq('available', true)
          .maybeSingle(),
      ]);

      if (hostRes.data && !hostRes.data.traveler_user_id) {
        await supabase
          .from('partner_hosts')
          .update({ traveler_user_id: authUser.id })
          .eq('id', hostRes.data.id);
      }

      if (guideRes.data && !guideRes.data.traveler_user_id) {
        await supabase
          .from('guides')
          .update({ traveler_user_id: authUser.id })
          .eq('id', guideRes.data.id);
      }

      return {
        isHost: !!hostRes.data,
        hostId: hostRes.data?.id || null,
        hostData: hostRes.data ? { id: hostRes.data.id, name: hostRes.data.name, partner_id: hostRes.data.partner_id, profile_picture: hostRes.data.profile_picture, email: authUser.email } : null,
        isGuide: !!guideRes.data,
        guideId: guideRes.data?.id || null,
        guideData: guideRes.data ? { id: guideRes.data.id, name: guideRes.data.name, portal_user_id: guideRes.data.portal_user_id, email: authUser.email } : null,
      };
    } catch {
      return { isHost: false, hostId: null, hostData: null, isGuide: false, guideId: null, guideData: null };
    }
  },

  async signInWithGoogle(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
        },
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  async getCurrentSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }
};

export const toPortalUser = (data: any): PortalUser => ({
  id: data.id,
  portal_type: data.portal_type,
  email: data.email,
  user_id_code: data.user_id_code,
  name: data.name,
  phone: data.phone,
  contact_person: data.contact_person,
  country: data.country,
  province: data.province,
  specific_location: data.specific_location,
  specialty: data.specialty,
  tags: data.tags,
  is_active: data.is_active,
});

export const portalAuth = {
  async login(
    email: string,
    password: string,
    userIdCode?: string
  ): Promise<{ user: PortalUser | null; error: string | null }> {
    try {
      const trimmedEmail = email.trim();

      // Newest path: accounts created via the invite system authenticate
      // through real Supabase Auth. Try this first — for every account that
      // hasn't been migrated yet, signInWithPassword simply fails (no such
      // Supabase Auth identity exists) and we fall through to the legacy
      // paths below unchanged.
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (!authError && authData.user) {
        const { data: portalRow } = await supabase
          .from('portal_users')
          .select('id, portal_type, email, user_id_code, name, phone, contact_person, country, province, specific_location, specialty, tags, is_active')
          .eq('auth_user_id', authData.user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (portalRow) {
          const user = toPortalUser(portalRow);
          localStorage.setItem('currentUser', JSON.stringify({ type: 'portal', user }));
          return { user, error: null };
        }

        // Valid Supabase Auth session, but not (yet) linked to a portal
        // account — e.g. a traveler with the same email. Don't leave a
        // stray session behind; fall through to the legacy checks below.
        await supabase.auth.signOut().catch(() => {});
      }

      // Preferred legacy path: the DB verifies credentials server-side and never
      // returns the password hash (migration 20260724120000). The plaintext
      // password is sent over HTTPS and hashed inside the SECURITY DEFINER
      // function, so the hash never travels to or from the browser.
      const { data: rpcData, error: rpcError } = await supabase.rpc('verify_portal_login', {
        p_email: trimmedEmail,
        p_password: password,
        p_user_id_code: userIdCode || null,
      });

      if (!rpcError) {
        const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        if (!row) {
          return { user: null, error: 'Invalid credentials' };
        }
        const user = toPortalUser(row);
        localStorage.setItem('currentUser', JSON.stringify({ type: 'portal', user }));
        return { user, error: null };
      }

      // Fallback for environments where the migration has not been applied yet.
      // Once the migration is live this path can never read password_hash, so it
      // simply stops being reachable. Remove after the migration is deployed.
      const passwordHash = await hashPassword(password);
      let query = supabase
        .from('portal_users')
        .select('*')
        .eq('email', trimmedEmail)
        .eq('password_hash', passwordHash)
        .eq('is_active', true);

      if (userIdCode) {
        query = query.eq('user_id_code', userIdCode);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      if (!data) {
        return { user: null, error: 'Invalid credentials' };
      }

      const user = toPortalUser(data);
      localStorage.setItem('currentUser', JSON.stringify({ type: 'portal', user }));

      return { user, error: null };
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  }
};

export const auth = {
  logout() {
    localStorage.removeItem('currentUser');
    supabase.auth.signOut().catch(() => {});
  },

  getCurrentUser(): { type: UserType; user: CurrentUser } | null {
    const stored = localStorage.getItem('currentUser');
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  },

  isTraveler(): boolean {
    const current = this.getCurrentUser();
    return current?.type === 'traveler';
  },

  isPortalUser(portalType?: string): boolean {
    const current = this.getCurrentUser();
    if (current?.type !== 'portal') return false;
    if (!portalType) return true;
    return (current.user as PortalUser).portal_type === portalType;
  }
};

export const generateUserIdCode = async (portalType: string): Promise<string> => {
  const prefix = portalType.substring(0, 2).toUpperCase();

  const { data: users } = await supabase
    .from('portal_users')
    .select('user_id_code')
    .eq('portal_type', portalType)
    .order('created_at', { ascending: false })
    .limit(1);

  let nextNumber = 1;
  if (users && users.length > 0) {
    const lastCode = users[0].user_id_code;
    const lastNumber = parseInt(lastCode.replace(/\D/g, ''));
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
};
