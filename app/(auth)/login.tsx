// Supabase Dashboard > Authentication > URL Configuration :
// - Site URL : skrim://auth/callback
// - Redirect URLs : skrim://auth/callback

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

type Provider = 'discord' | 'google';

let WebBrowser: typeof import('expo-web-browser') | null = null;

async function getWebBrowser() {
  if (!WebBrowser) {
    WebBrowser = await import('expo-web-browser');
  }
  return WebBrowser;
}

export default function LoginScreen() {
  const [loading, setLoading] = useState<Provider | null>(null);

  console.log('[Login] Screen rendered');

  const handleLogin = async (provider: Provider) => {
    try {
      setLoading(provider);

      const redirectTo = 'skrim://auth/callback';
      console.log(`[Login] Starting ${provider} OAuth flow`);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned');

      console.log(`[Login] Opening ${provider} OAuth URL`);

      const browser = await getWebBrowser();
      const result = await browser.openAuthSessionAsync(data.url, redirectTo);

      console.log(`[Login] Browser result type: ${result.type}`);

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
            console.log(`[Login] Session set successfully from ${provider}`);
          }
        }
      } else {
        console.log(`[Login] ${provider} OAuth cancelled or dismissed`);
      }
    } catch (err) {
      console.error(`[Login] ${provider} OAuth error:`, err);
      Alert.alert('Error', `Failed to sign in with ${provider}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header / Branding */}
        <View style={styles.header}>
          <Text style={styles.title}>SCRIM</Text>
          <Text style={styles.subtitle}>Find your next practice match.</Text>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Auth Buttons */}
        <View style={styles.buttonContainer}>
          {/* Discord Button */}
          <TouchableOpacity
            style={[styles.button, styles.discordButton]}
            onPress={() => handleLogin('discord')}
            disabled={loading !== null}
            activeOpacity={0.8}
          >
            {loading === 'discord' ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="logo-discord" size={22} color="#FFFFFF" />
                <Text style={styles.buttonText}>Continue with Discord</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Google Button */}
          <TouchableOpacity
            style={[styles.button, styles.googleButton]}
            onPress={() => handleLogin('google')}
            disabled={loading !== null}
            activeOpacity={0.8}
          >
            {loading === 'google' ? (
              <ActivityIndicator color="#ECE8E1" size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={22} color="#ECE8E1" />
                <Text style={styles.buttonTextGoogle}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <Text style={styles.legal}>
          By continuing, you agree to our Terms of Service
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1923',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  header: {
    flex: 0.3,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ECE8E1',
    letterSpacing: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#768A96',
    marginTop: 12,
  },
  spacer: {
    flex: 0.3,
  },
  buttonContainer: {
    flex: 0.25,
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    gap: 10,
  },
  discordButton: {
    backgroundColor: '#5865F2',
  },
  googleButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2A3A4A',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextGoogle: {
    color: '#ECE8E1',
    fontSize: 16,
    fontWeight: '600',
  },
  legal: {
    color: '#768A96',
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: 20,
  },
});
