import { useEffect, useState } from 'react';
import { View, Text, Pressable, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import type { Listing, Profile } from '@/types/database';

type ListingWithOwner = Listing & {
  lobbies: { owner_id: string; profiles: Profile } | null;
};

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const session = useAuthStore((s) => s.session);
  const [listing, setListing] = useState<ListingWithOwner | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from('listings')
        .select('*, lobbies!inner(owner_id, profiles!inner(*))')
        .eq('id', id)
        .maybeSingle();
      setListing(data as unknown as ListingWithOwner | null);
    })();
  }, [id]);

  if (!listing) return <View style={{ flex: 1, backgroundColor: c.background }} />;

  const isMyListing = listing.lobbies?.owner_id === session?.user.id;
  const cta = listing.kind === 'searcher' ? 'Propose myself as last' : 'Invite';

  const onCta = async () => {
    if (isMyListing || !id) return;
    setActing(true);
    try {
      if (listing.kind === 'searcher') {
        const { error } = await supabase.rpc('propose_as_last', { p_listing_id: id });
        if (error) throw error;
        Alert.alert('Sent', 'Your proposal was sent.');
      } else {
        const { data: myListing } = await supabase.rpc('get_my_active_listing');
        if (!myListing?.[0] || myListing[0].kind !== 'searcher') {
          Alert.alert(
            'Publish first',
            'You must publish a Searcher listing before inviting a Last.',
          );
          return;
        }
        if (!listing.lobbies) return;
        const { error } = await supabase.rpc('invite_last', {
          p_listing_id: myListing[0].listing_id,
          p_target_user_id: listing.lobbies.owner_id,
        });
        if (error) throw error;
        Alert.alert('Sent', 'Invitation sent.');
      }
      router.back();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong.';
      Alert.alert('Error', message);
    } finally {
      setActing(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{ padding: 16 }}
    >
      <Text
        style={{ fontSize: 22, fontWeight: '700', color: c.textPrimary, marginBottom: 12 }}
      >
        {listing.lobbies?.profiles.username}
      </Text>
      <Text style={{ color: c.textSecondary, marginBottom: 16 }}>
        {listing.lobbies?.profiles.current_rank}
      </Text>
      {listing.notes && (
        <Text style={{ color: c.textPrimary, marginBottom: 16 }}>{listing.notes}</Text>
      )}
      {!isMyListing && (
        <Pressable
          disabled={acting}
          onPress={onCta}
          style={{
            backgroundColor: c.accent,
            padding: 14,
            borderRadius: 12,
            alignItems: 'center',
            opacity: acting ? 0.5 : 1,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>{cta}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
