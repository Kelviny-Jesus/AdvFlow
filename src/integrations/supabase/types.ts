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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      cases: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          reference: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          reference?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      classification_rules: {
        Row: {
          created_at: string
          document_type: string
          enabled: boolean
          id: string
          match_pattern: string
          priority: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          enabled?: boolean
          id?: string
          match_pattern: string
          priority?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          enabled?: boolean
          id?: string
          match_pattern?: string
          priority?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          app_properties: Json | null
          case_id: string
          client_id: string
          created_at: string
          description: string | null
          doc_number: string | null
          download_link: string | null
          folder_id: string | null
          google_drive_id: string | null
          id: string
          mime_type: string
          name: string
          size: number
          status: string
          supabase_storage_path: string | null
          thumbnail_link: string | null
          type: string
          updated_at: string
          user_id: string
          web_view_link: string | null
        }
        Insert: {
          app_properties?: Json | null
          case_id: string
          client_id: string
          created_at?: string
          description?: string | null
          doc_number?: string | null
          download_link?: string | null
          folder_id?: string | null
          google_drive_id?: string | null
          id?: string
          mime_type: string
          name: string
          size?: number
          status?: string
          supabase_storage_path?: string | null
          thumbnail_link?: string | null
          type: string
          updated_at?: string
          user_id: string
          web_view_link?: string | null
        }
        Update: {
          app_properties?: Json | null
          case_id?: string
          client_id?: string
          created_at?: string
          description?: string | null
          doc_number?: string | null
          download_link?: string | null
          folder_id?: string | null
          google_drive_id?: string | null
          id?: string
          mime_type?: string
          name?: string
          size?: number
          status?: string
          supabase_storage_path?: string | null
          thumbnail_link?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          web_view_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_documents: {
        Row: {
          document_id: string
          fact_id: string
        }
        Insert: {
          document_id: string
          fact_id: string
        }
        Update: {
          document_id?: string
          fact_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fact_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_documents_fact_id_fkey"
            columns: ["fact_id"]
            isOneToOne: false
            referencedRelation: "facts"
            referencedColumns: ["id"]
          },
        ]
      }
      facts: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          petition_id: string
          tags: string[] | null
          text: string
          type: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          petition_id: string
          tags?: string[] | null
          text: string
          type: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          petition_id?: string
          tags?: string[] | null
          text?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facts_petition_id_fkey"
            columns: ["petition_id"]
            isOneToOne: false
            referencedRelation: "petitions"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          case_id: string | null
          client_id: string | null
          created_at: string
          id: string
          kind: string
          name: string
          parent_id: string | null
          path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          kind: string
          name: string
          parent_id?: string | null
          path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          name?: string
          parent_id?: string | null
          path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      petition_documents: {
        Row: {
          document_id: string
          petition_id: string
        }
        Insert: {
          document_id: string
          petition_id: string
        }
        Update: {
          document_id?: string
          petition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "petition_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petition_documents_petition_id_fkey"
            columns: ["petition_id"]
            isOneToOne: false
            referencedRelation: "petitions"
            referencedColumns: ["id"]
          },
        ]
      }
      petitions: {
        Row: {
          case_id: string
          client_id: string
          content: string
          created_at: string
          id: string
          status: string
          template: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          client_id: string
          content: string
          created_at?: string
          id?: string
          status?: string
          template?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          status?: string
          template?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "petitions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petitions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_files_log: {
        Row: {
          case_folder: string | null
          client_folder: string | null
          doc_number: string | null
          file_id: string | null
          file_name: string | null
          id: string
          mime_type: string | null
          processed_at: string | null
          user_id: string | null
        }
        Insert: {
          case_folder?: string | null
          client_folder?: string | null
          doc_number?: string | null
          file_id?: string | null
          file_name?: string | null
          id?: string
          mime_type?: string | null
          processed_at?: string | null
          user_id?: string | null
        }
        Update: {
          case_folder?: string | null
          client_folder?: string | null
          doc_number?: string | null
          file_id?: string | null
          file_name?: string | null
          id?: string
          mime_type?: string | null
          processed_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_files_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_google_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expiry_date: string | null
          id: string
          refresh_token: string
          scope: string | null
          token_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          refresh_token: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          refresh_token?: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_google_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          auto_extract_facts: boolean
          classification_enabled: boolean
          created_at: string
          date_format: string
          fact_categories: string[]
          google_drive_connected: boolean
          google_drive_last_sync: string | null
          id: string
          naming_pattern: string
          petition_template: string | null
          seq_reset_per_client: boolean
          updated_at: string
          uppercase_client: boolean
          use_underscores: boolean
          user_id: string
        }
        Insert: {
          auto_extract_facts?: boolean
          classification_enabled?: boolean
          created_at?: string
          date_format?: string
          fact_categories?: string[]
          google_drive_connected?: boolean
          google_drive_last_sync?: string | null
          id?: string
          naming_pattern?: string
          petition_template?: string | null
          seq_reset_per_client?: boolean
          updated_at?: string
          uppercase_client?: boolean
          use_underscores?: boolean
          user_id: string
        }
        Update: {
          auto_extract_facts?: boolean
          classification_enabled?: boolean
          created_at?: string
          date_format?: string
          fact_categories?: string[]
          google_drive_connected?: boolean
          google_drive_last_sync?: string | null
          id?: string
          naming_pattern?: string
          petition_template?: string | null
          seq_reset_per_client?: boolean
          updated_at?: string
          uppercase_client?: boolean
          use_underscores?: boolean
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          wa_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          wa_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          wa_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_profile: {
        Args: { p_wa_id_or_email: string }
        Returns: {
          client_name: string
          preferred_root: string
          user_id: string
        }[]
      }
      get_user_token: {
        Args: { p_email?: string; p_wa_id?: string }
        Returns: {
          access_token: string
          expiry_date: string
          refresh_token: string
          scope: string
          token_id: string
          token_type: string
          user_id: string
        }[]
      }
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
