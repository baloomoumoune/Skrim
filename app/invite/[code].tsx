import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { useGameAssets } from '@/hooks/useGameAssets';
import { GAME_ACCENTS } from '@/lib/constants';
import { getGameLogoUrl, getRankImage } from '@/lib/game-assets';
import { supabase } from '@/lib/supabase';
import { TeamInitials } from '@/components/TeamInitials';
import type { Team } from '@/types/database';

const REGION_LABELS: Record<string, string> = {
  eu: 'EU', na: 'NA', apac: 'APAC', sa: 'SA', me: 'ME', oce: 'OCE',
};

export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useColors();
  const { user } = useAuthStore();
  const { ranks, rankUrl } = useGameAssets();

  const [team, setTeam] = useState<Team | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [hasExistingTeam, setHasExistingTeam] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

  const fetchTeam = useCallback(async () => {
    if (!code || !user) return;

    try {
      // Fetch team by invite code
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('invite_code', code)
        .single();

      if (teamError || !teamData) {
        Alert.alert('Invalid link', 'This invite link is invalid or expired.');
        router.replace('/(tabs)/team');
        return;
      }

      const foundTeam = teamData as Team;
      setTeam(foundTeam);

      // Count members
      const { count } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', foundTeam.id);

      setMemberCount(count ?? 0);

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', foundTeam.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMember) {
        setAlreadyMember(true);
      }

      // Check if user has a team for this game
      const { data: userTeams } = await supabase
        .from('team_members')
        .select('team_id, teams(game)')
        .eq('user_id', user.id);

      if (userTeams) {
        const hasTeam = (userTeams as unknown as { team_id: string; teams: { game: string } }[])
          .some((t) => t.teams.game === foundTeam.game && t.team_id !== foundTeam.id);
        setHasExistingTeam(hasTeam);
      }
    } catch (err) {
      if (__DEV__) console.error('[Invite] Error:', err);
      Alert.alert('Error', 'Failed to load invite.');
    } finally {
      setLoading(false);
    }
  }, [code, user, router]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const handleJoin = async () => {
    if (!team || !user) return;

    const doJoin = async () => {
      setJoining(true);
      try {
        // Remove from existing team for same game
        const { data: existingMemberships } = await supabase
          .from('team_members')
          .select('team_id, teams(game)')
          .eq('user_id', user.id);

        if (existingMemberships) {
          const toRemove = (existingMemberships as unknown as { team_id: string; teams: { game: string } }[])
            .filter((t) => t.teams.game === team.game);

          for (const m of toRemove) {
            await supabase
              .from('team_members')
              .delete()
              .eq('team_id', m.team_id)
              .eq('user_id', user.id);
          }
        }

        // Join new team
        const { error } = await supabase
          .from('team_members')
          .insert({ team_id: team.id, user_id: user.id, role: 'player' } as never);

        if (error) throw error;

        // Recalculate rank
        const rankIds = ranks.map((r) => r.id);
        await (supabase.rpc as Function)('recalculate_team_rank', {
          p_team_id: team.id,
          p_rank_order: rankIds,
        });

        router.replace('/(tabs)/team');
      } catch (err) {
        console.error('[Invite] Join error:', err);
        Alert.alert('Error', 'Failed to join team.');
      } finally {
        setJoining(false);
      }
    };

    if (hasExistingTeam) {
      Alert.alert(
        'Leave current team?',
        `Joining ${team.name} will remove you from your current ${GAME_ACCENTS[team.game as keyof typeof GAME_ACCENTS]?.name ?? team.game} team.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Join', onPress: doJoin },
        ],
      );
    } else {
      doJoin();
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={c.textTertiary} style={{ marginTop: 100 }} />
      </View>
    );
  }

  if (!team) return null;

  const gameConfig = GAME_ACCENTS[team.game as keyof typeof GAME_ACCENTS];
  const accent = gameConfig?.accent ?? c.accent;
  const rankImage = team.rank_tier ? getRankImage(team.rank_tier, ranks) : null;

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      {/* Back button */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.back()}
        style={styles.backBtn}
      >
        <Ionicons name="arrow-back" size={22} color={c.textPrimary} />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Team logo */}
        {team.logo_url ? (
          <Image source={{ uri: team.logo_url }} style={styles.logo} contentFit="cover" />
        ) : (
          <TeamInitials tag={team.tag} size={88} />
        )}

        <Text style={[styles.inviteLabel, { color: c.textTertiary }]}>You've been invited to join</Text>
        <Text style={[styles.teamName, { color: c.textPrimary }]}>{team.name}</Text>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: `${accent}15` }]}>
            <Text style={[styles.badgeText, { color: accent }]}>{team.tag}</Text>
          </View>

          {gameConfig && (
            <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
              <Image source={{ uri: getGameLogoUrl(gameConfig.logo) }} style={styles.badgeIcon} contentFit="contain" />
              <Text style={[styles.badgeText, { color: c.textSecondary }]}>{gameConfig.name}</Text>
            </View>
          )}

          <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <Ionicons name="globe-outline" size={12} color={c.textSecondary} />
            <Text style={[styles.badgeText, { color: c.textSecondary }]}>
              {REGION_LABELS[team.region] ?? team.region.toUpperCase()}
            </Text>
          </View>

          <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <Ionicons name="people-outline" size={12} color={c.textSecondary} />
            <Text style={[styles.badgeText, { color: c.textSecondary }]}>
              {memberCount} member{memberCount !== 1 ? 's' : ''}
            </Text>
          </View>

          {rankImage && (
            <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
              <Image source={{ uri: rankUrl(rankImage) }} style={styles.rankIcon} contentFit="contain" />
            </View>
          )}
        </View>

        {team.description && (
          <Text style={[styles.description, { color: c.textSecondary }]}>{team.description}</Text>
        )}

        {hasExistingTeam && !alreadyMember && (
          <View style={[styles.warningRow, { backgroundColor: '#F59E0B15' }]}>
            <Ionicons name="warning-outline" size={14} color="#F59E0B" />
            <Text style={styles.warningText}>Joining will leave your current team for this game</Text>
          </View>
        )}

        {alreadyMember ? (
          <View style={[styles.alreadyBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
            <Text style={[styles.alreadyText, { color: c.textSecondary }]}>You're already a member</Text>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleJoin}
            disabled={joining}
            style={[styles.joinBtn, { backgroundColor: accent, opacity: joining ? 0.6 : 1 }]}
          >
            {joining ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="people" size={18} color="#FFFFFF" />
                <Text style={styles.joinBtnText}>Join Team</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  inviteLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 20,
  },
  teamName: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 6,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeIcon: {
    width: 14,
    height: 14,
  },
  rankIcon: {
    width: 18,
    height: 18,
  },
  description: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 14,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 20,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F59E0B',
  },
  alreadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 24,
  },
  alreadyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  joinBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
