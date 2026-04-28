import { View, Text, Pressable, Alert } from 'react-native';
import { useColors } from '@/hooks/useThemeColors';
import { supabase } from '@/lib/supabase';
import type { LobbyState } from '@/types/composites';

type Props = { state: LobbyState };

export default function LobbyHeader({ state }: Props) {
  const c = useColors();
  const listing = state.listing;
  const status = state.lobby.status;

  if (status === 'launched') {
    return (
      <View style={{ padding: 12, borderRadius: 12, backgroundColor: c.surface }}>
        <Text style={{ color: c.textPrimary, fontWeight: '600' }}>Match in progress</Text>
        <Text style={{ color: c.textSecondary, fontSize: 13 }}>Have a good game!</Text>
      </View>
    );
  }

  if (!listing) return null;

  const onCancel = async () => {
    const { error } = await supabase.rpc('cancel_listing', { p_listing_id: listing.id });
    if (error) Alert.alert('Error', error.message);
  };

  const minutesLeft = Math.max(
    0,
    Math.ceil((new Date(listing.expires_at).getTime() - Date.now()) / 60000),
  );
  return (
    <View
      style={{
        padding: 12,
        borderRadius: 12,
        backgroundColor: c.surface,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.textPrimary, fontWeight: '600' }}>Listing active</Text>
        <Text style={{ color: c.textSecondary, fontSize: 13 }}>
          Expires in {minutesLeft} min
        </Text>
      </View>
      <Pressable
        onPress={onCancel}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          backgroundColor: '#FF4655',
          borderRadius: 6,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 13 }}>Cancel</Text>
      </Pressable>
    </View>
  );
}
