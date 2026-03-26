import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useColors } from '@/hooks/useThemeColors';
import { useGameStore } from '@/stores/gameStore';
import { useAuthStore } from '@/stores/authStore';
import { useGameAssets } from '@/hooks/useGameAssets';
import { GAME_ACCENTS, GAME_MULTIPLATFORM } from '@/lib/constants';
import { VALORANT_GAME_MODES, getGameModeById } from '@/lib/game-assets';
import type { GameModeMeta } from '@/lib/game-assets';
import { supabase } from '@/lib/supabase';

type StepId = 'mode' | 'timing' | 'lasts' | 'rank' | 'details';
type MatchTiming = 'now' | 'scheduled';

/** Round a date up to the next 15-minute slot */
function roundToNext15(date: Date): Date {
  const d = new Date(date);
  const m = d.getMinutes();
  const next = Math.ceil(m / 15) * 15;
  d.setMinutes(next, 0, 0);
  if (next >= 60) {
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
  }
  return d;
}

interface CreateMatchModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateMatchModal({ visible, onClose, onCreated }: CreateMatchModalProps) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useColors();
  const selectedGame = useGameStore((s) => s.selectedGame);
  const game = GAME_ACCENTS[selectedGame];
  const { user, profile } = useAuthStore();
  const { ranks, rankUrl } = useGameAssets();
  const isMultiplatform = GAME_MULTIPLATFORM[selectedGame] ?? false;

  // Step state
  const [stepIndex, setStepIndex] = useState(0);

  // Step 0: game mode
  const [selectedMode, setSelectedMode] = useState<GameModeMeta>(VALORANT_GAME_MODES[0]);

  // Step 1: timing
  const [timing, setTiming] = useState<MatchTiming>('now');
  const [scheduledDate, setScheduledDate] = useState<Date>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    return roundToNext15(d);
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Step 2: lasts needed
  const [lastsNeeded, setLastsNeeded] = useState(1);

  // Step 3: rank range + RR
  const selectableRanks = ranks.filter((r) => r.id !== 'unranked');
  const [rankMinIdx, setRankMinIdx] = useState(0);
  const [rankMaxIdx, setRankMaxIdx] = useState(0);
  const [rrPenalty, setRrPenalty] = useState(false);
  const [showRankMinPicker, setShowRankMinPicker] = useState(false);
  const [showRankMaxPicker, setShowRankMaxPicker] = useState(false);

  // Step 4: optional details
  const [discordLink, setDiscordLink] = useState('');
  const [notes, setNotes] = useState('');

  const [creating, setCreating] = useState(false);

  // Dynamic step flow based on selected mode
  const activeSteps = useMemo<StepId[]>(() => {
    const steps: StepId[] = ['mode', 'timing'];
    if (selectedMode.teamBased && selectedMode.lastsOptions.length > 0) steps.push('lasts');
    if (selectedMode.hasRank) steps.push('rank');
    steps.push('details');
    return steps;
  }, [selectedMode]);

  const currentStepId = activeSteps[stepIndex] ?? 'mode';
  const totalSteps = activeSteps.length;

  // Computed scheduled_at
  const scheduledAt = useMemo<string | null>(() => {
    if (timing === 'now') return null;
    return scheduledDate.toISOString();
  }, [timing, scheduledDate]);

  const animateTo = useCallback((toStep: number) => {
    setStepIndex(toStep);
  }, []);

  const resetState = useCallback(() => {
    setStepIndex(0);
    setSelectedMode(VALORANT_GAME_MODES[0]);
    setTiming('now');
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    setScheduledDate(roundToNext15(d));
    setShowDatePicker(false);
    setShowTimePicker(false);
    setLastsNeeded(1);
    setRankMinIdx(0);
    setRankMaxIdx(0);
    setRrPenalty(false);
    setDiscordLink('');
    setNotes('');
    setCreating(false);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleCreate = async () => {
    if (!user || !profile) return;
    if (selectedMode.hasRank && rankMinIdx > rankMaxIdx) {
      Alert.alert('Invalid rank range', 'Min rank must be lower or equal to max rank.');
      return;
    }
    if (timing === 'scheduled' && scheduledDate <= new Date()) {
      Alert.alert('Invalid time', 'Scheduled time must be in the future.');
      return;
    }

    setCreating(true);
    try {
      const maxPlayers = selectedMode.maxPlayers;
      const currentPlayers = selectedMode.teamBased
        ? maxPlayers - lastsNeeded
        : 1;

      const payload = {
        game: selectedGame,
        game_mode: selectedMode.id,
        creator_id: user.id,
        region: profile.region,
        rank_min: selectedMode.hasRank ? selectableRanks[rankMinIdx].id : 'unranked',
        rank_max: selectedMode.hasRank ? selectableRanks[rankMaxIdx].id : 'unranked',
        rr_penalty: selectedMode.hasRrPenalty ? rrPenalty : false,
        current_players: currentPlayers,
        max_players: maxPlayers,
        status: 'open' as const,
        scheduled_at: scheduledAt,
        discord_link: discordLink.trim() || null,
        notes: notes.trim() || null,
        platform: isMultiplatform ? profile.platform : null,
      };

      const { data, error } = await supabase
        .from('matches')
        .insert(payload as never)
        .select()
        .single();

      if (error) throw error;

      const matchId = (data as { id: string }).id;

      const { error: memberError } = await supabase
        .from('match_members')
        .insert({ match_id: matchId, user_id: user.id, is_ready: false } as never);

      if (memberError) console.error('[Home] Member insert error:', memberError);
      if (__DEV__) console.log('[Home] Match created:', matchId);

      handleClose();
      onCreated();
    } catch (err) {
      console.error('[Home] Create error:', err);
      Alert.alert('Error', 'Failed to create match.');
    } finally {
      setCreating(false);
    }
  };

  // DateTimePicker handlers
  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      const updated = new Date(scheduledDate);
      updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setScheduledDate(updated);
    }
  };

  const onTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (date) {
      const updated = new Date(scheduledDate);
      const snapped = Math.round(date.getMinutes() / 15) * 15;
      updated.setHours(date.getHours(), snapped, 0, 0);
      if (snapped >= 60) {
        updated.setHours(updated.getHours() + 1, 0, 0, 0);
      }
      setScheduledDate(updated);
    }
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const minDate = new Date();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 7);

  // ─── Step renders ─────────────────────────────────────

  const renderStepMode = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: c.textPrimary }]}>
        What mode do you{'\n'}want to play?
      </Text>
      <Text style={[styles.stepSubtitle, { color: c.textTertiary }]}>
        Each mode adapts the match settings
      </Text>

      <View style={styles.modeGrid}>
        {VALORANT_GAME_MODES.map((mode) => {
          const isActive = selectedMode.id === mode.id;
          return (
            <TouchableOpacity
              key={mode.id}
              activeOpacity={0.7}
              onPress={() => {
                setSelectedMode(mode);
                // Reset lasts if mode changes player count
                if (mode.lastsOptions.length > 0 && !mode.lastsOptions.includes(lastsNeeded)) {
                  setLastsNeeded(mode.lastsOptions[0]);
                }
              }}
              style={[
                styles.modeCard,
                {
                  borderWidth: isActive ? 2 : 1,
                  borderColor: isActive ? game.accent : cardBorder,
                  backgroundColor: isActive ? `${game.accent}12` : cardBg,
                },
              ]}
            >
              <Ionicons
                name={mode.icon as keyof typeof Ionicons.glyphMap}
                size={22}
                color={isActive ? game.accent : c.textTertiary}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.modeLabel,
                  { color: isActive ? game.accent : c.textPrimary },
                ]}
              >
                {mode.label}
              </Text>
              <Text
                numberOfLines={2}
                style={[
                  styles.modeDesc,
                  { color: isActive ? game.accent : c.textTertiary },
                ]}
              >
                {mode.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderStepTiming = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: c.textPrimary }]}>
        When do you{'\n'}want to play?
      </Text>
      <Text style={[styles.stepSubtitle, { color: c.textTertiary }]}>
        Find players now or schedule for later
      </Text>

      <View style={styles.timingRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setTiming('now')}
          style={[
            styles.timingCard,
            {
              borderWidth: timing === 'now' ? 2 : 1,
              borderColor: timing === 'now' ? game.accent : cardBorder,
              backgroundColor: timing === 'now' ? `${game.accent}12` : cardBg,
            },
          ]}
        >
          <Ionicons
            name="flash"
            size={28}
            color={timing === 'now' ? game.accent : c.textTertiary}
          />
          <Text
            style={[
              styles.timingLabel,
              { color: timing === 'now' ? game.accent : c.textPrimary },
            ]}
          >
            Now
          </Text>
          <Text
            style={[
              styles.timingHint,
              { color: timing === 'now' ? game.accent : c.textTertiary },
            ]}
          >
            Play right away
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setTiming('scheduled')}
          style={[
            styles.timingCard,
            {
              borderWidth: timing === 'scheduled' ? 2 : 1,
              borderColor: timing === 'scheduled' ? game.accent : cardBorder,
              backgroundColor: timing === 'scheduled' ? `${game.accent}12` : cardBg,
            },
          ]}
        >
          <Ionicons
            name="calendar"
            size={28}
            color={timing === 'scheduled' ? game.accent : c.textTertiary}
          />
          <Text
            style={[
              styles.timingLabel,
              { color: timing === 'scheduled' ? game.accent : c.textPrimary },
            ]}
          >
            Scheduled
          </Text>
          <Text
            style={[
              styles.timingHint,
              { color: timing === 'scheduled' ? game.accent : c.textTertiary },
            ]}
          >
            Pick date & time
          </Text>
        </TouchableOpacity>
      </View>

      {timing === 'scheduled' && (
        <View style={styles.dateTimeSection}>
          <Text style={[styles.pickerLabel, { color: c.textTertiary }]}>Date</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowDatePicker(true)}
            style={[styles.dateTimeBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
          >
            <Ionicons name="calendar-outline" size={18} color={game.accent} />
            <Text style={[styles.dateTimeBtnText, { color: c.textPrimary }]}>
              {formatDate(scheduledDate)}
            </Text>
            <Ionicons name="chevron-down" size={14} color={c.textTertiary} />
          </TouchableOpacity>

          <Text style={[styles.pickerLabel, { color: c.textTertiary, marginTop: 20 }]}>Time</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowTimePicker(true)}
            style={[styles.dateTimeBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
          >
            <Ionicons name="time-outline" size={18} color={game.accent} />
            <Text style={[styles.dateTimeBtnText, { color: c.textPrimary }]}>
              {formatTime(scheduledDate)}
            </Text>
            <Ionicons name="chevron-down" size={14} color={c.textTertiary} />
          </TouchableOpacity>

          <View style={[styles.scheduleSummary, { backgroundColor: `${game.accent}08`, borderColor: `${game.accent}20` }]}>
            <Ionicons name="information-circle-outline" size={16} color={game.accent} />
            <Text style={[styles.scheduleSummaryText, { color: game.accent }]}>
              Match scheduled for {formatDate(scheduledDate)} at {formatTime(scheduledDate)}
            </Text>
          </View>
        </View>
      )}

      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={scheduledDate}
          mode="date"
          minimumDate={minDate}
          maximumDate={maxDate}
          onChange={onDateChange}
        />
      )}
      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={scheduledDate}
          mode="time"
          is24Hour
          minuteInterval={15}
          onChange={onTimeChange}
        />
      )}

      {Platform.OS === 'ios' && (showDatePicker || showTimePicker) && (
        <Modal transparent animationType="fade">
          <View style={styles.iosPickerOverlay}>
            <View
              style={[
                styles.iosPickerContainer,
                { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
              ]}
            >
              <View style={styles.iosPickerHeader}>
                <Text style={[styles.iosPickerTitle, { color: c.textPrimary }]}>
                  {showDatePicker ? 'Select Date' : 'Select Time'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowDatePicker(false);
                    setShowTimePicker(false);
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '600', color: game.accent }}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={scheduledDate}
                mode={showDatePicker ? 'date' : 'time'}
                display="spinner"
                minimumDate={showDatePicker ? minDate : undefined}
                maximumDate={showDatePicker ? maxDate : undefined}
                is24Hour
                minuteInterval={15}
                onChange={showDatePicker ? onDateChange : onTimeChange}
                themeVariant={isDark ? 'dark' : 'light'}
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );

  const renderStepLasts = () => {
    const options = selectedMode.lastsOptions;
    const maxP = selectedMode.maxPlayers;

    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.stepTitle, { color: c.textPrimary }]}>
          How many players{'\n'}do you need?
        </Text>
        <Text style={[styles.stepSubtitle, { color: c.textTertiary }]}>
          Select spots to fill in your {maxP}-stack
        </Text>

        <View style={styles.lastsGrid}>
          {options.map((n) => {
            const isActive = lastsNeeded === n;
            const groupSize = maxP - n;
            return (
              <TouchableOpacity
                key={n}
                activeOpacity={0.7}
                onPress={() => setLastsNeeded(n)}
                style={[
                  styles.lastCard,
                  {
                    borderWidth: isActive ? 2 : 1,
                    borderColor: isActive ? game.accent : cardBorder,
                    backgroundColor: isActive ? `${game.accent}12` : cardBg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.lastNumber,
                    { color: isActive ? game.accent : c.textPrimary },
                  ]}
                >
                  {n}
                </Text>
                <Text
                  style={[
                    styles.lastLabel,
                    { color: isActive ? game.accent : c.textSecondary },
                  ]}
                >
                  last{n > 1 ? 's' : ''}
                </Text>

                <View style={styles.slotPreview}>
                  {Array.from({ length: maxP }, (_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.previewSlot,
                        {
                          backgroundColor:
                            i < groupSize
                              ? isActive ? game.accent : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)')
                              : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          borderColor:
                            i < groupSize
                              ? isActive ? game.accent : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)')
                              : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        },
                      ]}
                    />
                  ))}
                </View>

                <Text
                  style={[
                    styles.lastHint,
                    { color: isActive ? game.accent : c.textTertiary },
                  ]}
                >
                  {groupSize} in group
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderStepRank = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: c.textPrimary }]}>
        Set rank range
      </Text>
      <Text style={[styles.stepSubtitle, { color: c.textTertiary }]}>
        Define the skill level for your match
      </Text>

      <View style={styles.rankPickerRow}>
        <TouchableOpacity
          style={[styles.rankPickerBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
          activeOpacity={0.7}
          onPress={() => setShowRankMinPicker(true)}
        >
          <Text style={[styles.rankPickerLabel, { color: c.textTertiary }]}>MIN</Text>
          {selectableRanks[rankMinIdx] && (
            <Image
              source={{ uri: rankUrl(selectableRanks[rankMinIdx].image) }}
              style={styles.rankPickerIcon}
              contentFit="contain"
            />
          )}
          <Text numberOfLines={1} style={[styles.rankPickerName, { color: c.textSecondary }]}>
            {selectableRanks[rankMinIdx]?.name ?? '—'}
          </Text>
        </TouchableOpacity>

        <View style={{ justifyContent: 'center' }}>
          <Ionicons name="arrow-forward" size={16} color={c.textTertiary} />
        </View>

        <TouchableOpacity
          style={[styles.rankPickerBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
          activeOpacity={0.7}
          onPress={() => setShowRankMaxPicker(true)}
        >
          <Text style={[styles.rankPickerLabel, { color: c.textTertiary }]}>MAX</Text>
          {selectableRanks[rankMaxIdx] && (
            <Image
              source={{ uri: rankUrl(selectableRanks[rankMaxIdx].image) }}
              style={styles.rankPickerIcon}
              contentFit="contain"
            />
          )}
          <Text numberOfLines={1} style={[styles.rankPickerName, { color: c.textSecondary }]}>
            {selectableRanks[rankMaxIdx]?.name ?? '—'}
          </Text>
        </TouchableOpacity>
      </View>

      {selectedMode.hasRrPenalty && (
        <View
          style={[
            styles.toggleRow,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: c.textPrimary }}>
              Accept -25% RR
            </Text>
            <Text style={{ fontSize: 11, color: c.textTertiary, marginTop: 2 }}>
              Allow players outside rank range
            </Text>
          </View>
          <Switch
            value={rrPenalty}
            onValueChange={setRrPenalty}
            trackColor={{ false: isDark ? '#333' : '#DDD', true: `${game.accent}80` }}
            thumbColor={rrPenalty ? game.accent : isDark ? '#666' : '#FFF'}
          />
        </View>
      )}
    </View>
  );

  const renderStepDetails = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: c.textPrimary }]}>
        Final details
      </Text>
      <Text style={[styles.stepSubtitle, { color: c.textTertiary }]}>
        Optional info to help players find you
      </Text>

      <Text style={[styles.inputLabel, { color: c.textTertiary }]}>Discord link</Text>
      <TextInput
        value={discordLink}
        onChangeText={setDiscordLink}
        placeholder="discord.gg/..."
        placeholderTextColor={c.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.textInput,
          { backgroundColor: cardBg, borderColor: cardBorder, color: c.textPrimary },
        ]}
      />

      <Text style={[styles.inputLabel, { color: c.textTertiary }]}>Notes</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Looking for a duelist main..."
        placeholderTextColor={c.textTertiary}
        multiline
        numberOfLines={3}
        style={[
          styles.textInput,
          {
            backgroundColor: cardBg,
            borderColor: cardBorder,
            color: c.textPrimary,
            height: 80,
            textAlignVertical: 'top',
          },
        ]}
      />
    </View>
  );

  // ─── Rank Picker Modals ───────────────────────────────

  const renderRankPickerModal = (
    pickerVisible: boolean,
    onDismiss: () => void,
    title: string,
    activeIdx: number,
    onSelect: (idx: number) => void,
    minBound?: number,
  ) => (
    <Modal visible={pickerVisible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onDismiss} activeOpacity={1} />
        <View
          style={{
            maxHeight: '60%',
            backgroundColor: c.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 20,
            paddingBottom: insets.bottom + 20,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: c.textPrimary, paddingHorizontal: 20, marginBottom: 12 }}>
            {title}
          </Text>
          <FlatList
            data={selectableRanks}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => {
              const isActive = index === activeIdx;
              const isDisabled = minBound !== undefined && index < minBound;
              return (
                <TouchableOpacity
                  activeOpacity={isDisabled ? 1 : 0.6}
                  disabled={isDisabled}
                  onPress={() => {
                    onSelect(index);
                    onDismiss();
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    opacity: isDisabled ? 0.3 : 1,
                    backgroundColor: isActive ? `${game.accent}12` : 'transparent',
                  }}
                >
                  <Image
                    source={{ uri: rankUrl(item.image) }}
                    style={{ width: 28, height: 28 }}
                    contentFit="contain"
                  />
                  <Text style={{ flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '600', color: isActive ? game.accent : c.textPrimary }}>
                    {item.name}
                  </Text>
                  {isActive && <Ionicons name="checkmark" size={18} color={game.accent} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );

  // Render current step content
  const renderCurrentStep = () => {
    switch (currentStepId) {
      case 'mode': return renderStepMode();
      case 'timing': return renderStepTiming();
      case 'lasts': return renderStepLasts();
      case 'rank': return renderStepRank();
      case 'details': return renderStepDetails();
    }
  };

  const isLastStep = stepIndex === totalSteps - 1;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <TouchableOpacity
          style={{ height: 60 + insets.top }}
          onPress={handleClose}
          activeOpacity={1}
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
            <Text style={[styles.modalTitle, { color: c.textPrimary }]}>
              Create Match
            </Text>
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
            {stepIndex > 0 ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => animateTo(stepIndex - 1)}
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

            {!isLastStep ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => animateTo(stepIndex + 1)}
                style={[styles.nextBtn, { backgroundColor: game.accent }]}
              >
                <Text style={styles.nextBtnText}>Next</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleCreate}
                disabled={creating}
                style={[styles.nextBtn, { backgroundColor: game.accent, opacity: creating ? 0.6 : 1 }]}
              >
                {creating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.nextBtnText}>Create</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Rank pickers */}
      {renderRankPickerModal(
        showRankMinPicker,
        () => setShowRankMinPicker(false),
        'Min Rank',
        rankMinIdx,
        (idx) => {
          setRankMinIdx(idx);
          if (idx > rankMaxIdx) setRankMaxIdx(idx);
        },
      )}
      {renderRankPickerModal(
        showRankMaxPicker,
        () => setShowRankMaxPicker(false),
        'Max Rank',
        rankMaxIdx,
        (idx) => setRankMaxIdx(idx),
        rankMinIdx,
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBody: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
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
    marginBottom: 32,
  },
  // Step 0 — Game mode
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modeCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 14,
    gap: 6,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  modeDesc: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 13,
  },
  // Step 1 — Timing
  timingRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timingCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 24,
    borderRadius: 14,
    gap: 8,
  },
  timingLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  timingHint: {
    fontSize: 11,
    fontWeight: '500',
  },
  dateTimeSection: {
    marginTop: 28,
  },
  pickerLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: 10,
  },
  dateTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateTimeBtnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  scheduleSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  scheduleSummaryText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  // iOS picker modal
  iosPickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  iosPickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  iosPickerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Step 2 — Lasts
  lastsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  lastCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 14,
    borderWidth: 1,
  },
  lastNumber: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  lastLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  slotPreview: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 16,
  },
  previewSlot: {
    width: 14,
    height: 5,
    borderRadius: 2,
    borderWidth: 0.5,
  },
  lastHint: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 8,
  },
  // Step 3 — Rank
  rankPickerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  rankPickerBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  rankPickerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 6,
  },
  rankPickerIcon: {
    width: 36,
    height: 36,
  },
  rankPickerName: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  // Step 4 — Details
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: 10,
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 14,
    marginBottom: 20,
  },
  // Bottom nav
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
