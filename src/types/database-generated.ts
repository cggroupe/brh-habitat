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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      brh_affiliates: {
        Row: {
          created_at: string | null
          id: string
          level: string | null
          points_balance: number | null
          recruited_by: string | null
          referral_code: string
          short_code: string | null
          total_points_earned: number | null
        }
        Insert: {
          created_at?: string | null
          id: string
          level?: string | null
          points_balance?: number | null
          recruited_by?: string | null
          referral_code: string
          short_code?: string | null
          total_points_earned?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: string | null
          points_balance?: number | null
          recruited_by?: string | null
          referral_code?: string
          short_code?: string | null
          total_points_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_affiliates_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_affiliates_recruited_by_fkey"
            columns: ["recruited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_appointments: {
        Row: {
          admin_notes: string | null
          case_id: string | null
          confirmed_date: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          diagnostic_id: string | null
          home_id: string | null
          id: string
          notes: string | null
          preferred_slot: string | null
          referral_code: string | null
          requested_date: string | null
          status: string | null
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          case_id?: string | null
          confirmed_date?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          diagnostic_id?: string | null
          home_id?: string | null
          id?: string
          notes?: string | null
          preferred_slot?: string | null
          referral_code?: string | null
          requested_date?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          case_id?: string | null
          confirmed_date?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          diagnostic_id?: string | null
          home_id?: string | null
          id?: string
          notes?: string | null
          preferred_slot?: string | null
          referral_code?: string | null
          requested_date?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_appointments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "brh_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_appointments_diagnostic_id_fkey"
            columns: ["diagnostic_id"]
            isOneToOne: false
            referencedRelation: "brh_diagnostics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_appointments_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "brh_homes"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_articles: {
        Row: {
          author: string | null
          category: string | null
          content: string
          cover_image: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          published: boolean | null
          read_time: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          content: string
          cover_image?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          published?: boolean | null
          read_time?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string
          cover_image?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          published?: boolean | null
          read_time?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      brh_badges: {
        Row: {
          code: string
          condition_type: string
          condition_value: number
          created_at: string | null
          description: string
          icon: string
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          code: string
          condition_type: string
          condition_value: number
          created_at?: string | null
          description: string
          icon: string
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          condition_type?: string
          condition_value?: number
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      brh_cases: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          created_at: string | null
          description: string | null
          diagnostic_id: string | null
          documents: string[] | null
          end_date: string | null
          estimated_budget: number | null
          home_id: string | null
          id: string
          start_date: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
          work_types: string[] | null
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          diagnostic_id?: string | null
          documents?: string[] | null
          end_date?: string | null
          estimated_budget?: number | null
          home_id?: string | null
          id?: string
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          work_types?: string[] | null
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          diagnostic_id?: string | null
          documents?: string[] | null
          end_date?: string | null
          estimated_budget?: number | null
          home_id?: string | null
          id?: string
          start_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          work_types?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_cases_diagnostic_id_fkey"
            columns: ["diagnostic_id"]
            isOneToOne: false
            referencedRelation: "brh_diagnostics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_cases_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "brh_homes"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_chiffrages: {
        Row: {
          client_address: string | null
          client_name: string
          client_phone: string | null
          company_id: string | null
          created_at: string | null
          id: string
          lignes: Json
          notes: string | null
          projet_description: string | null
          projet_titre: string
          reference: string
          total_ht: number
          total_ttc: number
          total_tva: number
          tva_rate: number
          user_id: string | null
        }
        Insert: {
          client_address?: string | null
          client_name: string
          client_phone?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          lignes?: Json
          notes?: string | null
          projet_description?: string | null
          projet_titre: string
          reference: string
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          tva_rate?: number
          user_id?: string | null
        }
        Update: {
          client_address?: string | null
          client_name?: string
          client_phone?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          lignes?: Json
          notes?: string | null
          projet_description?: string | null
          projet_titre?: string
          reference?: string
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          tva_rate?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_chiffrages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "brh_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_chiffrages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_companies: {
        Row: {
          address: string | null
          city: string | null
          commission_rate_percent: number
          created_at: string | null
          date_creation: string | null
          entreprise_category: string | null
          id: string
          is_active: boolean | null
          legal_name: string | null
          level: string | null
          logo_url: string | null
          naf_code: string | null
          naf_label: string | null
          name: string
          owner_id: string | null
          postal_code: string | null
          profession: string | null
          recruited_by: string | null
          siren: string | null
          siret: string | null
          siret_verified_at: string | null
          total_ca_apporte: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          commission_rate_percent?: number
          created_at?: string | null
          date_creation?: string | null
          entreprise_category?: string | null
          id?: string
          is_active?: boolean | null
          legal_name?: string | null
          level?: string | null
          logo_url?: string | null
          naf_code?: string | null
          naf_label?: string | null
          name: string
          owner_id?: string | null
          postal_code?: string | null
          profession?: string | null
          recruited_by?: string | null
          siren?: string | null
          siret?: string | null
          siret_verified_at?: string | null
          total_ca_apporte?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          commission_rate_percent?: number
          created_at?: string | null
          date_creation?: string | null
          entreprise_category?: string | null
          id?: string
          is_active?: boolean | null
          legal_name?: string | null
          level?: string | null
          logo_url?: string | null
          naf_code?: string | null
          naf_label?: string | null
          name?: string
          owner_id?: string | null
          postal_code?: string | null
          profession?: string | null
          recruited_by?: string | null
          siren?: string | null
          siret?: string | null
          siret_verified_at?: string | null
          total_ca_apporte?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_companies_recruited_by_fkey"
            columns: ["recruited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_company_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          company_id: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          member_role: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          company_id: string
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          member_role?: string | null
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          company_id?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          member_role?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_company_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_company_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "brh_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_company_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_company_members: {
        Row: {
          company_id: string | null
          id: string
          joined_at: string | null
          member_role: string | null
          profile_id: string | null
        }
        Insert: {
          company_id?: string | null
          id?: string
          joined_at?: string | null
          member_role?: string | null
          profile_id?: string | null
        }
        Update: {
          company_id?: string | null
          id?: string
          joined_at?: string | null
          member_role?: string | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "brh_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_company_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_contacts: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          email: string
          id: string
          message: string
          nom: string
          status: string | null
          sujet: string | null
          telephone: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          email: string
          id?: string
          message: string
          nom: string
          status?: string | null
          sujet?: string | null
          telephone?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          nom?: string
          status?: string | null
          sujet?: string | null
          telephone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      brh_diagnostics: {
        Row: {
          admin_notes: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          current_step: number
          equipment: Json
          id: string
          photos: string[] | null
          property_address: string | null
          property_floors: number | null
          property_surface: number | null
          property_type: string | null
          property_year: number | null
          referral_code: string | null
          results: Json | null
          status: string | null
          symptoms: Json
          types: string[]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          current_step?: number
          equipment?: Json
          id?: string
          photos?: string[] | null
          property_address?: string | null
          property_floors?: number | null
          property_surface?: number | null
          property_type?: string | null
          property_year?: number | null
          referral_code?: string | null
          results?: Json | null
          status?: string | null
          symptoms?: Json
          types: string[]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          current_step?: number
          equipment?: Json
          id?: string
          photos?: string[] | null
          property_address?: string | null
          property_floors?: number | null
          property_surface?: number | null
          property_type?: string | null
          property_year?: number | null
          referral_code?: string | null
          results?: Json | null
          status?: string | null
          symptoms?: Json
          types?: string[]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      brh_health_records: {
        Row: {
          assessed_at: string | null
          created_at: string | null
          domain: string
          home_id: string
          id: string
          notes: string | null
          score: number | null
          symptoms: string[] | null
          updated_at: string | null
          urgency: string | null
          user_id: string
        }
        Insert: {
          assessed_at?: string | null
          created_at?: string | null
          domain: string
          home_id: string
          id?: string
          notes?: string | null
          score?: number | null
          symptoms?: string[] | null
          updated_at?: string | null
          urgency?: string | null
          user_id: string
        }
        Update: {
          assessed_at?: string | null
          created_at?: string | null
          domain?: string
          home_id?: string
          id?: string
          notes?: string | null
          score?: number | null
          symptoms?: string[] | null
          updated_at?: string | null
          urgency?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_health_records_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "brh_homes"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_home_documents: {
        Row: {
          created_at: string | null
          doc_type: string
          expires_at: string | null
          file_url: string | null
          home_id: string
          id: string
          issued_at: string | null
          notes: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          doc_type: string
          expires_at?: string | null
          file_url?: string | null
          home_id: string
          id?: string
          issued_at?: string | null
          notes?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          doc_type?: string
          expires_at?: string | null
          file_url?: string | null
          home_id?: string
          id?: string
          issued_at?: string | null
          notes?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_home_documents_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "brh_homes"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_homes: {
        Row: {
          address: string
          city: string | null
          created_at: string | null
          dpe_rating: string | null
          floors: number | null
          health_score: number | null
          heating_type: string | null
          id: string
          insulation_type: string | null
          notes: string | null
          photos: string[] | null
          postal_code: string | null
          property_type: string | null
          surface: number | null
          updated_at: string | null
          user_id: string
          year_built: number | null
        }
        Insert: {
          address: string
          city?: string | null
          created_at?: string | null
          dpe_rating?: string | null
          floors?: number | null
          health_score?: number | null
          heating_type?: string | null
          id?: string
          insulation_type?: string | null
          notes?: string | null
          photos?: string[] | null
          postal_code?: string | null
          property_type?: string | null
          surface?: number | null
          updated_at?: string | null
          user_id: string
          year_built?: number | null
        }
        Update: {
          address?: string
          city?: string | null
          created_at?: string | null
          dpe_rating?: string | null
          floors?: number | null
          health_score?: number | null
          heating_type?: string | null
          id?: string
          insulation_type?: string | null
          notes?: string | null
          photos?: string[] | null
          postal_code?: string | null
          property_type?: string | null
          surface?: number | null
          updated_at?: string | null
          user_id?: string
          year_built?: number | null
        }
        Relationships: []
      }
      brh_message_threads: {
        Row: {
          created_at: string | null
          id: string
          is_archived: boolean | null
          last_message_at: string | null
          participant_id: string | null
          participant_type: string
          subject: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          last_message_at?: string | null
          participant_id?: string | null
          participant_type: string
          subject: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          last_message_at?: string | null
          participant_id?: string | null
          participant_type?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_message_threads_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          body: string
          created_at: string | null
          id: string
          is_read: boolean | null
          read_at: string | null
          sender_id: string | null
          thread_id: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          body: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          sender_id?: string | null
          thread_id?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          body?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          sender_id?: string | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "brh_message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          recipient_id: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          recipient_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          recipient_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_platform_settings: {
        Row: {
          admin_emails: string[] | null
          key: string
          monthly_bonus_points: number | null
          monthly_bonus_threshold: number | null
          particulier_ambassadeur_threshold: number | null
          particulier_expert_threshold: number | null
          particulier_vip_threshold: number | null
          points_per_signed_quote: number | null
          pro_gold_threshold: number | null
          pro_platinum_threshold: number | null
          pro_silver_threshold: number | null
          recruitment_commission_percent: number | null
          recruitment_max_levels: number | null
          social_monthly_limit: number | null
          social_reward_facebook_post: number | null
          social_reward_google_review: number | null
          social_reward_instagram_post: number | null
          social_reward_linkedin_article: number | null
          social_reward_linkedin_post: number | null
          social_reward_video: number | null
          updated_at: string | null
        }
        Insert: {
          admin_emails?: string[] | null
          key?: string
          monthly_bonus_points?: number | null
          monthly_bonus_threshold?: number | null
          particulier_ambassadeur_threshold?: number | null
          particulier_expert_threshold?: number | null
          particulier_vip_threshold?: number | null
          points_per_signed_quote?: number | null
          pro_gold_threshold?: number | null
          pro_platinum_threshold?: number | null
          pro_silver_threshold?: number | null
          recruitment_commission_percent?: number | null
          recruitment_max_levels?: number | null
          social_monthly_limit?: number | null
          social_reward_facebook_post?: number | null
          social_reward_google_review?: number | null
          social_reward_instagram_post?: number | null
          social_reward_linkedin_article?: number | null
          social_reward_linkedin_post?: number | null
          social_reward_video?: number | null
          updated_at?: string | null
        }
        Update: {
          admin_emails?: string[] | null
          key?: string
          monthly_bonus_points?: number | null
          monthly_bonus_threshold?: number | null
          particulier_ambassadeur_threshold?: number | null
          particulier_expert_threshold?: number | null
          particulier_vip_threshold?: number | null
          points_per_signed_quote?: number | null
          pro_gold_threshold?: number | null
          pro_platinum_threshold?: number | null
          pro_silver_threshold?: number | null
          recruitment_commission_percent?: number | null
          recruitment_max_levels?: number | null
          social_monthly_limit?: number | null
          social_reward_facebook_post?: number | null
          social_reward_google_review?: number | null
          social_reward_instagram_post?: number | null
          social_reward_linkedin_article?: number | null
          social_reward_linkedin_post?: number | null
          social_reward_video?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      brh_points_transactions: {
        Row: {
          affiliate_id: string | null
          created_at: string | null
          description: string | null
          id: string
          points: number
          reference_id: string | null
          type: string
        }
        Insert: {
          affiliate_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          points: number
          reference_id?: string | null
          type: string
        }
        Update: {
          affiliate_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_points_transactions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "brh_affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_prospect_files: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string
          id: string
          mime_type: string | null
          prospect_id: string | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          id?: string
          mime_type?: string | null
          prospect_id?: string | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          id?: string
          mime_type?: string | null
          prospect_id?: string | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_prospect_files_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "brh_prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_prospect_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_prospects: {
        Row: {
          admin_notes: string | null
          affiliate_id: string | null
          client_address: string | null
          client_city: string | null
          client_email: string | null
          client_first_name: string
          client_last_name: string
          client_phone: string
          client_postal_code: string | null
          company_id: string | null
          created_at: string | null
          crm_id: string | null
          crm_synced_at: string | null
          estimated_budget: number | null
          id: string
          lead_score: number | null
          notes: string | null
          source_type: string
          status: string | null
          status_updated_at: string | null
          submitted_by: string | null
          updated_at: string | null
          urgency: string | null
          work_type: string[] | null
        }
        Insert: {
          admin_notes?: string | null
          affiliate_id?: string | null
          client_address?: string | null
          client_city?: string | null
          client_email?: string | null
          client_first_name: string
          client_last_name: string
          client_phone: string
          client_postal_code?: string | null
          company_id?: string | null
          created_at?: string | null
          crm_id?: string | null
          crm_synced_at?: string | null
          estimated_budget?: number | null
          id?: string
          lead_score?: number | null
          notes?: string | null
          source_type: string
          status?: string | null
          status_updated_at?: string | null
          submitted_by?: string | null
          updated_at?: string | null
          urgency?: string | null
          work_type?: string[] | null
        }
        Update: {
          admin_notes?: string | null
          affiliate_id?: string | null
          client_address?: string | null
          client_city?: string | null
          client_email?: string | null
          client_first_name?: string
          client_last_name?: string
          client_phone?: string
          client_postal_code?: string | null
          company_id?: string | null
          created_at?: string | null
          crm_id?: string | null
          crm_synced_at?: string | null
          estimated_budget?: number | null
          id?: string
          lead_score?: number | null
          notes?: string | null
          source_type?: string
          status?: string | null
          status_updated_at?: string | null
          submitted_by?: string | null
          updated_at?: string | null
          urgency?: string | null
          work_type?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_prospects_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "brh_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_prospects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "brh_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_prospects_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_quotes: {
        Row: {
          amount: number
          commission_amount: number | null
          commission_paid_at: string | null
          commission_rate_percent: number | null
          commission_status: string | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          payment_method: string | null
          points_awarded: number | null
          points_awarded_at: string | null
          prospect_id: string | null
          signed_at: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          commission_amount?: number | null
          commission_paid_at?: string | null
          commission_rate_percent?: number | null
          commission_status?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          points_awarded?: number | null
          points_awarded_at?: string | null
          prospect_id?: string | null
          signed_at: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          commission_amount?: number | null
          commission_paid_at?: string | null
          commission_rate_percent?: number | null
          commission_status?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          points_awarded?: number | null
          points_awarded_at?: string | null
          prospect_id?: string | null
          signed_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_quotes_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "brh_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_recruitment_commissions: {
        Row: {
          chain_level: number | null
          commission_amount: number
          commission_rate_percent: number
          created_at: string | null
          id: string
          notes: string | null
          paid_at: string | null
          recruited_id: string | null
          recruiter_id: string | null
          reference_id: string | null
          source_amount: number
          source_type: string
          status: string | null
        }
        Insert: {
          chain_level?: number | null
          commission_amount: number
          commission_rate_percent?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          recruited_id?: string | null
          recruiter_id?: string | null
          reference_id?: string | null
          source_amount: number
          source_type: string
          status?: string | null
        }
        Update: {
          chain_level?: number | null
          commission_amount?: number
          commission_rate_percent?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          recruited_id?: string | null
          recruiter_id?: string | null
          reference_id?: string | null
          source_amount?: number
          source_type?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_recruitment_commissions_recruited_id_fkey"
            columns: ["recruited_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_recruitment_commissions_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_reward_claims: {
        Row: {
          admin_notes: string | null
          affiliate_id: string | null
          created_at: string | null
          discount_code: string | null
          discount_expires_at: string | null
          discount_used: boolean | null
          discount_used_at: string | null
          id: string
          points_spent: number
          reward_id: string | null
          shipping_address: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          affiliate_id?: string | null
          created_at?: string | null
          discount_code?: string | null
          discount_expires_at?: string | null
          discount_used?: boolean | null
          discount_used_at?: string | null
          id?: string
          points_spent: number
          reward_id?: string | null
          shipping_address?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          affiliate_id?: string | null
          created_at?: string | null
          discount_code?: string | null
          discount_expires_at?: string | null
          discount_used?: boolean | null
          discount_used_at?: string | null
          id?: string
          points_spent?: number
          reward_id?: string | null
          shipping_address?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_reward_claims_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "brh_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_reward_claims_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "brh_rewards_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_rewards_catalog: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          points_required: number
          sort_order: number | null
          stock: number | null
          type: string
          updated_at: string | null
          value_cents: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          points_required: number
          sort_order?: number | null
          stock?: number | null
          type: string
          updated_at?: string | null
          value_cents?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          points_required?: number
          sort_order?: number | null
          stock?: number | null
          type?: string
          updated_at?: string | null
          value_cents?: number | null
        }
        Relationships: []
      }
      brh_simulation_leads: {
        Row: {
          affiliate_id: string | null
          converted_to_prospect: boolean | null
          created_at: string | null
          id: string
          prospect_id: string | null
          share_id: string | null
          simulation_data: Json | null
          visitor_session: string | null
        }
        Insert: {
          affiliate_id?: string | null
          converted_to_prospect?: boolean | null
          created_at?: string | null
          id?: string
          prospect_id?: string | null
          share_id?: string | null
          simulation_data?: Json | null
          visitor_session?: string | null
        }
        Update: {
          affiliate_id?: string | null
          converted_to_prospect?: boolean | null
          created_at?: string | null
          id?: string
          prospect_id?: string | null
          share_id?: string | null
          simulation_data?: Json | null
          visitor_session?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_simulation_leads_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "brh_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_simulation_leads_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "brh_prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_simulation_leads_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "brh_simulation_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_simulation_shares: {
        Row: {
          affiliate_id: string | null
          click_count: number | null
          created_at: string | null
          id: string
          referral_code: string
          simulation_count: number | null
          work_type: string | null
        }
        Insert: {
          affiliate_id?: string | null
          click_count?: number | null
          created_at?: string | null
          id?: string
          referral_code: string
          simulation_count?: number | null
          work_type?: string | null
        }
        Update: {
          affiliate_id?: string | null
          click_count?: number | null
          created_at?: string | null
          id?: string
          referral_code?: string
          simulation_count?: number | null
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_simulation_shares_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "brh_affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_social_posts: {
        Row: {
          admin_notes: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          expiry_check_date: string | null
          expiry_confirmed: boolean | null
          id: string
          is_duplicate: boolean | null
          platform: string
          post_type: string
          post_url: string
          rejection_reason: string | null
          reward_amount_cents: number | null
          reward_points: number | null
          reward_type: string
          screenshot_path: string
          status: string | null
          submitted_by: string
          submitter_role: string
          updated_at: string | null
          validated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          expiry_check_date?: string | null
          expiry_confirmed?: boolean | null
          id?: string
          is_duplicate?: boolean | null
          platform: string
          post_type: string
          post_url: string
          rejection_reason?: string | null
          reward_amount_cents?: number | null
          reward_points?: number | null
          reward_type: string
          screenshot_path: string
          status?: string | null
          submitted_by: string
          submitter_role: string
          updated_at?: string | null
          validated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          expiry_check_date?: string | null
          expiry_confirmed?: boolean | null
          id?: string
          is_duplicate?: boolean | null
          platform?: string
          post_type?: string
          post_url?: string
          rejection_reason?: string | null
          reward_amount_cents?: number | null
          reward_points?: number | null
          reward_type?: string
          screenshot_path?: string
          status?: string | null
          submitted_by?: string
          submitter_role?: string
          updated_at?: string | null
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_social_posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "brh_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_social_posts_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_user_badges: {
        Row: {
          badge_id: string
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          badge_id: string
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          badge_id?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "brh_badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_work_history: {
        Row: {
          completed_at: string | null
          contractor: string | null
          cost: number | null
          created_at: string | null
          description: string | null
          documents: string[] | null
          domain: string
          home_id: string
          id: string
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
          work_date: string | null
        }
        Insert: {
          completed_at?: string | null
          contractor?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          documents?: string[] | null
          domain: string
          home_id: string
          id?: string
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          work_date?: string | null
        }
        Update: {
          completed_at?: string | null
          contractor?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          documents?: string[] | null
          domain?: string
          home_id?: string
          id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          work_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_work_history_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "brh_homes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          clerk_user_id: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          locale: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          clerk_user_id?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          locale?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          clerk_user_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          locale?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_profile_by_email: {
        Args: { search_email: string }
        Returns: {
          id: string
          role: string
        }[]
      }
      get_company_commission_stats: {
        Args: { p_company_id: string }
        Returns: {
          dues: number
          versees: number
        }[]
      }
      get_full_recruit_tree: {
        Args: { p_recruiter_id: string }
        Returns: {
          full_name: string
          id: string
          level_name: string
          lvl: number
          recruiter_id: string
          role: string
        }[]
      }
      get_my_company_id: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      get_my_threads_enriched: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          id: string
          is_archived: boolean
          last_message: string
          last_message_at: string
          participant_id: string
          participant_type: string
          subject: string
          unread_count: number
        }[]
      }
      get_network_stats: {
        Args: { p_recruiter_id: string }
        Returns: {
          total_commission: number
          total_prospects: number
          total_recruits: number
          total_signed: number
        }[]
      }
      get_recruit_stats: {
        Args: { p_recruiter_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          profile_id: string
          prospects_count: number
          role: string
          signed_count: number
        }[]
      }
      get_team_stats: {
        Args: { p_company_id: string }
        Returns: {
          full_name: string
          member_id: string
          prospects_count: number
          signed_count: number
          total_ca: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_email_admin: { Args: { p_email: string }; Returns: boolean }
      is_pro: { Args: never; Returns: boolean }
      profile_id_from_clerk: { Args: { p_clerk_id: string }; Returns: string }
      validate_recruiter: {
        Args: { p_expected_role: string; p_recruiter_id: string }
        Returns: boolean
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
