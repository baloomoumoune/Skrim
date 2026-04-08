import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { GameId } from '@/lib/constants';

const STORAGE_KEY = 'skrim:selectedGame';

interface GameState {
  selectedGame: GameId;
  isInitialized: boolean;
  setSelectedGame: (game: GameId) => void;
  initGame: () => Promise<void>;
}

export const useGameStore = create<GameState>((set) => ({
  selectedGame: 'valorant',
  isInitialized: false,

  setSelectedGame: (game) => {
    if (__DEV__) console.log('[GameStore] Game changed to:', game);
    set({ selectedGame: game });
    AsyncStorage.setItem(STORAGE_KEY, game).catch(() => {});
  },

  initGame: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === 'valorant' || stored === 'cs2') {
        set({ selectedGame: stored as GameId, isInitialized: true });
      } else {
        set({ isInitialized: true });
      }
    } catch {
      set({ isInitialized: true });
    }
  },
}));
