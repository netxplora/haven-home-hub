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
      agents: {
        Row: {
          bio: string | null
          created_at: string
          email: string | null
          featured: boolean
          full_name: string
          id: string
          phone: string | null
          photo_url: string | null
          role_title: string | null
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email?: string | null
          featured?: boolean
          full_name: string
          id?: string
          phone?: string | null
          photo_url?: string | null
          role_title?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string | null
          featured?: boolean
          full_name?: string
          id?: string
          phone?: string | null
          photo_url?: string | null
          role_title?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          agent_id: string | null
          created_at: string
          email: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          preferred_date: string
          property_id: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          preferred_date: string
          property_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          preferred_date?: string
          property_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          agent_id: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          property_id: string
          status: Database["public"]["Enums"]["inquiry_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          property_id: string
          status?: Database["public"]["Enums"]["inquiry_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          property_id?: string
          status?: Database["public"]["Enums"]["inquiry_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_properties: {
        Row: {
          cover_image_url: string | null
          created_at: string
          currency: string
          description: string
          distribution_frequency: Database["public"]["Enums"]["distribution_frequency"]
          estimated_rental_yield: number | null
          featured: boolean
          holding_period_months: number
          id: string
          income_model: string
          location: string
          min_investment: number
          projected_return_max: number
          projected_return_min: number
          property_type: string
          risk_notes: string
          slug: string
          status: Database["public"]["Enums"]["investment_status"]
          title: string
          total_units: number
          total_value: number
          unit_price: number
          units_sold: number
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string
          distribution_frequency?: Database["public"]["Enums"]["distribution_frequency"]
          estimated_rental_yield?: number | null
          featured?: boolean
          holding_period_months?: number
          id?: string
          income_model?: string
          location: string
          min_investment: number
          projected_return_max?: number
          projected_return_min?: number
          property_type?: string
          risk_notes?: string
          slug: string
          status?: Database["public"]["Enums"]["investment_status"]
          title: string
          total_units: number
          total_value: number
          unit_price: number
          units_sold?: number
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string
          distribution_frequency?: Database["public"]["Enums"]["distribution_frequency"]
          estimated_rental_yield?: number | null
          featured?: boolean
          holding_period_months?: number
          id?: string
          income_model?: string
          location?: string
          min_investment?: number
          projected_return_max?: number
          projected_return_min?: number
          property_type?: string
          risk_notes?: string
          slug?: string
          status?: Database["public"]["Enums"]["investment_status"]
          title?: string
          total_units?: number
          total_value?: number
          unit_price?: number
          units_sold?: number
          updated_at?: string
        }
        Relationships: []
      }
      investment_property_images: {
        Row: {
          created_at: string
          id: string
          is_cover: boolean
          property_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_cover?: boolean
          property_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_cover?: boolean
          property_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "investment_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string
          featured: boolean
          id: string
          image_url: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          featured?: boolean
          id?: string
          image_url?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          featured?: boolean
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          metadata: Json
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          crypto_address: string | null
          crypto_amount: number | null
          crypto_currency: string | null
          currency: string
          external_reference: string | null
          id: string
          investment_id: string | null
          investment_property_id: string | null
          metadata: Json
          payment_type: Database["public"]["Enums"]["payment_type"]
          property_id: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          reference: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          crypto_address?: string | null
          crypto_amount?: number | null
          crypto_currency?: string | null
          currency?: string
          external_reference?: string | null
          id?: string
          investment_id?: string | null
          investment_property_id?: string | null
          metadata?: Json
          payment_type: Database["public"]["Enums"]["payment_type"]
          property_id?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          reference: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          crypto_address?: string | null
          crypto_amount?: number | null
          crypto_currency?: string | null
          currency?: string
          external_reference?: string | null
          id?: string
          investment_id?: string | null
          investment_property_id?: string | null
          metadata?: Json
          payment_type?: Database["public"]["Enums"]["payment_type"]
          property_id?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          reference?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount: number
          created_at: string
          distribution_date: string
          id: string
          notes: string | null
          property_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          distribution_date: string
          id?: string
          notes?: string | null
          property_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          distribution_date?: string
          id?: string
          notes?: string | null
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "investment_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          agent_id: string | null
          bathrooms: number | null
          bedrooms: number | null
          cover_image_url: string | null
          created_at: string
          currency: string
          description: string
          featured: boolean
          features: Json
          id: string
          location_id: string | null
          price: number
          property_type: Database["public"]["Enums"]["property_type"]
          size_sqm: number | null
          slug: string
          status: Database["public"]["Enums"]["property_status"]
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          address?: string | null
          agent_id?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string
          featured?: boolean
          features?: Json
          id?: string
          location_id?: string | null
          price?: number
          property_type: Database["public"]["Enums"]["property_type"]
          size_sqm?: number | null
          slug: string
          status?: Database["public"]["Enums"]["property_status"]
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          address?: string | null
          agent_id?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string
          featured?: boolean
          features?: Json
          id?: string
          location_id?: string | null
          price?: number
          property_type?: Database["public"]["Enums"]["property_type"]
          size_sqm?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["property_status"]
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          created_at: string
          id: string
          is_cover: boolean
          property_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_cover?: boolean
          property_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_cover?: boolean
          property_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          amount_received: number
          created_at: string
          distribution_date: string
          id: string
          payout_id: string | null
          property_id: string
          user_id: string
        }
        Insert: {
          amount_received: number
          created_at?: string
          distribution_date: string
          id?: string
          payout_id?: string | null
          property_id: string
          user_id: string
        }
        Update: {
          amount_received?: number
          created_at?: string
          distribution_date?: string
          id?: string
          payout_id?: string | null
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "investment_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          agent_id: string | null
          body: string
          created_at: string
          id: string
          property_id: string | null
          rating: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          body?: string
          created_at?: string
          id?: string
          property_id?: string | null
          rating: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          body?: string
          created_at?: string
          id?: string
          property_id?: string | null
          rating?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_properties: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_investments: {
        Row: {
          amount_invested: number
          created_at: string
          id: string
          payment_id: string | null
          property_id: string
          status: Database["public"]["Enums"]["user_investment_status"]
          units_owned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_invested: number
          created_at?: string
          id?: string
          payment_id?: string | null
          property_id: string
          status?: Database["public"]["Enums"]["user_investment_status"]
          units_owned: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_invested?: number
          created_at?: string
          id?: string
          payment_id?: string | null
          property_id?: string
          status?: Database["public"]["Enums"]["user_investment_status"]
          units_owned?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_investments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "investment_properties"
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
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          completed_at: string | null
          created_at: string
          crypto_address: string | null
          crypto_currency: string | null
          currency: string
          id: string
          method: Database["public"]["Enums"]["withdrawal_method"]
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          transaction_reference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          completed_at?: string | null
          created_at?: string
          crypto_address?: string | null
          crypto_currency?: string | null
          currency?: string
          id?: string
          method: Database["public"]["Enums"]["withdrawal_method"]
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          transaction_reference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          completed_at?: string | null
          created_at?: string
          crypto_address?: string | null
          crypto_currency?: string | null
          currency?: string
          id?: string
          method?: Database["public"]["Enums"]["withdrawal_method"]
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          transaction_reference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allocate_investment_units: {
        Args: { _property_id: string; _units: number }
        Returns: boolean
      }
      create_notification: {
        Args: {
          _body?: string
          _link?: string
          _metadata?: Json
          _title: string
          _type: Database["public"]["Enums"]["notification_type"]
          _user_id: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      release_investment_units: {
        Args: { _property_id: string; _units: number }
        Returns: undefined
      }
      user_available_balance: { Args: { _user_id: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "agent" | "user"
      booking_status: "pending" | "confirmed" | "completed" | "cancelled"
      distribution_frequency: "monthly" | "quarterly" | "semi_annual" | "annual"
      inquiry_status: "new" | "in_progress" | "resolved" | "closed"
      investment_status: "draft" | "open" | "funded" | "closed" | "paused"
      notification_type:
        | "payment_confirmed"
        | "payment_failed"
        | "investment_confirmed"
        | "booking_confirmed"
        | "payout_received"
        | "withdrawal_submitted"
        | "withdrawal_approved"
        | "withdrawal_rejected"
        | "withdrawal_completed"
        | "system"
      payment_provider: "paystack" | "flutterwave" | "crypto" | "manual_bank"
      payment_status:
        | "pending"
        | "processing"
        | "success"
        | "failed"
        | "refunded"
      payment_type: "booking" | "reservation" | "investment"
      property_status: "available" | "reserved" | "sold"
      property_type: "buy" | "rent" | "land"
      user_investment_status: "pending" | "confirmed" | "cancelled" | "refunded"
      withdrawal_method: "bank_transfer" | "crypto"
      withdrawal_status:
        | "pending"
        | "approved"
        | "processing"
        | "completed"
        | "rejected"
        | "failed"
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
      app_role: ["admin", "agent", "user"],
      booking_status: ["pending", "confirmed", "completed", "cancelled"],
      distribution_frequency: ["monthly", "quarterly", "semi_annual", "annual"],
      inquiry_status: ["new", "in_progress", "resolved", "closed"],
      investment_status: ["draft", "open", "funded", "closed", "paused"],
      notification_type: [
        "payment_confirmed",
        "payment_failed",
        "investment_confirmed",
        "booking_confirmed",
        "payout_received",
        "withdrawal_submitted",
        "withdrawal_approved",
        "withdrawal_rejected",
        "withdrawal_completed",
        "system",
      ],
      payment_provider: ["paystack", "flutterwave", "crypto", "manual_bank"],
      payment_status: [
        "pending",
        "processing",
        "success",
        "failed",
        "refunded",
      ],
      payment_type: ["booking", "reservation", "investment"],
      property_status: ["available", "reserved", "sold"],
      property_type: ["buy", "rent", "land"],
      user_investment_status: ["pending", "confirmed", "cancelled", "refunded"],
      withdrawal_method: ["bank_transfer", "crypto"],
      withdrawal_status: [
        "pending",
        "approved",
        "processing",
        "completed",
        "rejected",
        "failed",
      ],
    },
  },
} as const
