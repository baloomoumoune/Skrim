import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { LobbyState } from '@/types/composites';

export function useMyLobby() {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;
  const [state, setState] = useState<LobbyState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const fetchState = async () => {
      const { data: lobby } = await supabase
        .from('lobbies')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle();
      if (!lobby) {
        if (!cancelled) {
          setState(null);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase.rpc('get_lobby_state', { p_lobby_id: lobby.id });
      if (!cancelled) {
        setState(data as unknown as LobbyState);
        setLoading(false);
      }
    };
    fetchState();

    const channel = supabase
      .channel(`my-lobby-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lobbies', filter: `owner_id=eq.${userId}` },
        fetchState,
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobby_members' }, fetchState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, fetchState)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { state, loading };
}
