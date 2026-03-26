import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { registerForPushNotifications, setupNotificationListeners } from '@/lib/notifications';

/**
 * Hook to initialize push notifications.
 * Call once in the root layout after authentication.
 */
export function useNotifications() {
  const { user } = useAuthStore();
  const registered = useRef(false);

  useEffect(() => {
    if (!user?.id || registered.current) return;

    registered.current = true;
    registerForPushNotifications(user.id);
  }, [user?.id]);

  useEffect(() => {
    const cleanup = setupNotificationListeners();
    return cleanup;
  }, []);
}
