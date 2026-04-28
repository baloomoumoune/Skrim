import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import ComposeGroupSection, {
  type CoplayerSlot,
} from '@/components/publish/ComposeGroupSection';
import CriteriaSection, { type Criteria } from '@/components/publish/CriteriaSection';
import type { ValorantRegion } from '@/lib/valorant-regions';

export default function PublishSearcher() {
  const c = useColors();
  const session = useAuthStore((s) => s.session);
  const [target, setTarget] = useState<1 | 2 | 3>(1);
  const [coplayers, setCoplayers] = useState<CoplayerSlot[]>([]);
  const [criteria, setCriteria] = useState<Criteria | null>(null);
  const [groupCode, setGroupCode] = useState('');
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

  const compositionValid =
    coplayers.length === 4 - target &&
    coplayers.every((s) => (s.mode === 'external' ? !!s.rank : !!s.userId));

  const codeValid = groupCode === '' || /^[A-Z0-9]{6}$/.test(groupCode);

  const onSubmit = async () => {
    const userId = session?.user.id;
    if (!criteria || !compositionValid || !codeValid || !userId) return;
    setSubmitting(true);
    try {
      const externals = coplayers
        .filter((s) => s.mode === 'external')
        .map((s) => ({ rank: (s as Extract<CoplayerSlot, { mode: 'external' }>).rank }));
      const invites = coplayers
        .filter((s) => s.mode === 'invite')
        .map((s) => (s as Extract<CoplayerSlot, { mode: 'invite' }>).userId);

      const { error } = await supabase.rpc('create_searcher_listing', {
        p_criteria: criteria as never,
        p_target_lasts_count: target,
        p_group_composition: (externals.length ? externals : null) as never,
        p_coplayer_invites: invites,
        p_notes: notes || undefined,
      });
      if (error) throw error;

      if (groupCode) {
        const { data: lobby } = await supabase
          .from('lobbies')
          .select('id')
          .eq('owner_id', userId)
          .single();
        if (lobby) {
          await supabase.rpc('set_group_code', {
            p_lobby_id: lobby.id,
            p_code: groupCode,
          });
        }
      }

      router.replace('/(tabs)/home');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong.';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const onPickFriend = (slotIndex: number) => {
    const handlePicked = async (text?: string) => {
      if (!text) return;
      const { data } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', text.trim())
        .maybeSingle();
      if (!data) {
        Alert.alert('Not found', `No user named "${text}".`);
        return;
      }
      const next = [...coplayers];
      next[slotIndex] = { mode: 'invite', userId: data.id, username: data.username };
      setCoplayers(next);
    };
    if (Platform.OS === 'ios' && Alert.prompt) {
      Alert.prompt('Invite friend by username', undefined, handlePicked);
    } else {
      Alert.alert(
        'Friend picker',
        'A richer picker will be added soon. iOS users can use the prompt for now.',
      );
    }
  };

  if (!criteria) return <View style={{ flex: 1, backgroundColor: c.background }} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }}>
      <ComposeGroupSection
        targetLastsCount={target}
        onTargetLastsChange={(n) => {
          setTarget(n);
          setCoplayers([]);
        }}
        coplayers={coplayers}
        onCoplayersChange={setCoplayers}
        onPickFriend={onPickFriend}
      />
      <CriteriaSection value={criteria} onChange={setCriteria} />
      <View style={{ padding: 16 }}>
        <Text
          style={{ fontSize: 17, fontWeight: '700', color: c.textPrimary, marginBottom: 8 }}
        >
          Optional
        </Text>
        <TextInput
          placeholder="Group code (6 chars, A-Z 0-9)"
          autoCapitalize="characters"
          maxLength={6}
          value={groupCode}
          onChangeText={(t) => setGroupCode(t.toUpperCase())}
          style={{
            padding: 12,
            borderRadius: 10,
            color: c.textPrimary,
            backgroundColor: c.surface,
            marginBottom: 8,
          }}
          placeholderTextColor={c.textSecondary}
        />
        {!codeValid && (
          <Text style={{ color: '#FF4655', marginBottom: 8 }}>
            Code must match A-Z 0-9 (6 chars).
          </Text>
        )}
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
          disabled={submitting || !compositionValid || !codeValid}
          onPress={onSubmit}
          style={{
            backgroundColor: c.accent,
            padding: 14,
            borderRadius: 12,
            alignItems: 'center',
            opacity: submitting || !compositionValid || !codeValid ? 0.4 : 1,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Publish</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
