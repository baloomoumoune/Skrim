import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useBaseColors } from '@/hooks/useThemeColors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  color?: string;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
  color,
}: ButtonProps) {
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const resolvedColor = color ?? c.accent;

  const bgColor = {
    primary: resolvedColor,
    outline: 'transparent',
    ghost: 'transparent',
  }[variant];

  const textColor = {
    primary: '#FFFFFF',
    outline: c.textPrimary,
    ghost: c.textSecondary,
  }[variant];

  return (
    <TouchableOpacity
      className={`h-14 rounded-2xl items-center justify-center px-6 ${disabled ? 'opacity-50' : ''} ${className}`}
      style={{
        backgroundColor: bgColor,
        borderWidth: variant === 'outline' ? 1 : 0,
        borderColor: variant === 'outline'
          ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)')
          : 'transparent',
      }}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#FFFFFF' : c.textPrimary}
          size="small"
        />
      ) : (
        <Text
          className="text-[15px] font-bold tracking-wide"
          style={{ color: textColor }}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
