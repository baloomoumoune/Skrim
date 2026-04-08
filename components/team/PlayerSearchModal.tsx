import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { useGameAssets } from '@/hooks/useGameAssets';
import { GAME_ACCENTS } from '@/lib/constants';
import { useGameStore } from '@/stores/gameStore';
import { getRankImage } from '@/lib/game-assets';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

interface PlayerSearchModalProps {
  visible: boolean;
  teamId: string;
  existingMemberIds: string[];
  onClose: () => void;
  onInviteSent: () => void;
}

type SearchResult = Profile & { teamTag?: string };

export default function PlayerSearchModal({
  visible,
  teamId,
  existingMemberIds,
  onClose,
  onInviteSent,
}: PlayerSearchModalProps) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useColors();
  const { user } = useAuthStore();
  const selectedGame = useGameStore((s) => s.selectedGame);
  const game = GAME_ACCENTS[selectedGame];
  const { ranks, rankUrl } = useGameAssets();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingInviteIds, setPendingInviteIds] = useState<Set<string>>(new Set());
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch existing pending invites when modal opens
  const fetchPendingInvites = useCallback(async () => {
    if (!teamId) return;
    try {
      const { data } = await supabase
        .from('team_invites')
        .select('invited_user_id')
        .eq('team_id', teamId)
        .eq('status', 'pending');

      const ids = new Set((data ?? []).map((d: { invited_user_id: string }) => d.invited_user_id));
      setPendingInviteIds(ids);
    } catch (err) {
      if (__DEV__) console.error('[PlayerSearch] Fetch pending invites error:', err);
    }
  }, [teamId]);

  // Fetch pending invites on open + subscribe to realtime
  useEffect(() => {
    if (!visible || !teamId) return;

    fetchPendingInvites();

    const channel = supabase
      .channel(`team_invites:${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_invites',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          fetchPendingInvites();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [visible, teamId, fetchPendingInvites]);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (text.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', `%${text.trim()}%`)
          .neq('id', user?.id ?? '')
          .limit(20);

        if (error) throw error;
        const profiles = (data ?? []) as Profile[];

        // Fetch team tags for results
        if (profiles.length > 0) {
          const { data: teamData } = await supabase
            .from('team_members')
            .select('user_id, team:teams(tag, game)')
            .in('user_id', profiles.map((p) => p.id));

          const tagMap: Record<string, string> = {};
          for (const row of (teamData ?? []) as { user_id: string; team: { tag: string; game: string } }[]) {
            if (row.team && row.team.game === selectedGame) {
              tagMap[row.user_id] = row.team.tag;
            }
          }

          setResults(profiles.map((p) => ({ ...p, teamTag: tagMap[p.id] })));
        } else {
          setResults(profiles);
        }
      } catch (err) {
        if (__DEV__) console.error('[PlayerSearch] Error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const handleInvite = async (playerId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('team_invites')
        .insert({
          team_id: teamId,
          invited_user_id: playerId,
          invited_by: user.id,
        });

      if (error) throw error;

      setPendingInviteIds((prev) => new Set(prev).add(playerId));
      onInviteSent();
    } catch (err) {
      console.error('[PlayerSearch] Invite error:', err);
      Alert.alert('Error', 'Failed to send invite.');
    }
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    onClose();
  };

  const renderPlayer = ({ item }: { item: SearchResult }) => {
    const isMember = existingMemberIds.includes(item.id);
    const isInvited = pendingInviteIds.has(item.id);
    const rankImage = item.current_rank ? getRankImage(item.current_rank, ranks) : null;

    return (
      <View
        style={[
          styles.playerRow,
          { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
        ]}
      >
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.avatarPlaceholder,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
            ]}
          >
            <Text style={[styles.avatarLetter, { color: c.textTertiary }]}>
              {item.username.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={styles.nameRow}>
            <Text style={[styles.username, { color: c.textPrimary }]}>{item.username}</Text>
            {item.teamTag && (
              <Text style={[styles.teamTagText, { color: c.textTertiary }]}>#{item.teamTag}</Text>
            )}
          </View>
          <View style={styles.detailRow}>
            {rankImage && (
              <Image source={{ uri: rankUrl(rankImage) }} style={styles.rankIcon} contentFit="contain" />
            )}
            {item.current_rank && (
              <Text style={[styles.rankText, { color: c.textTertiary }]}>
                {item.current_rank.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </Text>
            )}
          </View>
        </View>

        {isMember ? (
          <View style={[styles.memberBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <Text style={[styles.memberBadgeText, { color: c.textTertiary }]}>Member</Text>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleInvite(item.id)}
            disabled={isInvited}
            style={[
              styles.inviteBtn,
              {
                backgroundColor: isInvited
                  ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')
                  : game.accent,
                opacity: isInvited ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[styles.inviteBtnText, { color: isInvited ? c.textTertiary : '#FFFFFF' }]}>
              {isInvited ? 'Sent' : 'Invite'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          onPress={handleClose}
        />

        <View style={[styles.modalBody, { backgroundColor: c.background }]}>
          {/* Header */}
          <View
            style={[
              styles.header,
              { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
            ]}
          >
            <Text style={[styles.headerTitle, { color: c.textPrimary }]}>Invite Players</Text>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={c.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                },
              ]}
            >
              <Ionicons name="search-outline" size={16} color={c.textTertiary} />
              <TextInput
                value={query}
                onChangeText={handleSearch}
                placeholder="Search by username..."
                placeholderTextColor={c.textTertiary}
                style={[styles.searchInput, { color: c.textPrimary }]}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              {searching && <ActivityIndicator size="small" color={c.textTertiary} />}
            </View>
          </View>

          {/* Results */}
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderPlayer}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            ListEmptyComponent={
              query.trim().length >= 2 && !searching ? (
                <Text style={[styles.emptyText, { color: c.textTertiary }]}>
                  No players found
                </Text>
              ) : null
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBody: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 14,
    fontWeight: '700',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
  },
  teamTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  rankIcon: {
    width: 14,
    height: 14,
  },
  rankText: {
    fontSize: 11,
  },
  inviteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  inviteBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  memberBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  memberBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 13,
  },
});
