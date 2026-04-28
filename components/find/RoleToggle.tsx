import { View, Text, Pressable } from 'react-native';
import { useColors } from '@/hooks/useThemeColors';

type Props = {
  role: 'searcher' | 'last';
  onChange: (r: 'searcher' | 'last') => void;
  locked?: boolean;
};

export default function RoleToggle({ role, onChange, locked }: Props) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.surface, borderRadius: 12, padding: 4 }}>
      {(['searcher', 'last'] as const).map((r) => {
        const active = role === r;
        return (
          <Pressable
            key={r}
            disabled={locked && !active}
            onPress={() => onChange(r)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: active ? c.accent : 'transparent',
              opacity: locked && !active ? 0.4 : 1,
            }}
          >
            <Text style={{ color: active ? '#fff' : c.textPrimary, fontWeight: '600' }}>
              {r === 'searcher' ? "I'm looking for lasts" : "I'm a last"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
