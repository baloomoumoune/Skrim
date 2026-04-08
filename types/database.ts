export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      match_members: {
        Row: {
          id: string
          is_ready: boolean
          joined_at: string
          kicked_at: string | null
          match_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_ready?: boolean
          joined_at?: string
          kicked_at?: string | null
          match_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_ready?: boolean
          joined_at?: string
          kicked_at?: string | null
          match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_members_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          creator_id: string
          current_players: number
          discord_link: string | null
          expires_at: string | null
          game: Database["public"]["Enums"]["game_type"]
          game_mode: string
          group_code: string | null
          id: string
          launched_at: string | null
          max_players: number
          notes: string | null
          platform: string | null
          rank_max: string
          rank_min: string
          region: Database["public"]["Enums"]["region_type"]
          rr_penalty: boolean
          scheduled_at: string | null
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          current_players?: number
          discord_link?: string | null
          expires_at?: string | null
          game: Database["public"]["Enums"]["game_type"]
          game_mode?: string
          group_code?: string | null
          id?: string
          launched_at?: string | null
          max_players?: number
          notes?: string | null
          platform?: string | null
          rank_max: string
          rank_min: string
          region: Database["public"]["Enums"]["region_type"]
          rr_penalty?: boolean
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          current_players?: number
          discord_link?: string | null
          expires_at?: string | null
          game?: Database["public"]["Enums"]["game_type"]
          game_mode?: string
          group_code?: string | null
          id?: string
          launched_at?: string | null
          max_players?: number
          notes?: string | null
          platform?: string | null
          rank_max?: string
          rank_min?: string
          region?: Database["public"]["Enums"]["region_type"]
          rr_penalty?: boolean
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_rank: string | null
          discord_tag: string | null
          id: string
          main_agent: string | null
          platform: string | null
          preferred_game: Database["public"]["Enums"]["game_type"] | null
          push_token: string | null
          region: Database["public"]["Enums"]["region_type"]
          timezone: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_rank?: string | null
          discord_tag?: string | null
          id: string
          main_agent?: string | null
          platform?: string | null
          preferred_game?: Database["public"]["Enums"]["game_type"] | null
          push_token?: string | null
          region?: Database["public"]["Enums"]["region_type"]
          timezone?: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_rank?: string | null
          discord_tag?: string | null
          id?: string
          main_agent?: string | null
          platform?: string | null
          preferred_game?: Database["public"]["Enums"]["game_type"] | null
          push_token?: string | null
          region?: Database["public"]["Enums"]["region_type"]
          timezone?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      team_invites: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          invited_user_id: string
          status: Database["public"]["Enums"]["team_invite_status"]
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          invited_user_id: string
          status?: Database["public"]["Enums"]["team_invite_status"]
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          invited_user_id?: string
          status?: Database["public"]["Enums"]["team_invite_status"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          is_captain: boolean | null
          joined_at: string
          role: Database["public"]["Enums"]["team_role"]
          slot_index: number | null
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_captain?: boolean | null
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          slot_index?: number | null
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_captain?: boolean | null
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          slot_index?: number | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          game: Database["public"]["Enums"]["game_type"]
          id: string
          invite_code: string | null
          logo_url: string | null
          name: string
          president_id: string
          rank_tier: string | null
          region: Database["public"]["Enums"]["region_type"]
          tag: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          game: Database["public"]["Enums"]["game_type"]
          id?: string
          invite_code?: string | null
          logo_url?: string | null
          name: string
          president_id: string
          rank_tier?: string | null
          region: Database["public"]["Enums"]["region_type"]
          tag: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          game?: Database["public"]["Enums"]["game_type"]
          id?: string
          invite_code?: string | null
          logo_url?: string | null
          name?: string
          president_id?: string
          rank_tier?: string | null
          region?: Database["public"]["Enums"]["region_type"]
          tag?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_captain_id_fkey"
            columns: ["president_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_match_request: {
        Args: { p_match_id: string; p_request_id: string }
        Returns: undefined
      }
      accept_team_invite: { Args: { p_invite_id: string }; Returns: undefined }
      check_active_match: { Args: { p_user_id: string }; Returns: boolean }
      check_email_exists: { Args: { p_email: string }; Returns: boolean }
      check_kick_cooldown: {
        Args: {
          p_cooldown_minutes?: number
          p_match_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      check_username_available: {
        Args: { p_username: string }
        Returns: boolean
      }
      expire_old_matches: { Args: never; Returns: undefined }
      recalculate_team_rank: {
        Args: { p_rank_order: string[]; p_team_id: string }
        Returns: string
      }
      renew_match: { Args: { p_match_id: string }; Returns: undefined }
    }
    Enums: {
      game_type: "valorant" | "cs2"
      match_request_status: "pending" | "accepted" | "rejected"
      match_status: "open" | "full" | "in_progress" | "completed" | "cancelled"
      region_type: "eu" | "na" | "apac" | "sa" | "me" | "oce"
      scrim_status: "open" | "pending" | "confirmed" | "completed" | "cancelled"
      team_invite_status: "pending" | "accepted" | "rejected"
      team_role: "captain" | "player" | "sub" | "coach" | "president"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      game_type: ["valorant", "cs2"],
      match_request_status: ["pending", "accepted", "rejected"],
      match_status: ["open", "full", "in_progress", "completed", "cancelled"],
      region_type: ["eu", "na", "apac", "sa", "me", "oce"],
      scrim_status: ["open", "pending", "confirmed", "completed", "cancelled"],
      team_invite_status: ["pending", "accepted", "rejected"],
      team_role: ["captain", "player", "sub", "coach", "president"],
    },
  },
} as const

// ── Convenience re-exports ──────────────────────────────
// These aliases let the rest of the codebase import short names
// instead of Database['public']['Tables']['...']['Row'].
// Must cover every type name from Task 2.0 audit.

// Row types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Team = Database['public']['Tables']['teams']['Row'];
export type TeamMember = Database['public']['Tables']['team_members']['Row'];
export type TeamInvite = Database['public']['Tables']['team_invites']['Row'];
export type Match = Database['public']['Tables']['matches']['Row'];
export type MatchMember = Database['public']['Tables']['match_members']['Row'];

// Enum types
// Note: DB enum names differ from code names (game_type vs GameEnum, region_type vs Region)
export type GameEnum = Database['public']['Enums']['game_type'];
export type Region = Database['public']['Enums']['region_type'];
export type MatchStatus = Database['public']['Enums']['match_status'];
export type TeamRole = Database['public']['Enums']['team_role'];
export type TeamInviteStatus = Database['public']['Enums']['team_invite_status'];

// Platform is not a DB enum — it's string | null on profiles.
// The codebase uses a union type for type safety.
export type Platform = 'pc' | 'console';
