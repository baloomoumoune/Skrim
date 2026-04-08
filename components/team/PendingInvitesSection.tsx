import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useColors } from '@/hooks/useThemeColors';
import { useGameStore } from '@/stores/gameStore';
import { GAME_ACCENTS } from '@/lib/constants';
import { getGameLogoUrl } from '@/lib/game-assets';
import { TeamInitials } from '@/components/TeamInitials';
import type { TeamInviteWithTeam } from '@/types/composites';

interface PendingInvitesSectionProps {
  invites: TeamInviteWithTeam[];
  hasExistingTeam: boolean;
  onAccept: (inviteId: string) => void;
  onReject: (inviteId: string) => void;
}

export default function PendingInvitesSection({
  invites,
  hasExistingTeam,
  onAccept,
  onReject,
}: PendingInvitesSectionProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useColors();
  const selectedGame = useGameStore((s) => s.selectedGame);
  const game = GAME_ACCENTS[selectedGame];

  if (invites.length === 0) return null;

  const handleAccept = (inviteId: string, teamName: string) => {
    if (hasExistingTeam) {
      Alert.alert(
        'Join team',
        `Joining ${teamName} will remove you from your current team for this game. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Join', onPress: () => onAccept(inviteId) },
        ],
      );
    } else {
      onAccept(inviteId);
    }
  };

  const handleReject = (inviteId: string) => {
    onReject(inviteId);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
        Pending Invites ({invites.length})
      </Text>

      {invites.map((invite) => {
        const team = invite.team;
        const gameConfig = GAME_ACCENTS[team.game as keyof typeof GAME_ACCENTS];

        return (
          <View
            key={invite.id}
            style={[
              styles.card,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            <View style={styles.cardTop}>
              {/* Team logo */}
              {team.logo_url ? (
                <Image source={{ uri: team.logo_url }} style={styles.teamLogo} contentFit="cover" />
              ) : (
                <TeamInitials tag={team.tag} size={40} />
              )}

              <View style={styles.cardInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.teamName, { color: c.textPrimary }]}>{team.name}</Text>
                  <View style={[styles.tagBadge, { backgroundColor: `${(gameConfig ?? game).accent}15` }]}>
                    <Text style={[styles.tagText, { color: (gameConfig ?? game).accent }]}>
                      {team.tag}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.invitedBy, { color: c.textTertiary }]}>
                  Invited by {invite.inviter.username}
                </Text>
              </View>
            </View>

            {hasExistingTeam && (
              <View style={[styles.warningRow, { backgroundColor: '#F59E0B15' }]}>
                <Ionicons name="warning-outline" size={14} color="#F59E0B" />
                <Text style={styles.warningText}>
                  Joining will leave your current team
                </Text>
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleReject(invite.id)}
                style={[
                  styles.rejectBtn,
                  { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
                ]}
              >
                <Text style={[styles.rejectText, { color: c.textSecondary }]}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleAccept(invite.id, team.name)}
                style={[styles.acceptBtn, { backgroundColor: game.accent }]}
              >
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '700',
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  invitedBy: {
    fontSize: 12,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 10,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F59E0B',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  rejectBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  rejectText: {
    fontSize: 13,
    fontWeight: '600',
  },
  acceptBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 8,
  },
  acceptText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
