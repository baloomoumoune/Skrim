import { create } from 'zustand';
import { GAME_THEMES, GameId } from '@/lib/constants';

interface GameState {
  selectedGame: GameId;
  setSelectedGame: (game: GameId) => void;
  getTheme: () => typeof GAME_THEMES[GameId];
}

export const useGameStore = create<GameState>((set, get) => ({
  selectedGame: 'valorant',

  setSelectedGame: (game) => {
    console.log('[GameStore] Game changed to:', game);
    set({ selectedGame: game });
  },

  getTheme: () => {
    return GAME_THEMES[get().selectedGame];
  },
}));
