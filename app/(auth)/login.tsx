// Supabase Dashboard > Authentication > URL Configuration :
// - Site URL : skrim://auth/callback
// - Redirect URLs : skrim://auth/callback

import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useBaseColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';
import SocialButton from '@/components/auth/SocialButton';

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
  const router = useRouter();
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
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
        ]}
      >
        {/* Logo + Tagline — centered in upper half */}
        <View style={styles.heroSection}>
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 15, delay: 200 }}
          >
            <Image
              source={require('@/assets/images/skrim-logo.png')}
              style={styles.logo}
              contentFit="contain"
            />
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 6 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 400 }}
          >
            <Text style={[styles.tagline, { color: c.textTertiary }]}>
              FIND YOUR NEXT MATCH
            </Text>
          </MotiView>
        </View>

        {/* Bottom section — OAuth icons, divider, email button, legal */}
        <View style={styles.bottomSection}>
          {/* Social OAuth icons row */}
          <View style={styles.socialRow}>
            <SocialButton
              provider="google"
              onPress={() => handleLogin('google')}
              loading={loading === 'google'}
              disabled={loading !== null}
              delay={600}
            />
            <SocialButton
              provider="apple"
              onPress={() => {}}
              disabled={false}
              delay={700}
            />
            <SocialButton
              provider="discord"
              onPress={() => handleLogin('discord')}
              loading={loading === 'discord'}
              disabled={loading !== null}
              delay={800}
            />
          </View>

          {/* Divider "or" */}
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 400, delay: 850 }}
            style={styles.dividerContainer}
          >
            <View
              style={[
                styles.dividerLine,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,0,0,0.08)',
                },
              ]}
            />
            <Text style={[styles.dividerText, { color: c.textTertiary }]}>or</Text>
            <View
              style={[
                styles.dividerLine,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,0,0,0.08)',
                },
              ]}
            />
          </MotiView>

          {/* Continue with email button */}
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, delay: 900 }}
          >
            <TouchableOpacity
              style={[
                styles.emailButton,
                {
                  backgroundColor: isDark ? '#FFFFFF' : '#000000',
                },
              ]}
              onPress={() => router.push('/(auth)/email')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={isDark ? '#000000' : '#FFFFFF'}
                style={styles.emailIcon}
              />
              <Text
                style={[
                  styles.emailButtonText,
                  { color: isDark ? '#000000' : '#FFFFFF' },
                ]}
              >
                Continue with email
              </Text>
            </TouchableOpacity>
          </MotiView>

          {/* Legal text */}
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 400, delay: 1100 }}
          >
            <Text style={[styles.legalText, { color: c.textTertiary }]}>
              By continuing, you agree to our Terms of Service{'\n'}and Privacy Policy
            </Text>
          </MotiView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 210,
    height: 210,
    marginBottom: 20,
  },
  tagline: {
    fontSize: 12,
    letterSpacing: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  bottomSection: {
    paddingBottom: 8,
    gap: 20,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 27,
  },
  emailIcon: {
    marginRight: 10,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  legalText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
