export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      document_chunks: {
        Row: {
          chunk_index: number;
          content: string;
          created_at: string;
          document_id: string;
          id: string;
          metadata: Json;
          user_id: string;
        };
        Insert: {
          chunk_index: number;
          content: string;
          created_at?: string;
          document_id: string;
          id?: string;
          metadata?: Json;
          user_id: string;
        };
        Update: {
          chunk_index?: number;
          content?: string;
          created_at?: string;
          document_id?: string;
          id?: string;
          metadata?: Json;
          user_id?: string;
        };
        Relationships: [];
      };
      document_contents: {
        Row: {
          created_at: string;
          document_id: string;
          error_message: string | null;
          extracted_at: string | null;
          extraction_status: "completed" | "failed" | "pending";
          page_count: number | null;
          raw_text: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          document_id: string;
          error_message?: string | null;
          extracted_at?: string | null;
          extraction_status?: "completed" | "failed" | "pending";
          page_count?: number | null;
          raw_text?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          document_id?: string;
          error_message?: string | null;
          extracted_at?: string | null;
          extraction_status?: "completed" | "failed" | "pending";
          page_count?: number | null;
          raw_text?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          created_at: string;
          file_name: string;
          file_path: string;
          file_size: number;
          id: string;
          mime_type: string;
          title: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          file_name: string;
          file_path: string;
          file_size: number;
          id?: string;
          mime_type: string;
          title: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          file_name?: string;
          file_path?: string;
          file_size?: number;
          id?: string;
          mime_type?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
