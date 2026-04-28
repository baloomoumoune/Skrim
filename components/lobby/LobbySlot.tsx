import { View, Text, Image, Pressable } from 'react-native';
import { useColors } from '@/hooks/useThemeColors';

type Props = {
  state: 'filled' | 'pending' | 'empty';
  username?: string;
  rank?: string;
  avatarUrl?: string | null;
  role?: 'searcher' | 'coplayer' | 'last';
  external?: boolean;
  onKick?: () => void;
};

export default function LobbySlot({
  state,
  username,
  rank,
  avatarUrl,
  role,
  external,
  onKick,
}: Props) {
  const c = useColors();
  const opacity = state === 'pending' ? 0.45 : 1;
  const bg = state === 'empty' ? c.background : c.surface;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: bg,
        opacity,
      }}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: 44, height: 44, borderRadius: 22 }}
        />
      ) : (
        <View
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.border }}
        />
      )}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontWeight: '600', color: c.textPrimary }}>
          {state === 'empty' ? 'Empty slot' : (username ?? 'Pending…')}
        </Text>
        <Text style={{ fontSize: 12, color: c.textSecondary }}>
          {[rank, role, external ? 'external' : null].filter(Boolean).join(' • ')}
        </Text>
      </View>
      {onKick && state === 'filled' && role !== 'searcher' && (
        <Pressable
          onPress={onKick}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 6,
            backgroundColor: '#FF4655',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 12 }}>Kick</Text>
        </Pressable>
      )}
    </View>
  );
}
