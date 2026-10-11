export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      cart_items: {
        Row: {
          created_at: string;
          id: string;
          product_id: string;
          quantity: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          product_id: string;
          quantity?: number;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          product_id?: string;
          quantity?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          order_id: string;
          product_id: string;
          product_name: string;
          product_unit: string;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          order_id: string;
          product_id: string;
          product_name: string;
          product_unit: string;
          quantity: number;
          unit_price: number;
        };
        Update: {
          order_id?: string;
          product_id?: string;
          product_name?: string;
          product_unit?: string;
          quantity?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          address: string;
          address_detail: string | null;
          created_at: string;
          id: string;
          paid_at: string | null;
          postal_code: string;
          recipient_name: string;
          recipient_phone: string;
          request_key: string;
          status: string;
          total_amount: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          address: string;
          address_detail?: string | null;
          created_at?: string;
          id?: string;
          paid_at?: string | null;
          postal_code: string;
          recipient_name: string;
          recipient_phone: string;
          request_key: string;
          status?: string;
          total_amount: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          address?: string;
          address_detail?: string | null;
          created_at?: string;
          id?: string;
          paid_at?: string | null;
          postal_code?: string;
          recipient_name?: string;
          recipient_phone?: string;
          request_key?: string;
          status?: string;
          total_amount?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          condition_note: string | null;
          created_at: string;
          description: string;
          farm_name: string;
          farm_region: string | null;
          farm_story: string | null;
          id: string;
          image_path: string | null;
          is_active: boolean;
          is_featured: boolean;
          is_seasonal: boolean;
          name: string;
          original_price: number;
          price: number;
          tagline: string | null;
          ugly_reason: string;
          unit: string;
          updated_at: string;
          vegetable_id: string;
        };
        Insert: {
          condition_note?: string | null;
          created_at?: string;
          description: string;
          farm_name: string;
          farm_region?: string | null;
          farm_story?: string | null;
          id: string;
          image_path?: string | null;
          is_active?: boolean;
          is_featured?: boolean;
          is_seasonal?: boolean;
          name: string;
          original_price: number;
          price: number;
          tagline?: string | null;
          ugly_reason: string;
          unit: string;
          updated_at?: string;
          vegetable_id: string;
        };
        Update: {
          condition_note?: string | null;
          created_at?: string;
          description?: string;
          farm_name?: string;
          farm_region?: string | null;
          farm_story?: string | null;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          is_featured?: boolean;
          is_seasonal?: boolean;
          name?: string;
          original_price?: number;
          price?: number;
          tagline?: string | null;
          ugly_reason?: string;
          unit?: string;
          updated_at?: string;
          vegetable_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_vegetable_id_fkey";
            columns: ["vegetable_id"];
            isOneToOne: false;
            referencedRelation: "vegetables";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
          nickname: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          nickname: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          nickname?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recipe_products: {
        Row: {
          product_id: string;
          recipe_id: string;
        };
        Insert: {
          product_id: string;
          recipe_id: string;
        };
        Update: {
          product_id?: string;
          recipe_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_products_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_products_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      recipes: {
        Row: {
          source_url: string | null;
          source_name: string | null;
          vegetables: Json;
          cook_time_min: number | null;
          created_at: string;
          description: string;
          difficulty: string | null;
          id: string;
          image_path: string | null;
          ingredients: Json;
          name: string;
          servings: number | null;
          steps: Json;
        };
        Insert: {
          source_url?: string | null;
          source_name?: string | null;
          vegetables?: Json;
          cook_time_min?: number | null;
          created_at?: string;
          description: string;
          difficulty?: string | null;
          id: string;
          image_path?: string | null;
          ingredients?: Json;
          name: string;
          servings?: number | null;
          steps?: Json;
        };
        Update: {
          source_url?: string | null;
          source_name?: string | null;
          vegetables?: Json;
          cook_time_min?: number | null;
          created_at?: string;
          description?: string;
          difficulty?: string | null;
          id?: string;
          image_path?: string | null;
          ingredients?: Json;
          name?: string;
          servings?: number | null;
          steps?: Json;
        };
        Relationships: [];
      };
      vegetables: {
        Row: {
          category: string;
          created_at: string;
          description: string;
          id: string;
          image_path: string | null;
          name: string;
          prep_guide: string | null;
          season: string | null;
          storage_guide: string | null;
        };
        Insert: {
          category: string;
          created_at?: string;
          description: string;
          id: string;
          image_path?: string | null;
          name: string;
          prep_guide?: string | null;
          season?: string | null;
          storage_guide?: string | null;
        };
        Update: {
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          image_path?: string | null;
          name?: string;
          prep_guide?: string | null;
          season?: string | null;
          storage_guide?: string | null;
        };
        Relationships: [];
      };
      wishlist_items: {
        Row: {
          created_at: string;
          id: string;
          product_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          product_id: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          product_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
