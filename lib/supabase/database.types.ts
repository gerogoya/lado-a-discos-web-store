export type ProductStatus = "published" | "reserved" | "sold" | "draft";
export type ProductCondition = "M" | "NM" | "EX" | "VG+" | "VG" | "G";
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
          price: number;
          currency: ProductCurrency;
          status: ProductStatus;
          media_condition: ProductCondition;
          sleeve_condition: ProductCondition;
          stock: number;
          is_new: boolean;
          featured: boolean;
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
          price?: number;
          currency?: ProductCurrency;
          status?: ProductStatus;
          media_condition?: ProductCondition;
          sleeve_condition?: ProductCondition;
          stock?: number;
          is_new?: boolean;
          featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
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
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};
