import type { Profile, MatchMember, TeamMember, TeamInvite, Team } from './database';

// Composite types for joined Supabase queries (select with nested profile/team)
export type MatchMemberWithProfile = MatchMember & { profile: Profile };
export type TeamMemberWithProfile = TeamMember & { profile: Profile };
export type TeamInviteWithTeam = TeamInvite & { team: Team; inviter: Profile };
