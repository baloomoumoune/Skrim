import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useThemeColors';
import { useGameStore } from '@/stores/gameStore';
import { useAuthStore } from '@/stores/authStore';
import { useGameAssets } from '@/hooks/useGameAssets';
import { GAME_ACCENTS } from '@/lib/constants';
import { getRankLabel, getRankImage } from '@/lib/game-assets';
import { supabase } from '@/lib/supabase';

interface CreateMatchModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const LASTS_OPTIONS = [1, 2, 3, 4] as const;

export default function CreateMatchModal({ visible, onClose, onCreated }: CreateMatchModalProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useColors();
  const selectedGame = useGameStore((s) => s.selectedGame);
  const game = GAME_ACCENTS[selectedGame];
  const { user, profile } = useAuthStore();
  const { ranks, rankUrl } = useGameAssets();

  const [groupCode, setGroupCode] = useState('');
  const [lastsNeeded, setLastsNeeded] = useState(1);
  const [creating, setCreating] = useState(false);

  const currentRank = profile?.current_rank ?? 'unranked';
  const rankImage = getRankImage(currentRank, ranks);
  const rankLabel = getRankLabel(currentRank);

  const isCodeValid = /^[A-Z0-9]{6}$/.test(groupCode);
  const canCreate = isCodeValid && !creating;

  const resetState = () => {
    setGroupCode('');
    setLastsNeeded(1);
    setCreating(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleCreate = useCallback(async () => {
    if (!user || !profile || !canCreate) return;

    // Check if user already has an active match
    const { data: hasActive } = await supabase.rpc('check_active_match', {
      p_user_id: user.id,
    });
    if (hasActive) {
      Alert.alert('Active match', 'You already have an active match. Leave it first.');
      return;
    }

    setCreating(true);
    try {
      const maxPlayers = 5;
      const currentPlayers = maxPlayers - lastsNeeded;

      const { data: matchData, error: matchErr } = await supabase
        .from('matches')
        .insert({
          game: selectedGame,
          game_mode: 'competitive',
          creator_id: user.id,
          region: profile.region,
          rank_min: currentRank,
          rank_max: currentRank,
          rr_penalty: false,
          current_players: currentPlayers,
          max_players: maxPlayers,
          status: 'open',
          group_code: groupCode,
          platform: profile.platform ?? null,
        })
        .select()
        .single();

      if (matchErr) throw matchErr;

      // Insert creator as first member
      const { error: memberErr } = await supabase
        .from('match_members')
        .insert({
          match_id: (matchData as { id: string }).id,
          user_id: user.id,
          is_ready: false,
        });

      if (memberErr) throw memberErr;

      resetState();
      onClose();
      onCreated();
      router.push(`/match/${(matchData as { id: string }).id}`);
    } catch (err) {
      if (__DEV__) console.error('[CreateMatch] Error:', err);
      Alert.alert('Error', 'Failed to create match.');
    } finally {
      setCreating(false);
    }
  }, [user, profile, canCreate, lastsNeeded, groupCode, selectedGame, currentRank, router, onClose, onCreated]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        {/* Sheet */}
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? '#111111' : '#FFFFFF',
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleRow}>
            <View
              style={[
                styles.handle,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' },
              ]}
            />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: c.textPrimary }]}>
            Create Match
          </Text>

          {/* Rank display (auto from profile) */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: c.textTertiary }]}>YOUR RANK</Text>
            <View
              style={[
                styles.rankDisplay,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                },
              ]}
            >
              {rankImage && (
                <Image
                  source={{ uri: rankUrl(rankImage) }}
                  style={styles.rankIcon}
                  contentFit="contain"
                />
              )}
              <Text style={[styles.rankText, { color: c.textPrimary }]}>
                {rankLabel}
              </Text>
            </View>
          </View>

          {/* Group code input */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: c.textTertiary }]}>GROUP CODE</Text>
            <TextInput
              value={groupCode}
              onChangeText={(text) => setGroupCode(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="ABC123"
              placeholderTextColor={c.textTertiary}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[
                styles.codeInput,
                {
                  color: c.textPrimary,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  borderColor: groupCode.length > 0
                    ? isCodeValid ? game.accent : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'
                    : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                },
              ]}
            />
            <Text style={[styles.hint, { color: c.textTertiary }]}>
              Enter the 6-character group code from Valorant
            </Text>
          </View>

          {/* Lasts needed */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: c.textTertiary }]}>LOOKING FOR</Text>
            <View style={styles.lastsRow}>
              {LASTS_OPTIONS.map((n) => {
                const isActive = lastsNeeded === n;
                return (
                  <TouchableOpacity
                    key={n}
                    activeOpacity={0.7}
                    onPress={() => setLastsNeeded(n)}
                    style={[
                      styles.lastsChip,
                      {
                        backgroundColor: isActive
                          ? `${game.accent}18`
                          : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                        borderColor: isActive
                          ? game.accent
                          : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.lastsText,
                        { color: isActive ? game.accent : c.textSecondary },
                      ]}
                    >
                      {n} player{n > 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Create button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleCreate}
            disabled={!canCreate}
            style={[
              styles.createBtn,
              {
                backgroundColor: game.accent,
                opacity: canCreate ? 1 : 0.4,
              },
            ]}
          >
            {creating ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.createBtnText}>Create Match</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 24,
    marginTop: 8,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  rankDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  rankIcon: {
    width: 28,
    height: 28,
  },
  rankText: {
    fontSize: 15,
    fontWeight: '600',
  },
  codeInput: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  hint: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  lastsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  lastsChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  lastsText: {
    fontSize: 13,
    fontWeight: '700',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 27,
    marginTop: 8,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
