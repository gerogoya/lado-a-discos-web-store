export type ProductStatus = "published" | "reserved" | "sold" | "draft";
import type { CatalogOption } from "@/types/catalog";
export type ProductCondition = string;
export type ProductCurrency = "ARS" | "USD";
export type ProductIdentifierType = "matrix_runout" | "catalog_number" | "barcode" | "isrc" | "other";

export type Tables = Database["public"]["Tables"];
export type ProductRow = Tables["products"]["Row"];
export type ProductInsert = Tables["products"]["Insert"];
export type ProductUpdate = Tables["products"]["Update"];
export type ProductImageRow = Tables["product_images"]["Row"];
export type ProductImageInsert = Tables["product_images"]["Insert"];
export type ProductImageUpdate = Tables["product_images"]["Update"];
export type ProductIdentifierRow = Tables["product_identifiers"]["Row"];
export type ProductIdentifierInsert = Tables["product_identifiers"]["Insert"];
export type ProductIdentifierUpdate = Tables["product_identifiers"]["Update"];
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          slug: string;
          artist: string;
          title: string;
          album: string;
          description: string;
          year: number | null;
          genre: string;
          country: string;
          format: string;
          label: string;
          artist_id: string | null;
          genre_id: string | null;
          country_id: string | null;
          format_id: string | null;
          label_id: string | null;
          media_condition_id: string | null;
          sleeve_condition_id: string | null;
          needs_review: boolean;
          price: number;
          currency: ProductCurrency;
          status: ProductStatus;
          media_condition: ProductCondition;
          sleeve_condition: ProductCondition;
          stock: number;
          is_new: boolean;
          featured: boolean;
          featured_order: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          artist: string;
          title: string;
          album: string;
          description?: string;
          year?: number | null;
          genre?: string;
          country?: string;
          format?: string;
          label?: string;
          artist_id?: string | null;
          genre_id?: string | null;
          country_id?: string | null;
          format_id?: string | null;
          label_id?: string | null;
          media_condition_id?: string | null;
          sleeve_condition_id?: string | null;
          needs_review?: boolean;
          price?: number;
          currency?: ProductCurrency;
          status?: ProductStatus;
          media_condition?: ProductCondition;
          sleeve_condition?: ProductCondition;
          stock?: number;
          is_new?: boolean;
          featured?: boolean;
          featured_order?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      catalog_options: {
        Row: CatalogOption & { normalized_name: string };
        Insert: Pick<CatalogOption, "kind" | "name"> & Partial<Pick<CatalogOption, "id" | "active" | "sort_order">>;
        Update: Partial<Pick<CatalogOption, "name" | "active" | "sort_order">>;
        Relationships: [];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          storage_path: string;
          alt_text: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          storage_path: string;
          alt_text?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_images"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      product_identifiers: {
        Row: {
          id: string;
          product_id: string;
          type: ProductIdentifierType;
          value: string;
          description: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          type: ProductIdentifierType;
          value: string;
          description?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_identifiers"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "product_identifiers_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      homepage_content: {
        Row: {
          id: boolean;
          eyebrow: string;
          heading: string;
          body: string;
          hero_image_storage_path: string;
          hero_image_alt: string;
          actions: Json;
          trust_items: Json;
          trust_strip_visible: boolean;
          info_eyebrow: string;
          info_heading: string;
          info_body: string;
          info_section_visible: boolean;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["homepage_content"]["Row"]> & Pick<Database["public"]["Tables"]["homepage_content"]["Row"], "eyebrow" | "heading" | "body" | "actions">;
        Update: Partial<Database["public"]["Tables"]["homepage_content"]["Row"]>;
        Relationships: [];
      };
      homepage_sections: {
        Row: {
          id: string;
          title: string;
          body: string;
          visible: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["homepage_sections"]["Row"]> & Pick<Database["public"]["Tables"]["homepage_sections"]["Row"], "title">;
        Update: Partial<Database["public"]["Tables"]["homepage_sections"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      save_product_gallery: {
        Args: { target_product: string; expected_paths: string[]; gallery: { storage_path: string; alt_text: string }[] };
        Returns: ProductImageRow[];
      };
      save_homepage: {
        Args: { expected_updated_at: string | null; content: Json; sections: Json };
        Returns: Database["public"]["Tables"]["homepage_content"]["Row"];
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
};
