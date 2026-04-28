import { View, Text, Pressable, TextInput } from 'react-native';
import { useColors } from '@/hooks/useThemeColors';

export type CoplayerSlot =
  | { mode: 'external'; rank: string }
  | { mode: 'invite'; userId: string; username: string };

type Props = {
  targetLastsCount: 1 | 2 | 3;
  onTargetLastsChange: (n: 1 | 2 | 3) => void;
  coplayers: CoplayerSlot[];
  onCoplayersChange: (slots: CoplayerSlot[]) => void;
  onPickFriend: (slotIndex: number) => void;
};

export default function ComposeGroupSection({
  targetLastsCount,
  onTargetLastsChange,
  coplayers,
  onCoplayersChange,
  onPickFriend,
}: Props) {
  const c = useColors();
  const coplayerCount = 4 - targetLastsCount;

  return (
    <View style={{ padding: 16 }}>
      <Text
        style={{ fontSize: 17, fontWeight: '700', color: c.textPrimary, marginBottom: 8 }}
      >
        Group composition
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {([1, 2, 3] as const).map((n) => {
          const active = targetLastsCount === n;
          return (
            <Pressable
              key={n}
              onPress={() => onTargetLastsChange(n)}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 10,
                alignItems: 'center',
                backgroundColor: active ? c.accent : c.surface,
                borderWidth: 1,
                borderColor: active ? c.accent : c.border,
              }}
            >
              <Text style={{ color: active ? '#fff' : c.textPrimary, fontWeight: '600' }}>
                {n} last{n > 1 ? 's' : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {Array.from({ length: coplayerCount }).map((_, idx) => {
        const slot: CoplayerSlot = coplayers[idx] ?? { mode: 'external', rank: '' };
        return (
          <View
            key={idx}
            style={{
              marginBottom: 8,
              padding: 10,
              backgroundColor: c.surface,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontSize: 13, color: c.textSecondary, marginBottom: 6 }}>
              Co-player #{idx + 1}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {(['external', 'invite'] as const).map((m) => {
                const active = slot.mode === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => {
                      const next = [...coplayers];
                      next[idx] =
                        m === 'external'
                          ? { mode: 'external', rank: '' }
                          : { mode: 'invite', userId: '', username: '' };
                      onCoplayersChange(next);
                    }}
                    style={{
                      flex: 1,
                      padding: 8,
                      borderRadius: 8,
                      alignItems: 'center',
                      backgroundColor: active ? c.accent : c.background,
                    }}
                  >
                    <Text style={{ color: active ? '#fff' : c.textPrimary, fontSize: 12 }}>
                      {m === 'external' ? 'External (rank only)' : 'Invite friend'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {slot.mode === 'external' ? (
              <TextInput
                placeholder="Rank (e.g. Gold 2)"
                value={slot.rank}
                onChangeText={(t) => {
                  const next = [...coplayers];
                  next[idx] = { mode: 'external', rank: t };
                  onCoplayersChange(next);
                }}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  color: c.textPrimary,
                  backgroundColor: c.background,
                  borderWidth: 1,
                  borderColor: c.border,
                }}
                placeholderTextColor={c.textSecondary}
              />
            ) : (
              <Pressable
                onPress={() => onPickFriend(idx)}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: c.background,
                  borderWidth: 1,
                  borderColor: c.border,
                }}
              >
                <Text style={{ color: slot.username ? c.textPrimary : c.textSecondary }}>
                  {slot.username || 'Pick a friend'}
                </Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}
