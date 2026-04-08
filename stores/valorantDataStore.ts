import { create } from 'zustand';
import type { Database } from '@/types/database';

type AgentRow = Database['public']['Tables']['valorant_agents']['Row'];
type MapRow = Database['public']['Tables']['valorant_maps']['Row'];
type GameModeRow = Database['public']['Tables']['valorant_game_modes']['Row'];

interface ValorantDataState {
  agents: AgentRow[];
  maps: MapRow[];
  gameModes: GameModeRow[];
  setAgents: (agents: AgentRow[]) => void;
  setMaps: (maps: MapRow[]) => void;
  setGameModes: (modes: GameModeRow[]) => void;
}

// Initialized empty — hydrated by useHydrateValorantData with fallback data,
// then updated with fresh Supabase data when available.
export const useValorantDataStore = create<ValorantDataState>((set) => ({
  agents: [],
  maps: [],
  gameModes: [],
  setAgents: (agents) => set({ agents }),
  setMaps: (maps) => set({ maps }),
  setGameModes: (gameModes) => set({ gameModes }),
}));
