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
      arrivals: {
        Row: {
          arrived_at: string
          building_id: string | null
          company: string | null
          id: string
          source: string | null
          supplier_token_id: string | null
          user_id: string | null
        }
        Insert: {
          arrived_at?: string
          building_id?: string | null
          company?: string | null
          id?: string
          source?: string | null
          supplier_token_id?: string | null
          user_id?: string | null
        }
        Update: {
          arrived_at?: string
          building_id?: string | null
          company?: string | null
          id?: string
          source?: string | null
          supplier_token_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arrivals_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrivals_supplier_token_id_fkey"
            columns: ["supplier_token_id"]
            isOneToOne: false
            referencedRelation: "supplier_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          kind: string
          radius: number
          x: number
          y: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          kind: string
          radius?: number
          x: number
          y: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          radius?: number
          x?: number
          y?: number
        }
        Relationships: []
      }
      buildings: {
        Row: {
          category: Database["public"]["Enums"]["building_category"]
          created_at: string
          department: string | null
          description: string | null
          dock: string | null
          hours: string | null
          id: string
          keywords: string[] | null
          name_en: string | null
          name_pt: string
          notes: string | null
          number: string
          phone: string | null
          photo_url: string | null
          responsible: string | null
          x: number
          y: number
        }
        Insert: {
          category: Database["public"]["Enums"]["building_category"]
          created_at?: string
          department?: string | null
          description?: string | null
          dock?: string | null
          hours?: string | null
          id?: string
          keywords?: string[] | null
          name_en?: string | null
          name_pt: string
          notes?: string | null
          number: string
          phone?: string | null
          photo_url?: string | null
          responsible?: string | null
          x: number
          y: number
        }
        Update: {
          category?: Database["public"]["Enums"]["building_category"]
          created_at?: string
          department?: string | null
          description?: string | null
          dock?: string | null
          hours?: string | null
          id?: string
          keywords?: string[] | null
          name_en?: string | null
          name_pt?: string
          notes?: string | null
          number?: string
          phone?: string | null
          photo_url?: string | null
          responsible?: string | null
          x?: number
          y?: number
        }
        Relationships: []
      }
      favorites: {
        Row: {
          building_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          building_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          building_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      search_logs: {
        Row: {
          created_at: string
          id: string
          query: string
          result_building_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          result_building_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          result_building_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_logs_result_building_id_fkey"
            columns: ["result_building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_tokens: {
        Row: {
          company: string
          created_at: string
          delivery_desc: string | null
          destination_building_id: string | null
          dock: string | null
          driver_name: string
          entry_gate_id: string | null
          id: string
          token: string
          used_at: string | null
          valid_from: string
          valid_until: string
        }
        Insert: {
          company: string
          created_at?: string
          delivery_desc?: string | null
          destination_building_id?: string | null
          dock?: string | null
          driver_name: string
          entry_gate_id?: string | null
          id?: string
          token: string
          used_at?: string | null
          valid_from?: string
          valid_until?: string
        }
        Update: {
          company?: string
          created_at?: string
          delivery_desc?: string | null
          destination_building_id?: string | null
          dock?: string | null
          driver_name?: string
          entry_gate_id?: string | null
          id?: string
          token?: string
          used_at?: string | null
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_tokens_destination_building_id_fkey"
            columns: ["destination_building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_tokens_entry_gate_id_fkey"
            columns: ["entry_gate_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "employee" | "supplier"
      building_category: "industrial" | "social" | "auxiliary" | "gate"
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
      app_role: ["admin", "employee", "supplier"],
      building_category: ["industrial", "social", "auxiliary", "gate"],
    },
  },
} as const
