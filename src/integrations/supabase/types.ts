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
  public: {
    Tables: {
      activation_members: {
        Row: {
          activation_id: string
          assigned_at: string | null
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          activation_id: string
          assigned_at?: string | null
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          activation_id?: string
          assigned_at?: string | null
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activation_members_activation_id_fkey"
            columns: ["activation_id"]
            isOneToOne: false
            referencedRelation: "activations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activations: {
        Row: {
          budget: number | null
          client_id: string
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          landing_page_url: string | null
          name: string
          start_date: string | null
          status: string | null
          tags: string[] | null
          type: string | null
        }
        Insert: {
          budget?: number | null
          client_id: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          landing_page_url?: string | null
          name: string
          start_date?: string | null
          status?: string | null
          tags?: string[] | null
          type?: string | null
        }
        Update: {
          budget?: number | null
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          landing_page_url?: string | null
          name?: string
          start_date?: string | null
          status?: string | null
          tags?: string[] | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_campaigns: {
        Row: {
          activation_id: string
          budget: number | null
          created_at: string | null
          id: string
          name: string | null
          objective: string | null
          platform: string | null
          platform_campaign_id: string | null
          status: string | null
        }
        Insert: {
          activation_id: string
          budget?: number | null
          created_at?: string | null
          id?: string
          name?: string | null
          objective?: string | null
          platform?: string | null
          platform_campaign_id?: string | null
          status?: string | null
        }
        Update: {
          activation_id?: string
          budget?: number | null
          created_at?: string | null
          id?: string
          name?: string | null
          objective?: string | null
          platform?: string | null
          platform_campaign_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_activation_id_fkey"
            columns: ["activation_id"]
            isOneToOne: false
            referencedRelation: "activations"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_formats: {
        Row: {
          active: boolean | null
          category: string | null
          id: string
          name: string | null
          prompt_hint: string | null
          slug: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          id?: string
          name?: string | null
          prompt_hint?: string | null
          slug?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          id?: string
          name?: string | null
          prompt_hint?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      assets: {
        Row: {
          activation_id: string
          category: string | null
          copy_id: string | null
          created_at: string | null
          export_format: string | null
          export_url: string | null
          feedback: string | null
          file_url: string | null
          format_id: string | null
          html_content: string | null
          id: string
          image_url: string | null
          status: string | null
          tags: string[] | null
          version: number | null
        }
        Insert: {
          activation_id: string
          category?: string | null
          copy_id?: string | null
          created_at?: string | null
          export_format?: string | null
          export_url?: string | null
          feedback?: string | null
          file_url?: string | null
          format_id?: string | null
          html_content?: string | null
          id?: string
          image_url?: string | null
          status?: string | null
          tags?: string[] | null
          version?: number | null
        }
        Update: {
          activation_id?: string
          category?: string | null
          copy_id?: string | null
          created_at?: string | null
          export_format?: string | null
          export_url?: string | null
          feedback?: string | null
          file_url?: string | null
          format_id?: string | null
          html_content?: string | null
          id?: string
          image_url?: string | null
          status?: string | null
          tags?: string[] | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_activation_id_fkey"
            columns: ["activation_id"]
            isOneToOne: false
            referencedRelation: "activations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_copy_id_fkey"
            columns: ["copy_id"]
            isOneToOne: false
            referencedRelation: "copies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "asset_formats"
            referencedColumns: ["id"]
          },
        ]
      }
      briefs: {
        Row: {
          activation_id: string
          extra_context: string | null
          id: string
          objectives: string | null
          references_urls: string[] | null
          source_file_url: string | null
          target_audience: string | null
          tone_of_voice: string | null
          updated_at: string | null
        }
        Insert: {
          activation_id: string
          extra_context?: string | null
          id?: string
          objectives?: string | null
          references_urls?: string[] | null
          source_file_url?: string | null
          target_audience?: string | null
          tone_of_voice?: string | null
          updated_at?: string | null
        }
        Update: {
          activation_id?: string
          extra_context?: string | null
          id?: string
          objectives?: string | null
          references_urls?: string[] | null
          source_file_url?: string | null
          target_audience?: string | null
          tone_of_voice?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "briefs_activation_id_fkey"
            columns: ["activation_id"]
            isOneToOne: true
            referencedRelation: "activations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          body: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          parent_id: string | null
          resolved: boolean | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          parent_id?: string | null
          resolved?: boolean | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          parent_id?: string | null
          resolved?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      copies: {
        Row: {
          activation_id: string
          body: string | null
          channel: string | null
          created_at: string | null
          cta: string | null
          feedback: string | null
          full_copy: string | null
          funnel_stage: string | null
          hook: string | null
          id: string
          landing_page_url: string | null
          status: string | null
          tags: string[] | null
          type: string | null
          version: number | null
        }
        Insert: {
          activation_id: string
          body?: string | null
          channel?: string | null
          created_at?: string | null
          cta?: string | null
          feedback?: string | null
          full_copy?: string | null
          funnel_stage?: string | null
          hook?: string | null
          id?: string
          landing_page_url?: string | null
          status?: string | null
          tags?: string[] | null
          type?: string | null
          version?: number | null
        }
        Update: {
          activation_id?: string
          body?: string | null
          channel?: string | null
          created_at?: string | null
          cta?: string | null
          feedback?: string | null
          full_copy?: string | null
          funnel_stage?: string | null
          hook?: string | null
          id?: string
          landing_page_url?: string | null
          status?: string | null
          tags?: string[] | null
          type?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "copies_activation_id_fkey"
            columns: ["activation_id"]
            isOneToOne: false
            referencedRelation: "activations"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          activation_id: string
          asset_id: string | null
          collected_at: string | null
          comments_count: number | null
          cost_per_result: number | null
          date: string | null
          id: string
          likes: number | null
          results: number | null
          saves: number | null
          shares: number | null
          spend: number | null
        }
        Insert: {
          activation_id: string
          asset_id?: string | null
          collected_at?: string | null
          comments_count?: number | null
          cost_per_result?: number | null
          date?: string | null
          id?: string
          likes?: number | null
          results?: number | null
          saves?: number | null
          shares?: number | null
          spend?: number | null
        }
        Update: {
          activation_id?: string
          asset_id?: string | null
          collected_at?: string | null
          comments_count?: number | null
          cost_per_result?: number | null
          date?: string | null
          id?: string
          likes?: number | null
          results?: number | null
          saves?: number | null
          shares?: number | null
          spend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metrics_activation_id_fkey"
            columns: ["activation_id"]
            isOneToOne: false
            referencedRelation: "activations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metrics_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string | null
          read: boolean | null
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      scheduled_posts: {
        Row: {
          activation_id: string
          asset_id: string | null
          channel: string | null
          final_url: string | null
          id: string
          platform_post_id: string | null
          published_at: string | null
          scheduled_at: string | null
          status: string | null
        }
        Insert: {
          activation_id: string
          asset_id?: string | null
          channel?: string | null
          final_url?: string | null
          id?: string
          platform_post_id?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string | null
        }
        Update: {
          activation_id?: string
          asset_id?: string | null
          channel?: string | null
          final_url?: string | null
          id?: string
          platform_post_id?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_activation_id_fkey"
            columns: ["activation_id"]
            isOneToOne: false
            referencedRelation: "activations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      utm_configs: {
        Row: {
          activation_id: string
          generated_url: string | null
          id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          activation_id: string
          generated_url?: string | null
          id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          activation_id?: string
          generated_url?: string | null
          id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utm_configs_activation_id_fkey"
            columns: ["activation_id"]
            isOneToOne: true
            referencedRelation: "activations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
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
  public: {
    Enums: {},
  },
} as const
