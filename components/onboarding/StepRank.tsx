import { View, Text, Image, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useBaseColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';
import { getAssetUrl } from '@/lib/game-assets';
import type { RankMeta } from '@/lib/game-assets';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CONTENT_PAD = 24;
const COL_GAP = 8;
const GRID_WIDTH = SCREEN_WIDTH - CONTENT_PAD * 2;
const CELL_W = Math.floor((GRID_WIDTH - COL_GAP * 2) / 3);

interface StepRankProps {
  currentRank: string | null;
  onCurrentRankChange: (id: string) => void;
  game: string;
  ranks: RankMeta[];
}

function RankGrid({
  label,
  ranks,
  selectedId,
  onSelect,
  game,
  disabledIds = [],
}: {
  label: string;
  ranks: RankMeta[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  game: string;
  disabledIds?: string[];
}) {
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const unranked = ranks.find((r) => r.id === 'unranked') ?? null;
  const radiant = ranks.find((r) => r.id === 'radiant') ?? null;
  const tiered = ranks.filter((r) => r.id !== 'unranked' && r.id !== 'radiant');

  const renderCell = (r: RankMeta, index: number) => {
    const isActive = selectedId === r.id;
    const isDisabled = disabledIds.includes(r.id);
    return (
      <MotiView
        key={r.id}
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: isDisabled ? 0.25 : 1, scale: 1 }}
        transition={{ type: 'timing', duration: 200, delay: index * 20 }}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onSelect(r.id)}
          disabled={isDisabled}
          style={[
            styles.rankCell,
            {
              width: CELL_W,
              borderWidth: isActive ? 2 : 1,
              borderColor: isActive
                ? c.accent
                : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              backgroundColor: isActive
                ? isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'
                : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            },
          ]}
        >
          <Image
            source={{ uri: getAssetUrl(game, 'ranks', r.image) }}
            style={styles.rankImage}
            resizeMode="contain"
          />
          <Text
            numberOfLines={1}
            style={[
              styles.rankName,
              { color: isActive ? c.textPrimary : c.textTertiary },
            ]}
          >
            {r.name}
          </Text>
        </TouchableOpacity>
      </MotiView>
    );
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: c.textTertiary }]}>{label}</Text>

      {unranked && (
        <View style={styles.centeredRow}>{renderCell(unranked, 0)}</View>
      )}

      <View style={styles.grid}>
        {tiered.map((r, i) => renderCell(r, i + 1))}
      </View>

      {radiant && (
        <View style={styles.centeredRow}>{renderCell(radiant, tiered.length + 1)}</View>
      )}
    </View>
  );
}

export default function StepRank({
  currentRank,
  onCurrentRankChange,
  game,
  ranks,
}: StepRankProps) {
  return (
    <View style={styles.container}>
      <RankGrid
        label="Current Rank"
        ranks={ranks}
        selectedId={currentRank}
        onSelect={onCurrentRankChange}
        game={game}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 24,
  },
  section: {
    gap: 0,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: COL_GAP,
  },
  centeredRow: {
    alignItems: 'center',
    marginVertical: 4,
  },
  rankCell: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
  },
  rankImage: {
    width: 40,
    height: 40,
  },
  rankName: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
});
