import { Stack } from 'expo-router';
import { useBaseColors } from '@/hooks/useThemeColors';

export default function AuthLayout() {
  const colors = useBaseColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" options={{ animation: 'fade' }} />
      <Stack.Screen name="email" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
    </Stack>
  );
}
