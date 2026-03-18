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
    console.log('[AuthStore] Session updated:', session ? 'authenticated' : 'null');
    set({
      session,
      user: session?.user ?? null,
      isLoading: false,
    });
  },

  setProfile: (profile) => {
    console.log('[AuthStore] Profile updated:', profile?.username ?? 'null');
    set({ profile });
  },

  signOut: async () => {
    console.log('[AuthStore] Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[AuthStore] Sign out error:', error.message);
    }
    set({ session: null, user: null, profile: null });
  },
}));
