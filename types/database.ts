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
          last_rank_reset_at: string | null
          main_agent: string | null
          platform: string | null
          preferred_game: Database["public"]["Enums"]["game_type"] | null
          previous_rank_before_reset: string | null
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
          last_rank_reset_at?: string | null
          main_agent?: string | null
          platform?: string | null
          preferred_game?: Database["public"]["Enums"]["game_type"] | null
          previous_rank_before_reset?: string | null
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
          last_rank_reset_at?: string | null
          main_agent?: string | null
          platform?: string | null
          preferred_game?: Database["public"]["Enums"]["game_type"] | null
          previous_rank_before_reset?: string | null
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
      valorant_acts: {
        Row: {
          created_at: string | null
          display_name: string
          end_time: string
          is_current: boolean | null
          season_uuid: string
          start_time: string
          updated_at: string | null
          uuid: string
        }
        Insert: {
          created_at?: string | null
          display_name: string
          end_time: string
          is_current?: boolean | null
          season_uuid: string
          start_time: string
          updated_at?: string | null
          uuid: string
        }
        Update: {
          created_at?: string | null
          display_name?: string
          end_time?: string
          is_current?: boolean | null
          season_uuid?: string
          start_time?: string
          updated_at?: string | null
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "valorant_acts_season_uuid_fkey"
            columns: ["season_uuid"]
            isOneToOne: false
            referencedRelation: "valorant_seasons"
            referencedColumns: ["uuid"]
          },
        ]
      }
      valorant_agents: {
        Row: {
          abilities: Json
          background: string | null
          created_at: string | null
          description: string | null
          developer_name: string | null
          display_icon: string | null
          display_name: string
          full_portrait: string | null
          is_base_content: boolean | null
          killfeed_portrait: string | null
          raw_data: Json | null
          role_display_icon: string | null
          role_name: string
          role_uuid: string
          updated_at: string | null
          uuid: string
        }
        Insert: {
          abilities?: Json
          background?: string | null
          created_at?: string | null
          description?: string | null
          developer_name?: string | null
          display_icon?: string | null
          display_name: string
          full_portrait?: string | null
          is_base_content?: boolean | null
          killfeed_portrait?: string | null
          raw_data?: Json | null
          role_display_icon?: string | null
          role_name: string
          role_uuid: string
          updated_at?: string | null
          uuid: string
        }
        Update: {
          abilities?: Json
          background?: string | null
          created_at?: string | null
          description?: string | null
          developer_name?: string | null
          display_icon?: string | null
          display_name?: string
          full_portrait?: string | null
          is_base_content?: boolean | null
          killfeed_portrait?: string | null
          raw_data?: Json | null
          role_display_icon?: string | null
          role_name?: string
          role_uuid?: string
          updated_at?: string | null
          uuid?: string
        }
        Relationships: []
      }
      valorant_game_modes: {
        Row: {
          allows_match_timeouts: boolean | null
          created_at: string | null
          description: string | null
          display_icon: string | null
          display_name: string
          duration: string | null
          is_team_voice_allowed: boolean | null
          raw_data: Json | null
          updated_at: string | null
          uuid: string
        }
        Insert: {
          allows_match_timeouts?: boolean | null
          created_at?: string | null
          description?: string | null
          display_icon?: string | null
          display_name: string
          duration?: string | null
          is_team_voice_allowed?: boolean | null
          raw_data?: Json | null
          updated_at?: string | null
          uuid: string
        }
        Update: {
          allows_match_timeouts?: boolean | null
          created_at?: string | null
          description?: string | null
          display_icon?: string | null
          display_name?: string
          duration?: string | null
          is_team_voice_allowed?: boolean | null
          raw_data?: Json | null
          updated_at?: string | null
          uuid?: string
        }
        Relationships: []
      }
      valorant_maps: {
        Row: {
          coordinates: string | null
          created_at: string | null
          display_icon: string | null
          display_name: string
          is_in_current_pool: boolean | null
          is_playable: boolean | null
          list_view_icon: string | null
          raw_data: Json | null
          splash: string | null
          tactical_description: string | null
          updated_at: string | null
          uuid: string
        }
        Insert: {
          coordinates?: string | null
          created_at?: string | null
          display_icon?: string | null
          display_name: string
          is_in_current_pool?: boolean | null
          is_playable?: boolean | null
          list_view_icon?: string | null
          raw_data?: Json | null
          splash?: string | null
          tactical_description?: string | null
          updated_at?: string | null
          uuid: string
        }
        Update: {
          coordinates?: string | null
          created_at?: string | null
          display_icon?: string | null
          display_name?: string
          is_in_current_pool?: boolean | null
          is_playable?: boolean | null
          list_view_icon?: string | null
          raw_data?: Json | null
          splash?: string | null
          tactical_description?: string | null
          updated_at?: string | null
          uuid?: string
        }
        Relationships: []
      }
      valorant_seasons: {
        Row: {
          created_at: string | null
          display_name: string
          end_time: string
          is_current: boolean | null
          reset_processed: boolean
          start_time: string
          updated_at: string | null
          uuid: string
        }
        Insert: {
          created_at?: string | null
          display_name: string
          end_time: string
          is_current?: boolean | null
          reset_processed?: boolean
          start_time: string
          updated_at?: string | null
          uuid: string
        }
        Update: {
          created_at?: string | null
          display_name?: string
          end_time?: string
          is_current?: boolean | null
          reset_processed?: boolean
          start_time?: string
          updated_at?: string | null
          uuid?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      process_rank_reset: {
        Args: { p_season_uuid: string; p_target_user_ids?: string[] }
        Returns: {
          affected_count: number
          user_ids: string[]
        }[]
      }
      recalculate_team_rank: {
        Args: { p_rank_order: string[]; p_team_id: string }
        Returns: string
      }
      renew_match: { Args: { p_match_id: string }; Returns: undefined }
    }
    Enums: {
      game_type: "valorant" | "cs2"
      match_status: "open" | "full" | "in_progress" | "completed" | "cancelled"
      region_type: "eu" | "na" | "apac" | "sa" | "me" | "oce"
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
      match_status: ["open", "full", "in_progress", "completed", "cancelled"],
      region_type: ["eu", "na", "apac", "sa", "me", "oce"],
      team_invite_status: ["pending", "accepted", "rejected"],
      team_role: ["captain", "player", "sub", "coach", "president"],
    },
  },
} as const
