export type Region = 'eu' | 'na' | 'apac' | 'sa' | 'me' | 'oce';
export type GameEnum = 'valorant' | 'cs2';
export type Platform = 'pc' | 'console';
export type TeamRole = 'captain' | 'player' | 'sub' | 'coach';
export type ScrimStatus = 'open' | 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type MatchStatus = 'open' | 'full' | 'in_progress' | 'completed' | 'cancelled';
export type MatchRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  discord_tag: string | null;
  region: Region;
  timezone: string;
  preferred_game: GameEnum;
  current_rank: string | null;
  peak_rank: string | null;
  main_agent: string | null;
  platform: Platform | null;
  push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  tag: string;
  logo_url: string | null;
  game: GameEnum;
  region: Region;
  rank_tier: string | null;
  description: string | null;
  captain_id: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
}

export interface Availability {
  id: string;
  team_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  created_by: string;
  created_at: string;
}

export interface Scrim {
  id: string;
  game: GameEnum;
  team_a_id: string;
  team_b_id: string | null;
  status: ScrimStatus;
  scheduled_at: string;
  map_preferences: string[];
  rank_range: string | null;
  region: Region;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  game: GameEnum;
  game_mode: string;
  creator_id: string;
  region: Region;
  rank_min: string;
  rank_max: string;
  rr_penalty: boolean;
  current_players: number;
  max_players: number;
  status: MatchStatus;
  scheduled_at: string | null;
  discord_link: string | null;
  notes: string | null;
  platform: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchMember {
  id: string;
  match_id: string;
  user_id: string;
  is_ready: boolean;
  kicked_at: string | null;
  joined_at: string;
}

export interface MatchRequest {
  id: string;
  match_id: string;
  user_id: string;
  status: MatchRequestStatus;
  created_at: string;
}

// Composite types for joined queries
export type MatchMemberWithProfile = MatchMember & { profile: Profile };
export type MatchRequestWithProfile = MatchRequest & { profile: Profile };

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      teams: {
        Row: Team;
        Insert: Omit<Team, 'id' | 'created_at' | 'updated_at' | 'invite_code'>;
        Update: Partial<Omit<Team, 'id' | 'created_at' | 'updated_at'>>;
      };
      team_members: {
        Row: TeamMember;
        Insert: Omit<TeamMember, 'id' | 'joined_at'>;
        Update: Partial<Omit<TeamMember, 'id' | 'joined_at'>>;
      };
      availabilities: {
        Row: Availability;
        Insert: Omit<Availability, 'id' | 'created_at'>;
        Update: Partial<Omit<Availability, 'id' | 'created_at'>>;
      };
      scrims: {
        Row: Scrim;
        Insert: Omit<Scrim, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Scrim, 'id' | 'created_at' | 'updated_at'>>;
      };
      matches: {
        Row: Match;
        Insert: Omit<Match, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Match, 'id' | 'created_at' | 'updated_at'>>;
      };
      match_members: {
        Row: MatchMember;
        Insert: Omit<MatchMember, 'id' | 'joined_at' | 'kicked_at'>;
        Update: Partial<Omit<MatchMember, 'id' | 'joined_at'>>;
      };
      match_requests: {
        Row: MatchRequest;
        Insert: Omit<MatchRequest, 'id' | 'created_at'>;
        Update: Partial<Omit<MatchRequest, 'id' | 'created_at'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      region: Region;
      game_enum: GameEnum;
      team_role: TeamRole;
      scrim_status: ScrimStatus;
      match_status: MatchStatus;
      match_request_status: MatchRequestStatus;
    };
  };
}
