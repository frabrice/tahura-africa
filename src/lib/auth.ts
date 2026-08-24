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

      // Every portal account now authenticates through real Supabase Auth —
      // the anon-key RPC and password_hash fallback paths that used to sit
      // here were the root cause of this platform's RLS policies being
      // unable to tell a legitimate portal user from an anonymous request
      // (they never established a session, so auth.uid() was never set).
      // Removed as part of the account-security remediation once every real
      // account was migrated onto this path. If login fails for someone,
      // the fix is inviting them again via InvitePartnerDrawer, not
      // resurrecting a fallback here.
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (authError || !authData.user) {
        return { user: null, error: 'Invalid credentials' };
      }

      const { data: portalRow } = await supabase
        .from('portal_users')
        .select('id, portal_type, email, user_id_code, name, phone, contact_person, country, province, specific_location, specialty, tags, is_active')
        .eq('auth_user_id', authData.user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (userIdCode && portalRow?.user_id_code !== userIdCode) {
        await supabase.auth.signOut().catch(() => {});
        return { user: null, error: 'Invalid credentials' };
      }

      if (!portalRow) {
        // Valid Supabase Auth session, but not linked to an active portal
        // account (e.g. a traveler with the same email). Don't leave a
        // stray session behind.
        await supabase.auth.signOut().catch(() => {});
        return { user: null, error: 'Invalid credentials' };
      }

      const user = toPortalUser(portalRow);
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
