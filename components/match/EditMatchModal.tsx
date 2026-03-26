import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  ScrollView,
  Alert,
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
import { useGameAssets } from '@/hooks/useGameAssets';
import { GAME_ACCENTS } from '@/lib/constants';
import { getGameModeById, getRankLabel } from '@/lib/game-assets';
import type { Match } from '@/types/database';

interface EditMatchModalProps {
  visible: boolean;
  match: Match;
  onClose: () => void;
  onUpdated: (fields: Partial<Match>) => Promise<void>;
}

export default function EditMatchModal({ visible, match, onClose, onUpdated }: EditMatchModalProps) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useColors();
  const { ranks, rankUrl } = useGameAssets();
  const game = GAME_ACCENTS[match.game];
  const modeConfig = getGameModeById(match.game_mode);
  const hasRank = modeConfig?.hasRank ?? true;
  const hasRrPenalty = modeConfig?.hasRrPenalty ?? true;

  const selectableRanks = ranks.filter((r) => r.id !== 'unranked');

  // Editable fields
  const [rankMinIdx, setRankMinIdx] = useState(0);
  const [rankMaxIdx, setRankMaxIdx] = useState(0);
  const [rrPenalty, setRrPenalty] = useState(false);
  const [discordLink, setDiscordLink] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showRankMinPicker, setShowRankMinPicker] = useState(false);
  const [showRankMaxPicker, setShowRankMaxPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize from match data when modal opens
  useEffect(() => {
    if (!visible) return;
    const minIdx = selectableRanks.findIndex((r) => r.id === match.rank_min);
    const maxIdx = selectableRanks.findIndex((r) => r.id === match.rank_max);
    setRankMinIdx(minIdx >= 0 ? minIdx : 0);
    setRankMaxIdx(maxIdx >= 0 ? maxIdx : 0);
    setRrPenalty(match.rr_penalty ?? false);
    setDiscordLink(match.discord_link ?? '');
    setNotes(match.notes ?? '');
    setScheduledDate(match.scheduled_at ? new Date(match.scheduled_at) : null);
  }, [visible]);

  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const handleSave = async () => {
    if (hasRank && rankMinIdx > rankMaxIdx) {
      Alert.alert('Invalid rank range', 'Min rank must be lower or equal to max rank.');
      return;
    }
    if (scheduledDate && scheduledDate <= new Date()) {
      Alert.alert('Invalid time', 'Scheduled time must be in the future.');
      return;
    }

    setSaving(true);
    try {
      const fields: Partial<Match> = {
        rank_min: hasRank ? selectableRanks[rankMinIdx].id : match.rank_min,
        rank_max: hasRank ? selectableRanks[rankMaxIdx].id : match.rank_max,
        rr_penalty: hasRrPenalty ? rrPenalty : match.rr_penalty,
        discord_link: discordLink.trim() || null,
        notes: notes.trim() || null,
        scheduled_at: scheduledDate?.toISOString() ?? null,
      };
      await onUpdated(fields);
    } catch {
      Alert.alert('Error', 'Failed to update match.');
    } finally {
      setSaving(false);
    }
  };

  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date && scheduledDate) {
      const updated = new Date(scheduledDate);
      updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setScheduledDate(updated);
    }
  };

  const onTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (date && scheduledDate) {
      const updated = new Date(scheduledDate);
      updated.setHours(date.getHours(), date.getMinutes(), 0, 0);
      setScheduledDate(updated);
    }
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: cardBorder }]}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={c.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.textPrimary }]}>Edit Match</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Rank range */}
          {hasRank && (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>Rank Range</Text>

              <View style={styles.rankPickerRow}>
                {/* Min rank */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowRankMinPicker(true)}
                  style={[styles.rankPicker, { borderColor: cardBorder, backgroundColor: cardBg }]}
                >
                  {selectableRanks[rankMinIdx] && (
                    <Image
                      source={{ uri: rankUrl(selectableRanks[rankMinIdx].image) }}
                      style={styles.rankIcon}
                      contentFit="contain"
                    />
                  )}
                  <Text style={[styles.rankPickerText, { color: c.textPrimary }]}>
                    {selectableRanks[rankMinIdx]?.name ?? 'Min'}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={c.textTertiary} />
                </TouchableOpacity>

                <Text style={[styles.rankSep, { color: c.textTertiary }]}>to</Text>

                {/* Max rank */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowRankMaxPicker(true)}
                  style={[styles.rankPicker, { borderColor: cardBorder, backgroundColor: cardBg }]}
                >
                  {selectableRanks[rankMaxIdx] && (
                    <Image
                      source={{ uri: rankUrl(selectableRanks[rankMaxIdx].image) }}
                      style={styles.rankIcon}
                      contentFit="contain"
                    />
                  )}
                  <Text style={[styles.rankPickerText, { color: c.textPrimary }]}>
                    {selectableRanks[rankMaxIdx]?.name ?? 'Max'}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={c.textTertiary} />
                </TouchableOpacity>
              </View>

              {/* RR penalty toggle */}
              {hasRrPenalty && (
                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={[styles.toggleLabel, { color: c.textPrimary }]}>-25% RR Penalty</Text>
                    <Text style={[styles.toggleDesc, { color: c.textTertiary }]}>Accept rank penalty</Text>
                  </View>
                  <Switch
                    value={rrPenalty}
                    onValueChange={setRrPenalty}
                    trackColor={{ true: game.accent, false: isDark ? '#333' : '#DDD' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              )}
            </View>
          )}

          {/* Schedule */}
          {scheduledDate && (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>Schedule</Text>
              <View style={styles.scheduleRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowDatePicker(true)}
                  style={[styles.scheduleBtn, { borderColor: cardBorder }]}
                >
                  <Ionicons name="calendar-outline" size={16} color={game.accent} />
                  <Text style={[styles.scheduleBtnText, { color: c.textPrimary }]}>
                    {formatDate(scheduledDate)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowTimePicker(true)}
                  style={[styles.scheduleBtn, { borderColor: cardBorder }]}
                >
                  <Ionicons name="time-outline" size={16} color={game.accent} />
                  <Text style={[styles.scheduleBtnText, { color: c.textPrimary }]}>
                    {formatTime(scheduledDate)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Discord + Notes */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>Details</Text>

            <View style={styles.inputGroup}>
              <View style={styles.inputLabel}>
                <Ionicons name="logo-discord" size={14} color="#5865F2" />
                <Text style={[styles.inputLabelText, { color: c.textSecondary }]}>Discord Link</Text>
              </View>
              <TextInput
                value={discordLink}
                onChangeText={setDiscordLink}
                placeholder="discord.gg/..."
                placeholderTextColor={c.textTertiary}
                style={[styles.input, { color: c.textPrimary, borderColor: cardBorder, backgroundColor: cardBg }]}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputLabel}>
                <Ionicons name="document-text-outline" size={14} color={c.textTertiary} />
                <Text style={[styles.inputLabelText, { color: c.textSecondary }]}>Notes</Text>
              </View>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional info..."
                placeholderTextColor={c.textTertiary}
                style={[styles.input, styles.textArea, { color: c.textPrimary, borderColor: cardBorder, backgroundColor: cardBg }]}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </ScrollView>

        {/* Save button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, { backgroundColor: game.accent, opacity: saving ? 0.6 : 1 }]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Rank min picker */}
      {showRankMinPicker && (
        <Modal transparent animationType="fade">
          <View style={styles.pickerOverlay}>
            <View style={[styles.pickerCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
              <View style={styles.pickerHeader}>
                <Text style={[styles.pickerTitle, { color: c.textPrimary }]}>Min Rank</Text>
                <TouchableOpacity onPress={() => setShowRankMinPicker(false)}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: game.accent }}>Done</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 300 }}>
                {selectableRanks.map((r, i) => (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => { setRankMinIdx(i); setShowRankMinPicker(false); }}
                    style={[styles.pickerRow, { backgroundColor: i === rankMinIdx ? `${game.accent}15` : 'transparent' }]}
                  >
                    <Image source={{ uri: rankUrl(r.image) }} style={styles.pickerRankIcon} contentFit="contain" />
                    <Text style={[styles.pickerRowText, { color: i === rankMinIdx ? game.accent : c.textPrimary }]}>
                      {r.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Rank max picker */}
      {showRankMaxPicker && (
        <Modal transparent animationType="fade">
          <View style={styles.pickerOverlay}>
            <View style={[styles.pickerCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
              <View style={styles.pickerHeader}>
                <Text style={[styles.pickerTitle, { color: c.textPrimary }]}>Max Rank</Text>
                <TouchableOpacity onPress={() => setShowRankMaxPicker(false)}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: game.accent }}>Done</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 300 }}>
                {selectableRanks.map((r, i) => (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => { setRankMaxIdx(i); setShowRankMaxPicker(false); }}
                    style={[styles.pickerRow, { backgroundColor: i === rankMaxIdx ? `${game.accent}15` : 'transparent' }]}
                  >
                    <Image source={{ uri: rankUrl(r.image) }} style={styles.pickerRankIcon} contentFit="contain" />
                    <Text style={[styles.pickerRowText, { color: i === rankMaxIdx ? game.accent : c.textPrimary }]}>
                      {r.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Date picker */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={scheduledDate ?? new Date()}
          mode="date"
          minimumDate={new Date()}
          onChange={onDateChange}
        />
      )}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="fade">
          <View style={styles.pickerOverlay}>
            <View style={[styles.pickerCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
              <View style={styles.pickerHeader}>
                <Text style={[styles.pickerTitle, { color: c.textPrimary }]}>Pick Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: game.accent }}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={scheduledDate ?? new Date()}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={onDateChange}
                themeVariant={isDark ? 'dark' : 'light'}
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Time picker */}
      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={scheduledDate ?? new Date()}
          mode="time"
          is24Hour
          onChange={onTimeChange}
        />
      )}
      {showTimePicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="fade">
          <View style={styles.pickerOverlay}>
            <View style={[styles.pickerCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
              <View style={styles.pickerHeader}>
                <Text style={[styles.pickerTitle, { color: c.textPrimary }]}>Pick Time</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: game.accent }}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={scheduledDate ?? new Date()}
                mode="time"
                display="spinner"
                is24Hour
                onChange={onTimeChange}
                themeVariant={isDark ? 'dark' : 'light'}
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 14 },
  sectionLabel: { fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },
  // Rank
  rankPickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankPicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  rankIcon: { width: 22, height: 22 },
  rankPickerText: { flex: 1, fontSize: 13, fontWeight: '600' },
  rankSep: { fontSize: 13, fontWeight: '500' },
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  toggleInfo: { flex: 1, gap: 2 },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
  toggleDesc: { fontSize: 12, fontWeight: '400' },
  // Schedule
  scheduleRow: { flexDirection: 'row', gap: 10 },
  scheduleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  scheduleBtnText: { fontSize: 13, fontWeight: '600' },
  // Inputs
  inputGroup: { gap: 6 },
  inputLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inputLabelText: { fontSize: 13, fontWeight: '500' },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '500',
  },
  textArea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  // Footer
  footer: { paddingHorizontal: 20, paddingTop: 12 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
  },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  // Pickers
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  pickerTitle: { fontSize: 16, fontWeight: '700' },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  pickerRankIcon: { width: 28, height: 28 },
  pickerRowText: { fontSize: 15, fontWeight: '600' },
});
