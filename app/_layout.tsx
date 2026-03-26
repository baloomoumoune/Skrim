import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments, usePathname, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'nativewind';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSession } from '@/hooks/useSession';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import LoadingScreen from '@/components/LoadingScreen';
import ActiveMatchBanner from '@/components/ActiveMatchBanner';
import { useActiveMatch } from '@/hooks/useActiveMatch';
import { useActiveMatchStore } from '@/stores/activeMatchStore';
import { useNotifications } from '@/hooks/useNotifications';

import '../global.css';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function useProtectedRoute() {
  const { session, isLoading, profile } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!navigationState?.key) return;
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const onOnboarding = segments.join('/') === '(auth)/onboarding';
    const needsOnboarding = session && (!profile || profile.username.startsWith('pending_'));

    if (!session && !inAuthGroup) {
      if (__DEV__) console.log('[ProtectedRoute] → login');
      router.replace('/(auth)/login');
      hasRedirected.current = true;
      return;
    }

    if (!session && inAuthGroup) {
      hasRedirected.current = true;
      return;
    }

    if (needsOnboarding && !onOnboarding) {
      if (__DEV__) console.log('[ProtectedRoute] → onboarding');
      router.replace('/(auth)/onboarding');
      hasRedirected.current = true;
      return;
    }

    // Allow authenticated routes: tabs + match detail
    const inAllowedGroup = inTabsGroup || segments[0] === 'match';
    if (session && !needsOnboarding && !inAllowedGroup) {
      if (__DEV__) console.log('[ProtectedRoute] → tabs');
      router.replace('/(tabs)/home');
      hasRedirected.current = true;
      return;
    }

    hasRedirected.current = true;
  }, [session, isLoading, profile, segments, navigationState?.key, router]);

  return hasRedirected;
}

function InitialLayout() {
  useSession();
  const { isLoading, session } = useAuthStore();
  const hasRedirected = useProtectedRoute();
  const [showLoading, setShowLoading] = useState(true);
  const splashHidden = useRef(false);
  const initTheme = useThemeStore((s) => s.initTheme);
  const segments = useSegments();
  const activeMatch = useActiveMatchStore((s) => s.activeMatch);

  // Start polling for active match when authenticated
  useActiveMatch();

  // Register push notifications + setup listeners
  useNotifications();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    if (hasRedirected.current && !splashHidden.current) {
      splashHidden.current = true;
      SplashScreen.hideAsync();
    }
  });

  const handleLoadingFinish = () => {
    setShowLoading(false);
  };

  // Compute bottom offset: tab bar height when in tabs group
  const inTabs = segments[0] === '(tabs)';
  const bannerBottomOffset = inTabs ? 90 : 20; // ~56 tab bar + 34 safe area approx

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      {session && activeMatch && (
        <ActiveMatchBanner bottomOffset={bannerBottomOffset} />
      )}
      {(isLoading || showLoading) && (
        <LoadingScreen onFinish={handleLoadingFinish} minDuration={1500} />
      )}
    </>
  );
}

export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <InitialLayout />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
