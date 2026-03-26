import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { supabase } from './supabase';

// expo-device requires a native build — guard for Expo Go
let Device: typeof import('expo-device') | null = null;
try {
  Device = require('expo-device');
} catch {
  if (__DEV__) console.warn('[Notifications] expo-device not available (Expo Go?), push registration disabled');
}

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request push notification permissions and get Expo push token.
 * Saves the token to the user's profile in Supabase.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device?.isDevice) {
    if (__DEV__) console.log('[Notifications] Not a physical device, skipping push registration');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    if (__DEV__) console.log('[Notifications] Permission not granted');
    return null;
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF4655',
    });
  }

  // Get Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });
  const token = tokenData.data;

  if (__DEV__) console.log('[Notifications] Push token:', token);

  // Save to profile
  const { error } = await supabase
    .from('profiles')
    .update({ push_token: token } as never)
    .eq('id', userId);

  if (error && __DEV__) {
    console.error('[Notifications] Failed to save push token:', error);
  }

  return token;
}

/**
 * Setup notification listeners for foreground reception and tap handling.
 * Returns a cleanup function.
 */
export function setupNotificationListeners(): () => void {
  // When notification is received while app is in foreground
  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    if (__DEV__) {
      console.log('[Notifications] Received:', notification.request.content.title);
    }
  });

  // When user taps on a notification
  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (__DEV__) {
      console.log('[Notifications] Tapped:', data);
    }

    // Navigate to match detail if match_id is provided
    if (data?.match_id && typeof data.match_id === 'string') {
      router.push(`/match/${data.match_id}`);
    }
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
