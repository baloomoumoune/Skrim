import { TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useBaseColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';

type Provider = 'google' | 'apple' | 'discord';

const PROVIDER_CONFIG: Record<Provider, { icon: keyof typeof Ionicons.glyphMap; color?: string }> = {
  google: { icon: 'logo-google' },
  apple: { icon: 'logo-apple' },
  discord: { icon: 'logo-discord', color: '#5865F2' },
};

interface SocialButtonProps {
  provider: Provider;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  delay?: number;
}

export default function SocialButton({
  provider,
  onPress,
  loading = false,
  disabled = false,
  delay = 0,
}: SocialButtonProps) {
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const config = PROVIDER_CONFIG[provider];

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 15, delay }}
    >
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
          },
        ]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator color={c.textPrimary} size="small" />
        ) : (
          <Ionicons
            name={config.icon}
            size={22}
            color={config.color ?? c.textPrimary}
          />
        )}
      </TouchableOpacity>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
