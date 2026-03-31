import { useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { MotiView } from 'moti';
import { useBaseColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';
import { getAssetUrl } from '@/lib/game-assets';
import type { RankMeta } from '@/lib/game-assets';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_WIDTH = 90;
const ITEM_GAP = 10;
const SNAP_INTERVAL = ITEM_WIDTH + ITEM_GAP;
const SIDE_PADDING = (SCREEN_WIDTH - ITEM_WIDTH) / 2;

interface RankCarouselProps {
  ranks: RankMeta[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  game: string;
  disabledIds?: string[];
  label: string;
}

export default function RankCarousel({
  ranks,
  selectedId,
  onSelect,
  game,
  disabledIds = [],
  label,
}: RankCarouselProps) {
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const flatListRef = useRef<FlatList>(null);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ITEM_WIDTH + ITEM_GAP,
      offset: (ITEM_WIDTH + ITEM_GAP) * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: RankMeta }) => {
      const isActive = selectedId === item.id;
      const isDisabled = disabledIds.includes(item.id);

      return (
        <TouchableOpacity
          style={[
            styles.item,
            {
              opacity: isDisabled ? 0.25 : 1,
              borderColor: isActive
                ? c.accent
                : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              borderWidth: isActive ? 2 : 1,
              backgroundColor: isActive
                ? isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'
                : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            },
          ]}
          onPress={() => !isDisabled && onSelect(item.id)}
          activeOpacity={isDisabled ? 1 : 0.7}
          disabled={isDisabled}
        >
          <Image
            source={{ uri: getAssetUrl(game, 'ranks', item.image) }}
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
            {item.name}
          </Text>
        </TouchableOpacity>
      );
    },
    [selectedId, disabledIds, c, isDark, game],
  );

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300 }}
    >
      <Text style={[styles.label, { color: c.textTertiary }]}>{label}</Text>
      <FlatList
        ref={flatListRef}
        data={ranks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingHorizontal: SIDE_PADDING - ITEM_GAP / 2,
          gap: ITEM_GAP,
        }}
        getItemLayout={getItemLayout}
        removeClippedSubviews
      />
    </MotiView>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  item: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    gap: 6,
  },
  rankImage: {
    width: 48,
    height: 48,
  },
  rankName: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});
