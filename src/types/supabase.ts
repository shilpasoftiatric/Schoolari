export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string;
          phone: string;
          account_type: "student" | "parent";
          role: "user" | "admin";
          state: string;
          grade_level: string;
          gpa_range: string;
          fields_of_study: string[];
          background_tags: string[];
          involvement_tags: string[];
          college_start: string;
          biggest_challenge: string;
          career_interests: string[];
          onboarding_complete: boolean;
          onboarding_step: number;
          sms_opt_in: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: any[];
      };
      scholarships: {
        Row: {
          id: string;
          name: string;
          link: string;
          award_amount: string;
          award_amount_value: number | null;
          deadline: string;
          category: string;
          description: string;
          eligible_majors: string;
          min_gpa_required: number | null;
          eligible_states: string;
          special_eligibility: string;
          grade_levels: string[];
          essay_required: boolean;
          citizenship_req: string;
          organization_name: string;
          award_frequency: "" | "one_time" | "renewable";
          number_of_awards: string;
          featured: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["scholarships"]["Row"]> & {
          name: string;
          link: string;
          award_amount: string;
          deadline: string;
          category: string;
        };
        Update: Partial<Database["public"]["Tables"]["scholarships"]["Row"]>;
        Relationships: any[];
      };
      applications: {
        Row: {
          id: string;
          user_id: string;
          scholarship_id: string;
          status: "Not Started" | "In Progress" | "Submitted" | "Won" | "Lost";
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          scholarship_id: string;
          status?: "Not Started" | "In Progress" | "Submitted" | "Won" | "Lost";
          notes?: string;
        };
        Update: Partial<Database["public"]["Tables"]["applications"]["Row"]>;
        Relationships: any[];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          status: "pending" | "completed";
          type: "daily" | "weekly" | "custom";
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          title: string;
          description?: string;
          status?: "pending" | "completed";
          type?: "daily" | "weekly" | "custom";
          due_date?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>;
        Relationships: any[];
      };
      essays: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          topic: string;
          content: string;
          status: "draft" | "in_progress" | "completed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          title: string;
          topic?: string;
          content?: string;
          status?: "draft" | "in_progress" | "completed";
        };
        Update: Partial<Database["public"]["Tables"]["essays"]["Row"]>;
        Relationships: any[];
      };
      saved_colleges: {
        Row: {
          id: string;
          user_id: string;
          college_name: string;
          deadline: string | null;
          status: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          college_name: string;
          deadline?: string | null;
          status?: string;
          notes?: string;
        };
        Update: Partial<Database["public"]["Tables"]["saved_colleges"]["Row"]>;
        Relationships: any[];
      };
      resumes: {
        Row: {
          id: string;
          user_id: string;
          content: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          content?: any;
        };
        Update: Partial<Database["public"]["Tables"]["resumes"]["Row"]>;
        Relationships: any[];
      };
      income_goals: {
        Row: {
          id: string;
          user_id: string;
          hustle_title: string;
          target_amount: number;
          earned_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          hustle_title: string;
          target_amount: number;
          earned_amount?: number;
        };
        Update: Partial<Database["public"]["Tables"]["income_goals"]["Row"]>;
        Relationships: any[];
      };
      coaching_messages: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          type: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          title: string;
          content: string;
          type?: string;
          is_read?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["coaching_messages"]["Row"]>;
        Relationships: any[];
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: "transcript" | "report_card" | "recommendation_letter" | "essay" | "resume" | "certificate" | "award" | "other";
          file_url: string;
          size_bytes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          type: Database["public"]["Tables"]["documents"]["Row"]["type"];
          file_url: string;
          size_bytes?: number;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Row"]>;
        Relationships: any[];
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
}

// Convenience type aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Scholarship = Database["public"]["Tables"]["scholarships"]["Row"];
export type Application = Database["public"]["Tables"]["applications"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Essay = Database["public"]["Tables"]["essays"]["Row"];
export type Document = Database["public"]["Tables"]["documents"]["Row"];
