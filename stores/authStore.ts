import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { Profile } from '@/types/database';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,

  setSession: (session) => {
    if (__DEV__) console.log('[AuthStore] Session updated:', session ? 'authenticated' : 'null');
    if (!session) {
      // No session — stop loading immediately, no profile to fetch
      set({ session: null, user: null, profile: null, isLoading: false });
    } else {
      // Session found — reset profile and keep loading until profile is fetched
      set((state) => ({
        session,
        user: session.user,
        // Only reset profile/loading if this is a different user
        ...(state.user?.id !== session.user.id
          ? { profile: null, isLoading: true }
          : {}),
      }));
    }
  },

  setProfile: (profile) => {
    if (__DEV__) console.log('[AuthStore] Profile updated:', profile?.username ?? 'null');
    set({ profile, isLoading: false });
  },

  signOut: async () => {
    if (__DEV__) console.log('[AuthStore] Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[AuthStore] Sign out error:', error.message);
    }
    set({ session: null, user: null, profile: null });
  },
}));
