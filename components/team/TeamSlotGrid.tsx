import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import TeamSlot from './TeamSlot';
import type { SlotType } from './TeamSlot';
import type { TeamMemberWithProfile } from '@/types/database';

export type { SlotType };

interface TeamSlotGridProps {
  members: TeamMemberWithProfile[];
  presidentId: string;
  currentUserId: string | undefined;
  isPresident: boolean;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  isDark: boolean;
  onSlotPress: (slotType: SlotType, slotIndex: number, member: TeamMemberWithProfile | null) => void;
  onMemberLongPress?: (member: TeamMemberWithProfile) => void;
}

export default function TeamSlotGrid({
  members,
  presidentId,
  currentUserId,
  isPresident,
  accent,
  textPrimary,
  textSecondary,
  textTertiary,
  isDark,
  onSlotPress,
  onMemberLongPress,
}: TeamSlotGridProps) {
  // Find president (may or may not be in a player slot)
  const presidentMember = members.find((m) => m.user_id === presidentId);
  const presidentProfile = presidentMember?.profile;

  // Find coach (role = 'coach')
  const coach = members.find((m) => m.role === 'coach');

  // Find players (role = 'player'), sorted by slot_index
  const players = members
    .filter((m) => m.role === 'player')
    .sort((a, b) => (a.slot_index ?? 99) - (b.slot_index ?? 99));

  // Find subs (role = 'sub'), sorted by slot_index
  const subs = members
    .filter((m) => m.role === 'sub')
    .sort((a, b) => (a.slot_index ?? 99) - (b.slot_index ?? 99));

  // Check if president is also playing (in player/sub/coach role)
  const presidentIsPlaying = presidentMember && presidentMember.role !== 'president';

  // Build slot arrays
  const playerSlots: (TeamMemberWithProfile | null)[] = [];
  for (let i = 0; i < 5; i++) {
    playerSlots.push(players.find((p) => p.slot_index === i) ?? null);
  }

  const subSlots: (TeamMemberWithProfile | null)[] = [];
  for (let i = 0; i < 2; i++) {
    subSlots.push(subs.find((s) => s.slot_index === i) ?? null);
  }

  const renderSlot = (
    slotType: SlotType,
    slotIndex: number,
    member: TeamMemberWithProfile | null
  ) => (
    <TeamSlot
      key={`${slotType}-${slotIndex}`}
      slotType={slotType}
      slotIndex={slotIndex}
      member={member}
      isPresident={isPresident}
      isSelf={member?.user_id === currentUserId}
      isCaptain={member?.is_captain ?? false}
      isTeamPresident={member?.user_id === presidentId}
      accent={accent}
      textPrimary={textPrimary}
      textSecondary={textSecondary}
      textTertiary={textTertiary}
      isDark={isDark}
      onPress={() => onSlotPress(slotType, slotIndex, member)}
      onLongPress={member ? () => onMemberLongPress?.(member) : undefined}
    />
  );

  return (
    <View style={styles.container}>
      {/* President section (only if not playing) */}
      {!presidentIsPlaying && presidentMember && (
        <View style={styles.presidentSection}>
          <View style={styles.presidentCard}>
            {presidentProfile?.avatar_url ? (
              <Image
                source={{ uri: presidentProfile.avatar_url }}
                style={styles.presidentAvatar}
                contentFit="cover"
              />
            ) : (
              <View
                style={[
                  styles.presidentAvatar,
                  styles.avatarPlaceholder,
                  { backgroundColor: `${accent}20` },
                ]}
              >
                <Ionicons name="person" size={16} color={accent} />
              </View>
            )}
            <View style={styles.presidentInfo}>
              <View style={styles.presidentNameRow}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={[styles.presidentName, { color: textPrimary }]}>
                  {presidentProfile?.username ?? 'Unknown'}
                </Text>
                {presidentMember.user_id === currentUserId && (
                  <Text style={[styles.youText, { color: accent }]}>(vous)</Text>
                )}
              </View>
              <Text style={[styles.presidentLabel, { color: textTertiary }]}>
                Président
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Coach slot */}
      <View style={styles.coachSection}>
        <Text style={[styles.sectionLabel, { color: textTertiary }]}>COACH</Text>
        <View style={styles.coachRow}>
          {renderSlot('coach', 0, coach ?? null)}
        </View>
      </View>

      {/* Players - 3 top + 2 bottom */}
      <View style={styles.playersSection}>
        <Text style={[styles.sectionLabel, { color: textTertiary }]}>JOUEURS</Text>
        <View style={styles.playersRow}>
          {renderSlot('player', 0, playerSlots[0])}
          {renderSlot('player', 1, playerSlots[1])}
          {renderSlot('player', 2, playerSlots[2])}
        </View>
        <View style={styles.playersRow}>
          {renderSlot('player', 3, playerSlots[3])}
          {renderSlot('player', 4, playerSlots[4])}
        </View>
      </View>

      {/* Subs - 2 side by side */}
      <View style={styles.subsSection}>
        <Text style={[styles.sectionLabel, { color: textTertiary }]}>REMPLAÇANTS</Text>
        <View style={styles.subsRow}>
          {renderSlot('sub', 0, subSlots[0])}
          {renderSlot('sub', 1, subSlots[1])}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  // President
  presidentSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  presidentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  presidentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  presidentInfo: {
    gap: 2,
  },
  presidentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  presidentName: {
    fontSize: 14,
    fontWeight: '700',
  },
  presidentLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  youText: {
    fontSize: 11,
    fontWeight: '500',
  },
  // Coach
  coachSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  coachRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  // Players
  playersSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  playersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  // Subs
  subsSection: {
    alignItems: 'center',
  },
  subsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
});
