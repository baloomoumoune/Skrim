import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import CriteriaSection, { type Criteria } from '@/components/publish/CriteriaSection';
import type { ValorantRegion } from '@/lib/valorant-regions';

export default function PublishLast() {
  const c = useColors();
  const session = useAuthStore((s) => s.session);
  const [criteria, setCriteria] = useState<Criteria | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    (async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select(
          'region, platform, current_rank, primary_language, secondary_languages, voice_enabled',
        )
        .eq('id', userId)
        .maybeSingle();
      const { data: ps } = await supabase
        .from('profile_servers')
        .select('server_id')
        .eq('profile_id', userId);
      if (!profile) return;
      setCriteria({
        region: profile.region as ValorantRegion,
        servers: (ps ?? []).map((r) => r.server_id),
        platform: profile.platform,
        rank_min: profile.current_rank,
        rank_max: profile.current_rank,
        primary_language: profile.primary_language,
        secondary_languages: profile.secondary_languages,
        voice_required: profile.voice_enabled,
        age_filter: 'any',
      });
    })();
  }, [session?.user.id]);

  const onSubmit = async () => {
    if (!criteria) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('create_last_listing', {
        p_criteria: criteria as never,
        p_notes: notes || undefined,
      });
      if (error) throw error;
      router.replace({ pathname: '/(tabs)/find', params: { role: 'last' } });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong.';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!criteria) return <View style={{ flex: 1, backgroundColor: c.background }} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }}>
      <CriteriaSection value={criteria} onChange={setCriteria} />
      <View style={{ padding: 16 }}>
        <TextInput
          placeholder="Notes (max 200)"
          multiline
          maxLength={200}
          value={notes}
          onChangeText={setNotes}
          style={{
            padding: 12,
            borderRadius: 10,
            color: c.textPrimary,
            backgroundColor: c.surface,
            minHeight: 80,
          }}
          placeholderTextColor={c.textSecondary}
        />
      </View>
      <View style={{ padding: 16 }}>
        <Pressable
          disabled={submitting}
          onPress={onSubmit}
          style={{
            backgroundColor: c.accent,
            padding: 14,
            borderRadius: 12,
            alignItems: 'center',
            opacity: submitting ? 0.5 : 1,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Publish as last</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
