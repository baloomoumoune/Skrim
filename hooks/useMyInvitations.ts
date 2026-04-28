import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { ListingInvitation } from '@/types/database';

export function useMyInvitations() {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;
  const [received, setReceived] = useState<ListingInvitation[]>([]);
  const [sent, setSent] = useState<ListingInvitation[]>([]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const refresh = async () => {
      const [{ data: inboxData }, { data: outboxData }] = await Promise.all([
        supabase
          .from('listing_invitations')
          .select('*')
          .eq('to_user_id', userId)
          .eq('status', 'pending'),
        supabase
          .from('listing_invitations')
          .select('*')
          .eq('from_user_id', userId)
          .eq('status', 'pending'),
      ]);
      if (cancelled) return;
      setReceived(inboxData ?? []);
      setSent(outboxData ?? []);
    };
    refresh();

    const channel = supabase
      .channel(`my-invitations-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'listing_invitations',
          filter: `to_user_id=eq.${userId}`,
        },
        refresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'listing_invitations',
          filter: `from_user_id=eq.${userId}`,
        },
        refresh,
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { received, sent };
}
