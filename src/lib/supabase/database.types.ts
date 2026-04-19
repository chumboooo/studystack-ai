export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      flashcard_sets: {
        Row: {
          created_at: string;
          document_id: string | null;
          id: string;
          query_text: string | null;
          source_mode: "document" | "manual" | "retrieval";
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          document_id?: string | null;
          id?: string;
          query_text?: string | null;
          source_mode: "document" | "manual" | "retrieval";
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          document_id?: string | null;
          id?: string;
          query_text?: string | null;
          source_mode?: "document" | "manual" | "retrieval";
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      flashcards: {
        Row: {
          answer: string;
          created_at: string;
          id: string;
          prompt: string;
          set_id: string;
          source_chunk_id: string | null;
          source_chunk_index: number | null;
          source_document_id: string | null;
          source_document_title: string | null;
          user_id: string;
        };
        Insert: {
          answer: string;
          created_at?: string;
          id?: string;
          prompt: string;
          set_id: string;
          source_chunk_id?: string | null;
          source_chunk_index?: number | null;
          source_document_id?: string | null;
          source_document_title?: string | null;
          user_id: string;
        };
        Update: {
          answer?: string;
          created_at?: string;
          id?: string;
          prompt?: string;
          set_id?: string;
          source_chunk_id?: string | null;
          source_chunk_index?: number | null;
          source_document_id?: string | null;
          source_document_title?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      quiz_questions: {
        Row: {
          choices: Json;
          correct_choice_index: number;
          created_at: string;
          explanation: string;
          id: string;
          question: string;
          set_id: string;
          source_chunk_id: string | null;
          source_chunk_index: number | null;
          source_document_id: string | null;
          source_document_title: string | null;
          user_id: string;
        };
        Insert: {
          choices?: Json;
          correct_choice_index: number;
          created_at?: string;
          explanation: string;
          id?: string;
          question: string;
          set_id: string;
          source_chunk_id?: string | null;
          source_chunk_index?: number | null;
          source_document_id?: string | null;
          source_document_title?: string | null;
          user_id: string;
        };
        Update: {
          choices?: Json;
          correct_choice_index?: number;
          created_at?: string;
          explanation?: string;
          id?: string;
          question?: string;
          set_id?: string;
          source_chunk_id?: string | null;
          source_chunk_index?: number | null;
          source_document_id?: string | null;
          source_document_title?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      quiz_sets: {
        Row: {
          created_at: string;
          document_id: string | null;
          id: string;
          query_text: string | null;
          source_mode: "document" | "manual" | "retrieval";
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          document_id?: string | null;
          id?: string;
          query_text?: string | null;
          source_mode: "document" | "manual" | "retrieval";
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          document_id?: string | null;
          id?: string;
          query_text?: string | null;
          source_mode?: "document" | "manual" | "retrieval";
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      study_planner_entries: {
        Row: {
          created_at: string;
          entry_date: string;
          entry_type: "exam_prep" | "quiz_review" | "reminder" | "study_session";
          id: string;
          note: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          entry_date: string;
          entry_type?: "exam_prep" | "quiz_review" | "reminder" | "study_session";
          id?: string;
          note?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          entry_date?: string;
          entry_type?: "exam_prep" | "quiz_review" | "reminder" | "study_session";
          id?: string;
          note?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      chat_sessions: {
        Row: {
          created_at: string;
          id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      chat_turn_sources: {
        Row: {
          chunk_id: string | null;
          chunk_index: number;
          content_excerpt: string;
          created_at: string;
          document_id: string | null;
          document_title: string;
          id: string;
          rank: number | null;
          source_label: string;
          turn_id: string;
          user_id: string;
        };
        Insert: {
          chunk_id?: string | null;
          chunk_index: number;
          content_excerpt?: string;
          created_at?: string;
          document_id?: string | null;
          document_title: string;
          id?: string;
          rank?: number | null;
          source_label: string;
          turn_id: string;
          user_id: string;
        };
        Update: {
          chunk_id?: string | null;
          chunk_index?: number;
          content_excerpt?: string;
          created_at?: string;
          document_id?: string | null;
          document_title?: string;
          id?: string;
          rank?: number | null;
          source_label?: string;
          turn_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      chat_turns: {
        Row: {
          answer: string;
          created_at: string;
          error_message: string | null;
          id: string;
          question: string;
          session_id: string;
          status: "completed" | "no_sources" | "failed";
          updated_at: string;
          user_id: string;
        };
        Insert: {
          answer?: string;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          question: string;
          session_id: string;
          status?: "completed" | "no_sources" | "failed";
          updated_at?: string;
          user_id: string;
        };
        Update: {
          answer?: string;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          question?: string;
          session_id?: string;
          status?: "completed" | "no_sources" | "failed";
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      document_chunks: {
        Row: {
          character_count: number;
          chunk_index: number;
          content: string;
          created_at: string;
          document_id: string;
          embedding: string | null;
          id: string;
          metadata: Json;
          user_id: string;
        };
        Insert: {
          character_count: number;
          chunk_index: number;
          content: string;
          created_at?: string;
          document_id: string;
          embedding?: string | null;
          id?: string;
          metadata?: Json;
          user_id: string;
        };
        Update: {
          character_count?: number;
          chunk_index?: number;
          content?: string;
          created_at?: string;
          document_id?: string;
          embedding?: string | null;
          id?: string;
          metadata?: Json;
          user_id?: string;
        };
        Relationships: [];
      };
      document_contents: {
        Row: {
          chunk_count: number;
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
          chunk_count?: number;
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
          chunk_count?: number;
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
    Functions: {
      search_document_chunks: {
        Args: {
          match_count?: number;
          query_text: string;
        };
        Returns: {
          character_count: number;
          chunk_id: string;
          chunk_index: number;
          content: string;
          created_at: string;
          document_id: string;
          document_title: string;
          rank: number;
        }[];
      };
      match_document_chunks_by_embedding: {
        Args: {
          match_count?: number;
          query_embedding: string;
        };
        Returns: {
          character_count: number;
          chunk_id: string;
          chunk_index: number;
          content: string;
          created_at: string;
          document_id: string;
          document_title: string;
          similarity: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
