import { ScrollView, View, Text, Pressable } from 'react-native';
import { useColors } from '@/hooks/useThemeColors';

export type FeedFilters = {
  rankMin?: string;
  rankMax?: string;
  primaryLanguage?: string;
  voiceRequired?: boolean;
  servers?: string[];
  ageFilter?: 'under_18' | 'over_18' | 'any';
};

type Props = {
  filters: FeedFilters;
  onChange: (f: FeedFilters) => void;
  onReset: () => void;
  onOpenRank: () => void;
  onOpenLanguage: () => void;
  onOpenServers: () => void;
};

export default function FilterBar({
  filters,
  onChange,
  onReset,
  onOpenRank,
  onOpenLanguage,
  onOpenServers,
}: Props) {
  const c = useColors();
  const badge = (label: string, onPress: () => void, active: boolean) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        marginRight: 8,
        backgroundColor: active ? c.accent : c.surface,
        borderWidth: 1,
        borderColor: active ? c.accent : c.border,
      }}
    >
      <Text style={{ color: active ? '#fff' : c.textPrimary, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ paddingVertical: 8 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {badge(
          filters.voiceRequired ? 'Voice ✓' : 'Voice',
          () => onChange({ ...filters, voiceRequired: !filters.voiceRequired }),
          !!filters.voiceRequired,
        )}
        {badge(
          `Rank: ${filters.rankMin ?? '—'}–${filters.rankMax ?? '—'}`,
          onOpenRank,
          !!(filters.rankMin || filters.rankMax),
        )}
        {badge(
          `Lang: ${filters.primaryLanguage ?? 'any'}`,
          onOpenLanguage,
          !!filters.primaryLanguage,
        )}
        {badge(
          `Servers: ${filters.servers?.length ?? 0}`,
          onOpenServers,
          (filters.servers?.length ?? 0) > 0,
        )}
        {badge(
          `Age: ${filters.ageFilter ?? 'any'}`,
          () =>
            onChange({
              ...filters,
              ageFilter:
                filters.ageFilter === 'over_18'
                  ? 'under_18'
                  : filters.ageFilter === 'under_18'
                    ? 'any'
                    : 'over_18',
            }),
          filters.ageFilter !== undefined && filters.ageFilter !== 'any',
        )}
        {badge('Reset', onReset, false)}
      </ScrollView>
    </View>
  );
}
