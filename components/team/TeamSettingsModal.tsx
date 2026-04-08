import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { useGameStore } from '@/stores/gameStore';
import { GAME_ACCENTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { Team } from '@/types/database';
import type { TeamMemberWithProfile } from '@/types/composites';

interface TeamSettingsModalProps {
  visible: boolean;
  team: Team;
  members: TeamMemberWithProfile[];
  isPresident: boolean;
  onClose: () => void;
  onTeamUpdated: () => void;
}

export default function TeamSettingsModal({
  visible,
  team,
  members,
  isPresident,
  onClose,
  onTeamUpdated,
}: TeamSettingsModalProps) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useColors();
  const { user } = useAuthStore();
  const selectedGame = useGameStore((s) => s.selectedGame);
  const game = GAME_ACCENTS[selectedGame];

  const [showTransferPicker, setShowTransferPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get eligible members for transfer (not the current president)
  const eligibleForTransfer = members.filter(
    (m) => m.user_id !== team.president_id
  );

  const handleLeave = () => {
    Alert.alert(
      'Leave team',
      `Are you sure you want to leave ${team.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('team_members')
                .delete()
                .eq('team_id', team.id)
                .eq('user_id', user?.id ?? '');

              if (error) throw error;
              onClose();
              onTeamUpdated();
            } catch (err) {
              console.error('[TeamSettings] Leave error:', err);
              Alert.alert('Error', 'Failed to leave team.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleDissolve = () => {
    Alert.alert(
      'Dissolve team',
      `This will permanently delete ${team.name} and remove all members. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dissolve',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('teams')
                .delete()
                .eq('id', team.id);

              if (error) throw error;
              onClose();
              onTeamUpdated();
            } catch (err) {
              console.error('[TeamSettings] Dissolve error:', err);
              Alert.alert('Error', 'Failed to dissolve team.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleTransfer = (newPresidentId: string, username: string) => {
    Alert.alert(
      'Transfer ownership',
      `Transfer ownership of ${team.name} to ${username}? You will become a regular member.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('teams')
                .update({ president_id: newPresidentId })
                .eq('id', team.id);

              if (error) throw error;
              setShowTransferPicker(false);
              onClose();
              onTeamUpdated();
            } catch (err) {
              console.error('[TeamSettings] Transfer error:', err);
              Alert.alert('Error', 'Failed to transfer ownership.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const renderOption = (
    icon: string,
    label: string,
    onPress: () => void,
    danger = false
  ) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={loading}
      style={[
        styles.option,
        { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
      ]}
    >
      <Ionicons
        name={icon as never}
        size={20}
        color={danger ? '#EF4444' : c.textSecondary}
      />
      <Text
        style={[
          styles.optionText,
          { color: danger ? '#EF4444' : c.textPrimary },
        ]}
      >
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
    </TouchableOpacity>
  );

  // Transfer picker view
  if (showTransferPicker) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            onPress={() => setShowTransferPicker(false)}
          />

          <View style={[styles.modalBody, { backgroundColor: c.background, paddingBottom: insets.bottom + 16 }]}>
            {/* Header */}
            <View
              style={[
                styles.header,
                { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
              ]}
            >
              <TouchableOpacity onPress={() => setShowTransferPicker(false)} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={22} color={c.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: c.textPrimary }]}>Transfer Ownership</Text>
              <View style={{ width: 22 }} />
            </View>

            <Text style={[styles.transferHint, { color: c.textTertiary }]}>
              Select a member to become the new President
            </Text>

            {eligibleForTransfer.map((member) => (
              <TouchableOpacity
                key={member.id}
                activeOpacity={0.7}
                onPress={() => handleTransfer(member.user_id, member.profile.username)}
                disabled={loading}
                style={[
                  styles.memberOption,
                  { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                ]}
              >
                <View style={[styles.memberAvatar, { backgroundColor: `${game.accent}20` }]}>
                  <Text style={[styles.memberAvatarText, { color: game.accent }]}>
                    {member.profile.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.memberName, { color: c.textPrimary }]}>
                    {member.profile.username}
                  </Text>
                  <Text style={[styles.memberRole, { color: c.textTertiary }]}>
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {eligibleForTransfer.length === 0 && (
              <Text style={[styles.emptyText, { color: c.textTertiary }]}>
                No other members to transfer to
              </Text>
            )}
          </View>
        </View>
      </Modal>
    );
  }

  // Main settings view
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          onPress={onClose}
        />

        <View style={[styles.modalBody, { backgroundColor: c.background, paddingBottom: insets.bottom + 16 }]}>
          {/* Header */}
          <View
            style={[
              styles.header,
              { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
            ]}
          >
            <Text style={[styles.headerTitle, { color: c.textPrimary }]}>Team Settings</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={c.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={game.accent} />
            </View>
          )}

          {/* Options */}
          <View style={styles.options}>
            {isPresident && (
              <>
                {renderOption('swap-horizontal-outline', 'Transfer Ownership', () => setShowTransferPicker(true))}
                {renderOption('trash-outline', 'Dissolve Team', handleDissolve, true)}
              </>
            )}

            {!isPresident && (
              renderOption('log-out-outline', 'Leave Team', handleLeave, true)
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBody: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    minHeight: 200,
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
  options: {
    paddingTop: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  // Transfer picker
  transferHint: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  memberOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  memberRole: {
    fontSize: 12,
    marginTop: 1,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: 20,
  },
});
