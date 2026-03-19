// Supabase Dashboard > Authentication > URL Configuration :
// - Site URL : skrim://auth/callback
// - Redirect URLs : skrim://auth/callback

import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useBaseColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';

type Provider = 'discord' | 'google';

let WebBrowser: typeof import('expo-web-browser') | null = null;

async function getWebBrowser() {
  if (!WebBrowser) {
    WebBrowser = await import('expo-web-browser');
  }
  return WebBrowser;
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState<Provider | null>(null);
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (__DEV__) console.log('[Login] Screen rendered');

  const handleLogin = async (provider: Provider) => {
    try {
      setLoading(provider);
      const redirectTo = 'skrim://auth/callback';
      if (__DEV__) console.log(`[Login] Starting ${provider} OAuth flow`);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });

      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned');

      if (__DEV__) console.log(`[Login] Opening ${provider} OAuth URL`);

      const browser = await getWebBrowser();
      const result = await browser.openAuthSessionAsync(data.url, redirectTo);

      if (__DEV__) console.log(`[Login] Browser result type: ${result.type}`);

      if (result.type === 'success' && result.url) {
        const fragment = result.url.split('#')[1];
        if (fragment) {
          const params = new URLSearchParams(fragment);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (sessionError) throw sessionError;
            if (__DEV__) console.log(`[Login] Session set successfully from ${provider}`);
          }
        }
      } else {
        if (__DEV__) console.log(`[Login] ${provider} OAuth cancelled or dismissed`);
      }
    } catch (err) {
      console.error(`[Login] ${provider} OAuth error:`, err);
      Alert.alert('Error', `Failed to sign in with ${provider}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: c.background }}>
      <View
        className="flex-1 px-8"
        style={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 }}
      >
        {/* Logo + Branding — upper section */}
        <View className="flex-[1] items-center justify-center">
          <Image
            source={require('@/assets/images/skrim-logo.png')}
            style={{ width: 100, height: 100, marginBottom: 20 }}
            contentFit="contain"
          />
          <Text
            className="text-sm tracking-[6px] uppercase"
            style={{ color: c.textTertiary, letterSpacing: 6 }}
          >
            FIND YOUR NEXT MATCH
          </Text>
        </View>

        {/* Auth Buttons — lower section */}
        <View className="pb-4 gap-3">
          {/* Discord */}
          <TouchableOpacity
            className="flex-row items-center justify-center h-14 rounded-2xl gap-3"
            style={{ backgroundColor: '#5865F2' }}
            onPress={() => handleLogin('discord')}
            disabled={loading !== null}
            activeOpacity={0.8}
          >
            {loading === 'discord' ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="logo-discord" size={20} color="#FFFFFF" />
                <Text className="text-white text-[15px] font-semibold tracking-wide">
                  Continue with Discord
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Google */}
          <TouchableOpacity
            className="flex-row items-center justify-center h-14 rounded-2xl gap-3"
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
            }}
            onPress={() => handleLogin('google')}
            disabled={loading !== null}
            activeOpacity={0.8}
          >
            {loading === 'google' ? (
              <ActivityIndicator color={c.textPrimary} size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color={c.textSecondary} />
                <Text
                  className="text-[15px] font-semibold tracking-wide"
                  style={{ color: c.textPrimary }}
                >
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider line */}
          <View
            className="my-2 h-px self-stretch"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
          />

          {/* Legal */}
          <Text
            className="text-[11px] text-center leading-4"
            style={{ color: c.textTertiary }}
          >
            By continuing, you agree to our Terms of Service{'\n'}and Privacy Policy
          </Text>
        </View>
      </View>
    </View>
  );
}
