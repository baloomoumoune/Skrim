import { create } from 'zustand';
import type { Database } from '@/types/database';

type AgentRow = Database['public']['Tables']['valorant_agents']['Row'];
type MapRow = Database['public']['Tables']['valorant_maps']['Row'];
type GameModeRow = Database['public']['Tables']['valorant_game_modes']['Row'];
type SeasonRow = Database['public']['Tables']['valorant_seasons']['Row'];
type ActRow = Database['public']['Tables']['valorant_acts']['Row'];
type EventRow = Database['public']['Tables']['valorant_events']['Row'];

interface ValorantDataState {
  agents: AgentRow[];
  maps: MapRow[];
  gameModes: GameModeRow[];
  seasons: SeasonRow[];
  acts: ActRow[];
  events: EventRow[];
  setAgents: (agents: AgentRow[]) => void;
  setMaps: (maps: MapRow[]) => void;
  setGameModes: (modes: GameModeRow[]) => void;
  setSeasons: (seasons: SeasonRow[]) => void;
  setActs: (acts: ActRow[]) => void;
  setEvents: (events: EventRow[]) => void;
}

// Initialized empty — hydrated by useHydrateValorantData with fallback data,
// then updated with fresh Supabase data when available.
export const useValorantDataStore = create<ValorantDataState>((set) => ({
  agents: [],
  maps: [],
  gameModes: [],
  seasons: [],
  acts: [],
  events: [],
  setAgents: (agents) => set({ agents }),
  setMaps: (maps) => set({ maps }),
  setGameModes: (gameModes) => set({ gameModes }),
  setSeasons: (seasons) => set({ seasons }),
  setActs: (acts) => set({ acts }),
  setEvents: (events) => set({ events }),
}));
