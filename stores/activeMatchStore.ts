import { create } from 'zustand';
import type { Match, MatchMemberWithProfile } from '@/types/database';

interface ActiveMatchState {
  activeMatch: Match | null;
  activeMembers: MatchMemberWithProfile[];
  setActiveMatch: (match: Match | null, members?: MatchMemberWithProfile[]) => void;
  clearActiveMatch: () => void;
}

export const useActiveMatchStore = create<ActiveMatchState>((set) => ({
  activeMatch: null,
  activeMembers: [],
  setActiveMatch: (match, members = []) => set({ activeMatch: match, activeMembers: members }),
  clearActiveMatch: () => set({ activeMatch: null, activeMembers: [] }),
}));
