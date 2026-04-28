import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/useThemeColors';
import RoleToggle from '@/components/find/RoleToggle';
import FilterBar, { type FeedFilters } from '@/components/find/FilterBar';
import ListingCard from '@/components/find/ListingCard';
import StepServers from '@/components/onboarding/StepServers';
import StepLanguages from '@/components/onboarding/StepLanguages';
import { useFeed } from '@/hooks/useFeed';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import type { ValorantRegion } from '@/lib/valorant-regions';

export default function FindScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const params = useLocalSearchParams<{ role?: string }>();
  const session = useAuthStore((s) => s.session);
  const initialRole: 'searcher' | 'last' = params.role === 'last' ? 'last' : 'searcher';
  const [role, setRole] = useState<'searcher' | 'last'>(initialRole);
  const [filters, setFilters] = useState<FeedFilters>({});
  const [region, setRegion] = useState<ValorantRegion | null>(null);
  const [showServers, setShowServers] = useState(false);
  const [showLangs, setShowLangs] = useState(false);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('region')
        .eq('id', userId)
        .maybeSingle();
      if (data?.region) setRegion(data.region as ValorantRegion);
    })();
  }, [session?.user.id]);

  const feed = useFeed(role, filters);

  const onPublish = () => {
    router.push(role === 'searcher' ? '/publish/searcher' : '/publish/last');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
        <Text
          style={{ fontSize: 20, fontWeight: '700', color: c.textPrimary, marginBottom: 12 }}
        >
          Find
        </Text>
        <RoleToggle role={role} onChange={setRole} />
        <Pressable
          onPress={onPublish}
          style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 12,
            alignItems: 'center',
            backgroundColor: c.accent,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>
            {role === 'searcher' ? 'Publish search' : 'Publish as last'}
          </Text>
        </Pressable>
      </View>
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters({})}
        onOpenRank={() => {
          /* rank min/max picker — wired in a follow-up */
        }}
        onOpenLanguage={() => setShowLangs(true)}
        onOpenServers={() => region && setShowServers(true)}
      />

      <Modal
        visible={showServers}
        animationType="slide"
        onRequestClose={() => setShowServers(false)}
      >
        <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
          {region && (
            <StepServers
              region={region}
              value={filters.servers ?? []}
              onChange={(servers) => setFilters({ ...filters, servers })}
            />
          )}
          <Pressable
            onPress={() => setShowServers(false)}
            style={{
              margin: 16,
              padding: 14,
              borderRadius: 10,
              backgroundColor: c.accent,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Done</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal
        visible={showLangs}
        animationType="slide"
        onRequestClose={() => setShowLangs(false)}
      >
        <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
          <StepLanguages
            primary={filters.primaryLanguage ?? ''}
            secondary={[]}
            onPrimaryChange={(primary_language) =>
              setFilters({ ...filters, primaryLanguage: primary_language })
            }
            onSecondaryChange={() => {
              /* secondary not exposed in feed filters for now */
            }}
          />
          <Pressable
            onPress={() => setShowLangs(false)}
            style={{
              margin: 16,
              padding: 14,
              borderRadius: 10,
              backgroundColor: c.accent,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Done</Text>
          </Pressable>
        </View>
      </Modal>

      {feed.isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 12 }}
          data={feed.data ?? []}
          keyExtractor={(item) => item.listing_id}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              onPress={() => router.push(`/listing/${item.listing_id}`)}
            />
          )}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: c.textSecondary, marginTop: 40 }}>
              No matching listings.
            </Text>
          }
        />
      )}
    </View>
  );
}
