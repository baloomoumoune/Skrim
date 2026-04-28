import type {
  Profile,
  TeamMember,
  TeamInvite,
  Team,
  Lobby,
  LobbyMember,
  Listing,
} from './database';

// Composite types for joined Supabase queries (select with nested profile/team)
export type TeamMemberWithProfile = TeamMember & { profile: Profile };
export type TeamInviteWithTeam = TeamInvite & { team: Team; inviter: Profile };

export type LobbyMemberWithProfile = LobbyMember & { profile: Profile };

export type LobbyState = {
  lobby: Lobby;
  members: { member: LobbyMember; profile: Profile }[];
  listing: Listing | null;
};

export type FeedSearcherListing = {
  listing_id: string;
  lobby_id: string;
  owner_id: string;
  owner_username: string;
  owner_avatar_url: string | null;
  owner_current_rank: string;
  criteria: Record<string, unknown>;
  target_lasts_count: number;
  group_composition: { rank: string }[] | null;
  notes: string | null;
  created_at: string;
  expires_at: string;
};

export type FeedLastListing = Omit<FeedSearcherListing, 'target_lasts_count' | 'group_composition'>;
