import { useEffect } from 'react';
import { Slot, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSession } from '@/hooks/useSession';
import { useAuthStore } from '@/stores/authStore';

import '../global.css';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function useProtectedRoute() {
  const { session, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Wait for navigation to be ready and session to be checked
    if (!navigationState?.key) return;
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    console.log('[ProtectedRoute]', {
      hasSession: !!session,
      inAuthGroup,
      inTabsGroup,
      segments: segments.join('/'),
    });

    if (session && !inTabsGroup) {
      // Logged in but not in tabs — go to tabs
      console.log('[ProtectedRoute] → tabs');
      router.replace('/(tabs)/feed');
    } else if (!session && !inAuthGroup) {
      // Not logged in and not in auth — go to login
      console.log('[ProtectedRoute] → login');
      router.replace('/(auth)/login');
    }
  }, [session, isLoading, segments, navigationState?.key, router]);
}

function InitialLayout() {
  const { isLoading } = useSession();

  useProtectedRoute();

  useEffect(() => {
    if (!isLoading) {
      console.log('[RootLayout] Session loaded, hiding splash');
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <InitialLayout />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
