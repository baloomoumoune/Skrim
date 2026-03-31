import { useState, useRef, useCallback } from 'react';
import { View, TextInput, Pressable, Dimensions, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useBaseColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';

const SCREEN_WIDTH = Dimensions.get('window').width;
const H_PAD = 48;
const GAP = 8;

interface OtpInputProps {
  length?: number;
  onComplete: (code: string) => void;
  error?: boolean;
}

export default function OtpInput({ length = 8, onComplete, error = false }: OtpInputProps) {
  const [code, setCode] = useState<string[]>(Array(length).fill(''));
  const inputs = useRef<(TextInput | null)[]>([]);
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const cellW = Math.floor((SCREEN_WIDTH - H_PAD - GAP * (length - 1)) / length);
  const cellH = Math.round(cellW * 1.2);
  const fontSize = Math.round(cellW * 0.45);

  const handleChange = useCallback(
    (text: string, index: number) => {
      if (text.length === length) {
        const digits = text.split('').slice(0, length);
        setCode(digits);
        inputs.current[length - 1]?.focus();
        onComplete(digits.join(''));
        return;
      }

      const newCode = [...code];
      newCode[index] = text.slice(-1);
      setCode(newCode);

      if (text && index < length - 1) {
        inputs.current[index + 1]?.focus();
      }

      const joined = newCode.join('');
      if (joined.length === length && !newCode.includes('')) {
        onComplete(joined);
      }
    },
    [code, length, onComplete],
  );

  const handleKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === 'Backspace' && !code[index] && index > 0) {
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputs.current[index - 1]?.focus();
      }
    },
    [code],
  );

  return (
    <View style={[styles.container, { gap: GAP }]}>
      {Array.from({ length }).map((_, i) => (
        <MotiView
          key={i}
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 250, delay: i * 50 }}
        >
          <Pressable onPress={() => inputs.current[i]?.focus()}>
            <TextInput
              ref={(ref) => {
                inputs.current[i] = ref;
              }}
              style={[
                styles.cell,
                {
                  width: cellW,
                  height: cellH,
                  fontSize,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  borderColor: error
                    ? '#FF4655'
                    : code[i]
                      ? c.accent
                      : isDark
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(0,0,0,0.1)',
                  color: c.textPrimary,
                },
              ]}
              value={code[i]}
              onChangeText={(text) => handleChange(text, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={length}
              selectTextOnFocus
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
            />
          </Pressable>
        </MotiView>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cell: {
    borderRadius: 10,
    borderWidth: 1.5,
    fontWeight: '700',
    textAlign: 'center',
  },
});
