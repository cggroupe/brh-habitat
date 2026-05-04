export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      brh_agence_audits: {
        Row: {
          agence_id: string
          assignment_id: string
          audit_month: string
          contact_email: string | null
          created_at: string
          email_resend_id: string | null
          email_sent_at: string | null
          feedback: string | null
          feedback_message: string | null
          id: string
          prospect_id: number
          response_at: string | null
          response_token: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          agence_id: string
          assignment_id: string
          audit_month: string
          contact_email?: string | null
          created_at?: string
          email_resend_id?: string | null
          email_sent_at?: string | null
          feedback?: string | null
          feedback_message?: string | null
          id?: string
          prospect_id: number
          response_at?: string | null
          response_token?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          agence_id?: string
          assignment_id?: string
          audit_month?: string
          contact_email?: string | null
          created_at?: string
          email_resend_id?: string | null
          email_sent_at?: string | null
          feedback?: string | null
          feedback_message?: string | null
          id?: string
          prospect_id?: number
          response_at?: string | null
          response_token?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_agence_audits_agence_id_fkey"
            columns: ["agence_id"]
            isOneToOne: false
            referencedRelation: "brh_agences_immo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_agence_audits_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "brh_lead_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_agence_audits_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "brh_dpe_prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_agence_audits_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_agence_subscriptions: {
        Row: {
          agence_id: string
          created_at: string
          current_month_claims: number
          current_period_end: string
          current_period_start: string
          id: string
          monthly_lead_quota: number | null
          signer_profile_id: string | null
          stripe_customer_id: string | null
          stripe_status: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string
        }
        Insert: {
          agence_id: string
          created_at?: string
          current_month_claims?: number
          current_period_end?: string
          current_period_start?: string
          id?: string
          monthly_lead_quota?: number | null
          signer_profile_id?: string | null
          stripe_customer_id?: string | null
          stripe_status?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
        }
        Update: {
          agence_id?: string
          created_at?: string
          current_month_claims?: number
          current_period_end?: string
          current_period_start?: string
          id?: string
          monthly_lead_quota?: number | null
          signer_profile_id?: string | null
          stripe_customer_id?: string | null
          stripe_status?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_agence_subscriptions_agence_id_fkey"
            columns: ["agence_id"]
            isOneToOne: true
            referencedRelation: "brh_agences_immo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_agence_subscriptions_signer_profile_id_fkey"
            columns: ["signer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_agences_immo: {
        Row: {
          adresse: string | null
          carte_t_numero: string | null
          carte_t_validite: string | null
          code_insee: string | null
          code_postal: string | null
          commune: string | null
          created_at: string
          departement: string | null
          email: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          raison_sociale: string
          representant: string | null
          siret: string | null
          site_web: string | null
          status: string
          telephone: string | null
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          carte_t_numero?: string | null
          carte_t_validite?: string | null
          code_insee?: string | null
          code_postal?: string | null
          commune?: string | null
          created_at?: string
          departement?: string | null
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          raison_sociale: string
          representant?: string | null
          siret?: string | null
          site_web?: string | null
          status?: string
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          carte_t_numero?: string | null
          carte_t_validite?: string | null
          code_insee?: string | null
          code_postal?: string | null
          commune?: string | null
          created_at?: string
          departement?: string | null
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          raison_sociale?: string
          representant?: string | null
          siret?: string | null
          site_web?: string | null
          status?: string
          telephone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      brh_aides_locales: {
        Row: {
          active: boolean
          code_geo: string
          couleurs_eligibles: string[] | null
          created_at: string
          cumul_cee: boolean
          cumul_eco_ptz: boolean
          cumul_mpr: boolean
          date_validite_debut: string | null
          date_validite_fin: string | null
          forfait_euros: number | null
          geste_id: string
          id: number
          niveau: string
          notes: string | null
          organisme: string
          plafond_euros: number | null
          programme: string
          saut_dpe_min: number | null
          taux_pct: number | null
          updated_at: string
          url_officielle: string | null
        }
        Insert: {
          active?: boolean
          code_geo: string
          couleurs_eligibles?: string[] | null
          created_at?: string
          cumul_cee?: boolean
          cumul_eco_ptz?: boolean
          cumul_mpr?: boolean
          date_validite_debut?: string | null
          date_validite_fin?: string | null
          forfait_euros?: number | null
          geste_id: string
          id?: number
          niveau: string
          notes?: string | null
          organisme: string
          plafond_euros?: number | null
          programme: string
          saut_dpe_min?: number | null
          taux_pct?: number | null
          updated_at?: string
          url_officielle?: string | null
        }
        Update: {
          active?: boolean
          code_geo?: string
          couleurs_eligibles?: string[] | null
          created_at?: string
          cumul_cee?: boolean
          cumul_eco_ptz?: boolean
          cumul_mpr?: boolean
          date_validite_debut?: string | null
          date_validite_fin?: string | null
          forfait_euros?: number | null
          geste_id?: string
          id?: number
          niveau?: string
          notes?: string | null
          organisme?: string
          plafond_euros?: number | null
          programme?: string
          saut_dpe_min?: number | null
          taux_pct?: number | null
          updated_at?: string
          url_officielle?: string | null
        }
        Relationships: []
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
      brh_artisan_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          artisan_id: string
          created_at: string
          created_by: string | null
          email_to: string
          expires_at: string
          id: string
          message_personnel: string | null
          sent_at: string | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          artisan_id: string
          created_at?: string
          created_by?: string | null
          email_to: string
          expires_at?: string
          id?: string
          message_personnel?: string | null
          sent_at?: string | null
          status?: string
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          artisan_id?: string
          created_at?: string
          created_by?: string | null
          email_to?: string
          expires_at?: string
          id?: string
          message_personnel?: string | null
          sent_at?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_artisan_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_artisan_invitations_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "brh_artisans_rge"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_artisan_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_artisan_leads: {
        Row: {
          actual_chantier_ttc_eur: number | null
          artisan_id: string
          commission_paid_at: string | null
          commission_paid_eur: number | null
          completed_at: string | null
          created_at: string
          estimated_chantier_ttc_eur: number | null
          expected_commission_eur: number | null
          geste: string
          id: string
          prospect_id: number
          recommended_by: string | null
          responded_at: string | null
          signed_at: string | null
          status: string
          status_reason: string | null
          updated_at: string
        }
        Insert: {
          actual_chantier_ttc_eur?: number | null
          artisan_id: string
          commission_paid_at?: string | null
          commission_paid_eur?: number | null
          completed_at?: string | null
          created_at?: string
          estimated_chantier_ttc_eur?: number | null
          expected_commission_eur?: number | null
          geste: string
          id?: string
          prospect_id: number
          recommended_by?: string | null
          responded_at?: string | null
          signed_at?: string | null
          status?: string
          status_reason?: string | null
          updated_at?: string
        }
        Update: {
          actual_chantier_ttc_eur?: number | null
          artisan_id?: string
          commission_paid_at?: string | null
          commission_paid_eur?: number | null
          completed_at?: string | null
          created_at?: string
          estimated_chantier_ttc_eur?: number | null
          expected_commission_eur?: number | null
          geste?: string
          id?: string
          prospect_id?: number
          recommended_by?: string | null
          responded_at?: string | null
          signed_at?: string | null
          status?: string
          status_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_artisan_leads_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "brh_artisans_rge"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_artisan_leads_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "brh_dpe_prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_artisan_leads_recommended_by_fkey"
            columns: ["recommended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_artisans_rge: {
        Row: {
          adresse: string | null
          code_insee: string
          code_postal: string | null
          commune: string | null
          created_at: string
          departement: string | null
          email: string | null
          geste_specialites: string[]
          id: string
          last_verified_at: string | null
          latitude: number | null
          longitude: number | null
          marketplace_active: boolean
          marketplace_premium: boolean
          nom_entreprise: string
          nombre_chantiers_brh: number
          nombre_chantiers_lifetime: number
          profile_id: string | null
          representant: string | null
          rge_certifications: Json | null
          score_qualite: number | null
          siret: string
          site_web: string | null
          source: string | null
          taux_conversion_brh: number | null
          telephone: string | null
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          code_insee: string
          code_postal?: string | null
          commune?: string | null
          created_at?: string
          departement?: string | null
          email?: string | null
          geste_specialites?: string[]
          id?: string
          last_verified_at?: string | null
          latitude?: number | null
          longitude?: number | null
          marketplace_active?: boolean
          marketplace_premium?: boolean
          nom_entreprise: string
          nombre_chantiers_brh?: number
          nombre_chantiers_lifetime?: number
          profile_id?: string | null
          representant?: string | null
          rge_certifications?: Json | null
          score_qualite?: number | null
          siret: string
          site_web?: string | null
          source?: string | null
          taux_conversion_brh?: number | null
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          code_insee?: string
          code_postal?: string | null
          commune?: string | null
          created_at?: string
          departement?: string | null
          email?: string | null
          geste_specialites?: string[]
          id?: string
          last_verified_at?: string | null
          latitude?: number | null
          longitude?: number | null
          marketplace_active?: boolean
          marketplace_premium?: boolean
          nom_entreprise?: string
          nombre_chantiers_brh?: number
          nombre_chantiers_lifetime?: number
          profile_id?: string | null
          representant?: string | null
          rge_certifications?: Json | null
          score_qualite?: number | null
          siret?: string
          site_web?: string | null
          source?: string | null
          taux_conversion_brh?: number | null
          telephone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_artisans_rge_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_audit_emails: {
        Row: {
          audit_id: string
          created_at: string
          error_message: string | null
          id: string
          message: string | null
          recipient_email: string
          resend_id: string | null
          sent_at: string | null
          sent_by: string
          status: string
          subject: string | null
        }
        Insert: {
          audit_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string | null
          recipient_email: string
          resend_id?: string | null
          sent_at?: string | null
          sent_by: string
          status?: string
          subject?: string | null
        }
        Update: {
          audit_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string | null
          recipient_email?: string
          resend_id?: string | null
          sent_at?: string | null
          sent_by?: string
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_audit_emails_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "brh_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_audit_factures: {
        Row: {
          annee: number
          audit_id: string
          conso_kwh: number
          created_at: string
          depense_ttc_cents: number | null
          energie: string
          id: string
          notes: string | null
        }
        Insert: {
          annee: number
          audit_id: string
          conso_kwh: number
          created_at?: string
          depense_ttc_cents?: number | null
          energie: string
          id?: string
          notes?: string | null
        }
        Update: {
          annee?: number
          audit_id?: string
          conso_kwh?: number
          created_at?: string
          depense_ttc_cents?: number | null
          energie?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_audit_factures_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "brh_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_audit_variantes: {
        Row: {
          aides: Json
          aides_total_cents: number | null
          audit_id: string
          cep_kwh_ep_m2_an: number | null
          cout_fournitures_cents: number | null
          cout_main_oeuvre_cents: number | null
          cout_total_ttc_cents: number | null
          created_at: string
          delta_inputs: Json
          economie_annuelle_cents: number | null
          etiquette_climat: string | null
          etiquette_energie: string | null
          ges_kg_co2_m2_an: number | null
          id: string
          is_selected: boolean
          label: string
          ordre: number
          payback_annees: number | null
          reste_a_charge_cents: number | null
          results: Json
        }
        Insert: {
          aides?: Json
          aides_total_cents?: number | null
          audit_id: string
          cep_kwh_ep_m2_an?: number | null
          cout_fournitures_cents?: number | null
          cout_main_oeuvre_cents?: number | null
          cout_total_ttc_cents?: number | null
          created_at?: string
          delta_inputs?: Json
          economie_annuelle_cents?: number | null
          etiquette_climat?: string | null
          etiquette_energie?: string | null
          ges_kg_co2_m2_an?: number | null
          id?: string
          is_selected?: boolean
          label: string
          ordre?: number
          payback_annees?: number | null
          reste_a_charge_cents?: number | null
          results?: Json
        }
        Update: {
          aides?: Json
          aides_total_cents?: number | null
          audit_id?: string
          cep_kwh_ep_m2_an?: number | null
          cout_fournitures_cents?: number | null
          cout_main_oeuvre_cents?: number | null
          cout_total_ttc_cents?: number | null
          created_at?: string
          delta_inputs?: Json
          economie_annuelle_cents?: number | null
          etiquette_climat?: string | null
          etiquette_energie?: string | null
          ges_kg_co2_m2_an?: number | null
          id?: string
          is_selected?: boolean
          label?: string
          ordre?: number
          payback_annees?: number | null
          reste_a_charge_cents?: number | null
          results?: Json
        }
        Relationships: [
          {
            foreignKeyName: "brh_audit_variantes_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "brh_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_audits: {
        Row: {
          cep_kwh_ep_m2_an: number | null
          created_at: string
          diagnostic_id: string | null
          etiquette_climat: string | null
          etiquette_energie: string | null
          finalized_at: string | null
          ges_kg_co2_m2_an: number | null
          home_id: string | null
          id: string
          inputs: Json
          pdf_url: string | null
          pro_user_id: string | null
          results: Json
          status: string
          updated_at: string
          user_id: string | null
          xml_ademe_url: string | null
        }
        Insert: {
          cep_kwh_ep_m2_an?: number | null
          created_at?: string
          diagnostic_id?: string | null
          etiquette_climat?: string | null
          etiquette_energie?: string | null
          finalized_at?: string | null
          ges_kg_co2_m2_an?: number | null
          home_id?: string | null
          id?: string
          inputs: Json
          pdf_url?: string | null
          pro_user_id?: string | null
          results?: Json
          status?: string
          updated_at?: string
          user_id?: string | null
          xml_ademe_url?: string | null
        }
        Update: {
          cep_kwh_ep_m2_an?: number | null
          created_at?: string
          diagnostic_id?: string | null
          etiquette_climat?: string | null
          etiquette_energie?: string | null
          finalized_at?: string | null
          ges_kg_co2_m2_an?: number | null
          home_id?: string | null
          id?: string
          inputs?: Json
          pdf_url?: string | null
          pro_user_id?: string | null
          results?: Json
          status?: string
          updated_at?: string
          user_id?: string | null
          xml_ademe_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_audits_diagnostic_id_fkey"
            columns: ["diagnostic_id"]
            isOneToOne: false
            referencedRelation: "brh_diagnostics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_audits_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "brh_homes"
            referencedColumns: ["id"]
          },
        ]
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
      brh_commission_invoices: {
        Row: {
          artisan_id: string
          commission_pct: number
          created_at: string
          email_resend_id: string | null
          email_sent_at: string | null
          id: string
          invoiced_at: string | null
          nb_leads_completed: number
          notes: string | null
          paid_at: string | null
          pdf_path: string | null
          pdf_uploaded_at: string | null
          period_month: number
          period_year: number
          reconciled_at: string | null
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          total_chantiers_ttc_eur: number
          total_commission_due_eur: number
          updated_at: string
        }
        Insert: {
          artisan_id: string
          commission_pct?: number
          created_at?: string
          email_resend_id?: string | null
          email_sent_at?: string | null
          id?: string
          invoiced_at?: string | null
          nb_leads_completed?: number
          notes?: string | null
          paid_at?: string | null
          pdf_path?: string | null
          pdf_uploaded_at?: string | null
          period_month: number
          period_year: number
          reconciled_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          total_chantiers_ttc_eur?: number
          total_commission_due_eur: number
          updated_at?: string
        }
        Update: {
          artisan_id?: string
          commission_pct?: number
          created_at?: string
          email_resend_id?: string | null
          email_sent_at?: string | null
          id?: string
          invoiced_at?: string | null
          nb_leads_completed?: number
          notes?: string | null
          paid_at?: string | null
          pdf_path?: string | null
          pdf_uploaded_at?: string | null
          period_month?: number
          period_year?: number
          reconciled_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          total_chantiers_ttc_eur?: number
          total_commission_due_eur?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_commission_invoices_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "brh_artisans_rge"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_commission_lead_links: {
        Row: {
          chantier_ttc_eur: number
          commission_eur: number
          invoice_id: string
          lead_id: string
        }
        Insert: {
          chantier_ttc_eur: number
          commission_eur: number
          invoice_id: string
          lead_id: string
        }
        Update: {
          chantier_ttc_eur?: number
          commission_eur?: number
          invoice_id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_commission_lead_links_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "brh_commission_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_commission_lead_links_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "brh_artisan_leads"
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
          permissions: Json
          profile_id: string | null
        }
        Insert: {
          company_id?: string | null
          id?: string
          joined_at?: string | null
          member_role?: string | null
          permissions?: Json
          profile_id?: string | null
        }
        Update: {
          company_id?: string | null
          id?: string
          joined_at?: string | null
          member_role?: string | null
          permissions?: Json
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
      brh_cron_runs: {
        Row: {
          error_message: string | null
          finished_at: string | null
          id: string
          invoices_created: number | null
          job_name: string
          metadata: Json | null
          started_at: string
          status: string
          total_commission_eur: number | null
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          invoices_created?: number | null
          job_name: string
          metadata?: Json | null
          started_at?: string
          status?: string
          total_commission_eur?: number | null
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          invoices_created?: number | null
          job_name?: string
          metadata?: Json | null
          started_at?: string
          status?: string
          total_commission_eur?: number | null
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
      brh_dpe_coef_masque_lointain_homogene: {
        Row: {
          enum_orientation_id: string | null
          fe2: number
          hauteur_alpha: string | null
          id: number
          orientation: string | null
        }
        Insert: {
          enum_orientation_id?: string | null
          fe2: number
          hauteur_alpha?: string | null
          id?: number
          orientation?: string | null
        }
        Update: {
          enum_orientation_id?: string | null
          fe2?: number
          hauteur_alpha?: string | null
          id?: number
          orientation?: string | null
        }
        Relationships: []
      }
      brh_dpe_coef_masque_lointain_non_homogene: {
        Row: {
          enum_orientation_id: string | null
          id: number
          omb: number
          orientation: string | null
          secteur: string | null
        }
        Insert: {
          enum_orientation_id?: string | null
          id?: number
          omb: number
          orientation?: string | null
          secteur?: string | null
        }
        Update: {
          enum_orientation_id?: string | null
          id?: number
          omb?: number
          orientation?: string | null
          secteur?: string | null
        }
        Relationships: []
      }
      brh_dpe_coef_masque_proche: {
        Row: {
          avancee: string | null
          enum_orientation_id: string | null
          fe1: number
          id: number
          orientation: string | null
          type_masque_cr: string | null
          type_masque_proche: string | null
        }
        Insert: {
          avancee?: string | null
          enum_orientation_id?: string | null
          fe1: number
          id?: number
          orientation?: string | null
          type_masque_cr?: string | null
          type_masque_proche?: string | null
        }
        Update: {
          avancee?: string | null
          enum_orientation_id?: string | null
          fe1?: number
          id?: number
          orientation?: string | null
          type_masque_cr?: string | null
          type_masque_proche?: string | null
        }
        Relationships: []
      }
      brh_dpe_coef_orientation_pv: {
        Row: {
          coef_orientation_pv: number
          enum_inclinaison_pv_id: number | null
          enum_orientation_pv_id: number | null
          id: number
          inclinaison_pv: string | null
          orientation_pv: string | null
        }
        Insert: {
          coef_orientation_pv: number
          enum_inclinaison_pv_id?: number | null
          enum_orientation_pv_id?: number | null
          id?: number
          inclinaison_pv?: string | null
          orientation_pv?: string | null
        }
        Update: {
          coef_orientation_pv?: number
          enum_inclinaison_pv_id?: number | null
          enum_orientation_pv_id?: number | null
          id?: number
          inclinaison_pv?: string | null
          orientation_pv?: string | null
        }
        Relationships: []
      }
      brh_dpe_coef_reduction_deperdition: {
        Row: {
          aiu_aue_max_incl: number | null
          aiu_aue_min_excl: number | null
          b: number
          cfg_isolation_lnc: string | null
          enum_cfg_isolation_lnc_id: number | null
          enum_type_adjacence_id: number | null
          id: number
          type_adjacence: string | null
          uvue: number | null
          zone_climatique: string | null
        }
        Insert: {
          aiu_aue_max_incl?: number | null
          aiu_aue_min_excl?: number | null
          b: number
          cfg_isolation_lnc?: string | null
          enum_cfg_isolation_lnc_id?: number | null
          enum_type_adjacence_id?: number | null
          id?: number
          type_adjacence?: string | null
          uvue?: number | null
          zone_climatique?: string | null
        }
        Update: {
          aiu_aue_max_incl?: number | null
          aiu_aue_min_excl?: number | null
          b?: number
          cfg_isolation_lnc?: string | null
          enum_cfg_isolation_lnc_id?: number | null
          enum_type_adjacence_id?: number | null
          id?: number
          type_adjacence?: string | null
          uvue?: number | null
          zone_climatique?: string | null
        }
        Relationships: []
      }
      brh_dpe_coef_reduction_deperdition_copi: {
        Row: {
          aiu_aue_max_incl: number | null
          aiu_aue_min_excl: number | null
          b: number
          cfg_isolation_lnc: string | null
          enum_cfg_isolation_lnc_id: number | null
          enum_type_adjacence_id: string | null
          id: number
          type_adjacence: string | null
          uvue: number | null
          zone_climatique: string | null
        }
        Insert: {
          aiu_aue_max_incl?: number | null
          aiu_aue_min_excl?: number | null
          b: number
          cfg_isolation_lnc?: string | null
          enum_cfg_isolation_lnc_id?: number | null
          enum_type_adjacence_id?: string | null
          id?: number
          type_adjacence?: string | null
          uvue?: number | null
          zone_climatique?: string | null
        }
        Update: {
          aiu_aue_max_incl?: number | null
          aiu_aue_min_excl?: number | null
          b?: number
          cfg_isolation_lnc?: string | null
          enum_cfg_isolation_lnc_id?: number | null
          enum_type_adjacence_id?: string | null
          id?: number
          type_adjacence?: string | null
          uvue?: number | null
          zone_climatique?: string | null
        }
        Relationships: []
      }
      brh_dpe_coef_reduction_deperdition_ets: {
        Row: {
          b: number
          cfg_isolation_lnc: string | null
          enum_cfg_isolation_lnc_id: number | null
          enum_type_adjacence_id: number | null
          enum_zone_climatique_id: string | null
          id: number
          type_adjacence: string | null
          zone_climatique: string | null
        }
        Insert: {
          b: number
          cfg_isolation_lnc?: string | null
          enum_cfg_isolation_lnc_id?: number | null
          enum_type_adjacence_id?: number | null
          enum_zone_climatique_id?: string | null
          id?: number
          type_adjacence?: string | null
          zone_climatique?: string | null
        }
        Update: {
          b?: number
          cfg_isolation_lnc?: string | null
          enum_cfg_isolation_lnc_id?: number | null
          enum_type_adjacence_id?: number | null
          enum_zone_climatique_id?: string | null
          id?: number
          type_adjacence?: string | null
          zone_climatique?: string | null
        }
        Relationships: []
      }
      brh_dpe_coef_reduction_deperdition_lnc: {
        Row: {
          aiu_aue_max_incl: number | null
          aiu_aue_min_excl: number | null
          b: number
          cfg_isolation_lnc: string | null
          enum_cfg_isolation_lnc_id: number | null
          enum_type_adjacence_id: string | null
          id: number
          type_adjacence: string | null
          uvue: number | null
        }
        Insert: {
          aiu_aue_max_incl?: number | null
          aiu_aue_min_excl?: number | null
          b: number
          cfg_isolation_lnc?: string | null
          enum_cfg_isolation_lnc_id?: number | null
          enum_type_adjacence_id?: string | null
          id?: number
          type_adjacence?: string | null
          uvue?: number | null
        }
        Update: {
          aiu_aue_max_incl?: number | null
          aiu_aue_min_excl?: number | null
          b?: number
          cfg_isolation_lnc?: string | null
          enum_cfg_isolation_lnc_id?: number | null
          enum_type_adjacence_id?: string | null
          id?: number
          type_adjacence?: string | null
          uvue?: number | null
        }
        Relationships: []
      }
      brh_dpe_coef_transparence_ets: {
        Row: {
          coef_transparence_ets: number
          enum_type_materiaux_menuiserie_id: string | null
          enum_type_vitrage_id: string | null
          id: number
          type_materiaux_menuiserie: string | null
          type_vitrage: string | null
          vitrage_vir: number | null
        }
        Insert: {
          coef_transparence_ets: number
          enum_type_materiaux_menuiserie_id?: string | null
          enum_type_vitrage_id?: string | null
          id?: number
          type_materiaux_menuiserie?: string | null
          type_vitrage?: string | null
          vitrage_vir?: number | null
        }
        Update: {
          coef_transparence_ets?: number
          enum_type_materiaux_menuiserie_id?: string | null
          enum_type_vitrage_id?: string | null
          id?: number
          type_materiaux_menuiserie?: string | null
          type_vitrage?: string | null
          vitrage_vir?: number | null
        }
        Relationships: []
      }
      brh_dpe_debits_ventilation: {
        Row: {
          enum_type_ventilation_id: number | null
          id: number
          qvarep_conv: number | null
          qvasouf_conv: number | null
          smea_conv: number
          type_ventilation: string | null
        }
        Insert: {
          enum_type_ventilation_id?: number | null
          id?: number
          qvarep_conv?: number | null
          qvasouf_conv?: number | null
          smea_conv: number
          type_ventilation?: string | null
        }
        Update: {
          enum_type_ventilation_id?: number | null
          id?: number
          qvarep_conv?: number | null
          qvasouf_conv?: number | null
          smea_conv?: number
          type_ventilation?: string | null
        }
        Relationships: []
      }
      brh_dpe_deltar: {
        Row: {
          deltar: number
          enum_type_fermeture_id: number | null
          id: number
          type_fermeture: string | null
        }
        Insert: {
          deltar: number
          enum_type_fermeture_id?: number | null
          id?: number
          type_fermeture?: string | null
        }
        Update: {
          deltar?: number
          enum_type_fermeture_id?: number | null
          id?: number
          type_fermeture?: string | null
        }
        Relationships: []
      }
      brh_dpe_facteur_couverture_solaire: {
        Row: {
          enum_type_installation_solaire_id: number | null
          enum_zone_climatique_id: number | null
          facteur_couverture_solaire: number
          id: number
          type_batiment: string | null
          type_installation_solaire: string | null
          usage: string | null
          zone_climatique: string | null
        }
        Insert: {
          enum_type_installation_solaire_id?: number | null
          enum_zone_climatique_id?: number | null
          facteur_couverture_solaire: number
          id?: number
          type_batiment?: string | null
          type_installation_solaire?: string | null
          usage?: string | null
          zone_climatique?: string | null
        }
        Update: {
          enum_type_installation_solaire_id?: number | null
          enum_zone_climatique_id?: number | null
          facteur_couverture_solaire?: number
          id?: number
          type_batiment?: string | null
          type_installation_solaire?: string | null
          usage?: string | null
          zone_climatique?: string | null
        }
        Relationships: []
      }
      brh_dpe_generateur_combustion: {
        Row: {
          critere_pn: string | null
          enum_type_generateur_ch_id: string | null
          enum_type_generateur_ecs_id: string | null
          id: number
          pn: string | null
          pn_max_incl: number | null
          pn_min_excl: number | null
          pveil: number | null
          qp0_perc: string | null
          rpint: string | null
          rpn: string | null
          type_generateur: string | null
        }
        Insert: {
          critere_pn?: string | null
          enum_type_generateur_ch_id?: string | null
          enum_type_generateur_ecs_id?: string | null
          id?: number
          pn?: string | null
          pn_max_incl?: number | null
          pn_min_excl?: number | null
          pveil?: number | null
          qp0_perc?: string | null
          rpint?: string | null
          rpn?: string | null
          type_generateur?: string | null
        }
        Update: {
          critere_pn?: string | null
          enum_type_generateur_ch_id?: string | null
          enum_type_generateur_ecs_id?: string | null
          id?: number
          pn?: string | null
          pn_max_incl?: number | null
          pn_min_excl?: number | null
          pveil?: number | null
          qp0_perc?: string | null
          rpint?: string | null
          rpn?: string | null
          type_generateur?: string | null
        }
        Relationships: []
      }
      brh_dpe_intermittence: {
        Row: {
          comptage_individuel: string | null
          configuration_chauffage: string | null
          enum_classe_inertie_id: string | null
          enum_equipement_intermittence_id: number | null
          enum_methode_application_dpe_log_id: string | null
          enum_type_chauffage_id: number | null
          enum_type_emission_distribution_id: string | null
          enum_type_installation_id: string | null
          enum_type_regulation_id: number | null
          equipement_intermittence: string | null
          i0: number
          id: number
          inertie: string | null
          type_chauffage: string | null
          type_emission_simple: string | null
          type_regulation: string | null
        }
        Insert: {
          comptage_individuel?: string | null
          configuration_chauffage?: string | null
          enum_classe_inertie_id?: string | null
          enum_equipement_intermittence_id?: number | null
          enum_methode_application_dpe_log_id?: string | null
          enum_type_chauffage_id?: number | null
          enum_type_emission_distribution_id?: string | null
          enum_type_installation_id?: string | null
          enum_type_regulation_id?: number | null
          equipement_intermittence?: string | null
          i0: number
          id?: number
          inertie?: string | null
          type_chauffage?: string | null
          type_emission_simple?: string | null
          type_regulation?: string | null
        }
        Update: {
          comptage_individuel?: string | null
          configuration_chauffage?: string | null
          enum_classe_inertie_id?: string | null
          enum_equipement_intermittence_id?: number | null
          enum_methode_application_dpe_log_id?: string | null
          enum_type_chauffage_id?: number | null
          enum_type_emission_distribution_id?: string | null
          enum_type_installation_id?: string | null
          enum_type_regulation_id?: number | null
          equipement_intermittence?: string | null
          i0?: number
          id?: number
          inertie?: string | null
          type_chauffage?: string | null
          type_emission_simple?: string | null
          type_regulation?: string | null
        }
        Relationships: []
      }
      brh_dpe_pertes_stockage: {
        Row: {
          cr: number
          enum_type_generateur_ecs_id: string | null
          id: number
          type_generateur_ecs: string | null
          volume_stockage_max_incl: number | null
          volume_stockage_min_exl: number | null
        }
        Insert: {
          cr: number
          enum_type_generateur_ecs_id?: string | null
          id?: number
          type_generateur_ecs?: string | null
          volume_stockage_max_incl?: number | null
          volume_stockage_min_exl?: number | null
        }
        Update: {
          cr?: number
          enum_type_generateur_ecs_id?: string | null
          id?: number
          type_generateur_ecs?: string | null
          volume_stockage_max_incl?: number | null
          volume_stockage_min_exl?: number | null
        }
        Relationships: []
      }
      brh_dpe_pont_thermique: {
        Row: {
          enum_type_liaison_id: number | null
          enum_type_pose_id: number | null
          id: number
          isolation_mur: string | null
          isolation_plancher: string | null
          k: number
          largeur_dormant: number | null
          presence_retour_isolation: number | null
          type_liaison: string | null
          type_pose: string | null
        }
        Insert: {
          enum_type_liaison_id?: number | null
          enum_type_pose_id?: number | null
          id?: number
          isolation_mur?: string | null
          isolation_plancher?: string | null
          k: number
          largeur_dormant?: number | null
          presence_retour_isolation?: number | null
          type_liaison?: string | null
          type_pose?: string | null
        }
        Update: {
          enum_type_liaison_id?: number | null
          enum_type_pose_id?: number | null
          id?: number
          isolation_mur?: string | null
          isolation_plancher?: string | null
          k?: number
          largeur_dormant?: number | null
          presence_retour_isolation?: number | null
          type_liaison?: string | null
          type_pose?: string | null
        }
        Relationships: []
      }
      brh_dpe_prospects: {
        Row: {
          abf_required: boolean
          adresse: string | null
          adresse_ban: string | null
          aides_barem_date: string | null
          aides_detail: Json | null
          annee_construction: number | null
          brh_prospect_id: string | null
          cee_total: number | null
          chiffrage_date: string | null
          chiffrage_detail: Json | null
          chiffrage_total_ht: number | null
          chiffrage_total_ttc: number | null
          code_postal: string | null
          commune: string | null
          conso_m2_ep: number | null
          cout_chauffage: number | null
          cout_eclairage: number | null
          cout_ecs: number | null
          cout_energie_annuel: number | null
          date_collecte: string | null
          date_contact: string | null
          date_dpe: string | null
          departement: string | null
          deperditions_baies_vitrees: number | null
          deperditions_murs: number | null
          deperditions_planchers_bas: number | null
          deperditions_planchers_hauts: number | null
          deperditions_ponts_thermiques: number | null
          description_chauffage: string | null
          description_ecs: string | null
          dpe_saut_confidence: string | null
          dpe_saut_s1: Json | null
          dpe_saut_s2: Json | null
          dpe_saut_s3: Json | null
          dvf_date: string | null
          dvf_distance_m: number | null
          dvf_mutation_24m: boolean
          dvf_nature: string | null
          dvf_prix: number | null
          dvf_prix_m2: number | null
          dvf_surface: number | null
          dvf_type: string | null
          enedis_kwh_logt: number | null
          energie_chauffage: string | null
          energie_ecs: string | null
          enriched: boolean | null
          etiquette_dpe: string | null
          etiquette_ges: string | null
          has_pv_36kw: boolean
          hauteur_sous_plafond: number | null
          id: number
          imported_at: string
          iris_code: string | null
          isolation_enveloppe: string | null
          isolation_menuiseries: string | null
          isolation_murs: string | null
          isolation_plancher: string | null
          isolation_toiture_detail: string | null
          latitude: number | null
          longitude: number | null
          mpr_bleu_total: number | null
          mpr_jaune_total: number | null
          mpr_rose_total: number | null
          mpr_violet_total: number | null
          nombre_niveau: number | null
          notes: string | null
          numero_dpe: string | null
          owner_name: string | null
          owner_siren: string | null
          owner_type: string | null
          periode_construction: string | null
          qualite_isolation_menuiseries: string | null
          qualite_isolation_murs: string | null
          qualite_isolation_plancher_bas: string | null
          qualite_isolation_plancher_haut: string | null
          rnb_address: string | null
          rnb_distance_m: number | null
          rnb_id: string | null
          rnb_status: string | null
          score_prospect: number | null
          score_v2: number | null
          score_v2_calculated_at: string | null
          score_v2_detail: Json | null
          score_v2_segment: string | null
          statut: string | null
          surface_habitable: number | null
          type_batiment: string | null
          type_energie_chauffage: string | null
          type_energie_ecs: string | null
          type_ventilation: string | null
          ubat: number | null
        }
        Insert: {
          abf_required?: boolean
          adresse?: string | null
          adresse_ban?: string | null
          aides_barem_date?: string | null
          aides_detail?: Json | null
          annee_construction?: number | null
          brh_prospect_id?: string | null
          cee_total?: number | null
          chiffrage_date?: string | null
          chiffrage_detail?: Json | null
          chiffrage_total_ht?: number | null
          chiffrage_total_ttc?: number | null
          code_postal?: string | null
          commune?: string | null
          conso_m2_ep?: number | null
          cout_chauffage?: number | null
          cout_eclairage?: number | null
          cout_ecs?: number | null
          cout_energie_annuel?: number | null
          date_collecte?: string | null
          date_contact?: string | null
          date_dpe?: string | null
          departement?: string | null
          deperditions_baies_vitrees?: number | null
          deperditions_murs?: number | null
          deperditions_planchers_bas?: number | null
          deperditions_planchers_hauts?: number | null
          deperditions_ponts_thermiques?: number | null
          description_chauffage?: string | null
          description_ecs?: string | null
          dpe_saut_confidence?: string | null
          dpe_saut_s1?: Json | null
          dpe_saut_s2?: Json | null
          dpe_saut_s3?: Json | null
          dvf_date?: string | null
          dvf_distance_m?: number | null
          dvf_mutation_24m?: boolean
          dvf_nature?: string | null
          dvf_prix?: number | null
          dvf_prix_m2?: number | null
          dvf_surface?: number | null
          dvf_type?: string | null
          enedis_kwh_logt?: number | null
          energie_chauffage?: string | null
          energie_ecs?: string | null
          enriched?: boolean | null
          etiquette_dpe?: string | null
          etiquette_ges?: string | null
          has_pv_36kw?: boolean
          hauteur_sous_plafond?: number | null
          id?: number
          imported_at?: string
          iris_code?: string | null
          isolation_enveloppe?: string | null
          isolation_menuiseries?: string | null
          isolation_murs?: string | null
          isolation_plancher?: string | null
          isolation_toiture_detail?: string | null
          latitude?: number | null
          longitude?: number | null
          mpr_bleu_total?: number | null
          mpr_jaune_total?: number | null
          mpr_rose_total?: number | null
          mpr_violet_total?: number | null
          nombre_niveau?: number | null
          notes?: string | null
          numero_dpe?: string | null
          owner_name?: string | null
          owner_siren?: string | null
          owner_type?: string | null
          periode_construction?: string | null
          qualite_isolation_menuiseries?: string | null
          qualite_isolation_murs?: string | null
          qualite_isolation_plancher_bas?: string | null
          qualite_isolation_plancher_haut?: string | null
          rnb_address?: string | null
          rnb_distance_m?: number | null
          rnb_id?: string | null
          rnb_status?: string | null
          score_prospect?: number | null
          score_v2?: number | null
          score_v2_calculated_at?: string | null
          score_v2_detail?: Json | null
          score_v2_segment?: string | null
          statut?: string | null
          surface_habitable?: number | null
          type_batiment?: string | null
          type_energie_chauffage?: string | null
          type_energie_ecs?: string | null
          type_ventilation?: string | null
          ubat?: number | null
        }
        Update: {
          abf_required?: boolean
          adresse?: string | null
          adresse_ban?: string | null
          aides_barem_date?: string | null
          aides_detail?: Json | null
          annee_construction?: number | null
          brh_prospect_id?: string | null
          cee_total?: number | null
          chiffrage_date?: string | null
          chiffrage_detail?: Json | null
          chiffrage_total_ht?: number | null
          chiffrage_total_ttc?: number | null
          code_postal?: string | null
          commune?: string | null
          conso_m2_ep?: number | null
          cout_chauffage?: number | null
          cout_eclairage?: number | null
          cout_ecs?: number | null
          cout_energie_annuel?: number | null
          date_collecte?: string | null
          date_contact?: string | null
          date_dpe?: string | null
          departement?: string | null
          deperditions_baies_vitrees?: number | null
          deperditions_murs?: number | null
          deperditions_planchers_bas?: number | null
          deperditions_planchers_hauts?: number | null
          deperditions_ponts_thermiques?: number | null
          description_chauffage?: string | null
          description_ecs?: string | null
          dpe_saut_confidence?: string | null
          dpe_saut_s1?: Json | null
          dpe_saut_s2?: Json | null
          dpe_saut_s3?: Json | null
          dvf_date?: string | null
          dvf_distance_m?: number | null
          dvf_mutation_24m?: boolean
          dvf_nature?: string | null
          dvf_prix?: number | null
          dvf_prix_m2?: number | null
          dvf_surface?: number | null
          dvf_type?: string | null
          enedis_kwh_logt?: number | null
          energie_chauffage?: string | null
          energie_ecs?: string | null
          enriched?: boolean | null
          etiquette_dpe?: string | null
          etiquette_ges?: string | null
          has_pv_36kw?: boolean
          hauteur_sous_plafond?: number | null
          id?: number
          imported_at?: string
          iris_code?: string | null
          isolation_enveloppe?: string | null
          isolation_menuiseries?: string | null
          isolation_murs?: string | null
          isolation_plancher?: string | null
          isolation_toiture_detail?: string | null
          latitude?: number | null
          longitude?: number | null
          mpr_bleu_total?: number | null
          mpr_jaune_total?: number | null
          mpr_rose_total?: number | null
          mpr_violet_total?: number | null
          nombre_niveau?: number | null
          notes?: string | null
          numero_dpe?: string | null
          owner_name?: string | null
          owner_siren?: string | null
          owner_type?: string | null
          periode_construction?: string | null
          qualite_isolation_menuiseries?: string | null
          qualite_isolation_murs?: string | null
          qualite_isolation_plancher_bas?: string | null
          qualite_isolation_plancher_haut?: string | null
          rnb_address?: string | null
          rnb_distance_m?: number | null
          rnb_id?: string | null
          rnb_status?: string | null
          score_prospect?: number | null
          score_v2?: number | null
          score_v2_calculated_at?: string | null
          score_v2_detail?: Json | null
          score_v2_segment?: string | null
          statut?: string | null
          surface_habitable?: number | null
          type_batiment?: string | null
          type_energie_chauffage?: string | null
          type_energie_ecs?: string | null
          type_ventilation?: string | null
          ubat?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_dpe_prospects_brh_prospect_id_fkey"
            columns: ["brh_prospect_id"]
            isOneToOne: false
            referencedRelation: "brh_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_dpe_q4pa_conv: {
        Row: {
          enum_methode_application_dpe_log_id: string | null
          enum_periode_construction_id: string | null
          id: number
          isolation_surfaces: number | null
          periode_construction: string | null
          presence_joints_menuiserie: number | null
          q4pa_conv: number
          type_habitation: string | null
        }
        Insert: {
          enum_methode_application_dpe_log_id?: string | null
          enum_periode_construction_id?: string | null
          id?: number
          isolation_surfaces?: number | null
          periode_construction?: string | null
          presence_joints_menuiserie?: number | null
          q4pa_conv: number
          type_habitation?: string | null
        }
        Update: {
          enum_methode_application_dpe_log_id?: string | null
          enum_periode_construction_id?: string | null
          id?: number
          isolation_surfaces?: number | null
          periode_construction?: string | null
          presence_joints_menuiserie?: number | null
          q4pa_conv?: number
          type_habitation?: string | null
        }
        Relationships: []
      }
      brh_dpe_rendement_distribution_ch: {
        Row: {
          enum_type_emission_distribution_id: string | null
          id: number
          rd: number
          reseau_distribution: string | null
          reseau_distribution_isole: number | null
        }
        Insert: {
          enum_type_emission_distribution_id?: string | null
          id?: number
          rd: number
          reseau_distribution?: string | null
          reseau_distribution_isole?: number | null
        }
        Update: {
          enum_type_emission_distribution_id?: string | null
          id?: number
          rd?: number
          reseau_distribution?: string | null
          reseau_distribution_isole?: number | null
        }
        Relationships: []
      }
      brh_dpe_rendement_distribution_ecs: {
        Row: {
          configuration_logement: string | null
          enum_type_installation_id: string | null
          id: number
          rd: number
          type_installation: string | null
          type_reseau_collectif: string | null
        }
        Insert: {
          configuration_logement?: string | null
          enum_type_installation_id?: string | null
          id?: number
          rd: number
          type_installation?: string | null
          type_reseau_collectif?: string | null
        }
        Update: {
          configuration_logement?: string | null
          enum_type_installation_id?: string | null
          id?: number
          rd?: number
          type_installation?: string | null
          type_reseau_collectif?: string | null
        }
        Relationships: []
      }
      brh_dpe_rendement_emission: {
        Row: {
          enum_type_emission_distribution_id: string | null
          id: number
          re: number
          type_emission: string | null
        }
        Insert: {
          enum_type_emission_distribution_id?: string | null
          id?: number
          re: number
          type_emission?: string | null
        }
        Update: {
          enum_type_emission_distribution_id?: string | null
          id?: number
          re?: number
          type_emission?: string | null
        }
        Relationships: []
      }
      brh_dpe_rendement_generation: {
        Row: {
          enum_type_generateur_ch_id: string | null
          id: number
          rg: number
          type_generateur_ch: string | null
        }
        Insert: {
          enum_type_generateur_ch_id?: string | null
          id?: number
          rg: number
          type_generateur_ch?: string | null
        }
        Update: {
          enum_type_generateur_ch_id?: string | null
          id?: number
          rg?: number
          type_generateur_ch?: string | null
        }
        Relationships: []
      }
      brh_dpe_rendement_regulation: {
        Row: {
          enum_type_emission_distribution_id: string | null
          id: number
          rr: number
          type_emission_regulation: string | null
        }
        Insert: {
          enum_type_emission_distribution_id?: string | null
          id?: number
          rr: number
          type_emission_regulation?: string | null
        }
        Update: {
          enum_type_emission_distribution_id?: string | null
          id?: number
          rr?: number
          type_emission_regulation?: string | null
        }
        Relationships: []
      }
      brh_dpe_reseau_chaleur_2020: {
        Row: {
          chaud_ou_froid: string | null
          contenu_co2: number | null
          departement: number | null
          est_vertueux: number | null
          hash_reseau: string | null
          id: number
          localisation: string | null
          nom_reseau: string | null
          taux_enr: number | null
        }
        Insert: {
          chaud_ou_froid?: string | null
          contenu_co2?: number | null
          departement?: number | null
          est_vertueux?: number | null
          hash_reseau?: string | null
          id?: number
          localisation?: string | null
          nom_reseau?: string | null
          taux_enr?: number | null
        }
        Update: {
          chaud_ou_froid?: string | null
          contenu_co2?: number | null
          departement?: number | null
          est_vertueux?: number | null
          hash_reseau?: string | null
          id?: number
          localisation?: string | null
          nom_reseau?: string | null
          taux_enr?: number | null
        }
        Relationships: []
      }
      brh_dpe_reseau_chaleur_2021: {
        Row: {
          contenu_co2: number | null
          contenu_co2_acv: number | null
          correspondance_hash_reseau_2020: string | null
          correspondance_tv_reseau_chaleur_id_2020: number | null
          departement: string | null
          id: number
          identifiant_reseau: string | null
          localisation: string | null
          methode_calcul_taux: string | null
          nom_reseau: string | null
          nouveau_reseau_2020_2021: number | null
          taux_enr: string | null
        }
        Insert: {
          contenu_co2?: number | null
          contenu_co2_acv?: number | null
          correspondance_hash_reseau_2020?: string | null
          correspondance_tv_reseau_chaleur_id_2020?: number | null
          departement?: string | null
          id?: number
          identifiant_reseau?: string | null
          localisation?: string | null
          methode_calcul_taux?: string | null
          nom_reseau?: string | null
          nouveau_reseau_2020_2021?: number | null
          taux_enr?: string | null
        }
        Update: {
          contenu_co2?: number | null
          contenu_co2_acv?: number | null
          correspondance_hash_reseau_2020?: string | null
          correspondance_tv_reseau_chaleur_id_2020?: number | null
          departement?: string | null
          id?: number
          identifiant_reseau?: string | null
          localisation?: string | null
          methode_calcul_taux?: string | null
          nom_reseau?: string | null
          nouveau_reseau_2020_2021?: number | null
          taux_enr?: string | null
        }
        Relationships: []
      }
      brh_dpe_reseau_chaleur_2022: {
        Row: {
          contenu_co2: number | null
          contenu_co2_acv: number | null
          departement: number | null
          id: number
          identifiant_reseau: string | null
          localisation: string | null
          methode_calcul_taux: string | null
          nom_reseau: string | null
          nouveau_reseau_2021_2022: number | null
          taux_enr: string | null
        }
        Insert: {
          contenu_co2?: number | null
          contenu_co2_acv?: number | null
          departement?: number | null
          id?: number
          identifiant_reseau?: string | null
          localisation?: string | null
          methode_calcul_taux?: string | null
          nom_reseau?: string | null
          nouveau_reseau_2021_2022?: number | null
          taux_enr?: string | null
        }
        Update: {
          contenu_co2?: number | null
          contenu_co2_acv?: number | null
          departement?: number | null
          id?: number
          identifiant_reseau?: string | null
          localisation?: string | null
          methode_calcul_taux?: string | null
          nom_reseau?: string | null
          nouveau_reseau_2021_2022?: number | null
          taux_enr?: string | null
        }
        Relationships: []
      }
      brh_dpe_scop_ch: {
        Row: {
          enum_generateur_ch_id: string | null
          enum_type_emission_ditribution_id: string | null
          enum_zone_climatique_id: string | null
          id: number
          scop: number
          scop_ou_cop: string | null
          type_emetteur: string | null
          type_generateur: string | null
          zone_climatique: string | null
        }
        Insert: {
          enum_generateur_ch_id?: string | null
          enum_type_emission_ditribution_id?: string | null
          enum_zone_climatique_id?: string | null
          id?: number
          scop: number
          scop_ou_cop?: string | null
          type_emetteur?: string | null
          type_generateur?: string | null
          zone_climatique?: string | null
        }
        Update: {
          enum_generateur_ch_id?: string | null
          enum_type_emission_ditribution_id?: string | null
          enum_zone_climatique_id?: string | null
          id?: number
          scop?: number
          scop_ou_cop?: string | null
          type_emetteur?: string | null
          type_generateur?: string | null
          zone_climatique?: string | null
        }
        Relationships: []
      }
      brh_dpe_scop_ecs: {
        Row: {
          enum_generateur_ecs_id: string | null
          enum_zone_climatique_id: string | null
          id: number
          scop: number
          scop_ou_cop: string | null
          type_generateur: string | null
          zone_climatique: string | null
        }
        Insert: {
          enum_generateur_ecs_id?: string | null
          enum_zone_climatique_id?: string | null
          id?: number
          scop: number
          scop_ou_cop?: string | null
          type_generateur?: string | null
          zone_climatique?: string | null
        }
        Update: {
          enum_generateur_ecs_id?: string | null
          enum_zone_climatique_id?: string | null
          id?: number
          scop?: number
          scop_ou_cop?: string | null
          type_generateur?: string | null
          zone_climatique?: string | null
        }
        Relationships: []
      }
      brh_dpe_seer: {
        Row: {
          eer: number | null
          enum_periode_installation_fr_id: number | null
          enum_zone_climatique_id: string | null
          id: number
          periode_installation_fr: string | null
          seer: number | null
          seer_ou_eer: string | null
          zone_climatique: string | null
        }
        Insert: {
          eer?: number | null
          enum_periode_installation_fr_id?: number | null
          enum_zone_climatique_id?: string | null
          id?: number
          periode_installation_fr?: string | null
          seer?: number | null
          seer_ou_eer?: string | null
          zone_climatique?: string | null
        }
        Update: {
          eer?: number | null
          enum_periode_installation_fr_id?: number | null
          enum_zone_climatique_id?: string | null
          id?: number
          periode_installation_fr?: string | null
          seer?: number | null
          seer_ou_eer?: string | null
          zone_climatique?: string | null
        }
        Relationships: []
      }
      brh_dpe_seuils: {
        Row: {
          cep_a: number | null
          cep_b: number | null
          cep_c: number | null
          cep_d: number | null
          cep_e: number | null
          cep_f: number | null
          critere_altitude_zone_clim: number | null
          ges_a: number | null
          ges_b: number | null
          ges_c: number | null
          ges_d: number | null
          ges_e: number | null
          ges_f: number | null
          id: number
          surface: number | null
        }
        Insert: {
          cep_a?: number | null
          cep_b?: number | null
          cep_c?: number | null
          cep_d?: number | null
          cep_e?: number | null
          cep_f?: number | null
          critere_altitude_zone_clim?: number | null
          ges_a?: number | null
          ges_b?: number | null
          ges_c?: number | null
          ges_d?: number | null
          ges_e?: number | null
          ges_f?: number | null
          id?: number
          surface?: number | null
        }
        Update: {
          cep_a?: number | null
          cep_b?: number | null
          cep_c?: number | null
          cep_d?: number | null
          cep_e?: number | null
          cep_f?: number | null
          critere_altitude_zone_clim?: number | null
          ges_a?: number | null
          ges_b?: number | null
          ges_c?: number | null
          ges_d?: number | null
          ges_e?: number | null
          ges_f?: number | null
          id?: number
          surface?: number | null
        }
        Relationships: []
      }
      brh_dpe_solutions: {
        Row: {
          created_at: string
          id: number
          label: string
          param: Json
          pourcentage_tva: number
          prix_main_oeuvre_ht_cents: number | null
          prix_metre_ht_cents: number | null
          prix_unit_ht_cents: number | null
          score_confort: number | null
          type_element: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          label: string
          param?: Json
          pourcentage_tva?: number
          prix_main_oeuvre_ht_cents?: number | null
          prix_metre_ht_cents?: number | null
          prix_unit_ht_cents?: number | null
          score_confort?: number | null
          type_element: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          label?: string
          param?: Json
          pourcentage_tva?: number
          prix_main_oeuvre_ht_cents?: number | null
          prix_metre_ht_cents?: number | null
          prix_unit_ht_cents?: number | null
          score_confort?: number | null
          type_element?: string
          updated_at?: string
        }
        Relationships: []
      }
      brh_dpe_sw: {
        Row: {
          enum_type_baie_id: number | null
          enum_type_materiaux_menuiserie_id: number | null
          enum_type_pose_id: number | null
          enum_type_vitrage_id: number | null
          id: number
          sw: number
          type_baie: string | null
          type_materiaux_menuiserie: string | null
          type_pose: string | null
          type_vitrage: string | null
          vitrage_vir: number | null
        }
        Insert: {
          enum_type_baie_id?: number | null
          enum_type_materiaux_menuiserie_id?: number | null
          enum_type_pose_id?: number | null
          enum_type_vitrage_id?: number | null
          id?: number
          sw: number
          type_baie?: string | null
          type_materiaux_menuiserie?: string | null
          type_pose?: string | null
          type_vitrage?: string | null
          vitrage_vir?: number | null
        }
        Update: {
          enum_type_baie_id?: number | null
          enum_type_materiaux_menuiserie_id?: number | null
          enum_type_pose_id?: number | null
          enum_type_vitrage_id?: number | null
          id?: number
          sw?: number
          type_baie?: string | null
          type_materiaux_menuiserie?: string | null
          type_pose?: string | null
          type_vitrage?: string | null
          vitrage_vir?: number | null
        }
        Relationships: []
      }
      brh_dpe_temp_fonc_100: {
        Row: {
          enum_temp_distribution_ch_id: number | null
          id: number
          periode_emetteurs: string | null
          temp_distribution_ch: string | null
          temp_fonc_100: number
        }
        Insert: {
          enum_temp_distribution_ch_id?: number | null
          id?: number
          periode_emetteurs?: string | null
          temp_distribution_ch?: string | null
          temp_fonc_100: number
        }
        Update: {
          enum_temp_distribution_ch_id?: number | null
          id?: number
          periode_emetteurs?: string | null
          temp_distribution_ch?: string | null
          temp_fonc_100?: number
        }
        Relationships: []
      }
      brh_dpe_temp_fonc_30: {
        Row: {
          enum_temp_distribution_ch_id: number | null
          enum_type_generateur_ch_id: string | null
          id: number
          periode_emetteurs: string | null
          temp_distribution_ch: string | null
          temp_fonc_30: number
          type_chaudiere: string | null
        }
        Insert: {
          enum_temp_distribution_ch_id?: number | null
          enum_type_generateur_ch_id?: string | null
          id?: number
          periode_emetteurs?: string | null
          temp_distribution_ch?: string | null
          temp_fonc_30: number
          type_chaudiere?: string | null
        }
        Update: {
          enum_temp_distribution_ch_id?: number | null
          enum_type_generateur_ch_id?: string | null
          id?: number
          periode_emetteurs?: string | null
          temp_distribution_ch?: string | null
          temp_fonc_30?: number
          type_chaudiere?: string | null
        }
        Relationships: []
      }
      brh_dpe_ue: {
        Row: {
          id: number
          ratio_2sp: number | null
          type_adjacence_plancher: string | null
          ue: number
          upb: number | null
        }
        Insert: {
          id?: number
          ratio_2sp?: number | null
          type_adjacence_plancher?: string | null
          ue: number
          upb?: number | null
        }
        Update: {
          id?: number
          ratio_2sp?: number | null
          type_adjacence_plancher?: string | null
          ue?: number
          upb?: number | null
        }
        Relationships: []
      }
      brh_dpe_ug: {
        Row: {
          enum_inclinaison_vitrage_id: number | null
          enum_type_gaz_lame_id: number | null
          enum_type_vitrage_id: number | null
          epaisseur_lame: number | null
          id: number
          inclinaison_vitrage: string | null
          type_gaz_lame: string | null
          type_vitrage: string | null
          ug: number
          vitrage_vir: number | null
        }
        Insert: {
          enum_inclinaison_vitrage_id?: number | null
          enum_type_gaz_lame_id?: number | null
          enum_type_vitrage_id?: number | null
          epaisseur_lame?: number | null
          id?: number
          inclinaison_vitrage?: string | null
          type_gaz_lame?: string | null
          type_vitrage?: string | null
          ug: number
          vitrage_vir?: number | null
        }
        Update: {
          enum_inclinaison_vitrage_id?: number | null
          enum_type_gaz_lame_id?: number | null
          enum_type_vitrage_id?: number | null
          epaisseur_lame?: number | null
          id?: number
          inclinaison_vitrage?: string | null
          type_gaz_lame?: string | null
          type_vitrage?: string | null
          ug?: number
          vitrage_vir?: number | null
        }
        Relationships: []
      }
      brh_dpe_ujn: {
        Row: {
          deltar: number | null
          id: number
          ujn: number
          uw: number | null
        }
        Insert: {
          deltar?: number | null
          id?: number
          ujn: number
          uw?: number | null
        }
        Update: {
          deltar?: number | null
          id?: number
          ujn?: number
          uw?: number | null
        }
        Relationships: []
      }
      brh_dpe_umur: {
        Row: {
          effet_joule: number | null
          enum_periode_construction_id: number | null
          enum_zone_climatique_id: number | null
          id: number
          periode_construction: string | null
          umur: number
          zone_climatique: string | null
        }
        Insert: {
          effet_joule?: number | null
          enum_periode_construction_id?: number | null
          enum_zone_climatique_id?: number | null
          id?: number
          periode_construction?: string | null
          umur: number
          zone_climatique?: string | null
        }
        Update: {
          effet_joule?: number | null
          enum_periode_construction_id?: number | null
          enum_zone_climatique_id?: number | null
          id?: number
          periode_construction?: string | null
          umur?: number
          zone_climatique?: string | null
        }
        Relationships: []
      }
      brh_dpe_umur0: {
        Row: {
          enum_materiaux_structure_mur_id: number | null
          epaisseur_structure: string | null
          id: number
          materiaux_structure_mur: string | null
          umur0: number
        }
        Insert: {
          enum_materiaux_structure_mur_id?: number | null
          epaisseur_structure?: string | null
          id?: number
          materiaux_structure_mur?: string | null
          umur0: number
        }
        Update: {
          enum_materiaux_structure_mur_id?: number | null
          epaisseur_structure?: string | null
          id?: number
          materiaux_structure_mur?: string | null
          umur0?: number
        }
        Relationships: []
      }
      brh_dpe_upb: {
        Row: {
          effet_joule: number | null
          enum_periode_construction_id: number | null
          enum_zone_climatique_id: number | null
          id: number
          periode_construction: string | null
          upb: number
          zone_climatique: string | null
        }
        Insert: {
          effet_joule?: number | null
          enum_periode_construction_id?: number | null
          enum_zone_climatique_id?: number | null
          id?: number
          periode_construction?: string | null
          upb: number
          zone_climatique?: string | null
        }
        Update: {
          effet_joule?: number | null
          enum_periode_construction_id?: number | null
          enum_zone_climatique_id?: number | null
          id?: number
          periode_construction?: string | null
          upb?: number
          zone_climatique?: string | null
        }
        Relationships: []
      }
      brh_dpe_upb0: {
        Row: {
          enum_type_plancher_bas_id: number | null
          id: number
          type_plancher_bas: string | null
          upb0: number
        }
        Insert: {
          enum_type_plancher_bas_id?: number | null
          id?: number
          type_plancher_bas?: string | null
          upb0: number
        }
        Update: {
          enum_type_plancher_bas_id?: number | null
          id?: number
          type_plancher_bas?: string | null
          upb0?: number
        }
        Relationships: []
      }
      brh_dpe_uph: {
        Row: {
          effet_joule: number | null
          enum_periode_construction_id: number | null
          enum_zone_climatique_id: number | null
          id: number
          periode_construction: string | null
          type_toiture: string | null
          uph: number
          zone_climatique: string | null
        }
        Insert: {
          effet_joule?: number | null
          enum_periode_construction_id?: number | null
          enum_zone_climatique_id?: number | null
          id?: number
          periode_construction?: string | null
          type_toiture?: string | null
          uph: number
          zone_climatique?: string | null
        }
        Update: {
          effet_joule?: number | null
          enum_periode_construction_id?: number | null
          enum_zone_climatique_id?: number | null
          id?: number
          periode_construction?: string | null
          type_toiture?: string | null
          uph?: number
          zone_climatique?: string | null
        }
        Relationships: []
      }
      brh_dpe_uph0: {
        Row: {
          enum_type_plancher_haut_id: number | null
          id: number
          type_plancher_haut: string | null
          uph0: number
        }
        Insert: {
          enum_type_plancher_haut_id?: number | null
          id?: number
          type_plancher_haut?: string | null
          uph0: number
        }
        Update: {
          enum_type_plancher_haut_id?: number | null
          id?: number
          type_plancher_haut?: string | null
          uph0?: number
        }
        Relationships: []
      }
      brh_dpe_uporte: {
        Row: {
          enum_type_porte_id: number | null
          id: number
          type_porte: string | null
          uporte: number
        }
        Insert: {
          enum_type_porte_id?: number | null
          id?: number
          type_porte?: string | null
          uporte: number
        }
        Update: {
          enum_type_porte_id?: number | null
          id?: number
          type_porte?: string | null
          uporte?: number
        }
        Relationships: []
      }
      brh_dpe_uvue: {
        Row: {
          enum_type_adjacence_id: number | null
          id: number
          type_adjacence: string | null
          uvue: number
        }
        Insert: {
          enum_type_adjacence_id?: number | null
          id?: number
          type_adjacence?: string | null
          uvue: number
        }
        Update: {
          enum_type_adjacence_id?: number | null
          id?: number
          type_adjacence?: string | null
          uvue?: number
        }
        Relationships: []
      }
      brh_dpe_uw: {
        Row: {
          enum_type_baie_id: number | null
          enum_type_materiaux_menuiserie_id: number | null
          id: number
          type_baie: string | null
          type_materiaux_menuiserie: string | null
          ug: number | null
          uw: number
        }
        Insert: {
          enum_type_baie_id?: number | null
          enum_type_materiaux_menuiserie_id?: number | null
          id?: number
          type_baie?: string | null
          type_materiaux_menuiserie?: string | null
          ug?: number | null
          uw: number
        }
        Update: {
          enum_type_baie_id?: number | null
          enum_type_materiaux_menuiserie_id?: number | null
          id?: number
          type_baie?: string | null
          type_materiaux_menuiserie?: string | null
          ug?: number | null
          uw?: number
        }
        Relationships: []
      }
      brh_dpe_zones_climatiques: {
        Row: {
          altitude_max: number | null
          altitude_min: number | null
          departement_numero: string
          id: number
          zone_climatique: string
        }
        Insert: {
          altitude_max?: number | null
          altitude_min?: number | null
          departement_numero: string
          id?: number
          zone_climatique: string
        }
        Update: {
          altitude_max?: number | null
          altitude_min?: number | null
          departement_numero?: string
          id?: number
          zone_climatique?: string
        }
        Relationships: []
      }
      brh_ext_aides_anil: {
        Row: {
          code_geo: string
          conditions: string | null
          geste_concerne: string[] | null
          id: string
          montant_max_eur: number | null
          niveau: string
          nom_aide: string
          organisme: string | null
          scraped_at: string
          url_source: string | null
        }
        Insert: {
          code_geo: string
          conditions?: string | null
          geste_concerne?: string[] | null
          id?: string
          montant_max_eur?: number | null
          niveau: string
          nom_aide: string
          organisme?: string | null
          scraped_at?: string
          url_source?: string | null
        }
        Update: {
          code_geo?: string
          conditions?: string | null
          geste_concerne?: string[] | null
          id?: string
          montant_max_eur?: number | null
          niveau?: string
          nom_aide?: string
          organisme?: string | null
          scraped_at?: string
          url_source?: string | null
        }
        Relationships: []
      }
      brh_ext_cache: {
        Row: {
          cache_key: string
          fetched_at: string
          id: string
          payload: Json
          source: string
          ttl_seconds: number
        }
        Insert: {
          cache_key: string
          fetched_at?: string
          id?: string
          payload: Json
          source: string
          ttl_seconds?: number
        }
        Update: {
          cache_key?: string
          fetched_at?: string
          id?: string
          payload?: Json
          source?: string
          ttl_seconds?: number
        }
        Relationships: []
      }
      brh_ext_commune: {
        Row: {
          delta_dju_2050: number | null
          dju_18_normal: number | null
          dvf_last_refresh: string | null
          fetched_at: string
          insee: string
          nb_dp_logements_existants_12m: number | null
          nb_rge_isolation: number | null
          nb_rge_pac: number | null
          opah_active: boolean
          opah_fin_validite: string | null
          opah_operateur: string | null
          opah_type: string | null
          ppri_present: boolean
          prix_m2_growth_3y: number | null
          prix_m2_median_3y: number | null
          radon_categorie: number | null
          rga_alea: string | null
          sismique_zone: number | null
          sitadel2_last_refresh: string | null
          station_dju_id: string | null
          tx_vacance_struct: number | null
        }
        Insert: {
          delta_dju_2050?: number | null
          dju_18_normal?: number | null
          dvf_last_refresh?: string | null
          fetched_at?: string
          insee: string
          nb_dp_logements_existants_12m?: number | null
          nb_rge_isolation?: number | null
          nb_rge_pac?: number | null
          opah_active?: boolean
          opah_fin_validite?: string | null
          opah_operateur?: string | null
          opah_type?: string | null
          ppri_present?: boolean
          prix_m2_growth_3y?: number | null
          prix_m2_median_3y?: number | null
          radon_categorie?: number | null
          rga_alea?: string | null
          sismique_zone?: number | null
          sitadel2_last_refresh?: string | null
          station_dju_id?: string | null
          tx_vacance_struct?: number | null
        }
        Update: {
          delta_dju_2050?: number | null
          dju_18_normal?: number | null
          dvf_last_refresh?: string | null
          fetched_at?: string
          insee?: string
          nb_dp_logements_existants_12m?: number | null
          nb_rge_isolation?: number | null
          nb_rge_pac?: number | null
          opah_active?: boolean
          opah_fin_validite?: string | null
          opah_operateur?: string | null
          opah_type?: string | null
          ppri_present?: boolean
          prix_m2_growth_3y?: number | null
          prix_m2_median_3y?: number | null
          radon_categorie?: number | null
          rga_alea?: string | null
          sismique_zone?: number | null
          sitadel2_last_refresh?: string | null
          station_dju_id?: string | null
          tx_vacance_struct?: number | null
        }
        Relationships: []
      }
      brh_ext_iris: {
        Row: {
          commune_insee: string
          conso_gaz_mwh_an: number | null
          conso_resid_kwh_an: number | null
          couleur_mpr: string | null
          d121: number | null
          d921: number | null
          decile_estime: number | null
          fetched_at: string
          iris_code: string
          med21: number | null
          pdl_gaz_resid: number | null
          thermosens_kwh_dj: number | null
          tx_avant_1975: number | null
          tx_proprio: number | null
        }
        Insert: {
          commune_insee: string
          conso_gaz_mwh_an?: number | null
          conso_resid_kwh_an?: number | null
          couleur_mpr?: string | null
          d121?: number | null
          d921?: number | null
          decile_estime?: number | null
          fetched_at?: string
          iris_code: string
          med21?: number | null
          pdl_gaz_resid?: number | null
          thermosens_kwh_dj?: number | null
          tx_avant_1975?: number | null
          tx_proprio?: number | null
        }
        Update: {
          commune_insee?: string
          conso_gaz_mwh_an?: number | null
          conso_resid_kwh_an?: number | null
          couleur_mpr?: string | null
          d121?: number | null
          d921?: number | null
          decile_estime?: number | null
          fetched_at?: string
          iris_code?: string
          med21?: number | null
          pdl_gaz_resid?: number | null
          thermosens_kwh_dj?: number | null
          tx_avant_1975?: number | null
          tx_proprio?: number | null
        }
        Relationships: []
      }
      brh_field_visits: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          employee_id: string
          id: string
          lat: number | null
          lng: number | null
          notes: string | null
          scheduled_at: string | null
          status: string
          target_id: string
          target_type: string
          updated_at: string
          visit_type: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          employee_id: string
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          scheduled_at?: string | null
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
          visit_type: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          scheduled_at?: string | null
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_field_visits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "brh_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_field_visits_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      brh_lead_assignments: {
        Row: {
          agence_id: string
          claimed_at: string
          contact_attempts: number
          expires_at: string
          id: string
          last_attempt_at: string | null
          last_attempt_outcome: string | null
          notes: string | null
          prospect_id: number
          released_at: string | null
          status: string
        }
        Insert: {
          agence_id: string
          claimed_at?: string
          contact_attempts?: number
          expires_at?: string
          id?: string
          last_attempt_at?: string | null
          last_attempt_outcome?: string | null
          notes?: string | null
          prospect_id: number
          released_at?: string | null
          status?: string
        }
        Update: {
          agence_id?: string
          claimed_at?: string
          contact_attempts?: number
          expires_at?: string
          id?: string
          last_attempt_at?: string | null
          last_attempt_outcome?: string | null
          notes?: string | null
          prospect_id?: number
          released_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_lead_assignments_agence_id_fkey"
            columns: ["agence_id"]
            isOneToOne: false
            referencedRelation: "brh_agences_immo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_lead_assignments_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "brh_dpe_prospects"
            referencedColumns: ["id"]
          },
        ]
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
      brh_optout_requests: {
        Row: {
          adresse: string | null
          code_insee: string | null
          code_postal: string | null
          commune: string | null
          created_at: string
          deadline: string
          email: string
          id: string
          matched_prospect_id: number | null
          message: string | null
          processed_at: string | null
          processed_by: string | null
          processing_notes: string | null
          request_type: string
          source_ip: unknown
          source_user_agent: string | null
          status: string
        }
        Insert: {
          adresse?: string | null
          code_insee?: string | null
          code_postal?: string | null
          commune?: string | null
          created_at?: string
          deadline?: string
          email: string
          id?: string
          matched_prospect_id?: number | null
          message?: string | null
          processed_at?: string | null
          processed_by?: string | null
          processing_notes?: string | null
          request_type?: string
          source_ip?: unknown
          source_user_agent?: string | null
          status?: string
        }
        Update: {
          adresse?: string | null
          code_insee?: string | null
          code_postal?: string | null
          commune?: string | null
          created_at?: string
          deadline?: string
          email?: string
          id?: string
          matched_prospect_id?: number | null
          message?: string | null
          processed_at?: string | null
          processed_by?: string | null
          processing_notes?: string | null
          request_type?: string
          source_ip?: unknown
          source_user_agent?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_optout_requests_matched_prospect_id_fkey"
            columns: ["matched_prospect_id"]
            isOneToOne: false
            referencedRelation: "brh_dpe_prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_optout_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_partner_contracts: {
        Row: {
          agence_id: string | null
          artisan_id: string | null
          company_id: string | null
          consent_communications: boolean
          consent_data: boolean
          consent_terms: boolean
          contract_content: string
          created_at: string
          email_confirmation_token: string | null
          email_confirmed_at: string | null
          id: string
          partner_type: string
          revoked_at: string | null
          revoked_reason: string | null
          signature_ip: unknown
          signature_user_agent: string | null
          signed_at: string
          signer_email: string
          signer_full_name: string
          signer_profile_id: string | null
          signer_role: string | null
          status: string
          template_version: string
          updated_at: string
        }
        Insert: {
          agence_id?: string | null
          artisan_id?: string | null
          company_id?: string | null
          consent_communications?: boolean
          consent_data?: boolean
          consent_terms?: boolean
          contract_content: string
          created_at?: string
          email_confirmation_token?: string | null
          email_confirmed_at?: string | null
          id?: string
          partner_type: string
          revoked_at?: string | null
          revoked_reason?: string | null
          signature_ip?: unknown
          signature_user_agent?: string | null
          signed_at?: string
          signer_email: string
          signer_full_name: string
          signer_profile_id?: string | null
          signer_role?: string | null
          status?: string
          template_version?: string
          updated_at?: string
        }
        Update: {
          agence_id?: string | null
          artisan_id?: string | null
          company_id?: string | null
          consent_communications?: boolean
          consent_data?: boolean
          consent_terms?: boolean
          contract_content?: string
          created_at?: string
          email_confirmation_token?: string | null
          email_confirmed_at?: string | null
          id?: string
          partner_type?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          signature_ip?: unknown
          signature_user_agent?: string | null
          signed_at?: string
          signer_email?: string
          signer_full_name?: string
          signer_profile_id?: string | null
          signer_role?: string | null
          status?: string
          template_version?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_partner_contracts_agence_id_fkey"
            columns: ["agence_id"]
            isOneToOne: false
            referencedRelation: "brh_agences_immo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_partner_contracts_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "brh_artisans_rge"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_partner_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "brh_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_partner_contracts_signer_profile_id_fkey"
            columns: ["signer_profile_id"]
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
      brh_pro_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          letters_used_this_period: number
          profile_id: string
          quota_letters_per_month: number
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_status: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          letters_used_this_period?: number
          profile_id: string
          quota_letters_per_month?: number
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_status?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          letters_used_this_period?: number
          profile_id?: string
          quota_letters_per_month?: number
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_status?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_pro_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
      brh_prospect_letters: {
        Row: {
          body_md: string
          cache_creation_tokens: number | null
          cache_read_tokens: number | null
          created_at: string
          generated_by: string
          generation_duration_ms: number | null
          greeting: string | null
          id: string
          input_tokens: number | null
          model_used: string
          output_tokens: number | null
          prospect_id: number
          score_v2_at_generation: number | null
          segment_at_generation: string | null
          sent_at: string | null
          sent_via: string | null
          signature: string | null
          signaux_used: Json | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_md: string
          cache_creation_tokens?: number | null
          cache_read_tokens?: number | null
          created_at?: string
          generated_by: string
          generation_duration_ms?: number | null
          greeting?: string | null
          id?: string
          input_tokens?: number | null
          model_used?: string
          output_tokens?: number | null
          prospect_id: number
          score_v2_at_generation?: number | null
          segment_at_generation?: string | null
          sent_at?: string | null
          sent_via?: string | null
          signature?: string | null
          signaux_used?: Json | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          cache_creation_tokens?: number | null
          cache_read_tokens?: number | null
          created_at?: string
          generated_by?: string
          generation_duration_ms?: number | null
          greeting?: string | null
          id?: string
          input_tokens?: number | null
          model_used?: string
          output_tokens?: number | null
          prospect_id?: number
          score_v2_at_generation?: number | null
          segment_at_generation?: string | null
          sent_at?: string | null
          sent_via?: string | null
          signature?: string | null
          signaux_used?: Json | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_prospect_letters_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_prospect_letters_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "brh_dpe_prospects"
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
      brh_score_vente_v1: {
        Row: {
          algo_version: string
          computed_at: string
          proba_6m: number | null
          prospect_id: number
          rules_breakdown: Json | null
          score: number | null
          segment: string | null
          updated_at: string
        }
        Insert: {
          algo_version?: string
          computed_at?: string
          proba_6m?: number | null
          prospect_id: number
          rules_breakdown?: Json | null
          score?: number | null
          segment?: string | null
          updated_at?: string
        }
        Update: {
          algo_version?: string
          computed_at?: string
          proba_6m?: number | null
          prospect_id?: number
          rules_breakdown?: Json | null
          score?: number | null
          segment?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_score_vente_v1_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: true
            referencedRelation: "brh_dpe_prospects"
            referencedColumns: ["id"]
          },
        ]
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
      brh_artisan_invite_accept: {
        Args: { p_token: string; p_user_id: string }
        Returns: {
          artisan_id: string
          message: string
          success: boolean
        }[]
      }
      brh_artisan_respond_lead: {
        Args: {
          p_action: string
          p_actual_chantier_eur?: number
          p_lead_id: string
          p_reason?: string
        }
        Returns: {
          message: string
          new_status: string
          success: boolean
        }[]
      }
      brh_consume_letter_quota: {
        Args: { p_profile_id: string }
        Returns: {
          allowed: boolean
          period_end: string
          quota: number
          tier: string
          used: number
        }[]
      }
      brh_cron_generate_previous_month_commissions: {
        Args: never
        Returns: {
          invoices_created: number
          total_commission_eur: number
        }[]
      }
      brh_cron_generate_with_audit: { Args: never; Returns: string }
      brh_ext_decile_to_couleur_mpr: {
        Args: { decile: number }
        Returns: string
      }
      brh_gen_artisan_token: { Args: never; Returns: string }
      brh_generate_commission_invoices: {
        Args: { p_default_pct?: number; p_month: number; p_year: number }
        Returns: {
          artisan_id: string
          commission_eur: number
          invoice_id: string
          is_new: boolean
          nb_leads: number
          total_eur: number
        }[]
      }
      brh_generate_monthly_audits: {
        Args: { p_audit_month: string }
        Returns: number
      }
      brh_grant_lead_claim: {
        Args: { p_agence_id: string; p_prospect_id: number }
        Returns: string
      }
      brh_mark_commission_paid: {
        Args: { p_invoice_id: string; p_stripe_payment_intent?: string }
        Returns: boolean
      }
      brh_release_expired_assignments: { Args: never; Returns: number }
      brh_reset_agence_monthly_quotas: { Args: never; Returns: number }
      brh_update_artisan_score: {
        Args: { p_artisan_id: string }
        Returns: undefined
      }
      brh_user_can: {
        Args: { p_perm_key: string; p_user_id: string }
        Returns: boolean
      }
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

