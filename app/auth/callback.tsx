import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

// This screen handles the OAuth callback deep link: skrim://auth/callback#access_token=...
// Once the session is set, _layout.tsx will automatically redirect to tabs.
export default function AuthCallback() {
  useEffect(() => {
    async function handleCallback() {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (__DEV__) console.log('[AuthCallback] Initial URL:', initialUrl);

        if (!initialUrl) return;

        const fragment = initialUrl.split('#')[1];
        if (fragment) {
          const params = new URLSearchParams(fragment);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (__DEV__) console.log('[AuthCallback] Tokens:', {
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
              if (__DEV__) console.log('[AuthCallback] Session set successfully');
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
    <View className="flex-1 bg-background items-center justify-center">
      <ActivityIndicator size="large" />
    </View>
  );
}
