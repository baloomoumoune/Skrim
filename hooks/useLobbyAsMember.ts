import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { LobbyState } from '@/types/composites';

export function useLobbyAsMember() {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;
  const [state, setState] = useState<LobbyState | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const refresh = async () => {
      const { data: membership } = await supabase
        .from('lobby_members')
        .select('lobby_id')
        .eq('user_id', userId)
        .is('left_at', null)
        .neq('role', 'searcher')
        .maybeSingle();
      if (!membership) {
        if (!cancelled) setState(null);
        return;
      }
      const { data } = await supabase.rpc('get_lobby_state', { p_lobby_id: membership.lobby_id });
      if (!cancelled) setState(data as unknown as LobbyState);
    };
    refresh();

    const channel = supabase
      .channel(`as-member-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobby_members' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobbies' }, refresh)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return state;
}
