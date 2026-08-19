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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  next_auth: {
    Tables: {
      accounts: {
        Row: {
          access_token: string | null
          expires_at: number | null
          id: string
          id_token: string | null
          provider: string
          providerAccountId: string
          refresh_token: string | null
          scope: string | null
          session_state: string | null
          steamId: string | null
          token_type: string | null
          type: string
          userId: string
        }
        Insert: {
          access_token?: string | null
          expires_at?: number | null
          id?: string
          id_token?: string | null
          provider: string
          providerAccountId: string
          refresh_token?: string | null
          scope?: string | null
          session_state?: string | null
          steamId?: string | null
          token_type?: string | null
          type: string
          userId: string
        }
        Update: {
          access_token?: string | null
          expires_at?: number | null
          id?: string
          id_token?: string | null
          provider?: string
          providerAccountId?: string
          refresh_token?: string | null
          scope?: string | null
          session_state?: string | null
          steamId?: string | null
          token_type?: string | null
          type?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          expires: string
          id: string
          sessionToken: string
          userId: string
        }
        Insert: {
          expires: string
          id?: string
          sessionToken: string
          userId: string
        }
        Update: {
          expires?: string
          id?: string
          sessionToken?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          email: string | null
          emailVerified: string | null
          id: string
          image: string | null
          name: string | null
        }
        Insert: {
          email?: string | null
          emailVerified?: string | null
          id?: string
          image?: string | null
          name?: string | null
        }
        Update: {
          email?: string | null
          emailVerified?: string | null
          id?: string
          image?: string | null
          name?: string | null
        }
        Relationships: []
      }
      verification_tokens: {
        Row: {
          expires: string
          identifier: string
          token: string
        }
        Insert: {
          expires: string
          identifier: string
          token: string
        }
        Update: {
          expires?: string
          identifier?: string
          token?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          access_token: string | null
          expires_at: number | null
          id: string
          id_token: string | null
          provider: string
          providerAccountId: string
          refresh_token: string | null
          scope: string | null
          session_state: string | null
          token_type: string | null
          type: string
          userId: string
        }
        Insert: {
          access_token?: string | null
          expires_at?: number | null
          id?: string
          id_token?: string | null
          provider: string
          providerAccountId: string
          refresh_token?: string | null
          scope?: string | null
          session_state?: string | null
          token_type?: string | null
          type: string
          userId: string
        }
        Update: {
          access_token?: string | null
          expires_at?: number | null
          id?: string
          id_token?: string | null
          provider?: string
          providerAccountId?: string
          refresh_token?: string | null
          scope?: string | null
          session_state?: string | null
          token_type?: string | null
          type?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      caster_applications: {
        Row: {
          id: string
          user_id: string
          alias: string
          bio: string | null
          twitch_channel: string | null
          kick_channel: string | null
          youtube_channel: string | null
          languages: string[] | null
          status: string
          reviewer_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          alias: string
          bio?: string | null
          twitch_channel?: string | null
          kick_channel?: string | null
          youtube_channel?: string | null
          languages?: string[] | null
          status?: string
          reviewer_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          alias?: string
          bio?: string | null
          twitch_channel?: string | null
          kick_channel?: string | null
          youtube_channel?: string | null
          languages?: string[] | null
          status?: string
          reviewer_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "caster_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      casters: {
        Row: {
          id: string
          user_id: string
          alias: string
          bio: string | null
          avatar_url: string | null
          twitch_channel: string | null
          kick_channel: string | null
          youtube_channel: string | null
          is_live: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          alias: string
          bio?: string | null
          avatar_url?: string | null
          twitch_channel?: string | null
          kick_channel?: string | null
          youtube_channel?: string | null
          is_live?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          alias?: string
          bio?: string | null
          avatar_url?: string | null
          twitch_channel?: string | null
          kick_channel?: string | null
          youtube_channel?: string | null
          is_live?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "casters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_casters: {
        Row: {
          id: string
          match_id: string
          caster_id: string
          stream_url: string | null
          is_primary: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          caster_id: string
          stream_url?: string | null
          is_primary?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          caster_id?: string
          stream_url?: string | null
          is_primary?: boolean | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_casters_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_casters_caster_id_fkey"
            columns: ["caster_id"]
            isOneToOne: false
            referencedRelation: "casters"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_casters: {
        Row: {
          id: string
          tournament_id: string
          user_id: string
          alias: string
          bio: string | null
          twitch_channel: string | null
          kick_channel: string | null
          youtube_channel: string | null
          languages: string[] | null
          status: string
          reviewer_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          user_id: string
          alias: string
          bio?: string | null
          twitch_channel?: string | null
          kick_channel?: string | null
          youtube_channel?: string | null
          languages?: string[] | null
          status?: string
          reviewer_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          user_id?: string
          alias?: string
          bio?: string | null
          twitch_channel?: string | null
          kick_channel?: string | null
          youtube_channel?: string | null
          languages?: string[] | null
          status?: string
          reviewer_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_casters_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_casters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      map_vetoes: {
        Row: {
          created_at: string | null
          format: string
          id: string
          match_id: string | null
          state: Json
          team_a_id: string | null
          team_a_token: string
          team_b_id: string | null
          team_b_token: string
          tournament_id: string | null
        }
        Insert: {
          created_at?: string | null
          format: string
          id?: string
          match_id?: string | null
          state?: Json
          team_a_id?: string | null
          team_a_token: string
          team_b_id?: string | null
          team_b_token: string
          tournament_id?: string | null
        }
        Update: {
          created_at?: string | null
          format?: string
          id?: string
          match_id?: string | null
          state?: Json
          team_a_id?: string | null
          team_a_token?: string
          team_b_id?: string | null
          team_b_token?: string
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "map_vetoes_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_vetoes_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_vetoes_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string | null
          id: string
          is_bye: boolean | null
          is_grand_final: boolean | null
          is_upper: boolean | null
          loser_id: string | null
          loser_match_id: string | null
          match_order: number
          next_loser_match_id: string | null
          next_match_id: string | null
          round: number
          score1: number | null
          score2: number | null
          status: string | null
          team1_id: string | null
          team2_id: string | null
          tournament_id: string | null
          updated_at: string | null
          winner_id: string | null
          scheduled_at: string | null
          selected_maps: string[] | null
          map_veto_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_bye?: boolean | null
          is_grand_final?: boolean | null
          is_upper?: boolean | null
          loser_id?: string | null
          loser_match_id?: string | null
          match_order: number
          next_loser_match_id?: string | null
          next_match_id?: string | null
          round: number
          score1?: number | null
          score2?: number | null
          status?: string | null
          team1_id?: string | null
          team2_id?: string | null
          tournament_id?: string | null
          updated_at?: string | null
          winner_id?: string | null
          scheduled_at?: string | null
          selected_maps?: string[] | null
          map_veto_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_bye?: boolean | null
          is_grand_final?: boolean | null
          is_upper?: boolean | null
          loser_id?: string | null
          loser_match_id?: string | null
          match_order?: number
          next_loser_match_id?: string | null
          next_match_id?: string | null
          round?: number
          score1?: number | null
          score2?: number | null
          status?: string | null
          team1_id?: string | null
          team2_id?: string | null
          tournament_id?: string | null
          updated_at?: string | null
          winner_id?: string | null
          scheduled_at?: string | null
          selected_maps?: string[] | null
          map_veto_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_loser_match_id_fkey"
            columns: ["loser_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_next_loser_match_id_fkey"
            columns: ["next_loser_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_next_match_id_fkey"
            columns: ["next_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          expires: string
          id: string
          sessionToken: string
          userId: string
        }
        Insert: {
          expires: string
          id?: string
          sessionToken: string
          userId: string
        }
        Update: {
          expires?: string
          id?: string
          sessionToken?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          is_profile_private: boolean | null
          l4d2_playtime_hours: number | null
          name: string
          role: string | null
          steam_id_64: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_profile_private?: boolean | null
          l4d2_playtime_hours?: number | null
          name: string
          role?: string | null
          steam_id_64: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_profile_private?: boolean | null
          l4d2_playtime_hours?: number | null
          name?: string
          role?: string | null
          steam_id_64?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          creator_id: string | null
          id: string
          logo_url: string | null
          name: string
          status: string
          tournament_id: string
        }
        Insert: {
          created_at?: string | null
          creator_id?: string | null
          id?: string
          logo_url?: string | null
          name: string
          status?: string
          tournament_id: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          status?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          bracket_status: string | null
          created_at: string | null
          creator_id: string
          description: string | null
          id: string
          logo_url: string | null
          max_teams: number
          moderators: Json
          name: string
          status: string
          template_json: Json
          tournament_format: string | null
        }
        Insert: {
          bracket_status?: string | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          id?: string
          logo_url?: string | null
          max_teams?: number
          moderators?: Json
          name: string
          status?: string
          template_json?: Json
          tournament_format?: string | null
        }
        Update: {
          bracket_status?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          max_teams?: number
          moderators?: Json
          name?: string
          status?: string
          template_json?: Json
          tournament_format?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          emailVerified: string | null
          id: string
          image: string | null
          name: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          emailVerified?: string | null
          id?: string
          image?: string | null
          name?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          emailVerified?: string | null
          id?: string
          image?: string | null
          name?: string | null
        }
        Relationships: []
      }
      verification_tokens: {
        Row: {
          expires: string
          identifier: string
          token: string
        }
        Insert: {
          expires: string
          identifier: string
          token: string
        }
        Update: {
          expires?: string
          identifier?: string
          token?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  next_auth: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
