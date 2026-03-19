import { Stack } from 'expo-router';
import { useBaseColors } from '@/hooks/useThemeColors';

export default function AuthLayout() {
  const colors = useBaseColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    />
  );
}
