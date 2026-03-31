import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useColors } from '@/hooks/useThemeColors';
import { useGameStore } from '@/stores/gameStore';
import { GAME_ACCENTS } from '@/lib/constants';
import { useTeam } from '@/hooks/useTeam';
import { useTeamInvites } from '@/hooks/useTeamInvites';
import CreateTeamModal from '@/components/CreateTeamModal';
import TeamManagementView from '@/components/TeamManagementView';
import PendingInvitesSection from '@/components/team/PendingInvitesSection';

export default function TeamScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const selectedGame = useGameStore((s) => s.selectedGame);
  const game = GAME_ACCENTS[selectedGame];

  const { team, members, loading, isPresident, refresh } = useTeam();
  const { invites, accept, reject, refresh: refreshInvites } = useTeamInvites();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Re-fetch when tab gains focus (e.g. after editing profile rank)
  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshInvites();
    }, [refresh, refreshInvites])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), refreshInvites()]);
    setRefreshing(false);
  }, [refresh, refreshInvites]);

  const handleTeamCreated = () => {
    setShowCreateModal(false);
    refresh();
  };

  const HEADER_H = 60;

  // Loading
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <View
          style={[
            styles.header,
            {
              height: HEADER_H,
              borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: c.textPrimary }]}>Team</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={game.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            height: HEADER_H,
            borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>Team</Text>
      </View>

      {team ? (
        // Team exists — management view
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={game.accent}
            />
          }
        >
          {/* Pending invites for this game (if any) */}
          {invites.length > 0 && (
            <PendingInvitesSection
              invites={invites}
              hasExistingTeam={true}
              onAccept={async (id) => { await accept(id); await refresh(); }}
              onReject={reject}
            />
          )}

          <TeamManagementView
            team={team}
            members={members}
            isPresident={isPresident}
            onRefresh={onRefresh}
          />
        </ScrollView>
      ) : (
        // No team — empty state + pending invites
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={game.accent}
            />
          }
        >
          {/* Pending invites */}
          {invites.length > 0 && (
            <PendingInvitesSection
              invites={invites}
              hasExistingTeam={false}
              onAccept={async (id) => { await accept(id); await refresh(); }}
              onReject={reject}
            />
          )}

          {/* Empty state */}
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
              ]}
            >
              <Ionicons name="people-outline" size={28} color={c.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>No team</Text>
            <Text style={[styles.emptySubtitle, { color: c.textTertiary }]}>
              Create or join a team{'\n'}to start scrimming.
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowCreateModal(true)}
              style={[styles.createBtn, { backgroundColor: game.accent }]}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.createBtnText}>Create Team</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Create Team Modal */}
      <CreateTeamModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleTeamCreated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    minHeight: 400,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
