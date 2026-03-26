import { create } from 'zustand';
import type { Team, TeamMemberWithProfile } from '@/types/database';

interface TeamState {
  currentTeam: Team | null;
  teamMembers: TeamMemberWithProfile[];
  setCurrentTeam: (team: Team | null, members?: TeamMemberWithProfile[]) => void;
  clearTeam: () => void;
}

export const useTeamStore = create<TeamState>((set) => ({
  currentTeam: null,
  teamMembers: [],
  setCurrentTeam: (team, members = []) => set({ currentTeam: team, teamMembers: members }),
  clearTeam: () => set({ currentTeam: null, teamMembers: [] }),
}));
