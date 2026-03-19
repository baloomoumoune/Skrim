import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export function useSession() {
  const { session, isLoading, setSession, setProfile } = useAuthStore();

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (__DEV__) console.log('[useSession] Auth state changed:', _event);
        setSession(session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession]);

  // Fetch profile separately when session changes
  useEffect(() => {
    if (!session?.user) {
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      if (__DEV__) console.log('[useSession] Fetching profile...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session!.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('[useSession] Failed to fetch profile:', error.message);
        setProfile(null);
      } else {
        setProfile(data);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, setProfile]);

  return { session, isLoading };
}
