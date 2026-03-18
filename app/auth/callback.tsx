import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

// This screen handles the OAuth callback deep link: skrim://auth/callback#access_token=...
// Once the session is set, _layout.tsx will automatically redirect to tabs.
export default function AuthCallback() {
  useEffect(() => {
    async function handleCallback() {
      try {
        const initialUrl = await Linking.getInitialURL();
        console.log('[AuthCallback] Initial URL:', initialUrl);

        if (!initialUrl) return;

        const fragment = initialUrl.split('#')[1];
        if (fragment) {
          const params = new URLSearchParams(fragment);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          console.log('[AuthCallback] Tokens:', {
            access: !!access_token,
            refresh: !!refresh_token,
          });

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (error) {
              console.error('[AuthCallback] Session error:', error.message);
            } else {
              console.log('[AuthCallback] Session set successfully');
            }
            // _layout.tsx useProtectedRoute will handle the redirect
          }
        }
      } catch (err) {
        console.error('[AuthCallback] Error:', err);
      }
    }

    handleCallback();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#FF4655" size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1923',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
