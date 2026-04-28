import { View, Text, Image, Pressable } from 'react-native';
import { useColors } from '@/hooks/useThemeColors';
import type { FeedSearcherListing, FeedLastListing } from '@/types/composites';

type Props = {
  listing: FeedSearcherListing | FeedLastListing;
  onPress: () => void;
};

function isSearcher(l: FeedSearcherListing | FeedLastListing): l is FeedSearcherListing {
  return (
    'target_lasts_count' in l && (l as FeedSearcherListing).target_lasts_count !== undefined
  );
}

export default function ListingCard({ listing, onPress }: Props) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: c.surface,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        gap: 12,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      {listing.owner_avatar_url ? (
        <Image
          source={{ uri: listing.owner_avatar_url }}
          style={{ width: 52, height: 52, borderRadius: 26 }}
        />
      ) : (
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.border }} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: c.textPrimary }}>
          {listing.owner_username}
        </Text>
        <Text style={{ fontSize: 13, color: c.textSecondary }}>
          {listing.owner_current_rank}
          {isSearcher(listing)
            ? `  •  Looking for ${listing.target_lasts_count} last${listing.target_lasts_count > 1 ? 's' : ''}`
            : '  •  Available as last'}
        </Text>
        {listing.notes && (
          <Text
            numberOfLines={2}
            style={{ fontSize: 12, color: c.textSecondary, marginTop: 4 }}
          >
            {listing.notes}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
