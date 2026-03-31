import { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useBaseColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';

interface AuthInputProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (text: string) => void;
  secure?: boolean;
  error?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoFocus?: boolean;
}

export default function AuthInput({
  label,
  icon,
  value,
  onChangeText,
  secure = false,
  error,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoFocus = false,
}: AuthInputProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const borderColor = error
    ? '#FF4655'
    : focused
      ? c.accent
      : isDark
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(0,0,0,0.1)';

  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300 }}
    >
      <Text style={[styles.label, { color: error ? '#FF4655' : c.textSecondary }]}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          {
            borderColor,
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
          },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? c.accent : c.textTertiary}
            style={styles.icon}
          />
        )}
        <TextInput
          style={[styles.input, { color: c.textPrimary }]}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure && !showPassword}
          placeholder={placeholder}
          placeholderTextColor={c.textTertiary}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCorrect={false}
        />
        {secure && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={c.textTertiary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </MotiView>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  error: {
    color: '#FF4655',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});
