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
      listing_invitations: {
        Row: {
          created_at: string
          direction: Database["public"]["Enums"]["invitation_direction"]
          expires_at: string
          from_user_id: string
          id: string
          listing_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["invitation_status"]
          to_user_id: string
        }
        Insert: {
          created_at?: string
          direction: Database["public"]["Enums"]["invitation_direction"]
          expires_at?: string
          from_user_id: string
          id?: string
          listing_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          to_user_id: string
        }
        Update: {
          created_at?: string
          direction?: Database["public"]["Enums"]["invitation_direction"]
          expires_at?: string
          from_user_id?: string
          id?: string
          listing_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_invitations_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_invitations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_invitations_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          created_at: string
          criteria: Json
          expires_at: string
          group_composition: Json | null
          id: string
          kind: Database["public"]["Enums"]["listing_kind"]
          lobby_id: string
          notes: string | null
          status: Database["public"]["Enums"]["listing_status"]
          target_lasts_count: number | null
        }
        Insert: {
          created_at?: string
          criteria: Json
          expires_at?: string
          group_composition?: Json | null
          id?: string
          kind: Database["public"]["Enums"]["listing_kind"]
          lobby_id: string
          notes?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          target_lasts_count?: number | null
        }
        Update: {
          created_at?: string
          criteria?: Json
          expires_at?: string
          group_composition?: Json | null
          id?: string
          kind?: Database["public"]["Enums"]["listing_kind"]
          lobby_id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          target_lasts_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      lobbies: {
        Row: {
          created_at: string
          group_code: string | null
          id: string
          last_launched_at: string | null
          owner_id: string
          status: Database["public"]["Enums"]["lobby_status"]
        }
        Insert: {
          created_at?: string
          group_code?: string | null
          id?: string
          last_launched_at?: string | null
          owner_id: string
          status?: Database["public"]["Enums"]["lobby_status"]
        }
        Update: {
          created_at?: string
          group_code?: string | null
          id?: string
          last_launched_at?: string | null
          owner_id?: string
          status?: Database["public"]["Enums"]["lobby_status"]
        }
        Relationships: [
          {
            foreignKeyName: "lobbies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lobby_events: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["lobby_event_kind"]
          lobby_id: string
          metadata: Json | null
          recipient_id: string
          seen_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["lobby_event_kind"]
          lobby_id: string
          metadata?: Json | null
          recipient_id: string
          seen_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["lobby_event_kind"]
          lobby_id?: string
          metadata?: Json | null
          recipient_id?: string
          seen_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lobby_events_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobby_events_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lobby_members: {
        Row: {
          id: string
          joined_at: string
          left_at: string | null
          lobby_id: string
          removed_by_searcher: boolean
          role: Database["public"]["Enums"]["lobby_member_role"]
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          left_at?: string | null
          lobby_id: string
          removed_by_searcher?: boolean
          role: Database["public"]["Enums"]["lobby_member_role"]
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          left_at?: string | null
          lobby_id?: string
          removed_by_searcher?: boolean
          role?: Database["public"]["Enums"]["lobby_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lobby_members_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobby_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_servers: {
        Row: {
          profile_id: string
          server_id: string
        }
        Insert: {
          profile_id: string
          server_id: string
        }
        Update: {
          profile_id?: string
          server_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_servers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_servers_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "valorant_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birthdate: string
          created_at: string
          current_rank: string
          discord_tag: string | null
          id: string
          main_agent: string | null
          platform: Database["public"]["Enums"]["valorant_platform"]
          preferred_game: Database["public"]["Enums"]["game_type"] | null
          primary_language: string
          push_token: string | null
          rank_updated_at: string
          region: Database["public"]["Enums"]["valorant_region"]
          secondary_languages: string[]
          updated_at: string
          username: string
          voice_enabled: boolean
        }
        Insert: {
          avatar_url?: string | null
          birthdate: string
          created_at?: string
          current_rank: string
          discord_tag?: string | null
          id: string
          main_agent?: string | null
          platform: Database["public"]["Enums"]["valorant_platform"]
          preferred_game?: Database["public"]["Enums"]["game_type"] | null
          primary_language: string
          push_token?: string | null
          rank_updated_at?: string
          region: Database["public"]["Enums"]["valorant_region"]
          secondary_languages?: string[]
          updated_at?: string
          username: string
          voice_enabled?: boolean
        }
        Update: {
          avatar_url?: string | null
          birthdate?: string
          created_at?: string
          current_rank?: string
          discord_tag?: string | null
          id?: string
          main_agent?: string | null
          platform?: Database["public"]["Enums"]["valorant_platform"]
          preferred_game?: Database["public"]["Enums"]["game_type"] | null
          primary_language?: string
          push_token?: string | null
          rank_updated_at?: string
          region?: Database["public"]["Enums"]["valorant_region"]
          secondary_languages?: string[]
          updated_at?: string
          username?: string
          voice_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_main_agent_fkey"
            columns: ["main_agent"]
            isOneToOne: false
            referencedRelation: "valorant_agents"
            referencedColumns: ["uuid"]
          },
        ]
      }
      profiles_backup_pre_uuid_migration: {
        Row: {
          backed_up_at: string | null
          id: string | null
          main_agent: string | null
        }
        Insert: {
          backed_up_at?: string | null
          id?: string | null
          main_agent?: string | null
        }
        Update: {
          backed_up_at?: string | null
          id?: string | null
          main_agent?: string | null
        }
        Relationships: []
      }
      sync_runs: {
        Row: {
          duration_ms: number
          endpoints_summary: Json
          errors: string[]
          id: number
          new_current_act_uuid: string | null
          ran_at: string
          success: boolean
          triggered_rank_reset: boolean
          valorant_build_date: string | null
          valorant_version: string | null
        }
        Insert: {
          duration_ms: number
          endpoints_summary: Json
          errors?: string[]
          id?: number
          new_current_act_uuid?: string | null
          ran_at?: string
          success: boolean
          triggered_rank_reset?: boolean
          valorant_build_date?: string | null
          valorant_version?: string | null
        }
        Update: {
          duration_ms?: number
          endpoints_summary?: Json
          errors?: string[]
          id?: number
          new_current_act_uuid?: string | null
          ran_at?: string
          success?: boolean
          triggered_rank_reset?: boolean
          valorant_build_date?: string | null
          valorant_version?: string | null
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
          act_number: number
          created_at: string | null
          display_name: string
          end_time: string
          is_current: boolean | null
          reset_processed: boolean
          season_uuid: string
          start_time: string
          updated_at: string | null
          uuid: string
        }
        Insert: {
          act_number: number
          created_at?: string | null
          display_name: string
          end_time: string
          is_current?: boolean | null
          reset_processed?: boolean
          season_uuid: string
          start_time: string
          updated_at?: string | null
          uuid: string
        }
        Update: {
          act_number?: number
          created_at?: string | null
          display_name?: string
          end_time?: string
          is_current?: boolean | null
          reset_processed?: boolean
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
          slug: string
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
          slug: string
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
          slug?: string
          updated_at?: string | null
          uuid?: string
        }
        Relationships: []
      }
      valorant_competitive_tiers: {
        Row: {
          asset_object_name: string | null
          asset_path: string | null
          created_at: string | null
          raw_data: Json | null
          tiers: Json
          updated_at: string | null
          uuid: string
        }
        Insert: {
          asset_object_name?: string | null
          asset_path?: string | null
          created_at?: string | null
          raw_data?: Json | null
          tiers: Json
          updated_at?: string | null
          uuid: string
        }
        Update: {
          asset_object_name?: string | null
          asset_path?: string | null
          created_at?: string | null
          raw_data?: Json | null
          tiers?: Json
          updated_at?: string | null
          uuid?: string
        }
        Relationships: []
      }
      valorant_events: {
        Row: {
          asset_path: string | null
          created_at: string | null
          display_name: string
          end_time: string
          is_current: boolean | null
          raw_data: Json | null
          short_display_name: string | null
          start_time: string
          updated_at: string | null
          uuid: string
        }
        Insert: {
          asset_path?: string | null
          created_at?: string | null
          display_name: string
          end_time: string
          is_current?: boolean | null
          raw_data?: Json | null
          short_display_name?: string | null
          start_time: string
          updated_at?: string | null
          uuid: string
        }
        Update: {
          asset_path?: string | null
          created_at?: string | null
          display_name?: string
          end_time?: string
          is_current?: boolean | null
          raw_data?: Json | null
          short_display_name?: string | null
          start_time?: string
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
      valorant_gear: {
        Row: {
          asset_path: string | null
          created_at: string | null
          description: string | null
          display_icon: string | null
          display_name: string
          raw_data: Json | null
          shop_data: Json | null
          updated_at: string | null
          uuid: string
        }
        Insert: {
          asset_path?: string | null
          created_at?: string | null
          description?: string | null
          display_icon?: string | null
          display_name: string
          raw_data?: Json | null
          shop_data?: Json | null
          updated_at?: string | null
          uuid: string
        }
        Update: {
          asset_path?: string | null
          created_at?: string | null
          description?: string | null
          display_icon?: string | null
          display_name?: string
          raw_data?: Json | null
          shop_data?: Json | null
          updated_at?: string | null
          uuid?: string
        }
        Relationships: []
      }
      valorant_level_borders: {
        Row: {
          asset_path: string | null
          created_at: string | null
          display_name: string | null
          level_number_appearance: string | null
          raw_data: Json | null
          small_player_card_appearance: string | null
          starting_level: number
          updated_at: string | null
          uuid: string
        }
        Insert: {
          asset_path?: string | null
          created_at?: string | null
          display_name?: string | null
          level_number_appearance?: string | null
          raw_data?: Json | null
          small_player_card_appearance?: string | null
          starting_level: number
          updated_at?: string | null
          uuid: string
        }
        Update: {
          asset_path?: string | null
          created_at?: string | null
          display_name?: string | null
          level_number_appearance?: string | null
          raw_data?: Json | null
          small_player_card_appearance?: string | null
          starting_level?: number
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
          episode_number: number | null
          is_current: boolean | null
          start_time: string
          updated_at: string | null
          uuid: string
        }
        Insert: {
          created_at?: string | null
          display_name: string
          end_time: string
          episode_number?: number | null
          is_current?: boolean | null
          start_time: string
          updated_at?: string | null
          uuid: string
        }
        Update: {
          created_at?: string | null
          display_name?: string
          end_time?: string
          episode_number?: number | null
          is_current?: boolean | null
          start_time?: string
          updated_at?: string | null
          uuid?: string
        }
        Relationships: []
      }
      valorant_seasons_competitive: {
        Row: {
          asset_path: string | null
          borders: Json | null
          competitive_tiers_uuid: string
          created_at: string | null
          end_time: string
          is_current: boolean | null
          raw_data: Json | null
          season_uuid: string
          start_time: string
          updated_at: string | null
          uuid: string
        }
        Insert: {
          asset_path?: string | null
          borders?: Json | null
          competitive_tiers_uuid: string
          created_at?: string | null
          end_time: string
          is_current?: boolean | null
          raw_data?: Json | null
          season_uuid: string
          start_time: string
          updated_at?: string | null
          uuid: string
        }
        Update: {
          asset_path?: string | null
          borders?: Json | null
          competitive_tiers_uuid?: string
          created_at?: string | null
          end_time?: string
          is_current?: boolean | null
          raw_data?: Json | null
          season_uuid?: string
          start_time?: string
          updated_at?: string | null
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "valorant_seasons_competitive_competitive_tiers_uuid_fkey"
            columns: ["competitive_tiers_uuid"]
            isOneToOne: false
            referencedRelation: "valorant_competitive_tiers"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "valorant_seasons_competitive_season_uuid_fkey"
            columns: ["season_uuid"]
            isOneToOne: false
            referencedRelation: "valorant_seasons"
            referencedColumns: ["uuid"]
          },
        ]
      }
      valorant_servers: {
        Row: {
          display_name: string
          id: string
          region: Database["public"]["Enums"]["valorant_region"]
          sort_order: number
        }
        Insert: {
          display_name: string
          id: string
          region: Database["public"]["Enums"]["valorant_region"]
          sort_order?: number
        }
        Update: {
          display_name?: string
          id?: string
          region?: Database["public"]["Enums"]["valorant_region"]
          sort_order?: number
        }
        Relationships: []
      }
      valorant_weapons: {
        Row: {
          asset_path: string | null
          category: string
          created_at: string | null
          default_skin_uuid: string | null
          display_icon: string | null
          display_name: string
          kill_stream_icon: string | null
          raw_data: Json | null
          shop_data: Json | null
          updated_at: string | null
          uuid: string
          weapon_stats: Json | null
        }
        Insert: {
          asset_path?: string | null
          category: string
          created_at?: string | null
          default_skin_uuid?: string | null
          display_icon?: string | null
          display_name: string
          kill_stream_icon?: string | null
          raw_data?: Json | null
          shop_data?: Json | null
          updated_at?: string | null
          uuid: string
          weapon_stats?: Json | null
        }
        Update: {
          asset_path?: string | null
          category?: string
          created_at?: string | null
          default_skin_uuid?: string | null
          display_icon?: string | null
          display_name?: string
          kill_stream_icon?: string | null
          raw_data?: Json | null
          shop_data?: Json | null
          updated_at?: string | null
          uuid?: string
          weapon_stats?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { p_invitation_id: string }; Returns: string }
      accept_team_invite: { Args: { p_invite_id: string }; Returns: undefined }
      assert_launch_composition_valid: {
        Args: { p_lobby_id: string }
        Returns: undefined
      }
      assert_lobby_owner: { Args: { p_lobby_id: string }; Returns: undefined }
      cancel_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      cancel_listing: { Args: { p_listing_id: string }; Returns: undefined }
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
      create_last_listing: {
        Args: { p_criteria: Json; p_notes?: string }
        Returns: string
      }
      create_searcher_listing: {
        Args: {
          p_coplayer_invites: string[]
          p_criteria: Json
          p_group_composition: Json
          p_notes?: string
          p_target_lasts_count: number
        }
        Returns: string
      }
      decline_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      expire_old_invitations: { Args: never; Returns: number }
      expire_old_listings: { Args: never; Returns: number }
      get_last_feed: {
        Args: { p_filter_overrides?: Json }
        Returns: {
          created_at: string
          criteria: Json
          expires_at: string
          listing_id: string
          lobby_id: string
          notes: string
          owner_avatar_url: string
          owner_current_rank: string
          owner_id: string
          owner_username: string
        }[]
      }
      get_lobby_state: { Args: { p_lobby_id: string }; Returns: Json }
      get_my_active_listing: {
        Args: never
        Returns: {
          created_at: string
          criteria: Json
          expires_at: string
          group_code: string
          group_composition: Json
          kind: Database["public"]["Enums"]["listing_kind"]
          listing_id: string
          lobby_id: string
          lobby_status: Database["public"]["Enums"]["lobby_status"]
          notes: string
          status: Database["public"]["Enums"]["listing_status"]
          target_lasts_count: number
        }[]
      }
      get_searcher_feed: {
        Args: { p_filter_overrides?: Json }
        Returns: {
          created_at: string
          criteria: Json
          expires_at: string
          group_composition: Json
          listing_id: string
          lobby_id: string
          notes: string
          owner_avatar_url: string
          owner_current_rank: string
          owner_id: string
          owner_username: string
          target_lasts_count: number
        }[]
      }
      get_sync_health_snapshot: { Args: { p_since?: string }; Returns: Json }
      get_vault_secret: { Args: { p_name: string }; Returns: string }
      invite_coplayer: {
        Args: { p_listing_id: string; p_target_user_id: string }
        Returns: string
      }
      invite_last: {
        Args: { p_listing_id: string; p_target_user_id: string }
        Returns: string
      }
      is_immortal_plus: { Args: { p_tier_name: string }; Returns: boolean }
      launch_lobby: { Args: { p_lobby_id: string }; Returns: undefined }
      leave_lobby: { Args: { p_lobby_id: string }; Returns: undefined }
      lobby_active_member_count: {
        Args: { p_lobby_id: string }
        Returns: number
      }
      mark_events_seen: { Args: { p_event_ids: string[] }; Returns: number }
      my_lobby_id: { Args: never; Returns: string }
      process_rank_reset: {
        Args: { p_act_uuid: string; p_target_user_ids?: string[] }
        Returns: {
          affected_count: number
          user_ids: string[]
        }[]
      }
      propose_as_last: { Args: { p_listing_id: string }; Returns: string }
      recalculate_team_rank: {
        Args: { p_rank_order: string[]; p_team_id: string }
        Returns: string
      }
      remove_lobby_member: {
        Args: { p_lobby_id: string; p_target_user_id: string }
        Returns: undefined
      }
      set_group_code: {
        Args: { p_code: string; p_lobby_id: string }
        Returns: undefined
      }
    }
    Enums: {
      game_type: "valorant" | "cs2"
      invitation_direction: "invite_last" | "propose_last" | "invite_coplayer"
      invitation_status:
        | "pending"
        | "accepted"
        | "declined"
        | "expired"
        | "cancelled"
      listing_kind: "searcher" | "last"
      listing_status: "open" | "closed" | "expired"
      lobby_event_kind:
        | "invitation_received"
        | "invitation_accepted"
        | "invitation_declined"
        | "member_joined"
        | "member_left"
        | "member_kicked"
        | "group_code_set"
        | "lobby_launched"
        | "listing_expiring_soon"
        | "listing_expired"
      lobby_member_role: "searcher" | "coplayer" | "last"
      lobby_status: "idle" | "searching" | "launched"
      team_invite_status: "pending" | "accepted" | "rejected"
      team_role: "captain" | "player" | "sub" | "coach" | "president"
      valorant_platform: "pc" | "console"
      valorant_region: "NA" | "LATAM" | "BR" | "EU" | "KR" | "APAC"
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
      invitation_direction: ["invite_last", "propose_last", "invite_coplayer"],
      invitation_status: [
        "pending",
        "accepted",
        "declined",
        "expired",
        "cancelled",
      ],
      listing_kind: ["searcher", "last"],
      listing_status: ["open", "closed", "expired"],
      lobby_event_kind: [
        "invitation_received",
        "invitation_accepted",
        "invitation_declined",
        "member_joined",
        "member_left",
        "member_kicked",
        "group_code_set",
        "lobby_launched",
        "listing_expiring_soon",
        "listing_expired",
      ],
      lobby_member_role: ["searcher", "coplayer", "last"],
      lobby_status: ["idle", "searching", "launched"],
      team_invite_status: ["pending", "accepted", "rejected"],
      team_role: ["captain", "player", "sub", "coach", "president"],
      valorant_platform: ["pc", "console"],
      valorant_region: ["NA", "LATAM", "BR", "EU", "KR", "APAC"],
    },
  },
} as const

// ── Compatibility aliases ──────────────────────────────────────────────
// Hand-maintained re-exports of common Row / Enum types used across the
// app. Keep these in sync when the schema changes.

type _Tables = Database["public"]["Tables"]
type _Enums = Database["public"]["Enums"]

export type Profile = _Tables["profiles"]["Row"]
export type Team = _Tables["teams"]["Row"]
export type TeamMember = _Tables["team_members"]["Row"]
export type TeamInvite = _Tables["team_invites"]["Row"]

export type Lobby = _Tables["lobbies"]["Row"]
export type LobbyMember = _Tables["lobby_members"]["Row"]
export type LobbyEvent = _Tables["lobby_events"]["Row"]
export type Listing = _Tables["listings"]["Row"]
export type ListingInvitation = _Tables["listing_invitations"]["Row"]
export type ValorantServer = _Tables["valorant_servers"]["Row"]
export type ProfileServer = _Tables["profile_servers"]["Row"]

export type Region = _Enums["valorant_region"]
export type Platform = _Enums["valorant_platform"]
export type TeamRole = _Enums["team_role"]
export type GameEnum = "valorant" | "cs2"

