import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';

const STORAGE_KEY = '@scrim/theme-preference';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeState {
  preference: ThemePreference;
  isInitialized: boolean;
  setPreference: (pref: ThemePreference) => void;
  initTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'system',
  isInitialized: false,

  setPreference: (pref) => {
    set({ preference: pref });
    colorScheme.set(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref).catch((err) => {
      if (__DEV__) console.error('[ThemeStore] Failed to persist preference:', err);
    });
  },

  initTheme: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        set({ preference: stored, isInitialized: true });
        colorScheme.set(stored);
      } else {
        set({ isInitialized: true });
        colorScheme.set('system');
      }
    } catch {
      set({ isInitialized: true });
      colorScheme.set('system');
    }
  },
}));
