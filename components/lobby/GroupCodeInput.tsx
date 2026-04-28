import { useState } from 'react';
import { View, TextInput, Pressable, Alert, Text } from 'react-native';
import { useColors } from '@/hooks/useThemeColors';
import { supabase } from '@/lib/supabase';

type Props = { lobbyId: string; current: string | null };

export default function GroupCodeInput({ lobbyId, current }: Props) {
  const c = useColors();
  const [code, setCode] = useState(current ?? '');
  const valid = /^[A-Z0-9]{6}$/.test(code);

  const onSave = async () => {
    if (!valid) return;
    const { error } = await supabase.rpc('set_group_code', {
      p_lobby_id: lobbyId,
      p_code: code,
    });
    if (error) Alert.alert('Error', error.message);
  };

  const disabled = !valid || code === current;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <TextInput
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        autoCapitalize="characters"
        maxLength={6}
        placeholder="GROUP CODE"
        placeholderTextColor={c.textSecondary}
        style={{
          flex: 1,
          padding: 12,
          borderRadius: 10,
          color: c.textPrimary,
          backgroundColor: c.surface,
          fontFamily: 'monospace',
          letterSpacing: 4,
        }}
      />
      <Pressable
        onPress={onSave}
        disabled={disabled}
        style={{
          padding: 12,
          borderRadius: 10,
          backgroundColor: c.accent,
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>
      </Pressable>
    </View>
  );
}
