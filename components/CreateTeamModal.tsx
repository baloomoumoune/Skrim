import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Modal,
  TextInput,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Share,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useColors } from '@/hooks/useThemeColors';
import { useGameStore } from '@/stores/gameStore';
import { useAuthStore } from '@/stores/authStore';
import { GAME_ACCENTS, type GameId } from '@/lib/constants';
import { getGameLogoUrl } from '@/lib/game-assets';
import { supabase } from '@/lib/supabase';
import { TeamInitials } from '@/components/TeamInitials';
import type { Profile, Region, Team } from '@/types/database';

type StepId = 'info' | 'invite';

const REGIONS: { id: Region; label: string }[] = [
  { id: 'eu', label: 'EU' },
  { id: 'na', label: 'NA' },
  { id: 'apac', label: 'APAC' },
  { id: 'sa', label: 'SA' },
  { id: 'me', label: 'ME' },
  { id: 'oce', label: 'OCE' },
];

const ALL_GAMES = Object.values(GAME_ACCENTS);

interface CreateTeamModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateTeamModal({ visible, onClose, onCreated }: CreateTeamModalProps) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useColors();
  const selectedGame = useGameStore((s) => s.selectedGame);
  const game = GAME_ACCENTS[selectedGame];
  const { user, profile } = useAuthStore();

  // Step state
  const [stepIndex, setStepIndex] = useState(0);
  const steps: StepId[] = ['info', 'invite'];
  const currentStepId = steps[stepIndex];
  const totalSteps = steps.length;

  // Step 1: Team info
  const [teamName, setTeamName] = useState('');
  const [teamTag, setTeamTag] = useState('');
  const [teamGame, setTeamGame] = useState<GameId>(selectedGame);
  const [teamRegion, setTeamRegion] = useState<Region>(profile?.region ?? 'eu');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showGameDropdown, setShowGameDropdown] = useState(false);

  // Step 2: Invite
  const [createdTeam, setCreatedTeam] = useState<Team | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<(Profile & { teamTag?: string })[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingInviteIds, setPendingInviteIds] = useState<Set<string>>(new Set());
  const [copiedLink, setCopiedLink] = useState(false);

  const [creating, setCreating] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch pending invites + realtime when on invite step
  const fetchPendingInvites = useCallback(async () => {
    if (!createdTeam) return;
    try {
      const { data } = await supabase
        .from('team_invites')
        .select('invited_user_id')
        .eq('team_id', createdTeam.id)
        .eq('status', 'pending');

      const ids = new Set((data ?? []).map((d: { invited_user_id: string }) => d.invited_user_id));
      setPendingInviteIds(ids);
    } catch (err) {
      if (__DEV__) console.error('[CreateTeam] Fetch pending invites error:', err);
    }
  }, [createdTeam]);

  useEffect(() => {
    if (currentStepId !== 'invite' || !createdTeam) return;

    fetchPendingInvites();

    const channel = supabase
      .channel(`team_invites:create:${createdTeam.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_invites',
          filter: `team_id=eq.${createdTeam.id}`,
        },
        () => {
          fetchPendingInvites();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentStepId, createdTeam, fetchPendingInvites]);

  const resetState = useCallback(() => {
    setStepIndex(0);
    setTeamName('');
    setTeamTag('');
    setTeamGame(selectedGame);
    setTeamRegion(profile?.region ?? 'eu');
    setDescription('');
    setPhotoUri(null);
    setShowGameDropdown(false);
    setCreatedTeam(null);
    setSearchQuery('');
    setSearchResults([]);
    setSearching(false);
    setPendingInviteIds(new Set());
    setCopiedLink(false);
    setCreating(false);
  }, [selectedGame, profile?.region]);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSelectGame = (gameId: GameId) => {
    const g = GAME_ACCENTS[gameId];
    if ('disabled' in g && g.disabled) return;
    setTeamGame(gameId);
    setShowGameDropdown(false);
  };

  const handleCreate = async () => {
    if (!user || !profile) return;

    const name = teamName.trim();
    const tag = teamTag.trim().toUpperCase();

    if (!name) {
      Alert.alert('Missing info', 'Team name is required.');
      return;
    }
    if (!tag) {
      Alert.alert('Missing info', 'Team tag is required.');
      return;
    }

    setCreating(true);
    try {
      // Insert team
      const payload = {
        name,
        tag,
        game: teamGame,
        region: teamRegion,
        description: description.trim() || null,
        president_id: user.id,
        rank_tier: profile.current_rank,
        logo_url: null as string | null,
      };

      const { data, error } = await supabase
        .from('teams')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      const team = data as Team;

      // Add president as member (ignore duplicate if a DB trigger already inserted it)
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({ team_id: team.id, user_id: user.id, role: 'president' });

      if (memberError && memberError.code !== '23505') {
        console.error('[CreateTeam] Member insert error:', memberError);
      }

      // Upload photo if selected
      if (photoUri) {
        try {
          const ext = photoUri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
          const filePath = `${team.id}.${ext}`;
          const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

          // Read file as arraybuffer via fetch (works in Expo Go & dev builds)
          const response = await fetch(photoUri);
          const blob = await response.blob();
          const arrayBuffer = await new Response(blob).arrayBuffer();

          const { error: uploadError } = await supabase.storage
            .from('team-logos')
            .upload(filePath, arrayBuffer, {
              upsert: true,
              contentType,
            });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('team-logos')
            .getPublicUrl(filePath);

          const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

          await supabase
            .from('teams')
            .update({ logo_url: logoUrl })
            .eq('id', team.id);

          team.logo_url = logoUrl;
        } catch (uploadErr) {
          console.error('[CreateTeam] Photo upload error:', uploadErr);
        }
      }

      if (__DEV__) console.log('[CreateTeam] Team created:', team.id);
      setCreatedTeam(team);
      setStepIndex(1);
    } catch (err) {
      console.error('[CreateTeam] Error:', err);
      Alert.alert('Error', 'Failed to create team.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!createdTeam) return;
    const link = `skrim://invite/${createdTeam.invite_code}`;
    await Clipboard.setStringAsync(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareLink = async () => {
    if (!createdTeam) return;
    const link = `skrim://invite/${createdTeam.invite_code}`;
    await Share.share({ message: `Join my team on Scrim! ${link}` });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (query.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', `%${query.trim()}%`)
          .neq('id', user?.id ?? '')
          .limit(15);

        if (error) throw error;
        const profiles = (data ?? []) as Profile[];

        // Fetch team tags for results
        if (profiles.length > 0) {
          const { data: teamData } = await supabase
            .from('team_members')
            .select('user_id, team:teams(tag, game)')
            .in('user_id', profiles.map((p) => p.id));

          const tagMap: Record<string, string> = {};
          for (const row of (teamData ?? []) as unknown as { user_id: string; team: { tag: string; game: string } }[]) {
            if (row.team && row.team.game === teamGame) {
              tagMap[row.user_id] = row.team.tag;
            }
          }
          setSearchResults(profiles.map((p) => ({ ...p, teamTag: tagMap[p.id] })));
        } else {
          setSearchResults(profiles);
        }
      } catch (err) {
        if (__DEV__) console.error('[CreateTeam] Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const handleInvitePlayer = async (playerId: string) => {
    if (!createdTeam || !user) return;

    try {
      const { error } = await supabase
        .from('team_invites')
        .insert({
          team_id: createdTeam.id,
          invited_user_id: playerId,
          invited_by: user.id,
        });

      if (error) throw error;

      setPendingInviteIds((prev) => new Set(prev).add(playerId));
    } catch (err) {
      console.error('[CreateTeam] Invite error:', err);
      Alert.alert('Error', 'Failed to send invite.');
    }
  };

  const handleDone = () => {
    handleClose();
    onCreated();
  };

  // ── Render Step 1: Info ────────────────────────────
  const renderInfoStep = () => {
    const gameConfig = GAME_ACCENTS[teamGame];

    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.stepTitle, { color: c.textPrimary }]}>Create your team</Text>
        <Text style={[styles.stepSubtitle, { color: c.textSecondary }]}>
          Set up your team identity
        </Text>

        {/* Team Photo */}
        <View style={styles.photoSection}>
          <TouchableOpacity activeOpacity={0.7} onPress={handlePickPhoto} style={styles.photoBtn}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} contentFit="cover" />
            ) : teamTag.trim() ? (
              <TeamInitials tag={teamTag.trim()} size={80} />
            ) : (
              <View style={[styles.photoPlaceholder, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <Ionicons name="camera-outline" size={28} color={c.textTertiary} />
              </View>
            )}
            <View style={[styles.photoBadge, { backgroundColor: game.accent }]}>
              <Ionicons name="pencil" size={10} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.photoHint, { color: c.textTertiary }]}>Team logo (optional)</Text>
        </View>

        {/* Team Name */}
        <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Team Name *</Text>
        <TextInput
          value={teamName}
          onChangeText={(t) => setTeamName(t.slice(0, 30))}
          placeholder="e.g. DRAVA Esport"
          placeholderTextColor={c.textTertiary}
          style={[
            styles.input,
            {
              color: c.textPrimary,
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        />

        {/* Team Tag */}
        <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Tag *</Text>
        <TextInput
          value={teamTag}
          onChangeText={(t) => setTeamTag(t.slice(0, 5).toUpperCase())}
          placeholder="e.g. DRV"
          placeholderTextColor={c.textTertiary}
          autoCapitalize="characters"
          style={[
            styles.input,
            {
              color: c.textPrimary,
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        />

        {/* Game Selector */}
        <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Game</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowGameDropdown(!showGameDropdown)}
          style={[
            styles.gameSelector,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          <Image
            source={{ uri: getGameLogoUrl(gameConfig.logo) }}
            style={styles.gameLogo}
            contentFit="contain"
          />
          <Text style={[styles.gameLabel, { color: c.textPrimary }]}>{gameConfig.name}</Text>
          <Ionicons
            name={showGameDropdown ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={c.textTertiary}
          />
        </TouchableOpacity>

        {/* Game Dropdown */}
        {showGameDropdown && (
          <View
            style={[
              styles.dropdownCard,
              {
                backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              },
            ]}
          >
            {ALL_GAMES.map((g, index) => {
              const isActive = g.id === teamGame;
              const isDisabled = 'disabled' in g && g.disabled;
              const isLast = index === ALL_GAMES.length - 1;

              return (
                <TouchableOpacity
                  key={g.id}
                  activeOpacity={isDisabled ? 1 : 0.6}
                  onPress={() => handleSelectGame(g.id as GameId)}
                  disabled={isDisabled}
                  style={[
                    styles.dropdownRow,
                    {
                      opacity: isDisabled ? 0.35 : 1,
                      borderBottomWidth: isLast ? 0 : 0.5,
                      borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                >
                  <Image
                    source={{ uri: getGameLogoUrl(g.logo) }}
                    style={styles.dropdownLogo}
                    contentFit="contain"
                  />
                  <Text
                    style={{
                      flex: 1,
                      marginLeft: 12,
                      fontSize: 15,
                      fontWeight: '600',
                      color: isActive ? game.accent : c.textPrimary,
                    }}
                  >
                    {g.name}
                  </Text>
                  {isDisabled && (
                    <Text style={{ fontSize: 11, color: c.textTertiary }}>Coming soon</Text>
                  )}
                  {isActive && <Ionicons name="checkmark-circle" size={20} color={game.accent} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Region */}
        <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Region</Text>
        <View style={styles.regionRow}>
          {REGIONS.map((r) => {
            const isActive = r.id === teamRegion;
            return (
              <TouchableOpacity
                key={r.id}
                activeOpacity={0.7}
                onPress={() => setTeamRegion(r.id)}
                style={[
                  styles.regionChip,
                  {
                    backgroundColor: isActive
                      ? game.accent
                      : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    borderColor: isActive
                      ? game.accent
                      : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.regionLabel,
                    { color: isActive ? '#FFFFFF' : c.textSecondary },
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description */}
        <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Description</Text>
        <TextInput
          value={description}
          onChangeText={(t) => setDescription(t.slice(0, 200))}
          placeholder="Tell others about your team..."
          placeholderTextColor={c.textTertiary}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={[
            styles.input,
            styles.textArea,
            {
              color: c.textPrimary,
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        />
        <Text style={[styles.charCount, { color: c.textTertiary }]}>
          {description.length}/200
        </Text>
      </View>
    );
  };

  // ── Render Step 2: Invite ──────────────────────────
  const renderInviteStep = () => {
    const inviteLink = createdTeam ? `skrim://invite/${createdTeam.invite_code}` : '';

    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.stepTitle, { color: c.textPrimary }]}>Invite your squad</Text>
        <Text style={[styles.stepSubtitle, { color: c.textSecondary }]}>
          Share the link or search for players
        </Text>

        {/* Invite Link Card */}
        <View
          style={[
            styles.inviteLinkCard,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          <Ionicons name="link-outline" size={18} color={game.accent} />
          <Text
            style={[styles.inviteLinkText, { color: c.textPrimary }]}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {inviteLink}
          </Text>
        </View>

        <View style={styles.inviteActions}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleCopyLink}
            style={[
              styles.inviteActionBtn,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              },
            ]}
          >
            <Ionicons name={copiedLink ? 'checkmark' : 'copy-outline'} size={16} color={copiedLink ? '#38A169' : c.textSecondary} />
            <Text style={[styles.inviteActionText, { color: copiedLink ? '#38A169' : c.textSecondary }]}>
              {copiedLink ? 'Copied!' : 'Copy'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleShareLink}
            style={[
              styles.inviteActionBtn,
              { backgroundColor: game.accent, borderColor: game.accent },
            ]}
          >
            <Ionicons name="share-outline" size={16} color="#FFFFFF" />
            <Text style={[styles.inviteActionText, { color: '#FFFFFF' }]}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Search Players */}
        <Text style={[styles.fieldLabel, { color: c.textSecondary, marginTop: 24 }]}>
          Search players
        </Text>
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
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search by username..."
            placeholderTextColor={c.textTertiary}
            style={[styles.searchInput, { color: c.textPrimary }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searching && <ActivityIndicator size="small" color={c.textTertiary} />}
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            style={{ marginTop: 8 }}
            renderItem={({ item }) => {
              const isInvited = pendingInviteIds.has(item.id);
              return (
                <View
                  style={[
                    styles.playerRow,
                    {
                      borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                >
                  {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={styles.playerAvatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.playerAvatarPlaceholder, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                      <Text style={[styles.playerAvatarLetter, { color: c.textTertiary }]}>
                        {item.username.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={[styles.playerName, { color: c.textPrimary }]}>
                        {item.username}
                      </Text>
                      {item.teamTag && (
                        <Text style={{ fontSize: 12, fontWeight: '500', color: c.textTertiary }}>
                          #{item.teamTag}
                        </Text>
                      )}
                    </View>
                    {item.current_rank && (
                      <Text style={[styles.playerRank, { color: c.textTertiary }]}>
                        {item.current_rank.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleInvitePlayer(item.id)}
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
                </View>
              );
            }}
          />
        )}

        {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
          <Text style={[styles.noResults, { color: c.textTertiary }]}>
            No players found
          </Text>
        )}
      </View>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStepId) {
      case 'info':
        return renderInfoStep();
      case 'invite':
        return renderInviteStep();
      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          onPress={handleClose}
        />

        <View
          style={[
            styles.modalBody,
            { backgroundColor: c.background },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
            ]}
          >
            <Text style={[styles.modalTitle, { color: c.textPrimary }]}>Create Team</Text>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={c.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Progress dots */}
          <View style={styles.progressRow}>
            {Array.from({ length: totalSteps }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: i <= stepIndex ? game.accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                    width: i === stepIndex ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>

          {/* Active step */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
            {renderCurrentStep()}
          </ScrollView>

          {/* Bottom nav */}
          <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 12 }]}>
            {stepIndex > 0 && currentStepId === 'invite' ? (
              <View />
            ) : stepIndex > 0 ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setStepIndex(stepIndex - 1)}
                style={[
                  styles.backBtn,
                  { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' },
                ]}
              >
                <Ionicons name="arrow-back" size={18} color={c.textSecondary} />
                <Text style={[styles.backBtnText, { color: c.textSecondary }]}>Back</Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}

            {currentStepId === 'info' ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleCreate}
                disabled={creating || !teamName.trim() || !teamTag.trim()}
                style={[
                  styles.nextBtn,
                  {
                    backgroundColor: game.accent,
                    opacity: creating || !teamName.trim() || !teamTag.trim() ? 0.5 : 1,
                  },
                ]}
              >
                {creating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.nextBtnText}>Create</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.inviteBottomRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleDone}
                  style={[
                    styles.skipBtn,
                    { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' },
                  ]}
                >
                  <Text style={[styles.skipBtnText, { color: c.textSecondary }]}>
                    {pendingInviteIds.size > 0 ? 'Done' : 'Skip'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
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
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  progressDot: {
    height: 4,
    borderRadius: 2,
  },
  stepContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    marginBottom: 28,
  },
  // Photo
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoBtn: {
    position: 'relative',
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  photoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHint: {
    fontSize: 11,
    marginTop: 6,
  },
  // Fields
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 72,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
  // Game selector
  gameSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  gameLogo: {
    width: 24,
    height: 24,
  },
  gameLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  // Dropdown
  dropdownCard: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dropdownLogo: {
    width: 28,
    height: 28,
  },
  // Region
  regionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  regionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  regionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Invite link
  inviteLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  inviteLinkText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  inviteActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  inviteActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Search
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
  // Player results
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  playerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerAvatarLetter: {
    fontSize: 14,
    fontWeight: '700',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  playerRank: {
    fontSize: 11,
    marginTop: 1,
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
  noResults: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 13,
  },
  // Bottom nav
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inviteBottomRow: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'flex-end',
  },
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
