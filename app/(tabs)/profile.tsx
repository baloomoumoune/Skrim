import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore, ThemePreference } from '@/stores/themeStore';
import { useColors } from '@/hooks/useThemeColors';
import { useGameStore } from '@/stores/gameStore';
import { useGameAssets } from '@/hooks/useGameAssets';
import { GAME_ACCENTS, GAME_MULTIPLATFORM } from '@/lib/constants';
import { formatRank } from '@/lib/game-assets';
import type { Platform, Region } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { useTeam } from '@/hooks/useTeam';
import { TeamInitials } from '@/components/TeamInitials';
import AssetPickerModal, { PickerItem } from '@/components/AssetPickerModal';
import BottomSheetEditor from '@/components/BottomSheetEditor';
import StepRegion from '@/components/onboarding/StepRegion';
import StepServers from '@/components/onboarding/StepServers';
import StepLanguages from '@/components/onboarding/StepLanguages';
import StepVoice from '@/components/onboarding/StepVoice';
import { getRegionLabel } from '@/lib/valorant-regions';
import { getServerById } from '@/lib/valorant-servers';
import { getLanguageByCode } from '@/lib/languages';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'system', label: 'Auto', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, setProfile } = useAuthStore();
  const { colorScheme } = useColorScheme();
  const { preference, setPreference } = useThemeStore();
  const c = useColors();
  const isDark = colorScheme === 'dark';
  const selectedGame = useGameStore((s) => s.selectedGame);
  const game = GAME_ACCENTS[selectedGame];
  const { agents, ranks, agentUrl, rankUrl } = useGameAssets();
  const isMultiplatform = GAME_MULTIPLATFORM[selectedGame] ?? false;
  const { team: currentTeam } = useTeam();
  const params = useLocalSearchParams<{ openRankEditor?: string }>();
  const router = useRouter();

  // Modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRankPicker, setShowRankPicker] = useState(false);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Find Lasts editors
  const [showRegionEditor, setShowRegionEditor] = useState(false);
  const [showServersEditor, setShowServersEditor] = useState(false);
  const [showLanguagesEditor, setShowLanguagesEditor] = useState(false);
  const [showVoiceEditor, setShowVoiceEditor] = useState(false);

  // Local draft state for editors
  const [draftRegion, setDraftRegion] = useState<Region | null>(null);
  const [draftServers, setDraftServers] = useState<string[]>([]);
  const [draftPrimaryLang, setDraftPrimaryLang] = useState<string>('en');
  const [draftSecondaryLangs, setDraftSecondaryLangs] = useState<string[]>([]);
  const [savingField, setSavingField] = useState(false);
  const [profileServers, setProfileServers] = useState<string[]>([]);

  // Hydrate the user's saved servers
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profile_servers')
        .select('server_id')
        .eq('profile_id', user.id);
      if (cancelled) return;
      setProfileServers((data ?? []).map((r) => r.server_id));
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Auto-open rank picker when navigated with ?openRankEditor=true (from Home banner CTA)
  useEffect(() => {
    if (params.openRankEditor === 'true') {
      setShowRankPicker(true);
      router.setParams({ openRankEditor: undefined });
    }
  }, [params.openRankEditor, router]);

  // Resolve stored IDs to metadata
  const currentRankMeta = ranks.find((r) => r.id === profile?.current_rank) ?? null;
  const mainAgentMeta = agents.find((a) => a.id === profile?.main_agent) ?? null;

  // Build picker items
  const rankItems: PickerItem[] = ranks.map((r) => ({
    id: r.id,
    name: r.name,
    imageUrl: rankUrl(r.image),
  }));

  const agentItems: PickerItem[] = agents.map((a) => ({
    id: a.id,
    name: a.name,
    imageUrl: agentUrl(a.image, a.role),
    group: a.role,
  }));

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0] || !user || !profile) return;

    setUploadingAvatar(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
      const filePath = `${user.id}.${ext}`;

      // Read file as arraybuffer via fetch (works in Expo Go & dev builds)
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      // Upload to Supabase Storage (avatars bucket)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          upsert: true,
          contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache-buster to force refresh
      const newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile in DB
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: newAvatarUrl });
      if (__DEV__) console.log('[Profile] Avatar updated:', newAvatarUrl);
    } catch (err) {
      console.error('[Profile] Avatar upload error:', err);
      Alert.alert('Error', 'Failed to upload avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRankSelect = async (id: string) => {
    if (!user || !profile) return;
    setShowRankPicker(false);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ current_rank: id })
        .eq('id', user.id);
      if (error) throw error;
      setProfile({ ...profile, current_rank: id });

      // Recalculate team rank
      {
        try {
          const { data: memberData } = await supabase
            .from('team_members')
            .select('team_id, teams(game)')
            .eq('user_id', user.id);

          if (memberData) {
            const entry = (memberData as { team_id: string; teams: { game: string } }[])
              .find((m) => m.teams.game === selectedGame);
            if (entry) {
              const rankIds = ranks.map((r) => r.id);
              await supabase.rpc('recalculate_team_rank', {
                p_team_id: entry.team_id,
                p_rank_order: rankIds,
              });
            }
          }
        } catch (err) {
          if (__DEV__) console.error('[Profile] Rank recalc error:', err);
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to update rank.');
    }
  };

  const handleAgentSelect = async (id: string) => {
    if (!user || !profile) return;
    setShowAgentPicker(false);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ main_agent: id })
        .eq('id', user.id);
      if (error) throw error;
      setProfile({ ...profile, main_agent: id });
    } catch {
      Alert.alert('Error', 'Failed to update agent.');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          if (__DEV__) console.log('[Profile] Signing out...');
          await useAuthStore.getState().signOut();
        },
      },
    ]);
  };

  // Birthdate badge
  const ageInfo = useMemo(() => {
    if (!profile?.birthdate) return { years: null as number | null, badge: '—' };
    const ms = Date.now() - new Date(profile.birthdate).getTime();
    const years = Math.floor(ms / (365.25 * 24 * 3600 * 1000));
    return { years, badge: years >= 18 ? '18+' : 'Under 18' };
  }, [profile?.birthdate]);

  const formattedBirthdate = useMemo(() => {
    if (!profile?.birthdate) return '—';
    return new Date(profile.birthdate).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [profile?.birthdate]);

  const openRegionEditor = () => {
    setDraftRegion((profile?.region as Region | undefined) ?? null);
    setShowRegionEditor(true);
  };

  const openServersEditor = () => {
    setDraftServers(profileServers);
    setShowServersEditor(true);
  };

  const openLanguagesEditor = () => {
    setDraftPrimaryLang(profile?.primary_language ?? 'en');
    setDraftSecondaryLangs(profile?.secondary_languages ?? []);
    setShowLanguagesEditor(true);
  };

  const saveRegion = async () => {
    if (!user || !profile || !draftRegion || draftRegion === profile.region) {
      setShowRegionEditor(false);
      return;
    }
    Alert.alert(
      'Change region?',
      'Changing your region will clear your selected servers. You will be asked to pick new ones.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          style: 'destructive',
          onPress: async () => {
            setSavingField(true);
            try {
              await supabase.from('profile_servers').delete().eq('profile_id', user.id);
              const { error } = await supabase
                .from('profiles')
                .update({ region: draftRegion })
                .eq('id', user.id);
              if (error) throw error;
              setProfile({ ...profile, region: draftRegion });
              setProfileServers([]);
              setShowRegionEditor(false);
              setDraftServers([]);
              setShowServersEditor(true);
            } catch {
              Alert.alert('Error', 'Failed to update region.');
            } finally {
              setSavingField(false);
            }
          },
        },
      ],
    );
  };

  const saveServers = async () => {
    if (!user) return;
    setSavingField(true);
    try {
      await supabase.from('profile_servers').delete().eq('profile_id', user.id);
      if (draftServers.length > 0) {
        const rows = draftServers.map((server_id) => ({ profile_id: user.id, server_id }));
        const { error } = await supabase.from('profile_servers').insert(rows);
        if (error) throw error;
      }
      setProfileServers(draftServers);
      setShowServersEditor(false);
    } catch {
      Alert.alert('Error', 'Failed to update servers.');
    } finally {
      setSavingField(false);
    }
  };

  const saveLanguages = async () => {
    if (!user || !profile) return;
    setSavingField(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          primary_language: draftPrimaryLang,
          secondary_languages: draftSecondaryLangs,
        })
        .eq('id', user.id);
      if (error) throw error;
      setProfile({
        ...profile,
        primary_language: draftPrimaryLang,
        secondary_languages: draftSecondaryLangs,
      });
      setShowLanguagesEditor(false);
    } catch {
      Alert.alert('Error', 'Failed to update languages.');
    } finally {
      setSavingField(false);
    }
  };

  const saveVoice = async (next: boolean) => {
    if (!user || !profile) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ voice_enabled: next })
        .eq('id', user.id);
      if (error) throw error;
      setProfile({ ...profile, voice_enabled: next });
      setShowVoiceEditor(false);
    } catch {
      Alert.alert('Error', 'Failed to update voice setting.');
    }
  };

  const handlePlatformChange = (next: Platform) => {
    if (!user || !profile || profile.platform === next) return;
    Alert.alert(
      'Change platform?',
      'Changing your platform changes who you see in Find — not who can see you. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('profiles')
                .update({ platform: next })
                .eq('id', user.id);
              if (error) throw error;
              setProfile({ ...profile, platform: next });
            } catch {
              Alert.alert('Error', 'Failed to update platform.');
            }
          },
        },
      ],
    );
  };

  const cardStyle = {
    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    borderWidth: 0.5,
    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
  };

  const dividerColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';

  const renderAvatar = (size: number, showEditBadge = false) => {
    const content = profile?.avatar_url ? (
      <Image
        source={{ uri: profile.avatar_url }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: game.accent,
        }}
      />
    ) : (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: game.accent,
          backgroundColor: `${game.accent}18`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontSize: size * 0.38,
            fontWeight: '700',
            color: game.accent,
          }}
        >
          {(profile?.username?.[0] ?? '?').toUpperCase()}
        </Text>
      </View>
    );

    if (!showEditBadge) return content;

    return (
      <View>
        {content}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: game.accent,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: c.background,
          }}
        >
          <Ionicons name="camera" size={12} color="#fff" />
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: c.background, paddingTop: insets.top }}>
      {/* Header */}
      <View
        style={{
          height: 60,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          borderBottomWidth: 0.5,
          borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.5 }}>
          Profile
        </Text>
        <TouchableOpacity onPress={() => setShowSettingsModal(true)} activeOpacity={0.7}>
          <Ionicons name="settings-outline" size={22} color={c.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header: Avatar + Username + Team */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          {renderAvatar(80)}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text className="text-[22px] font-bold" style={{ color: c.textPrimary, letterSpacing: -0.5 }}>
                {profile?.username ?? 'Unknown'}
              </Text>
              {currentTeam && (
                <Text style={{ fontSize: 14, fontWeight: '500', color: c.textTertiary }}>
                  #{currentTeam.tag}
                </Text>
              )}
            </View>
            {isMultiplatform && profile?.platform && (
              <View className="flex-row items-center gap-1.5 mt-1">
                <Ionicons
                  name={profile.platform === 'console' ? 'game-controller-outline' : 'desktop-outline'}
                  size={13}
                  color={c.textTertiary}
                />
                <Text style={{ fontSize: 12, fontWeight: '500', color: c.textTertiary }}>
                  {profile.platform === 'console' ? 'Console' : 'PC'}
                </Text>
              </View>
            )}
          </View>
          {currentTeam && (
            <View style={{ alignItems: 'center', gap: 4, marginRight: 30 }}>
              {currentTeam.logo_url ? (
                <Image
                  source={{ uri: currentTeam.logo_url }}
                  style={{ width: 44, height: 44, borderRadius: 22 }}
                />
              ) : (
                <TeamInitials tag={currentTeam.tag} size={44} />
              )}
              <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '600', color: c.textSecondary }}>
                {currentTeam.name}
              </Text>
            </View>
          )}
        </View>

        {/* Stats Row: Rank / Peak / Agent */}
        <View
          className="flex-row rounded-2xl overflow-hidden mb-4"
          style={cardStyle}
        >
          {/* Current Rank */}
          <View className="flex-1 items-center py-3" style={{ borderRightWidth: 0.5, borderRightColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, color: c.textTertiary, marginBottom: 6 }}>
              Rank
            </Text>
            {currentRankMeta ? (
              <Image
                source={{ uri: rankUrl(currentRankMeta.image) }}
                style={{ width: 40, height: 40 }}
                resizeMode="contain"
              />
            ) : (
              <Ionicons name="shield-outline" size={36} color={c.textTertiary} />
            )}
            <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '600', marginTop: 4, color: c.textSecondary }}>
              {currentRankMeta?.name ?? '—'}
            </Text>
          </View>

          {/* Main Agent */}
          <View className="flex-1 items-center py-3">
            <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, color: c.textTertiary, marginBottom: 6 }}>
              Agent
            </Text>
            {mainAgentMeta ? (
              <Image
                source={{ uri: agentUrl(mainAgentMeta.image, mainAgentMeta.role) }}
                style={{ width: 40, height: 40 }}
                resizeMode="contain"
              />
            ) : (
              <Ionicons name="person-outline" size={36} color={c.textTertiary} />
            )}
            <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '600', marginTop: 4, color: c.textSecondary }}>
              {mainAgentMeta?.name ?? '—'}
            </Text>
          </View>
        </View>

        {/* Edit Profile button */}
        <TouchableOpacity
          className="flex-row items-center justify-center gap-2 rounded-xl py-3 mb-8"
          style={{
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
          }}
          onPress={() => setShowEditModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil" size={14} color={c.textSecondary} />
          <Text className="text-[13px] font-semibold" style={{ color: c.textSecondary }}>
            Edit Profile
          </Text>
        </TouchableOpacity>

        {/* Section: Game Stats (empty for now) */}
        <Text
          className="text-[11px] font-bold uppercase tracking-[3px] mb-3"
          style={{ color: c.textTertiary }}
        >
          Game Stats
        </Text>
        <View className="rounded-2xl overflow-hidden mb-8 items-center justify-center py-6" style={cardStyle}>
          <Text className="text-[13px]" style={{ color: c.textTertiary }}>
            Coming soon
          </Text>
        </View>

      </ScrollView>

      {/* ── Edit Profile Modal ─────────────────────────── */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableOpacity
            style={{ height: 60 + insets.top }}
            onPress={() => setShowEditModal(false)}
            activeOpacity={1}
          />
          <View
            style={{
              flex: 1,
              backgroundColor: c.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 16,
                borderBottomWidth: 0.5,
                borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.3 }}>
                Edit Profile
              </Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={c.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 + insets.bottom }}
              showsVerticalScrollIndicator={false}
            >
              {/* Avatar edit */}
              <View style={{ alignItems: 'center', marginBottom: 32 }}>
                <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.7} disabled={uploadingAvatar}>
                  {uploadingAvatar ? (
                    <View
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: 48,
                        borderWidth: 2,
                        borderColor: game.accent,
                        backgroundColor: `${game.accent}18`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ActivityIndicator color={game.accent} />
                    </View>
                  ) : (
                    renderAvatar(96, true)
                  )}
                </TouchableOpacity>
                <Text style={{ fontSize: 13, color: c.textSecondary, marginTop: 8 }}>
                  Tap to change photo
                </Text>
              </View>

              {/* Current Rank */}
              <TouchableOpacity
                className="flex-row items-center justify-between px-4 py-4 rounded-2xl mb-3"
                style={cardStyle}
                onPress={() => setShowRankPicker(true)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center gap-3">
                  <Ionicons name="shield-outline" size={18} color={c.textSecondary} />
                  <Text className="text-[14px]" style={{ color: c.textPrimary }}>Current Rank</Text>
                </View>
                {currentRankMeta ? (
                  <View className="flex-row items-center gap-2">
                    <Image
                      source={{ uri: rankUrl(currentRankMeta.image) }}
                      style={{ width: 28, height: 28 }}
                      resizeMode="contain"
                    />
                    <Text className="text-[13px] font-medium" style={{ color: c.textSecondary }}>
                      {currentRankMeta.name}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={c.textTertiary} />
                  </View>
                ) : (
                  <View className="flex-row items-center gap-1">
                    <Text className="text-[13px]" style={{ color: c.textTertiary }}>Select</Text>
                    <Ionicons name="chevron-forward" size={14} color={c.textTertiary} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Main Agent */}
              <TouchableOpacity
                className="flex-row items-center justify-between px-4 py-4 rounded-2xl mb-3"
                style={cardStyle}
                onPress={() => setShowAgentPicker(true)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center gap-3">
                  <Ionicons name="person-outline" size={18} color={c.textSecondary} />
                  <Text className="text-[14px]" style={{ color: c.textPrimary }}>Main Agent</Text>
                </View>
                {mainAgentMeta ? (
                  <View className="flex-row items-center gap-2">
                    <Image
                      source={{ uri: agentUrl(mainAgentMeta.image, mainAgentMeta.role) }}
                      style={{ width: 28, height: 28 }}
                      resizeMode="contain"
                    />
                    <Text className="text-[13px] font-medium" style={{ color: c.textSecondary }}>
                      {mainAgentMeta.name}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={c.textTertiary} />
                  </View>
                ) : (
                  <View className="flex-row items-center gap-1">
                    <Text className="text-[13px]" style={{ color: c.textTertiary }}>Select</Text>
                    <Ionicons name="chevron-forward" size={14} color={c.textTertiary} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Servers */}
              <TouchableOpacity
                className="flex-row items-center justify-between px-4 py-4 rounded-2xl mb-3"
                style={cardStyle}
                onPress={openServersEditor}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center gap-3">
                  <Ionicons name="server-outline" size={18} color={c.textSecondary} />
                  <Text className="text-[14px]" style={{ color: c.textPrimary }}>Servers</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Text className="text-[13px] font-medium" style={{ color: c.textSecondary }} numberOfLines={1}>
                    {profileServers.length === 0
                      ? 'Select'
                      : profileServers.length === 1
                        ? (getServerById(profileServers[0])?.displayName ?? '1 server')
                        : `${profileServers.length} servers`}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={c.textTertiary} />
                </View>
              </TouchableOpacity>

              {/* Languages */}
              <TouchableOpacity
                className="flex-row items-center justify-between px-4 py-4 rounded-2xl mb-3"
                style={cardStyle}
                onPress={openLanguagesEditor}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center gap-3">
                  <Ionicons name="chatbubbles-outline" size={18} color={c.textSecondary} />
                  <Text className="text-[14px]" style={{ color: c.textPrimary }}>Languages</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Text className="text-[13px] font-medium" style={{ color: c.textSecondary }}>
                    {(() => {
                      const primary = getLanguageByCode(profile?.primary_language ?? 'en')?.native ?? 'EN';
                      const extra = profile?.secondary_languages?.length ?? 0;
                      return extra > 0 ? `${primary} +${extra}` : primary;
                    })()}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={c.textTertiary} />
                </View>
              </TouchableOpacity>

              {/* Voice */}
              <TouchableOpacity
                className="flex-row items-center justify-between px-4 py-4 rounded-2xl"
                style={cardStyle}
                onPress={() => setShowVoiceEditor(true)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center gap-3">
                  <Ionicons
                    name={profile?.voice_enabled ? 'mic' : 'mic-off'}
                    size={18}
                    color={c.textSecondary}
                  />
                  <Text className="text-[14px]" style={{ color: c.textPrimary }}>Voice chat</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Text className="text-[13px] font-medium" style={{ color: c.textSecondary }}>
                    {profile?.voice_enabled ? 'Yes' : 'No'}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={c.textTertiary} />
                </View>
              </TouchableOpacity>

              {/* Platform toggle (only for multiplatform games) */}
              {isMultiplatform && (
                <>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: 3,
                      color: c.textTertiary,
                      marginTop: 24,
                      marginBottom: 12,
                    }}
                  >
                    Platform
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {([
                      { value: 'pc' as Platform, label: 'PC', icon: 'desktop-outline' as const },
                      { value: 'console' as Platform, label: 'Console', icon: 'game-controller-outline' as const },
                    ]).map((p) => {
                      const isActive = profile?.platform === p.value;
                      return (
                        <TouchableOpacity
                          key={p.value}
                          activeOpacity={0.7}
                          onPress={() => handlePlatformChange(p.value)}
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            paddingVertical: 14,
                            borderRadius: 14,
                            borderWidth: isActive ? 2 : 1,
                            borderColor: isActive
                              ? game.accent
                              : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            backgroundColor: isActive
                              ? `${game.accent}15`
                              : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                          }}
                        >
                          <Ionicons
                            name={p.icon}
                            size={18}
                            color={isActive ? game.accent : c.textSecondary}
                          />
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: '600',
                              color: isActive ? game.accent : c.textSecondary,
                            }}
                          >
                            {p.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Settings Modal ──────────────────────────────── */}
      <Modal visible={showSettingsModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableOpacity
            style={{ height: 60 + insets.top }}
            onPress={() => setShowSettingsModal(false)}
            activeOpacity={1}
          />
          <View
            style={{
              flex: 1,
              backgroundColor: c.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 16,
                borderBottomWidth: 0.5,
                borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.3 }}>
                Settings
              </Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={c.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 + insets.bottom }}
              showsVerticalScrollIndicator={false}
            >
              {/* Appearance */}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 3,
                  color: c.textTertiary,
                  marginBottom: 12,
                }}
              >
                Appearance
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28 }}>
                {THEME_OPTIONS.map((opt) => {
                  const isActive = preference === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      activeOpacity={0.7}
                      onPress={() => setPreference(opt.value)}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        paddingVertical: 12,
                        borderRadius: 14,
                        borderWidth: isActive ? 2 : 1,
                        borderColor: isActive
                          ? game.accent
                          : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        backgroundColor: isActive
                          ? `${game.accent}15`
                          : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                      }}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={16}
                        color={isActive ? game.accent : c.textSecondary}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: isActive ? game.accent : c.textSecondary,
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Account */}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 3,
                  color: c.textTertiary,
                  marginBottom: 12,
                }}
              >
                Account
              </Text>
              <View className="rounded-2xl overflow-hidden mb-6" style={cardStyle}>
                {/* Birthdate (read-only) */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: 0.5,
                    borderBottomColor: dividerColor,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="calendar-outline" size={18} color={c.textSecondary} />
                    <Text style={{ fontSize: 14, color: c.textPrimary }}>Birthdate</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: c.textSecondary }}>
                      {formattedBirthdate}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                        backgroundColor: ageInfo.years != null && ageInfo.years >= 18
                          ? `${game.accent}20`
                          : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: ageInfo.years != null && ageInfo.years >= 18
                            ? game.accent
                            : c.textSecondary,
                        }}
                      >
                        {ageInfo.badge}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Region (editable, with cascade) */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={openRegionEditor}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="globe-outline" size={18} color={c.textSecondary} />
                    <Text style={{ fontSize: 14, color: c.textPrimary }}>Region</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: c.textSecondary }}>
                      {profile?.region ? getRegionLabel(profile.region as Region) : '—'}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={c.textTertiary} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Sign Out */}
              <TouchableOpacity
                className="flex-row items-center justify-center gap-2 rounded-xl py-3.5"
                style={{
                  borderWidth: 1,
                  borderColor: 'rgba(255,59,48,0.2)',
                  backgroundColor: 'rgba(255,59,48,0.06)',
                }}
                onPress={handleSignOut}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={16} color="#FF3B30" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#FF3B30' }}>
                  Sign Out
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Rank Picker Modal */}
      <AssetPickerModal
        visible={showRankPicker}
        onClose={() => setShowRankPicker(false)}
        onSelect={handleRankSelect}
        selectedId={profile?.current_rank ?? null}
        title="Current Rank"
        items={rankItems}
        accentColor={game.accent}
        numColumns={3}
        firstItemCentered
        lastItemCentered
      />

      {/* Agent Picker Modal */}
      <AssetPickerModal
        visible={showAgentPicker}
        onClose={() => setShowAgentPicker(false)}
        onSelect={handleAgentSelect}
        selectedId={profile?.main_agent ?? null}
        title="Main Agent"
        items={agentItems}
        accentColor={game.accent}
        numColumns={3}
      />

      {/* Region editor */}
      <BottomSheetEditor
        visible={showRegionEditor}
        title="Region"
        onClose={() => setShowRegionEditor(false)}
        onSave={saveRegion}
        saving={savingField}
        saveDisabled={!draftRegion || draftRegion === profile?.region}
      >
        <StepRegion value={draftRegion} onChange={setDraftRegion} />
      </BottomSheetEditor>

      {/* Servers editor */}
      <BottomSheetEditor
        visible={showServersEditor}
        title="Servers"
        onClose={() => setShowServersEditor(false)}
        onSave={saveServers}
        saving={savingField}
        saveDisabled={draftServers.length === 0}
      >
        {profile?.region && (
          <StepServers
            region={profile.region as Region}
            value={draftServers}
            onChange={setDraftServers}
          />
        )}
      </BottomSheetEditor>

      {/* Languages editor */}
      <BottomSheetEditor
        visible={showLanguagesEditor}
        title="Languages"
        onClose={() => setShowLanguagesEditor(false)}
        onSave={saveLanguages}
        saving={savingField}
        saveDisabled={!draftPrimaryLang}
      >
        <StepLanguages
          primary={draftPrimaryLang}
          secondary={draftSecondaryLangs}
          onPrimaryChange={setDraftPrimaryLang}
          onSecondaryChange={setDraftSecondaryLangs}
        />
      </BottomSheetEditor>

      {/* Voice editor */}
      <BottomSheetEditor
        visible={showVoiceEditor}
        title="Voice chat"
        onClose={() => setShowVoiceEditor(false)}
      >
        <StepVoice value={profile?.voice_enabled ?? null} onChange={saveVoice} />
      </BottomSheetEditor>
    </View>
  );
}
