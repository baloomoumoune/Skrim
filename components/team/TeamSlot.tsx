import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { TeamRole } from '@/types/database';
import type { TeamMemberWithProfile } from '@/types/composites';

export type SlotType = 'coach' | 'player' | 'sub';

const SLOT_LABELS: Record<SlotType, string> = {
  coach: 'Coach',
  player: 'Joueur',
  sub: 'Remplaçant',
};

const ROLE_COLORS: Record<TeamRole, string> = {
  president: '#F59E0B',
  captain: '#F59E0B',
  player: '#3B82F6',
  sub: '#8B5CF6',
  coach: '#10B981',
};

interface TeamSlotProps {
  slotType: SlotType;
  slotIndex: number;
  member: TeamMemberWithProfile | null;
  isPresident: boolean;
  isSelf: boolean;
  isCaptain: boolean;
  isTeamPresident: boolean;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  isDark: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

export default function TeamSlot({
  slotType,
  member,
  isPresident,
  isSelf,
  isCaptain,
  isTeamPresident,
  accent,
  textPrimary,
  textSecondary,
  textTertiary,
  isDark,
  onPress,
  onLongPress,
}: TeamSlotProps) {
  const profile = member?.profile;

  // Empty slot
  if (!member) {
    return (
      <TouchableOpacity
        activeOpacity={isPresident ? 0.7 : 1}
        onPress={isPresident ? onPress : undefined}
        disabled={!isPresident}
        style={[
          styles.slot,
          styles.emptySlot,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        <View
          style={[
            styles.emptyIcon,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            },
          ]}
        >
          <Ionicons
            name={isPresident ? 'add' : 'person-outline'}
            size={16}
            color={isPresident ? accent : textTertiary}
          />
        </View>
        <Text style={[styles.slotLabel, { color: textTertiary }]}>
          {SLOT_LABELS[slotType]}
        </Text>
      </TouchableOpacity>
    );
  }

  // Filled slot
  const roleColor = ROLE_COLORS[member.role];

  return (
    <TouchableOpacity
      activeOpacity={isPresident ? 0.7 : 1}
      onPress={onPress}
      onLongPress={isPresident ? onLongPress : undefined}
      style={[
        styles.slot,
        styles.filledSlot,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        },
      ]}
    >
      {/* Avatar */}
      {profile?.avatar_url ? (
        <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: `${accent}20` }]}>
          <Ionicons name="person" size={14} color={accent} />
        </View>
      )}

      {/* Username + badges */}
      <View style={styles.nameContainer}>
        <Text numberOfLines={1} style={[styles.username, { color: textPrimary }]}>
          {profile?.username ?? 'Unknown'}
        </Text>

        {/* Badges row */}
        <View style={styles.badgesRow}>
          {/* President badge */}
          {isTeamPresident && (
            <View style={[styles.badge, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="star" size={8} color="#F59E0B" />
            </View>
          )}

          {/* Captain badge */}
          {isCaptain && !isTeamPresident && (
            <View style={[styles.badge, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="shield" size={8} color="#F59E0B" />
            </View>
          )}

          {/* Self indicator */}
          {isSelf && (
            <Text style={[styles.youText, { color: accent }]}>vous</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: 70,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  emptySlot: {
    borderStyle: 'dashed',
  },
  filledSlot: {},
  emptyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
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
  nameContainer: {
    marginTop: 4,
    alignItems: 'center',
    width: '100%',
  },
  username: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 62,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
    minHeight: 14,
  },
  badge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  youText: {
    fontSize: 8,
    fontWeight: '600',
  },
});
