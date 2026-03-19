import { create } from 'zustand';
import { GAME_ACCENTS, GameId } from '@/lib/constants';

interface GameState {
  selectedGame: GameId;
  setSelectedGame: (game: GameId) => void;
}

export const useGameStore = create<GameState>((set) => ({
  selectedGame: 'valorant',

  setSelectedGame: (game) => {
    if (__DEV__) console.log('[GameStore] Game changed to:', game);
    set({ selectedGame: game });
  },
}));
