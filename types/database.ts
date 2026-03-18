export type Region = 'eu' | 'na' | 'apac' | 'sa' | 'me' | 'oce';
export type GameEnum = 'valorant' | 'cs2';
export type TeamRole = 'captain' | 'player' | 'sub' | 'coach';
export type ScrimStatus = 'open' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  discord_tag: string | null;
  region: Region;
  timezone: string;
  preferred_game: GameEnum;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      region: Region;
      game_enum: GameEnum;
      team_role: TeamRole;
      scrim_status: ScrimStatus;
    };
  };
}
